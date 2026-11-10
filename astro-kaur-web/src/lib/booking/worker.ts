import "server-only";
import { check, database, loadOrder } from "./server";
import type { BookingOrder, Job } from "./types";
import { reconcileCheckout } from "@/lib/payments/stripe";
import { syncEvent } from "@/lib/google/calendar";
import { sendBookingEmail } from "@/lib/email/booking";

export async function runWorker() {
  const db = database(),
    began = Date.now();
  check(
    await db
      .from("availability_settings")
      .update({ worker_last_seen_at: new Date().toISOString() })
      .eq("id", true),
  );
  check(await db.rpc("booking_queue_reconciliation"));
  const pending = check(
    await db
      .from("orders")
      .select("*")
      .eq("status", "pending_payment")
      .lte("hold_expires_at", new Date().toISOString())
      .order("hold_expires_at")
      .limit(10),
  ) as BookingOrder[];
  let reconciled = 0,
    processed = 0;
  for (const order of pending.slice(0, 2)) {
    if (Date.now() - began > 15000) break;
    try {
      await reconcileCheckout(order);
      reconciled++;
    } catch {
      /* Retain the lock on unknown provider state. Next scheduled invocation retries. */
    }
  }
  const jobs = check(await db.rpc("booking_claim_jobs")) as Job[];
  for (const job of jobs) {
    if (Date.now() - began > 35000) break; // Unstarted leases are recoverable after three minutes.
    try {
      const order = await loadOrder(job.order_id);
      const stale = job.version !== order.booking_version;
      const skip =
        (stale && !["owner", "request"].includes(job.kind)) ||
        (job.kind === "reminder" &&
          (order.status !== "confirmed" ||
            Date.parse(order.scheduled_at || "") <= Date.now())) ||
        (["customer", "rescheduled"].includes(job.kind) &&
          order.status !== "confirmed");
      if (skip) {
        check(
          await db
            .from("booking_jobs")
            .update({ status: "skipped", lease_until: null })
            .eq("id", job.id)
            .eq("lease_token", job.lease_token),
        );
        continue;
      }
      if (
        job.kind !== "calendar" &&
        job.attempts > 1 &&
        job.email_started_at &&
        Date.now() - Date.parse(job.email_started_at) > 23 * 3600000
      )
        throw new Error(
          "Email retry window exceeded; owner review required to avoid duplicates.",
        );
      let providerId: string | null = null;
      if (job.kind === "calendar") {
        if (order.format === "voice_call") await syncEvent(order);
      } else providerId = await sendBookingEmail(order, job);
      check(
        await db
          .from("booking_jobs")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
            provider_id: providerId,
            lease_until: null,
            last_error: null,
          })
          .eq("id", job.id)
          .eq("lease_token", job.lease_token),
      );
      processed++;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Provider operation failed.";
      const exhausted =
        job.attempts >= 20 ||
        (job.kind !== "calendar" &&
          job.attempts > 1 &&
          !!job.email_started_at &&
          Date.now() - Date.parse(job.email_started_at) > 23 * 3600000);
      check(
        await db
          .from("booking_jobs")
          .update({
            status: exhausted ? "failed" : "pending",
            last_error: message,
            lease_until: null,
            run_at: new Date(
              Date.now() +
                Math.min(1800, 30 * 2 ** Math.min(job.attempts, 6)) * 1000,
            ).toISOString(),
          })
          .eq("id", job.id)
          .eq("lease_token", job.lease_token),
      );
      if (job.kind === "calendar") {
        await db
          .from("reading_details")
          .update({ calendar_sync_status: "error" })
          .eq("order_id", job.order_id);
        await db
          .from("google_calendar_connections")
          .update({ last_error: message, status: "error" })
          .eq("id", true);
      }
    }
  }
  return { reconciled, processed };
}
