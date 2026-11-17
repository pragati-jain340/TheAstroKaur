import "server-only";
import { check, database, loadOrder } from "./server";
import type { BookingOrder, Job } from "./types";
import { reconcilePendingRefunds } from "@/lib/payments/refunds";
import { reconcileCheckout } from "@/lib/payments/stripe";
import { freeBusy, syncEvent } from "@/lib/google/calendar";
import { sendBookingEmail } from "@/lib/email/booking";
import { EmailDeliveryUncertain } from "@/lib/email/smtp";
import { availability } from "@/lib/booking/availability";

export async function runWorker() {
  const db = database(),
    began = Date.now();
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
  try { await reconcilePendingRefunds(); } catch { console.error("Refund reconciliation is unavailable; pending refunds remain queued."); }
  const jobs = check(await db.rpc("booking_claim_jobs")) as Job[];
  for (const job of jobs) {
    if (Date.now() - began > 35000) break; // Unstarted leases are recoverable after three minutes.
    try {
      const order = await loadOrder(job.order_id);
      if (["refund", "refund_owner"].includes(job.kind) && job.refund_id) {
        const refund = check(await db.from("booking_refunds").select("status").eq("id", job.refund_id).single());
        if (!refund) throw new Error("Refund notification record is missing.");
        if (refund.status !== job.refund_status) {
          check(await db.from("booking_jobs").update({ status: "skipped", lease_until: null }).eq("id", job.id).eq("lease_token", job.lease_token));
          continue;
        }
      }
      const stale = job.version !== order.booking_version;
      const skip =
        (job.kind === "calendar" && order.status === "confirmed" && Date.parse(order.scheduled_end_at || order.scheduled_at || "") <= Date.now()) ||
        (stale && !["owner", "request", "schedule_owner", "refund", "refund_owner", "payment_received"].includes(job.kind)) ||
        (job.kind === "schedule_owner" && order.status !== "awaiting_schedule") ||
        (job.kind === "availability_customer" && (order.status !== "awaiting_schedule" || !!order.availability_notified_at)) ||
        (job.kind === "reminder" &&
          (order.status !== "confirmed" ||
            Date.parse(order.scheduled_at || "") <= Date.now())) ||
        (["customer", "rescheduled", "rescheduled_owner"].includes(job.kind) &&
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
          if (order.status === "confirmed") {
            const recovered = check(await db.from("reading_details").select("meet_url,calendar_synced_version")
              .eq("order_id", order.id).single());
            if (recovered?.meet_url && recovered.calendar_synced_version === order.booking_version) {
              const notifications = check(await db.from("booking_jobs").select("kind,email_payload")
                .eq("order_id", order.id).eq("version", order.booking_version).eq("status", "sent")
                .in("kind", ["customer", "owner"]));
              for (const kind of ["customer", "owner"]) {
                const sent = notifications?.filter(message => message.kind === kind) || [];
                if (sent.length && !sent.some(message => message.email_payload?.html?.includes(recovered.meet_url))) {
                  check(await db.from("booking_jobs").upsert({ order_id: order.id, kind, version: order.booking_version,
                    dedupe_key: `${order.id}:${kind}:meet-recovery-v${order.booking_version}`,
                  }, { onConflict: "dedupe_key", ignoreDuplicates: true }));
                }
              }
            }
          }
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
  // Advertise a healthy worker only after a full processing cycle succeeds.
  check(
    await db
      .from("availability_settings")
      .update({ worker_last_seen_at: new Date().toISOString() })
      .eq("id", true),
  );
  return { reconciled, processed };
}
