import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { parseEnv } from "node:util";

const envFile = new URL("../.env.local", import.meta.url);
let content;
try {
  content = readFileSync(envFile, "utf8");
} catch {
  console.error("Create .env.local with your Stripe test key first.");
  process.exit(1);
}

const env = { ...parseEnv(content), ...process.env };
if (!/^(sk|rk)_test_/.test(env.STRIPE_SECRET_KEY || "")) {
  console.error("A Stripe test key is required in .env.local.");
  process.exit(1);
}
const site = new URL(env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000");
if (site.protocol !== "http:" || site.hostname !== "localhost") {
  console.error("The local booking worker requires an http://localhost site URL.");
  process.exit(1);
}
const workerSecret = env.BOOKING_WORKER_SECRET || randomBytes(32).toString("base64url");
if (workerSecret.length < 32) {
  console.error("BOOKING_WORKER_SECRET must contain at least 32 characters.");
  process.exit(1);
}

function saveSetting(name, value) {
  const line = `${name}=${JSON.stringify(value)}`;
  const pattern = new RegExp(`^${name}=.*$`, "m");
  content = pattern.test(content)
    ? content.replace(pattern, line)
    : `${content.trimEnd()}\n${line}\n`;
  writeFileSync(envFile, content, { mode: 0o600 });
}

if (!env.BOOKING_WORKER_SECRET) saveSetting("BOOKING_WORKER_SECRET", workerSecret);

const stripe = spawn("npx", [
  "--yes", "@stripe/cli", "listen",
  "--api-key", env.STRIPE_SECRET_KEY,
  "--events", "checkout.session.completed,checkout.session.async_payment_succeeded,checkout.session.async_payment_failed,checkout.session.expired,charge.refunded",
  "--forward-to", new URL("/api/stripe/webhook", site).href,
], { stdio: ["ignore", "pipe", "pipe"] });

let stripeOutput = "";
let ready = false;
let running = false;
let timer;

async function runWorker() {
  if (running) return;
  running = true;
  try {
    const response = await fetch(new URL("/api/internal/booking-worker", site), {
      method: "POST",
      headers: { Authorization: `Bearer ${workerSecret}` },
      signal: AbortSignal.timeout(55000),
    });
    if (!response.ok) console.error(`Booking worker returned HTTP ${response.status}. Retrying.`);
  } catch {
    console.error("Cannot reach the local booking worker. Start the development server; retrying.");
  } finally {
    running = false;
  }
}

function onStripeOutput(chunk) {
  if (ready) return;
  stripeOutput = (stripeOutput + chunk.toString()).slice(-10000);
  const secret = stripeOutput.match(/whsec_[A-Za-z0-9]+/)?.[0];
  if (!secret) return;
  ready = true;
  saveSetting("STRIPE_WEBHOOK_SECRET", secret);
  console.log("Stripe test webhook connected. Starting the local booking worker.");
  void runWorker();
  timer = setInterval(() => void runWorker(), 30000);
}
stripe.stdout.on("data", onStripeOutput);
stripe.stderr.on("data", onStripeOutput);
stripe.on("error", () => {
  console.error("Could not start the Stripe CLI.");
  process.exitCode = 1;
});
stripe.on("exit", (code) => {
  if (timer) clearInterval(timer);
  if (code) console.error(`Stripe test listener stopped with exit code ${code}.`);
  process.exitCode = code || 0;
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => stripe.kill(signal));
}
