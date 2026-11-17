import test from "node:test";
import assert from "node:assert/strict";
import nodemailer, { type SendMailOptions } from "nodemailer";
import type Stripe from "stripe";
import { sendBookingEmail } from "../src/lib/email/booking";
import { settleSession } from "../src/lib/payments/stripe";
import type { BookingOrder, Job } from "../src/lib/booking/types";
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://notifications.invalid";
process.env.SUPABASE_SECRET_KEY = "synthetic-secret";
process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";
process.env.SMTP_HOST = "smtp.example.invalid";
process.env.SMTP_USER = "owner@example.invalid";
process.env.SMTP_PASS = "synthetic-password";
process.env.SMTP_FROM = "TheAstroKaur <owner@example.invalid>";
delete process.env.BOOKING_OWNER_EMAIL;
delete process.env.CONTACT_EMAIL;
const base = { id: "11111111-1111-4111-8111-111111111111", service_title: "Test reading", status: "confirmed", payment_status: "paid", customer_email_snapshot: "customer@example.invalid", payment_verified_at: "2026-11-17T12:00:00Z", price_cents_snapshot: 2000, currency_snapshot: "eur", stripe_payment_intent_id: "pi_synthetic", stripe_receipt_url: "https://pay.stripe.com/receipts/test_receipt", customer_timezone: "Europe/Berlin", scheduled_at: "2026-11-18T18:00:00Z" } as BookingOrder;

test("booking/payment confirmations contain receipts, and changes notify each recipient separately", async t => {
  const sent: SendMailOptions[] = [];
  const transport = nodemailer.createTransport({ host: "smtp.example.invalid" });
  t.mock.method(nodemailer, "createTransport", () => transport);
  t.mock.method(transport, "sendMail", async (message: SendMailOptions) => { sent.push(message); return { messageId: 'synthetic', accepted: [message.to], rejected: [] }; });
  let frozen: unknown;
  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request, options?: RequestInit) => {
    const url = String(input);
    if (url.includes('/reading_details')) return Response.json({ calendar_sync_status: 'error', meet_url: null });
    if (url.includes('/booking_jobs')) {
      if (options?.method === 'PATCH') {
        const data = JSON.parse(String(options.body));
        if (data.email_payload) frozen = data.email_payload;
        return data.email_started_at ? Response.json({ id: 'job' }) : new Response(null, { status: 204 });
      }
      return Response.json({ email_payload: frozen });
    }
    throw new Error('Unexpected synthetic request');
  });
  for (const kind of ['customer', 'owner', 'payment_received', 'rescheduled', 'rescheduled_owner', 'cancelled', 'cancelled_owner']) {
    frozen = undefined;
    const owner = kind === 'owner' || kind.endsWith('_owner');
    const order = { ...base, format: ['customer', 'owner'].includes(kind) ? 'text' : 'voice_call', status: kind === 'payment_received' ? 'awaiting_schedule' : kind.startsWith('cancelled') ? 'cancelled' : 'confirmed' } as BookingOrder;
    await sendBookingEmail(order, { id: 'job', kind, lease_token: 'lease' } as Job);
    const email = sent.at(-1)!;
    assert.equal(email.to, owner ? process.env.SMTP_USER : base.customer_email_snapshot);
    if (['customer', 'owner', 'payment_received'].includes(kind)) {
      assert.match(String(email.html), /View Stripe payment receipt/);
      assert.match(String(email.html), /20.00/);
      assert.match(String(email.html), /pi_synthetic/);
    }
    if (kind.startsWith('cancelled')) assert.match(String(email.html), /did not issue a refund/);
    if (kind.startsWith('rescheduled')) { assert.match(String(email.subject), /rescheduled/); assert.match(String(email.html), /19:00/); }
    if (kind === 'payment_received') assert.match(String(email.html), /Choose an available appointment/);
    if (owner) { assert.match(String(email.html), /\/admin\/readings\//); assert.match(String(email.html), /customer@example.invalid/); }
    else assert.doesNotMatch(String(email.html), /\/admin\/readings\//);
  }
  assert.equal(sent.length, 7);
});

test("verified Stripe receipt is persisted before settlement enqueues confirmation emails", async t => {
  const mutations: { name: string; body: Record<string, unknown> }[] = [];
  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request, options?: RequestInit) => {
    const name = new URL(String(input)).pathname.split('/').at(-1)!;
    const body = JSON.parse(String(options?.body || '{}'));
    mutations.push({ name, body });
    if (name === 'orders') return new Response(null, { status: 204 });
    if (name === 'booking_settle') return Response.json('paid');
    throw new Error('Unexpected synthetic request');
  });
  const provider = { paymentIntents: { retrieve: async () => ({ status: 'succeeded', amount_received: 2000, currency: 'eur', latest_charge: { created: 1794916800, receipt_url: base.stripe_receipt_url } }) } } as unknown as Pick<Stripe, 'paymentIntents'>;
  const session = { id: 'cs_synthetic', metadata: { order_id: base.id }, client_reference_id: base.id, mode: 'payment', payment_status: 'paid', amount_total: 2000, currency: 'eur', payment_intent: 'pi_synthetic', livemode: false } as unknown as Stripe.Checkout.Session;
  assert.equal(await settleSession(session, 'evt_synthetic', provider), 'paid');
  assert.deepEqual(mutations.map(item => item.name), ['orders', 'booking_settle']);
  assert.equal(mutations[0].body.stripe_receipt_url, base.stripe_receipt_url);
});
