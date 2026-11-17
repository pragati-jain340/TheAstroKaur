import "server-only";
import type Stripe from "stripe";
import { BookingError, check, database, loadOrder } from "@/lib/booking/server";
import type { BookingOrder } from "@/lib/booking/types";
import { stripe } from "./stripe";

export interface BookingRefund {
  id: string;
  order_id: string;
  stripe_refund_id: string | null;
  amount_cents: number;
  currency: string;
  status: "processing" | "pending" | "requires_action" | "succeeded" | "failed" | "canceled";
  reason: string;
  actor: string | null;
  failure_reason: string | null;
  created_at: string;
}

type Provider = Pick<Stripe, "refunds" | "paymentIntents">;
const requestId = (value?: string) => value && /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(value) ? value : null;

export async function refundTracking(orderId: string) {
  const result = await database().from("booking_refunds").select("*").eq("order_id", orderId).order("created_at", { ascending: false });
  if (result.error && ["42P01", "PGRST205"].includes(result.error.code)) return { refunds: [] as BookingRefund[], refund_tracking_ready: false };
  return { refunds: check(result) as BookingRefund[], refund_tracking_ready: true };
}

async function listRefunds(provider: Provider, intent: string) {
  const refunds: Stripe.Refund[] = [];
  let after: string | undefined;
  for (let page = 0; page < 100; page++) {
    const result = await provider.refunds.list({ payment_intent: intent, limit: 100, ...(after ? { starting_after: after } : {}) });
    refunds.push(...result.data);
    if (!result.has_more) return refunds;
    after = result.data.at(-1)?.id;
    if (!after) break;
  }
  throw new BookingError("Unable to verify the complete refund history. Review this payment in Stripe.", 503);
}

async function recordRefund(order: BookingOrder, refund: Stripe.Refund) {
  const intent = typeof refund.payment_intent === "string" ? refund.payment_intent : refund.payment_intent?.id;
  if (intent !== order.stripe_payment_intent_id || !refund.status || refund.currency.toLowerCase() !== order.currency_snapshot?.toLowerCase())
    throw new BookingError("Refund does not match this payment.", 409);
  check(await database().rpc("booking_sync_refund", {
    p_intent: intent,
    p_refund: refund.id,
    p_amount: refund.amount,
    p_currency: refund.currency,
    p_status: refund.status,
    p_request: requestId(refund.metadata?.refund_request_id),
    p_failure: refund.failure_reason || null,
  }));
}

/** Read Stripe's authoritative state; this never creates or cancels a refund. */
export async function reconcileRefunds(order: BookingOrder, provider: Provider = stripe()) {
  if (!order.payment_verified_at || !order.stripe_payment_intent_id) return [];
  const refunds = await listRefunds(provider, order.stripe_payment_intent_id);
  if (refunds.length || !order.stripe_receipt_url) {
    const payment = await provider.paymentIntents.retrieve(order.stripe_payment_intent_id, { expand: ["latest_charge"] });
    const charge = typeof payment.latest_charge === "object" ? payment.latest_charge : null;
    if (charge?.receipt_url && payment.status === "succeeded" && payment.amount_received === order.price_cents_snapshot && payment.currency.toLowerCase() === order.currency_snapshot?.toLowerCase()) {
      // Refresh the hosted receipt before a refund transition queues email copies.
      check(await database().from("orders").update({ stripe_receipt_url: charge.receipt_url }).eq("id", order.id).eq("stripe_payment_intent_id", order.stripe_payment_intent_id));
    }
  }
  // Existing refunds may have been created in the Stripe dashboard as well as here.
  for (const refund of refunds) await recordRefund(order, refund);
  return refunds;
}

/** Only call after the webhook signature and test/live mode have been verified. */
export async function handleRefundWebhook(event: Stripe.Event, provider: Provider & Pick<Stripe, "charges"> = stripe()) {
  const snapshot = event.data.object as Stripe.Refund | Stripe.Charge;
  const authoritative = event.type === "charge.refunded"
    ? await provider.charges.retrieve(snapshot.id)
    : await provider.refunds.retrieve(snapshot.id);
  const intent = typeof authoritative.payment_intent === "string" ? authoritative.payment_intent : authoritative.payment_intent?.id;
  if (!intent) return;
  const order = check(await database().from("orders").select("*").eq("stripe_payment_intent_id", intent).not("payment_verified_at", "is", null).maybeSingle());
  if (order) await reconcileRefunds(order as BookingOrder, provider);
}

