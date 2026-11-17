import test, { type TestContext } from "node:test";
import assert from "node:assert/strict";
import type Stripe from "stripe";
import { issueExceptionalRefund, reconcileRefunds, refundTracking, handleRefundWebhook, reconcilePendingRefunds } from "../src/lib/payments/refunds";
import type { BookingOrder } from "../src/lib/booking/types";

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://refunds.invalid";
process.env.SUPABASE_SECRET_KEY = "synthetic-secret";
const order = { id: "11111111-1111-4111-8111-111111111111", payment_status: "paid", payment_verified_at: "2026-11-17T00:00:00Z", stripe_payment_intent_id: "pi_synthetic", price_cents_snapshot: 2000, currency_snapshot: "eur", status: "confirmed" } as BookingOrder;
const operation = { id: "22222222-2222-4222-8222-222222222222", order_id: order.id, amount_cents: 2000, currency: "eur", status: "processing", reason: "Approved service exception" };
const refund = (status = "succeeded") => ({ id: "re_synthetic", payment_intent: "pi_synthetic", currency: "eur", amount: 2000, status, metadata: { order_id: order.id, refund_request_id: operation.id }, failure_reason: null } as unknown as Stripe.Refund);
const optionsMethod = (init?: RequestInit) => init?.method || "GET";
function scenario(t: TestContext) {
  const calls: { name: string; body: Record<string, unknown> }[] = [];
  const creates: { body: Record<string, unknown>; options: Record<string, unknown> }[] = [];
  const state = { existing: [] as Stripe.Refund[], result: refund(), error: null as unknown, amount: 2000, persistBeforeError: false, missingSchema: false, pendingOrders: [] as { order_id: string }[] };
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(input));
    assert.equal(url.hostname, "refunds.invalid", "no real provider or database is contacted");
    const name = url.pathname.split("/").at(-1)!;
    if (name === "orders") return Response.json(order);
    if (name === "booking_refunds" && optionsMethod(init) === "PATCH") { calls.push({ name, body: JSON.parse(String(init?.body)) }); return new Response(null, { status: 204 }); }
    if (name === "booking_refunds") return state.missingSchema ? Response.json({ code: "PGRST205", message: "Table missing" }, { status: 404 }) : Response.json(state.pendingOrders);
    const body = JSON.parse(String(init?.body || "{}")); calls.push({ name, body });
    if (name === "booking_begin_refund") return Response.json(operation);
    if (["booking_sync_refund", "booking_reject_refund"].includes(name)) return Response.json(null);
    throw new Error(`Unexpected mutation ${name}`);
  });
  const provider = {
    paymentIntents: { retrieve: async () => ({ id: "pi_synthetic", status: "succeeded", amount_received: state.amount, currency: "eur", metadata: { order_id: order.id } }) },
    charges: { retrieve: async () => ({ id: "ch_synthetic", payment_intent: "pi_synthetic" }) },
    refunds: {
      retrieve: async () => state.result,
      list: async () => ({ data: state.existing, has_more: false }),
      create: async (body: Record<string, unknown>, options: Record<string, unknown>) => {
        creates.push({ body, options });
        if (state.persistBeforeError) state.existing = [state.result];
        if (state.error) throw state.error;
        state.existing = [state.result]; return state.result;
      },
    },
  } as unknown as Pick<Stripe, "paymentIntents" | "refunds" | "charges">;
  return { calls, creates, state, provider };
}

test("exceptional refund uses a persisted idempotency key and never cancels a booking", async t => {
  const s = scenario(t);
  const result = await issueExceptionalRefund(order, "admin", "Approved service exception", 2000, s.provider);
  assert.equal(result.status, "succeeded");
  assert.deepEqual(s.creates[0].body, { payment_intent: "pi_synthetic", amount: 2000, metadata: { order_id: order.id, refund_request_id: operation.id } });
  assert.equal(s.creates[0].options.idempotencyKey, `booking-refund-${operation.id}`);
  assert.deepEqual(s.calls.map(call => call.name), ["booking_begin_refund", "booking_sync_refund"]);
  assert.equal(s.calls[1].body.p_status, "succeeded");
});

test("refund requires a reason and confirmed balance and rejects mismatched payments", async t => {
  const s = scenario(t);
  await assert.rejects(issueExceptionalRefund(order, "admin", "", 2000, s.provider), /refund reason/);
  await assert.rejects(issueExceptionalRefund(order, "admin", "Approved exception", 1000, s.provider), /balance changed/);
  s.state.amount = 3000;
  await assert.rejects(issueExceptionalRefund(order, "admin", "Approved exception", 2000, s.provider), /does not match/);
  assert.equal(s.creates.length, 0);
  assert.equal(s.calls.length, 0);
});

