import test, { mock } from "node:test";
import assert from "node:assert/strict";
import nodemailer from "nodemailer";
import { NextRequest } from "next/server";
import {
  generateOtp,
  hashOtp,
  createAndSendOtp,
  verifyOtp,
  renderOtpHtml,
  OTP_COOLDOWN_SECONDS,
} from "../src/lib/email/otp";

process.env.SMTP_HOST = "smtp.example.invalid";
process.env.SMTP_PORT = "465";
process.env.SMTP_USER = "owner@example.invalid";
process.env.SMTP_PASS = "synthetic-password";
process.env.SMTP_FROM = "TheAstroKaur <owner@example.invalid>";
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://otp-test.invalid";
process.env.SUPABASE_SECRET_KEY = "synthetic-database-secret-key-123";

test("generateOtp produces uniform 6-digit numeric strings", () => {
  for (let i = 0; i < 50; i++) {
    const code = generateOtp();
    assert.equal(code.length, 6);
    assert.match(code, /^\d{6}$/);
    const num = Number(code);
    assert.ok(num >= 100000 && num <= 999999);
  }
});

test("hashOtp is deterministic, case-insensitive, and salt-protected", () => {
  const hash1 = hashOtp("User@Example.Com", "123456");
  const hash2 = hashOtp("user@example.com ", "123456");
  const hashDiff = hashOtp("user@example.com", "123457");

  assert.equal(hash1, hash2);
  assert.equal(hash1.length, 64);
  assert.notEqual(hash1, hashDiff);
  assert.ok(!hash1.includes("123456"));
});

test("renderOtpHtml formats correct branding, code, and expiry", () => {
  const html = renderOtpHtml("654321", "signup");
  assert.match(html, /TheAstroKaur/);
  assert.match(html, /654321/);
  assert.match(html, /Verify Your Email/);
  assert.match(html, /10 minutes/);
});

test("createAndSendOtp delivers email and enforces 60-second cooldown", async () => {
  const transport = nodemailer.createTransport({ host: "smtp.example.invalid" });
  const create = mock.method(nodemailer, "createTransport", () => transport);
  const send = mock.method(transport, "sendMail", async () => ({
    messageId: "otp-msg-1",
    accepted: ["target@example.invalid"],
    rejected: [],
  }));

  const inMemoryRows: Array<{
    id: string;
    email: string;
    otp_hash: string;
    purpose: string;
    attempts: number;
    expires_at: string;
    created_at: string;
  }> = [];

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const urlStr = String(input);
    const method = init?.method || "GET";

    if (urlStr.includes("/rest/v1/email_otp_verifications")) {
      if (method === "GET") {
        if (urlStr.includes("gt.created_at")) {
          // Cooldown check
          const recent = inMemoryRows.find(
            (r) =>
              r.email === "target@example.invalid" &&
              Date.now() - new Date(r.created_at).getTime() < OTP_COOLDOWN_SECONDS * 1000
          );
          return Response.json(recent ? [recent] : []);
        }
        return Response.json(inMemoryRows);
      }
      if (method === "DELETE") {
        inMemoryRows.length = 0;
        return new Response(null, { status: 204 });
      }
      if (method === "POST") {
        const body = JSON.parse(String(init?.body || "{}"));
        const newRow = {
          ...body,
          id: "row-1",
          created_at: new Date().toISOString(),
        };
        inMemoryRows.push(newRow);
        return Response.json([newRow], { status: 201 });
      }
    }
    return new Response(null, { status: 200 });
  };

  try {
    // 1. Initial send succeeds
    const res1 = await createAndSendOtp("target@example.invalid", "signup");
    assert.equal(res1.success, true);
    assert.equal(send.mock.calls.length, 1);
    assert.equal(inMemoryRows.length, 1);

    // 2. Immediate second send is rejected by cooldown
    const res2 = await createAndSendOtp("target@example.invalid", "signup");
    assert.equal(res2.success, false);
    assert.match(res2.error || "", /60 seconds/);
    assert.equal(send.mock.calls.length, 1);
  } finally {
    globalThis.fetch = originalFetch;
    create.mock.restore();
    send.mock.restore();
  }
});

