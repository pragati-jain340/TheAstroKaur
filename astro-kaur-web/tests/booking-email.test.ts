import test, { mock } from "node:test";
import assert from "node:assert/strict";
import nodemailer, { type SendMailOptions } from "nodemailer";
import { runWorker } from "../src/lib/booking/worker";
import type { BookingOrder, Job } from "../src/lib/booking/types";

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://booking-email.invalid";
process.env.SUPABASE_SECRET_KEY = "synthetic-secret";
process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";
process.env.SMTP_HOST = "smtp.example.invalid";
process.env.SMTP_USER = "owner@example.invalid";
process.env.SMTP_PASS = "synthetic-password";
process.env.SMTP_FROM = "TheAstroKaur <owner@example.invalid>";
delete process.env.CONTACT_EMAIL;
delete process.env.BOOKING_OWNER_EMAIL;

const order = {
  id: "11111111-1111-4111-8111-111111111111", format: "text",
  status: "confirmed", booking_version: 1, service_title: "Written reading",
  customer_email_snapshot: "customer@example.invalid", payment_status: "paid",
} as BookingOrder;
const job = {
  id: "22222222-2222-4222-8222-222222222222", order_id: order.id,
  kind: "customer", version: 1, attempts: 1, lease_token: "synthetic-lease",
} as Job;

test("SMTP jobs retry explicit rejections, stop uncertain sends, and preserve their original recipient", async () => {
  const original = globalThis.fetch;
  const transport = nodemailer.createTransport({ host: "smtp.example.invalid" });
  const create = mock.method(nodemailer, "createTransport", () => transport);
  try {
    for (const scenario of ["accepted", "owner", "rejected", "uncertain", "earlier-attempt", "lost-database-response"]) {
      const currentJob = { ...job, kind: scenario === "owner" ? "owner" : "customer" };
      const recipient = scenario === "owner" ? process.env.SMTP_USER : order.customer_email_snapshot;
      // Legacy queued messages must use the configured SMTP sender, not their saved sender.
      const frozen = { from: "obsolete@example.invalid", to: [recipient], subject: "Original subject", html: "Original body", reply_to: "support@example.invalid" };
      let started: string | null = scenario === "earlier-attempt" ? new Date().toISOString() : null;
      let outcome: Record<string, unknown> | undefined;
      let sends = 0;
      let loseResponse = scenario === "lost-database-response";
      const send = mock.method(transport, "sendMail", async (message: SendMailOptions) => {
        sends++;
        assert.equal(message.to, recipient);
        assert.equal(message.from, process.env.SMTP_FROM);
        assert.equal(message.subject, frozen.subject);
        assert.equal(message.html, frozen.html);
        assert.equal(message.replyTo, frozen.reply_to);
        assert.equal(message.messageId, `<booking-${job.id}@example.invalid>`);
        if (scenario === "rejected") throw Object.assign(new Error("Invalid login"), { code: "EAUTH", responseCode: 535 });
        if (scenario === "uncertain") throw Object.assign(new Error("Connection lost"), { code: "ECONNECTION" });
        return { messageId: "synthetic-email-id", accepted: [message.to], rejected: [] };
      });
      globalThis.fetch = async (input, options) => {
        const url = String(input), method = options?.method || "GET";
        if (url.includes("/availability_settings") || url.includes("/rpc/booking_queue_reconciliation")) return Response.json(null);
        if (url.includes("/rpc/booking_claim_jobs")) return Response.json([currentJob]);
        if (url.includes("/orders")) return Response.json(url.includes("pending_payment") ? [] : order);
        if (url.includes("/reading_details")) return Response.json({ calendar_sync_status: "not_required" });
        if (url.includes("/booking_jobs")) {
          if (method === "PATCH") {
            const data = JSON.parse(String(options?.body));
            if (data.email_payload) return new Response(null, { status: 204 });
            if ("email_started_at" in data) {
              if (data.email_started_at && started) return Response.json(null);
              started = data.email_started_at;
              return data.email_started_at ? Response.json({ id: job.id }) : new Response(null, { status: 204 });
            }
            if (data.status === "sent" && loseResponse) { loseResponse = false; throw new Error("Lost database response"); }
            outcome = data;
            return new Response(null, { status: 204 });
          }
          return Response.json({ email_payload: frozen });
        }
        throw new Error(`Unexpected synthetic request: ${url}`);
      };
      await runWorker();
      if (scenario === "lost-database-response") await runWorker();
      assert.equal(sends, scenario === "earlier-attempt" ? 0 : 1);
      assert.equal(outcome?.status, ["accepted", "owner"].includes(scenario) ? "sent" : scenario === "rejected" ? "pending" : "failed");
      if (["accepted", "owner"].includes(scenario)) assert.equal(outcome?.provider_id, "synthetic-email-id");
      if (scenario === "rejected") { assert.equal(started, null); assert.match(String(outcome?.last_error), /535/); }
      if (scenario === "uncertain" || scenario === "earlier-attempt") assert.match(String(outcome?.last_error), /review/i);
      send.mock.restore();
    }
  } finally { globalThis.fetch = original; create.mock.restore(); }
});
