import test, { mock } from "node:test";
import nodemailer, { type SendMailOptions } from "nodemailer";
import assert from "node:assert/strict";
import { availability } from "../src/lib/booking/availability";
import { sendBookingEmail } from "../src/lib/email/booking";
import type { BookingOrder, Job } from "../src/lib/booking/types";

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://booking-offline.invalid";
process.env.SUPABASE_SECRET_KEY = "synthetic-secret";
process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";
process.env.SMTP_HOST = "smtp.example.invalid";
process.env.SMTP_USER = "owner@example.invalid";
process.env.SMTP_PASS = "synthetic-password";
process.env.BOOKING_OWNER_EMAIL = "owner@example.invalid";

test("unconnected Google still offers 30-day availability while website reservations block overlaps", async () => {
  const original = globalThis.fetch;
  const start = new Date(); start.setUTCDate(start.getUTCDate() + 10); start.setUTCHours(10, 0, 0, 0);
  const end = new Date(start.getTime() + 45 * 60000);
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.includes('/services')) return Response.json({ id: 'service', format: 'voice_call', duration_minutes: 30 });
    if (url.includes('/availability_settings')) return Response.json({ timezone: 'UTC', min_notice_minutes: 15, advance_window_days: 30, buffer_minutes: 15, slot_step_minutes: 15, booking_enabled: true });
    if (url.includes('/availability_windows')) return Response.json(Array.from({ length: 7 }, (_, weekday) => ({ weekday, start_local: '09:00', end_local: '12:00', enabled: true })));
    if (url.includes('/availability_overrides')) return Response.json([]);
    if (url.includes('/google_calendar_connections')) return Response.json(null);
    if (url.includes('/booking_reservations')) return Response.json([{ starts_at: start.toISOString(), blocked_until: end.toISOString() }]);
    throw new Error(`Unexpected synthetic request: ${url}`);
  };
  try {
    const result = await availability('service');
    assert.ok(result.slots.some((slot) => Date.parse(slot.start) > Date.now() + 3 * 86400000));
    assert.ok(!result.slots.some((slot) => Date.parse(slot.start) < end.getTime() && Date.parse(slot.end) + 15 * 60000 > start.getTime()));
  } finally { globalThis.fetch = original; }
});

test("Google sync errors send personal-contact instructions to customer and owner", async () => {
  const original = globalThis.fetch;
  let frozen: unknown; const sent: SendMailOptions[] = [];
  const transport = nodemailer.createTransport({ host: "smtp.example.invalid" });
  const create = mock.method(nodemailer, "createTransport", () => transport);
  const send = mock.method(transport, "sendMail", async (message: SendMailOptions) => {
    sent.push(message);
    return { messageId: "synthetic-id", accepted: [message.to], rejected: [] };
  });
  globalThis.fetch = async (input, options) => {
    const url = String(input), method = options?.method || 'GET';
    if (url.includes('/reading_details')) return Response.json({ meet_url: null, calendar_sync_status: 'error', calendar_synced_version: null });
    if (url.includes('/booking_jobs') && method === 'PATCH') { const data = JSON.parse(String(options?.body)); if (data.email_payload) frozen = data.email_payload; return data.email_started_at ? Response.json({ id: 'job' }) : new Response(null, { status: 204 }); }
    if (url.includes('/booking_jobs')) return Response.json({ email_payload: frozen });
    throw new Error(`Unexpected synthetic request: ${url}`);
  };
  const order = { id: '11111111-1111-4111-8111-111111111111', format: 'voice_call', status: 'confirmed', booking_version: 1, service_title: 'Call', scheduled_at: '2026-11-20T10:00:00Z', customer_timezone: 'UTC', customer_email_snapshot: 'customer@example.invalid', payment_status: 'paid' } as BookingOrder;
  try {
    for (const kind of ['customer', 'owner']) await sendBookingEmail(order, { id: kind, kind } as Job);
    assert.match(String(sent[0].html), /contact you personally/);
    assert.match(String(sent[1].html), /Google Calendar is disconnected, unavailable, or reports a conflict/);
    assert.match(String(sent[1].html), /Contact this customer promptly/);
  } finally { globalThis.fetch = original; send.mock.restore(); create.mock.restore(); }
});

test("calendar worker queues one owner warning for a rescheduled call when Google is disconnected", async () => {
  const { runWorker } = await import('../src/lib/booking/worker');
  const original = globalThis.fetch;
  const order = { id: '22222222-2222-4222-8222-222222222222', format: 'voice_call', status: 'confirmed', booking_version: 2, scheduled_at: '2026-11-20T10:00:00Z', scheduled_end_at: '2026-11-20T10:30:00Z' };
  const job = { id: '33333333-3333-4333-8333-333333333333', order_id: order.id, kind: 'calendar', version: 2, attempts: 1, lease_token: 'synthetic-lease' };
  const warnings = new Set<string>();
  globalThis.fetch = async (input, options) => {
    const url = String(input), method = options?.method || 'GET';
    if (url.includes('/rpc/booking_queue_reconciliation')) return Response.json(null);
    if (url.includes('/rpc/booking_claim_jobs')) return Response.json([job]);
    if (url.includes('/availability_settings')) return new Response(null, { status: 204 });
    if (url.includes('/orders')) return Response.json(url.includes('pending_payment') ? [] : order);
    if (url.includes('/reading_details')) return method === 'GET' ? Response.json({ google_calendar_event_id: null }) : new Response(null, { status: 204 });
    if (url.includes('/google_calendar_connections')) return method === 'GET' ? Response.json(null) : new Response(null, { status: 204 });
    if (url.includes('/booking_jobs')) {
      if (method === 'POST') warnings.add(JSON.parse(String(options?.body)).dedupe_key);
      return new Response(null, { status: 204 });
    }
    throw new Error(`Unexpected synthetic request: ${url}`);
  };
  try {
    await runWorker(); await runWorker();
    assert.deepEqual([...warnings], [`${order.id}:owner:2`]);
  } finally { globalThis.fetch = original; }
});
