import "server-only";
import Stripe from "stripe";
import { BookingError, check, database, siteUrl } from "@/lib/booking/server";
import type { BookingOrder } from "@/lib/booking/types";

export function stripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key?.startsWith("sk_test_") && !key?.startsWith("rk_test_"))
    throw new BookingError("Test payments are not configured yet.", 503);
  return new Stripe(key, { timeout: 8000, maxNetworkRetries: 0 });
}
export async function createCheckout(order: BookingOrder) {
  const provider = stripe();
  if (order.stripe_checkout_session_id)
    return provider.checkout.sessions.retrieve(
      order.stripe_checkout_session_id,
    );
  if (
    order.status !== "pending_payment" ||
    !order.checkout_key ||
    !order.price_cents_snapshot ||
    !order.customer_email_snapshot
  )
    throw new BookingError("This checkout is no longer available.", 409);
  const origin = siteUrl();
  // This marker makes a lost Stripe response recoverable with the same idempotency key.
  if (
    !check(
      await database().rpc("booking_begin_checkout", { p_order: order.id }),
    )
  )
    throw new BookingError(
      "This checkout has expired. Please start again.",
      409,
    );
  const session = await provider.checkout.sessions.create(
    {
      mode: "payment",
      allowed_payment_method_types: ["card"],
      customer_email: order.customer_email_snapshot,
      client_reference_id: order.id,
      metadata: { order_id: order.id },
      payment_intent_data: { metadata: { order_id: order.id } },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: order.currency_snapshot || "eur",
            unit_amount: order.price_cents_snapshot,
            product_data: { name: order.service_title },
          },
        },
      ],
      success_url: `${origin}/account/readings/${order.id}?checkout=returned`,
      cancel_url: `${origin}/account/readings/${order.id}?checkout=cancelled`,
    },
    { idempotencyKey: `booking-${order.checkout_key}` },
  );
  check(
    await database()
      .from("orders")
      .update({ stripe_checkout_session_id: session.id })
      .eq("id", order.id)
      .is("stripe_checkout_session_id", null),
  );
  return session;
}
export async function settleSession(
  session: Stripe.Checkout.Session,
  eventId: string,
) {
  if (session.livemode)
    throw new BookingError("Live payment events are disabled.", 400);
  const id = session.metadata?.order_id;
  if (!id || session.client_reference_id !== id || session.mode !== "payment")
    throw new BookingError("Unrecognized payment session.", 400);
  const paid = session.payment_status === "paid";
  if (!paid && session.status !== "expired") return "pending";
  const intent =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id || null;
  let receipt: string | null = null;
  let startedAt: string | null = null;
  if (paid && intent) {
    const payment = await stripe().paymentIntents.retrieve(intent, {
      expand: ["latest_charge"],
    });
    if (
      payment.status !== "succeeded" ||
      payment.currency !== session.currency ||
      payment.amount_received !== session.amount_total
    )
      throw new BookingError(
        "Payment verification does not match the checkout.",
        409,
      );
    receipt =
      typeof payment.latest_charge === "object"
        ? payment.latest_charge?.receipt_url || null
        : null;
    if(typeof payment.latest_charge==='object' && payment.latest_charge) startedAt=new Date(payment.latest_charge.created*1000).toISOString();
  }
  const outcome = check(
    await database().rpc("booking_settle", {
      p_order: id,
      p_session: session.id,
      p_intent: intent,
      p_amount: session.amount_total,
      p_currency: session.currency,
      p_event: eventId,
      p_paid: paid,
      p_started_at:startedAt,
    }),
  );
  if (receipt)
    check(
      await database()
        .from("orders")
        .update({ stripe_receipt_url: receipt })
        .eq("id", id)
        .eq("stripe_payment_intent_id", intent),
    );
  return outcome;
}
export async function reconcileCheckout(order: BookingOrder) {
  if (
    !order.checkout_created_at &&
    !order.stripe_checkout_session_id &&
    Date.parse(order.hold_expires_at || "") <= Date.now()
  ) {
    await database().rpc("booking_expire_unstarted", { p_order: order.id });
    return null;
  }
  // With no saved ID, recover creation using the original stable idempotency key.
  let session = order.stripe_checkout_session_id
    ? await stripe().checkout.sessions.retrieve(
        order.stripe_checkout_session_id,
      )
    : await createCheckout(order);
  if (
    session.status === "open" &&
    Date.parse(order.hold_expires_at || "") <= Date.now()
  ) {
    try {
      session = await stripe().checkout.sessions.expire(session.id);
    } catch {
      session = await stripe().checkout.sessions.retrieve(session.id);
    }
  }
  // Never release an open, processing or unknown session. The next worker retries.
  await settleSession(
    session,
    `reconcile:${session.id}:${session.payment_status}:${session.status}`,
  );
  return session;
}
