import "server-only";
import { check, database, loadOrder } from "./server";
import type { BookingOrder, Job } from "./types";
import { reconcileCheckout } from "@/lib/payments/stripe";
import { freeBusy, syncEvent } from "@/lib/google/calendar";
import { sendBookingEmail } from "@/lib/email/booking";
import { EmailDeliveryUncertain } from "@/lib/email/smtp";
import { availability } from "@/lib/booking/availability";

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
        (stale && !["owner", "request", "schedule_owner"].includes(job.kind)) ||
        (job.kind === "schedule_owner" && order.status !== "awaiting_schedule") ||
        (job.kind === "availability_customer" && (order.status !== "awaiting_schedule" || !!order.availability_notified_at)) ||
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
      if (job.kind === "availability_customer" && order.service_id) {
        const available = await availability(order.service_id, order.id);
        if (available.slots.length === 0) {
          check(await db.from("booking_jobs").update({ status: "skipped", lease_until: null }).eq("id", job.id).eq("lease_token", job.lease_token));
          continue;
        }
      }
      let providerId: string | null = null;
      if (job.kind === "calendar") {
        if (order.format === "voice_call") {
          if (order.status === "confirmed" && order.scheduled_at && order.scheduled_end_at) {
            const details = check(await db.from("reading_details").select("google_calendar_event_id").eq("order_id", order.id).maybeSingle());
            const conflicts = await freeBusy(order.scheduled_at, order.scheduled_end_at, details?.google_calendar_event_id);
            if (conflicts.length) throw new Error("Google Calendar reports a conflict for this call.");
          }
          await syncEvent(order);
        }
      } else providerId = await sendBookingEmail(order, job);
      if (job.kind === "availability_customer") {
        check(await db.from("orders").update({ availability_notified_at: new Date().toISOString() }).eq("id", order.id).eq("status", "awaiting_schedule"));
      }
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
        job.attempts >= 20 || error instanceof EmailDeliveryUncertain;
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
        const current = await loadOrder(job.order_id);
        if (current.booking_version === job.version && current.status === "confirmed") {
          check(await db.from("reading_details").update({ calendar_sync_status: "error" }).eq("order_id", job.order_id));
          // The existing owner job shares this key, so retries cannot send duplicate warnings.
          check(await db.from("booking_jobs").upsert({
            order_id: job.order_id,
            kind: "owner",
            version: job.version,
            dedupe_key: `${job.order_id}:owner:${job.version}`,
          }, { onConflict: "dedupe_key", ignoreDuplicates: true }));
        }
        await db
          .from("google_calendar_connections")
          .update({ last_error: message, status: "error" })
          .eq("id", true);
      }
    }
  }
  return { reconciled, processed };
}