test("pending and failed Stripe refunds are recorded without claiming they succeeded", async t => {
  const s = scenario(t);
  s.state.result = refund("pending");
  assert.equal((await issueExceptionalRefund(order, "admin", "Approved exception", 2000, s.provider)).status, "pending");
  assert.equal(s.calls.at(-1)!.body.p_status, "pending");
  s.state.existing = [refund("failed")];
  await reconcileRefunds(order, s.provider);
  assert.equal(s.calls.at(-1)!.body.p_status, "failed");
});

test("an existing pending refund prevents another create request", async t => {
  const s = scenario(t); s.state.existing = [refund("pending")];
  assert.equal((await issueExceptionalRefund(order, "admin", "Approved exception", 2000, s.provider)).status, "pending");
  assert.equal(s.creates.length, 0);
  assert.equal(s.calls.some(call => call.name === "booking_begin_refund"), false);
});

test("a lost Stripe response recovers the successful refund without submitting another", async t => {
  const s = scenario(t); s.state.error = new Error("Connection lost"); s.state.persistBeforeError = true;
  await assert.rejects(issueExceptionalRefund(order, "admin", "Approved exception", 2000, s.provider), /not confirmed yet/);
  assert.equal(s.calls.some(call => call.name === "booking_reject_refund"), false);
  s.state.error = null;
  await assert.rejects(issueExceptionalRefund(order, "admin", "Approved exception", 2000, s.provider), /already been fully refunded/);
  assert.equal(s.creates.length, 1);
  assert.equal(s.calls.at(-1)!.body.p_status, "succeeded");
});

test("retrying an uncertain unsubmitted operation reuses its original request key", async t => {
  const s = scenario(t); s.state.error = new Error("Timeout");
  await assert.rejects(issueExceptionalRefund(order, "admin", "Approved exception", 2000, s.provider), /not confirmed yet/);
  s.state.error = null;
  await issueExceptionalRefund(order, "admin", "Approved exception", 2000, s.provider);
  assert.equal(s.creates.length, 2);
  assert.equal(s.creates[0].options.idempotencyKey, s.creates[1].options.idempotencyKey);
});

test("a definite Stripe rejection is distinct from an uncertain network result", async t => {
  const s = scenario(t); s.state.error = { type: "StripeInvalidRequestError" };
  await assert.rejects(issueExceptionalRefund(order, "admin", "Approved exception", 2000, s.provider), /Stripe rejected/);
  assert.equal(s.calls.at(-1)!.name, "booking_reject_refund");
});

test("refund tracking reports a missing migration without breaking booking reads", async t => {
  const s = scenario(t); s.state.missingSchema = true;
  assert.deepEqual(await refundTracking(order.id), { refunds: [], refund_tracking_ready: false });
});


test("refund webhooks retrieve authoritative pending and failed state rather than trusting the event snapshot", async t => {
  const s = scenario(t);
  for (const status of ['pending', 'failed']) {
    s.state.result = refund(status); s.state.existing = [s.state.result];
    const event = { type: 'refund.updated', data: { object: { id: 're_synthetic', status: 'succeeded' } } } as unknown as Stripe.Event;
    await handleRefundWebhook(event, s.provider);
    assert.equal(s.calls.at(-1)!.body.p_status, status);
  }
  assert.equal(s.creates.length, 0);
});

test("refund synchronization processes all pages, including dashboard-issued partial refunds", async t => {
  const s = scenario(t);
  let page = 0;
  const first = { ...refund('succeeded'), id: 're_first', amount: 500, metadata: {} };
  const second = { ...refund('succeeded'), id: 're_second', amount: 1500, metadata: {} };
  t.mock.method(s.provider.refunds, 'list', async (params: Stripe.RefundListParams) => {
    page++;
    assert.equal(params.starting_after, page === 1 ? undefined : 're_first');
    return { data: [page === 1 ? first : second], has_more: page === 1 };
  });
  await reconcileRefunds(order, s.provider);
  assert.equal(page, 2);
  assert.deepEqual(s.calls.map(call => call.body.p_amount), [500, 1500]);
  assert.ok(s.calls.every(call => call.body.p_request === null));
});


test("worker rotates checked unsubmitted operations without creating a refund", async t => {
  const s = scenario(t); s.state.pendingOrders = [{ order_id: order.id }];
  await reconcilePendingRefunds(s.provider);
  assert.equal(s.creates.length, 0);
  assert.equal(s.calls.length, 1);
  assert.equal(s.calls[0].name, 'booking_refunds');
  assert.ok(typeof s.calls[0].body.updated_at === 'string');
});
