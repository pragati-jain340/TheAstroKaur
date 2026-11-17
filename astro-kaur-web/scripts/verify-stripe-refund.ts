/** Opt-in real Stripe TEST API probe. Never changes website booking records. */
import { randomUUID } from "node:crypto";
import { loadEnvConfig } from "@next/env";
import type { BookingOrder } from "../src/lib/booking/types";
let stage = "initialization";

async function main() {
  loadEnvConfig(process.cwd());
  if (!/^(sk|rk)_test_/.test(process.env.STRIPE_SECRET_KEY || "")) throw new Error("A Stripe test key is required. Live keys are refused.");
  const { stripe } = await import("../src/lib/payments/stripe");
  const { issueExceptionalRefund } = await import("../src/lib/payments/refunds");
  const provider = stripe();
  const orderId = randomUUID();
  const operationId = randomUUID();
  const amount = 100;
  const reason = "Isolated Stripe refund API verification";
  stage = "create isolated test payment";
  const payment = await provider.paymentIntents.create({
    amount, currency: "eur", payment_method: "pm_card_visa", allowed_payment_method_types: ["card"], confirm: true,
    description: "TheAstroKaur isolated refund verification (test only)",
    metadata: { order_id: orderId, purpose: "refund_api_verification" }, expand: ["latest_charge"],
  }, { idempotencyKey: `refund-verification-payment-${orderId}` });
  if (payment.livemode || payment.status !== "succeeded") throw new Error("The isolated test payment did not succeed.");

  // Exercise the real application service and Stripe SDK, while keeping the
  // operation ledger in memory. SQL transactions are checked separately.
  const originalFetch = globalThis.fetch;
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalSecret = process.env.SUPABASE_SECRET_KEY;
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://refund-verification.invalid";
  process.env.SUPABASE_SECRET_KEY = "synthetic-verification-only";
  const recorded: Record<string, unknown>[] = [];
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    if (url.hostname !== "refund-verification.invalid") throw new Error("Unexpected fetch request. Real website database access is prohibited in this probe.");
    const body = JSON.parse(String(init?.body || "{}"));
    if (url.pathname.endsWith("/booking_begin_refund")) return Response.json({ id: operationId, order_id: orderId, amount_cents: amount, currency: "eur", status: "processing", reason });
    if (url.pathname.endsWith("/booking_sync_refund")) { recorded.push(body); return Response.json(null); }
    if (url.pathname.endsWith("/orders") && init?.method === "PATCH") return new Response(null, { status: 204 });
    throw new Error("Unexpected ledger operation in the isolated probe.");
  };
  try {
    const charge = typeof payment.latest_charge === "object" ? payment.latest_charge : null;
    const order = {
      id: orderId, status: "confirmed", payment_status: "paid", payment_verified_at: new Date().toISOString(),
      stripe_payment_intent_id: payment.id, price_cents_snapshot: amount, currency_snapshot: "eur",
      stripe_receipt_url: charge?.receipt_url || null,
    } as BookingOrder;
    stage = "application refund service";
    const refund = await issueExceptionalRefund(order, randomUUID(), reason, amount, provider);
    stage = "verify Stripe refund and idempotency";
    const authoritative = await provider.refunds.retrieve(refund.id);
    const repeated = await provider.refunds.create({ payment_intent: payment.id, amount, metadata: { order_id: orderId, refund_request_id: operationId } }, { idempotencyKey: `booking-refund-${operationId}` });
    const sameRefund = repeated.id === refund.id;
    const savedCorrectly = recorded.some(row => row.p_refund === refund.id && row.p_amount === amount && row.p_status === authoritative.status);
    if (authoritative.status !== "succeeded" || !sameRefund || !savedCorrectly) throw new Error("Refund verification did not pass all assertions.");
    console.log(JSON.stringify({
      stripe_mode: "test", amount: "EUR 1.00", payment_status: payment.status, refund_status: authoritative.status,
      refund_id: refund.id, payment_intent_id: payment.id, idempotency_verified: sameRefund,
      application_saved_matching_result: savedCorrectly, website_database_changed: false,
    }));
  } finally {
    globalThis.fetch = originalFetch;
    if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL; else process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    if (originalSecret === undefined) delete process.env.SUPABASE_SECRET_KEY; else process.env.SUPABASE_SECRET_KEY = originalSecret;
  }
}

main().catch(error => {
  // Provider error objects can contain request details. Print only a safe code.
  const type = error && typeof error === "object" && "type" in error ? String(error.type) : "VerificationError";
  const code = error && typeof error === "object" && "code" in error ? String(error.code) : undefined;
  const message = error instanceof Error ? error.message.replace(/(?:sk|rk|pk)_(?:test|live)_[A-Za-z0-9]+|whsec_[A-Za-z0-9]+|[A-Za-z0-9_]+_secret_[A-Za-z0-9]+/g, "[redacted]").slice(0, 400) : "Unknown verification failure";
  console.error(JSON.stringify({ refund_verification: "failed", stage, type, code, message }));
  process.exitCode = 1;
});
