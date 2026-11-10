import test from "node:test";
import assert from "node:assert/strict";
import Stripe from "stripe";
import { NextRequest } from "next/server";
import { POST } from "../src/app/api/stripe/webhook/route";
import { stripe } from "../src/lib/payments/stripe";

const secret = "whsec_synthetic_test_only";
process.env.STRIPE_SECRET_KEY = "sk_test_synthetic_test_only";
process.env.STRIPE_WEBHOOK_SECRET = secret;
const provider = new Stripe(process.env.STRIPE_SECRET_KEY);
function request(payload: string, signature?: string) {
  return new NextRequest("http://localhost/api/stripe/webhook", {
    method: "POST",
    body: payload,
    headers: signature ? { "stripe-signature": signature } : {},
  });
}
test("live keys cannot initialize the payment integration", () => {
  const previous = process.env.STRIPE_SECRET_KEY;
  process.env.STRIPE_SECRET_KEY = "sk_live_synthetic";
  assert.throws(() => stripe(), /Test payments are not configured/);
  process.env.STRIPE_SECRET_KEY = previous;
});
test("Stripe webhook rejects missing, tampered and stale signatures", async () => {
  const payload = JSON.stringify({
    id: "evt_synthetic",
    type: "account.updated",
    livemode: false,
    data: { object: {} },
  });
  const signature = provider.webhooks.generateTestHeaderString({
    payload,
    secret,
  });
  assert.equal((await POST(request(payload))).status, 400);
  assert.equal((await POST(request(payload + " ", signature))).status, 400);
  const stale = provider.webhooks.generateTestHeaderString({
    payload,
    secret,
    timestamp: 1,
  });
  assert.equal((await POST(request(payload, stale))).status, 400);
});
test("valid test signatures are accepted without treating irrelevant events as payment", async () => {
  const payload = JSON.stringify({
    id: "evt_synthetic",
    type: "account.updated",
    livemode: false,
    data: { object: {} },
  });
  const signature = provider.webhooks.generateTestHeaderString({
    payload,
    secret,
  });
  const response = await POST(request(payload, signature));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { received: true });
});
test("a correctly signed live event is still refused", async () => {
  const payload = JSON.stringify({
    id: "evt_synthetic",
    type: "checkout.session.completed",
    livemode: true,
    data: { object: {} },
  });
  const signature = provider.webhooks.generateTestHeaderString({
    payload,
    secret,
  });
  assert.equal((await POST(request(payload, signature))).status, 400);
});
