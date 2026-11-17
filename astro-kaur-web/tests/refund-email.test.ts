import test from "node:test";
import assert from "node:assert/strict";
import nodemailer, { type SendMailOptions } from "nodemailer";
import { sendBookingEmail } from "../src/lib/email/booking";
import type { BookingOrder, Job } from "../src/lib/booking/types";

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://refund-email.invalid";
process.env.SUPABASE_SECRET_KEY = "synthetic-secret";
process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";
process.env.SMTP_HOST = "smtp.example.invalid";
process.env.SMTP_USER = "owner@example.invalid";
process.env.SMTP_PASS = "synthetic-password";
process.env.SMTP_FROM = "TheAstroKaur <owner@example.invalid>";
const order = { id: "11111111-1111-4111-8111-111111111111", format: "voice_call", service_title: "Test reading", status: "confirmed", payment_status: "paid", payment_verified_at: "2026-11-17T12:00:00Z", price_cents_snapshot: 2000, currency_snapshot: "eur", stripe_payment_intent_id: "pi_synthetic", stripe_receipt_url: "https://pay.stripe.com/receipts/test_receipt", customer_timezone: "Europe/Berlin", customer_email_snapshot: "customer@example.invalid" } as BookingOrder;

test("refund notification states the provider result and never says the booking was cancelled", async t => {
  const sent: SendMailOptions[] = [];
  const transport = nodemailer.createTransport({ host: "smtp.example.invalid" });
  t.mock.method(nodemailer, "createTransport", () => transport);
  t.mock.method(transport, "sendMail", async (message: SendMailOptions) => { sent.push(message); return { messageId: "synthetic-message", accepted: [message.to], rejected: [] }; });
  let frozen: unknown;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, options?: RequestInit) => {
    const url = String(input);
    if (url.includes('/reading_details')) return Response.json({ calendar_sync_status: 'pending', meet_url: null });
    if (url.includes('/booking_refunds')) return Response.json({ stripe_refund_id: 're_synthetic', amount_cents: 2000, currency: 'eur', status: 'succeeded' });
    if (url.includes('/booking_jobs')) {
      if (options?.method === 'PATCH') {
        const data = JSON.parse(String(options.body));
        if (data.email_payload) frozen = data.email_payload;
        return data.email_started_at ? Response.json({ id: 'job' }) : new Response(null, { status: 204 });
      }
      return Response.json({ email_payload: frozen });
    }
    throw new Error('Unexpected synthetic database request');
  });
  for (const [kind, recipient] of [["refund", order.customer_email_snapshot], ["refund_owner", process.env.SMTP_USER]]) {
  for (const status of ['pending', 'succeeded', 'failed']) {
    frozen = undefined;
    const job = { id: 'job', order_id: order.id, kind, refund_id: 'refund', refund_status: status, lease_token: 'lease' } as Job;
    await sendBookingEmail(order, job);
    const message = sent.at(-1)!;
    assert.equal(message.to, recipient);
    assert.match(String(message.html), /does not cancel your reading/);
    assert.match(String(message.html), /Current booking status: confirmed/);
    assert.match(String(message.html), /re_synthetic/);
    if (status === 'succeeded') assert.match(String(message.html), /View Stripe receipt and refund details/);
    else assert.doesNotMatch(String(message.html), /View Stripe receipt and refund details/);
    assert.match(String(message.html), status === 'pending' ? /not yet completed/ : status === 'succeeded' ? /refund succeeded/ : /refund failed/);
  }
  }
  assert.equal(sent.length, 6);
});
