import "server-only";
import { BookingError, check, database, siteUrl } from "@/lib/booking/server";
import type { BookingOrder, Job } from "@/lib/booking/types";
import { EmailDeliveryUncertain, sendEmail } from "./smtp";

const escape = (v: string) =>
  v.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export async function sendBookingEmail(order: BookingOrder, job: Job) {
  const db = database();
  const details = check(
    await db
      .from("reading_details")
      .select("meet_url,calendar_sync_status,calendar_synced_version")
      .eq("order_id", order.id)
      .single(),
  );
  if (!details) throw new Error("Reading snapshot is missing.");
  const isOwner = ["owner", "request", "schedule_owner"].includes(job.kind);
  if (
    order.format === "voice_call" &&
    ["customer", "owner", "rescheduled", "reminder"].includes(job.kind) &&
    order.status === "confirmed" &&
    details.calendar_sync_status !== "error" &&
    (!details.meet_url ||
      details.calendar_sync_status !== "synced" ||
      details.calendar_synced_version !== order.booking_version)
  )
    throw new BookingError("Waiting for the Google Meet link.", 503);
  const owner = process.env.BOOKING_OWNER_EMAIL || process.env.CONTACT_EMAIL || process.env.SMTP_USER;
  const recipient = isOwner ? owner : order.customer_email_snapshot;
  if (!recipient) throw new Error("Booking email recipient is missing.");
  const subjects: Record<string, string> = {
    customer:
      order.format === "text"
        ? "Your written reading order is confirmed"
        : "Your consultation is confirmed",
    owner: "New TheAstroKaur order",
    reminder: "Your consultation reminder",
    cancelled: "Your booking has been cancelled",
    rescheduled: "Your consultation has been rescheduled",
    request: "A customer withdrawal/refund request needs review",
    schedule_owner: "A paid voice reading needs scheduling",
    availability_customer: "Times are available for your voice reading",
  };
  const subject = subjects[job.kind] || "Your TheAstroKaur order";
  const parts = [
    `<h1 style="font-family:Georgia,serif;font-weight:normal">${escape(subject)}</h1>`,
    `<p>${escape(order.service_title)}</p>`,
    `<p>Order reference: ${escape(order.id.slice(0, 8).toUpperCase())}</p>`,
  ];
  if (order.format === "text" && job.kind === "customer")
    parts.push(
      "<p>Your payment has been received. The owner will personally contact you by email to discuss when to expect your reading, then email the completed reading to you.</p>",
    );
  if (job.kind === "schedule_owner")
    parts.push("<p>Please contact the customer to arrange a call if no suitable time is available.</p>");
  if (job.kind === "availability_customer")
    parts.push("<p>Available times have been added. Open your booking to choose one.</p>");
  if (
    order.format === "voice_call" &&
    order.scheduled_at &&
    job.kind !== "cancelled"
  ) {
    const time = new Intl.DateTimeFormat("en-GB", {
      timeZone: order.customer_timezone,
      dateStyle: "full",
      timeStyle: "short",
    }).format(new Date(order.scheduled_at));
    parts.push(`<p>${escape(time)} (${escape(order.customer_timezone)})</p>`);
    if (details.meet_url && details.calendar_sync_status === "synced" && details.calendar_synced_version === order.booking_version)
      parts.push(
        `<p><a href="${escape(details.meet_url)}">Join your Google Meet consultation</a></p>`,
      );
    else if (details.calendar_sync_status === "error")
      parts.push(isOwner
        ? "<p>Google Calendar is disconnected, unavailable, or reports a conflict. Contact this customer promptly to share the call details and check your calendar.</p>"
        : "<p>The owner will contact you personally to share the call details.</p>");
  }
  if (job.kind === "cancelled")
    parts.push(
      "<p>Your appointment has been cancelled. This action does not automatically issue a refund. You may contact support about applicable withdrawal/refund rights.</p>",
    );
  if (isOwner)
    parts.push(
      `<p>Customer contact: ${escape(order.customer_email_snapshot || '')}</p><p>Payment: ${escape(order.payment_status)}. Status: ${escape(order.status)}.</p><p><a href="${siteUrl()}/admin/readings/${order.id}">Open order in admin</a></p>`,
    );
  else
    parts.push(
      `<p><a href="${siteUrl()}/account/readings/${order.id}">View your order and booking details</a></p>`,
    );
  const payload = {
    to: [recipient],
    ...(process.env.BOOKING_REPLY_TO
      ? { reply_to: process.env.BOOKING_REPLY_TO }
      : {}),
    subject,
    html: `<div style="background:#FAF8F5;color:#0F172A;padding:32px;max-width:600px;font-family:Arial,sans-serif;border-top:4px solid #E5B842">${parts.join("")}<p>With warmth,<br>TheAstroKaur</p></div>`,
  };
  // Keep the original contents and recipient across retries.
  check(
    await db
      .from("booking_jobs")
      .update({
        email_payload: payload,
      })
      .eq("id", job.id)
      .is("email_payload", null),
  );
  const frozen = check(
    await db
      .from("booking_jobs")
      .select("email_payload")
      .eq("id", job.id)
      .single(),
  );
  if (!frozen?.email_payload) throw new Error("Email job is missing.");
  // ponytail: SMTP has no idempotency; uncertain sends require manual review instead of automatic retries.
  const claimed = check(await db.from("booking_jobs")
    .update({ email_started_at: new Date().toISOString() })
    .eq("id", job.id).eq("lease_token", job.lease_token)
    .is("email_started_at", null).select("id").maybeSingle());
  if (!claimed)
    throw new EmailDeliveryUncertain("An earlier SMTP attempt needs review in the sender's Sent folder before retrying.");
  try {
    return await sendEmail({
      to: frozen.email_payload.to[0],
      subject: frozen.email_payload.subject,
      html: frozen.email_payload.html,
      replyTo: frozen.email_payload.reply_to,
      messageId: `<booking-${job.id}@${process.env.SMTP_USER!.split("@")[1]}>`,
    });
  } catch (error) {
    if (!(error instanceof EmailDeliveryUncertain))
      check(await db.from("booking_jobs").update({ email_started_at: null })
        .eq("id", job.id).eq("lease_token", job.lease_token));
    throw error;
  }
}