test("verifyOtp validates code, locks out after 5 attempts, and deletes on success", async () => {
  const testEmail = "verify@example.invalid";
  const correctOtp = "123456";
  const expectedHash = hashOtp(testEmail, correctOtp);

  let storedRow: {
    id: string;
    email: string;
    otp_hash: string;
    purpose: string;
    attempts: number;
    expires_at: string;
  } | null = {
    id: "active-row-1",
    email: testEmail,
    otp_hash: expectedHash,
    purpose: "signup",
    attempts: 0,
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  };

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const urlStr = String(input);
    const method = init?.method || "GET";

    if (urlStr.includes("/rest/v1/email_otp_verifications")) {
      if (method === "GET") {
        return Response.json(storedRow ? [storedRow] : []);
      }
      if (method === "PATCH") {
        const body = JSON.parse(String(init?.body || "{}"));
        if (storedRow) storedRow.attempts = body.attempts;
        return Response.json([storedRow]);
      }
      if (method === "DELETE") {
        storedRow = null;
        return new Response(null, { status: 204 });
      }
    }
    return new Response(null, { status: 200 });
  };

  try {
    // Bad OTP input format
    const badFormat = await verifyOtp(testEmail, "12", "signup");
    assert.equal(badFormat.valid, false);

    // Incorrect code: increments attempts
    const wrong1 = await verifyOtp(testEmail, "999999", "signup");
    assert.equal(wrong1.valid, false);
    assert.match(wrong1.error || "", /Incorrect verification code/);
    assert.equal(storedRow?.attempts, 1);

    // Try 4 more incorrect codes to reach limit
    await verifyOtp(testEmail, "999999", "signup");
    await verifyOtp(testEmail, "999999", "signup");
    await verifyOtp(testEmail, "999999", "signup");
    const lockout = await verifyOtp(testEmail, "999999", "signup");
    assert.equal(lockout.valid, false);
    assert.match(lockout.error || "", /Too many incorrect attempts/);
    assert.equal(storedRow, null); // Lockout deleted the record

    // Reset row for successful verification test
    storedRow = {
      id: "active-row-2",
      email: testEmail,
      otp_hash: expectedHash,
      purpose: "signup",
      attempts: 0,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    };

    const validResult = await verifyOtp(testEmail, correctOtp, "signup");
    assert.equal(validResult.valid, true);
    assert.equal(storedRow, null); // Deleted on success to prevent replay

    // Immediate reuse fails because record was deleted
    const replayResult = await verifyOtp(testEmail, correctOtp, "signup");
    assert.equal(replayResult.valid, false);
    assert.match(replayResult.error || "", /No active verification code found/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("POST /api/auth/otp/send validates input, checks existing account, and rejects cross-site requests", async () => {
  const { POST } = await import("../src/app/api/auth/otp/send/route");

  // Non-JSON request rejected
  const req1 = new NextRequest("http://localhost:3000/api/auth/otp/send", {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: "hello",
  });
  const res1 = await POST(req1);
  assert.equal(res1.status, 415);

  // Cross-site origin rejected
  const req2 = new NextRequest("http://localhost:3000/api/auth/otp/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://malicious-site.invalid",
    },
    body: JSON.stringify({ email: "user@example.invalid", purpose: "signup" }),
  });
  const res2 = await POST(req2);
  assert.equal(res2.status, 403);

  // Existing account check on signup
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const urlStr = String(input);
    if (urlStr.includes("/rest/v1/customer_profiles")) {
      return Response.json([{ id: "existing-profile-id" }]);
    }
    return new Response(null, { status: 200 });
  };

  try {
    const req3 = new NextRequest("http://localhost:3000/api/auth/otp/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://localhost:3000",
      },
      body: JSON.stringify({ email: "existing@example.invalid", purpose: "signup" }),
    });
    const res3 = await POST(req3);
    assert.equal(res3.status, 409);
    const json3 = await res3.json();
    assert.match(json3.error, /already exists/);

    // Non-existent account check on reset_password
    globalThis.fetch = async () => Response.json([]);
    const req4 = new NextRequest("http://localhost:3000/api/auth/otp/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://localhost:3000",
      },
      body: JSON.stringify({ email: "nonexistent@example.invalid", purpose: "reset_password" }),
    });
    const res4 = await POST(req4);
    assert.equal(res4.status, 404);
    const json4 = await res4.json();
    assert.match(json4.error, /No account found/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
