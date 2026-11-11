import test, { mock } from "node:test";
import assert from "node:assert/strict";
import nodemailer, { type SendMailOptions, type SMTPTransportOptions } from "nodemailer";
import { EmailDeliveryUncertain, sendEmail, smtpTransport } from "../src/lib/email/smtp";
import { NextRequest } from "next/server";

process.env.SMTP_HOST = "smtp.example.invalid";
process.env.SMTP_PORT = "465";
process.env.SMTP_USER = "owner@example.invalid";
process.env.SMTP_PASS = "synthetic-password";
process.env.SMTP_FROM = "TheAstroKaur <owner@example.invalid>";
process.env.CONTACT_EMAIL = "contact@example.invalid";
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://smtp-test.invalid";
process.env.SUPABASE_SECRET_KEY = "synthetic-secret";

test("SMTP requires valid configuration, encrypted transport and recipient acceptance", async () => {
  const transport = nodemailer.createTransport({ host: "smtp.example.invalid" });
  let options: SMTPTransportOptions | undefined;
  const create = mock.method(nodemailer, "createTransport", (config: SMTPTransportOptions) => { options = config; return transport; });
  try {
    smtpTransport();
    assert.equal(options?.secure, true);
    assert.equal(options?.disableFileAccess, true);
    assert.equal(options?.disableUrlAccess, true);
    process.env.SMTP_PORT = "587";
    smtpTransport();
    assert.equal(options?.secure, false);
    assert.equal(options?.requireTLS, true);
    process.env.SMTP_PORT = "invalid";
    assert.throws(() => smtpTransport(), /configuration/);
    process.env.SMTP_PORT = "465";
    for (const result of [
      { messageId: "id", accepted: [], rejected: ["customer@example.invalid"] },
      { messageId: "", accepted: ["customer@example.invalid"], rejected: [] },
    ]) {
      const send = mock.method(transport, "sendMail", async () => result);
      await assert.rejects(sendEmail({ to: "customer@example.invalid", subject: "Test", text: "Test" }), result.messageId ? /SMTP rejected/ : EmailDeliveryUncertain);
      send.mock.restore();
    }
  } finally { create.mock.restore(); }
});

test("contact mail uses SMTP and preserves the enquiry when sending fails", async () => {
  const { POST } = await import("../src/app/api/contact/route");
  const original = globalThis.fetch;
  const transport = nodemailer.createTransport({ host: "smtp.example.invalid" });
  const create = mock.method(nodemailer, "createTransport", () => transport);
  try {
    for (const scenario of ["sent", "saved-only", "failed"]) {
      let inserts = 0;
      globalThis.fetch = async (input) => {
        assert.match(String(input), /\/rest\/v1\/contact_messages/);
        inserts++;
        return scenario === "failed" ? Response.json({ message: "Storage unavailable" }, { status: 503 }) : new Response(null, { status: 201 });
      };
      const send = mock.method(transport, "sendMail", async (message: SendMailOptions) => {
        assert.equal(message.to, process.env.CONTACT_EMAIL);
        assert.equal(message.replyTo, "visitor@example.invalid");
        assert.equal(message.from, process.env.SMTP_FROM);
        assert.match(String(message.html), /&lt;script&gt;/);
        if (scenario !== "sent") throw Object.assign(new Error("Authentication failed"), { code: "EAUTH", responseCode: 535 });
        return { messageId: "contact-id", accepted: [message.to], rejected: [] };
      });
      const request = new NextRequest("http://localhost/api/contact", {
        method: "POST", headers: { "Content-Type": "application/json", "x-forwarded-for": scenario },
        body: JSON.stringify({ name: "Test Visitor", email: "visitor@example.invalid", subject: "General Question", message: "Hello <script>test</script>" }),
      });
      const response = await POST(request);
      assert.equal(response.status, scenario === "failed" ? 502 : 200);
      const body = await response.json();
      if (scenario === "sent") assert.equal(body.id, "contact-id");
      if (scenario === "saved-only") assert.match(body.message, /saved/);
      assert.equal(inserts, 1);
      send.mock.restore();
    }
  } finally { globalThis.fetch = original; create.mock.restore(); }
});
