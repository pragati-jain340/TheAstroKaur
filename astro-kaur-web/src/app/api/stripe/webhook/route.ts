import { NextRequest, NextResponse } from "next/server";
import { stripe, settleSession } from "@/lib/payments/stripe";
import { apiError, BookingError, check, database } from "@/lib/booking/server";
import type Stripe from "stripe";
export const runtime = "nodejs";
export async function POST(req: NextRequest) {
  try {
    const secret = process.env.STRIPE_WEBHOOK_SECRET,
      signature = req.headers.get("stripe-signature");
    if (!secret || !signature)
      throw new BookingError(
        "Webhook configuration or signature missing.",
        400,
      );
    let event: Stripe.Event;
    try {
      event = stripe().webhooks.constructEvent(
        await req.text(),
        signature,
        secret,
      );
    } catch {
      throw new BookingError("Invalid webhook signature.", 400);
    }
    if (event.livemode)
      throw new BookingError("Live payments are disabled.", 400);
    if (event.type === "charge.refunded") {
      const snapshot = event.data.object as Stripe.Charge;
      const charge = await stripe().charges.retrieve(snapshot.id);
      const intent =
        typeof charge.payment_intent === "string"
          ? charge.payment_intent
          : charge.payment_intent?.id;
      if (intent) {
        const order = check(
          await database()
            .from("orders")
            .select("id")
            .eq("stripe_payment_intent_id", intent)
            .not("payment_verified_at", "is", null)
            .maybeSingle(),
        );
        if (order)
          check(
            await database().rpc("booking_record_refund", {
              p_intent: intent,
              p_refund: charge.refunds?.data[0]?.id || charge.id,
              p_amount: charge.amount_refunded,
            }),
          );
      }
    }
    if (
      [
        "checkout.session.completed",
        "checkout.session.async_payment_succeeded",
        "checkout.session.async_payment_failed",
        "checkout.session.expired",
      ].includes(event.type)
    ) {
      // Retrieve authoritative state; duplicate/out-of-order event payloads cannot regress payment.
      const snapshot = event.data.object as Stripe.Checkout.Session;
      const session = await stripe().checkout.sessions.retrieve(snapshot.id);
      await settleSession(session, event.id);
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    return apiError(error);
  }
}