export async function issueExceptionalRefund(order: BookingOrder, actor: string, reason: unknown, expectedAmount: unknown, provider: Provider = stripe()) {
  if (!order.payment_verified_at || !order.stripe_payment_intent_id || order.payment_status !== "paid")
    throw new BookingError("A verified paid order is required.", 409);
  if (typeof reason !== "string" || reason.trim().length < 3 || reason.trim().length > 1000)
    throw new BookingError("Enter a refund reason (3 to 1000 characters).");
  if (!Number.isInteger(expectedAmount) || Number(expectedAmount) <= 0)
    throw new BookingError("Confirm the refundable amount before continuing.");

  const payment = await provider.paymentIntents.retrieve(order.stripe_payment_intent_id);
  if (payment.status !== "succeeded" || payment.amount_received !== order.price_cents_snapshot || payment.currency.toLowerCase() !== order.currency_snapshot?.toLowerCase() || (payment.metadata.order_id && payment.metadata.order_id !== order.id))
    throw new BookingError("The Stripe payment does not match this booking.", 409);

  const existing = await reconcileRefunds(order, provider);
  const active = existing.find(refund => ["pending", "requires_action"].includes(refund.status || ""));
  if (active) return active;
  const refunded = existing.filter(refund => refund.status === "succeeded").reduce((total, refund) => total + refund.amount, 0);
  const remaining = payment.amount_received - refunded;
  if (remaining <= 0) throw new BookingError("This payment has already been fully refunded. Refresh the booking.", 409);
  if (remaining !== expectedAmount) throw new BookingError("The refundable balance changed. Refresh before confirming.", 409);

  // The database locks the order and reuses any unfinished operation, including its key.
  const operation = check(await database().rpc("booking_begin_refund", {
    p_order: order.id, p_actor: actor, p_reason: reason.trim(), p_amount: remaining,
  })) as BookingRefund;
  if (operation.status !== "processing") throw new BookingError("A refund is already in progress. Refresh its status.", 409);
  const recovered = existing.find(refund => refund.metadata?.refund_request_id === operation.id);
  if (recovered) return recovered;
  let refund: Stripe.Refund;
  try {
    refund = await provider.refunds.create({
      payment_intent: order.stripe_payment_intent_id,
      amount: operation.amount_cents,
      metadata: { order_id: order.id, refund_request_id: operation.id },
    }, { idempotencyKey: `booking-refund-${operation.id}` });
  } catch (error) {
    const type = error && typeof error === "object" && "type" in error ? error.type : "";
    if (["StripeInvalidRequestError", "StripePermissionError", "StripeAuthenticationError", "StripeCardError"].includes(String(type))) {
      check(await database().rpc("booking_reject_refund", { p_request: operation.id, p_failure: "Stripe rejected the refund. Check the payment and account permissions in Stripe." }));
      throw new BookingError("Stripe rejected the refund. Check the payment and account permissions in Stripe before trying again.", 409);
    }
    // Do not label an uncertain network response as failed or create a new operation.
    throw new BookingError("Stripe's result is not confirmed yet. Refresh refund status before retrying; retries reuse the same request.", 503);
  }
  // Persistence is outside the provider try/catch: a database error never implies a failed refund.
  await recordRefund(order, refund);
  return refund;
}

export async function reconcilePendingRefunds(provider?: Provider) {
  const pending = check(await database().from("booking_refunds").select("order_id").in("status", ["processing", "pending", "requires_action"]).order("updated_at").limit(4));
  for (const id of [...new Set((pending || []).map(row => String(row.order_id)))].slice(0, 2)) {
    try {
      await reconcileRefunds(await loadOrder(id), provider);
      // Rotate successfully checked operations, including unsubmitted requests, so
      // they cannot monopolize the bounded worker batch indefinitely.
      check(await database().from("booking_refunds").update({ updated_at: new Date().toISOString() }).eq("order_id", id).in("status", ["processing", "pending", "requires_action"]));
    } catch { /* Retain pending state until the provider can be verified. */ }
  }
}
