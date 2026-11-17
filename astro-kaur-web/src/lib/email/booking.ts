import "server-only";
import { BookingError, check, database, siteUrl } from "@/lib/booking/server";
import type { BookingOrder, Job } from "@/lib/booking/types";
import { EmailDeliveryUncertain, sendEmail, smtpConfiguration } from "./smtp";

const escape = (v: string) =>
  v.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export async function sendBookingEmail(order: BookingOrder, job: Job) {
  // Validate before freezing or claiming the message so configuration failures remain retryable.
  const { user: smtpUser } = smtpConfiguration();
  const db = database();
  const details = check(
    await db
      .from("reading_details")
      .select("meet_url,calendar_sync_status,calendar_synced_version,client_name,client_date_of_birth,client_time_of_birth,client_time_uncertain,client_place_of_birth,partner_name,partner_date_of_birth,partner_time_of_birth,partner_time_uncertain,partner_place_of_birth")
      .eq("order_id", order.id)
      .single(),
  );
  if (!details) throw new Error("Reading snapshot is missing.");
  const kind = ({ cancelled_owner: "cancelled", rescheduled_owner: "rescheduled", refund_owner: "refund" } as Record<string, string>)[job.kind] || job.kind;
  const isOwner = ["owner", "request", "schedule_owner", "cancelled_owner", "rescheduled_owner", "refund_owner"].includes(job.kind);
  if (
    order.format === "voice_call" &&
    ["customer", "owner", "rescheduled", "reminder"].includes(kind) &&
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
    refund: "Your reading payment refund update",
    refund_owner: "Refund update for a customer booking",
    cancelled_owner: "A customer booking has been cancelled",
    rescheduled_owner: "A customer booking has been rescheduled",
    payment_received: "Payment received for your reading",
  };
  const subject = subjects[job.kind] || "Your TheAstroKaur order";
  const parts = [
    `<h1 style="font-family:Georgia,serif;font-weight:normal">${escape(subject)}</h1>`,
    `<p>${escape(order.service_title)}</p>`,
    `<p>Order reference: ${escape(order.id.slice(0, 8).toUpperCase())}</p>`,
  ];
  if (isOwner) {
    if (order.notes?.trim()) {
      parts.push(`<h2 style="font-size:18px">Client's additional note</h2><p style="white-space:pre-wrap;overflow-wrap:anywhere">${escape(order.notes)}</p>`);
    }
    const row = (label: string, value: string | null | undefined) =>
      `<tr><th align="left" style="padding:6px 12px 6px 0;font-weight:normal;color:#555">${escape(label)}</th><td style="padding:6px 0">${escape(value || "Not provided")}</td></tr>`;
    const birthTime = (time: string | null, uncertain: boolean) =>
      uncertain ? `${time || "Not provided"} (exact time unknown)` : time;
    parts.push(`<h2 style="font-size:18px">Client details</h2><table role="presentation">${row("Name", details.client_name)}${row("Email", order.customer_email_snapshot)}${row("Reading format", order.format === "text" ? "Written reading" : "Voice call")}${row("Date of birth", details.client_date_of_birth)}${row("Time of birth", birthTime(details.client_time_of_birth, details.client_time_uncertain))}${row("Place of birth", details.client_place_of_birth)}${row("Customer timezone", order.customer_timezone)}</table>`);
    if (order.requires_partner || details.partner_name || details.partner_date_of_birth || details.partner_place_of_birth) {
      parts.push(`<h2 style="font-size:18px">Partner details</h2><table role="presentation">${row("Name", details.partner_name)}${row("Date of birth", details.partner_date_of_birth)}${row("Time of birth", birthTime(details.partner_time_of_birth, details.partner_time_uncertain))}${row("Place of birth", details.partner_place_of_birth)}</table>`);
    }
  }
  if (kind === "refund" && job.refund_id) {
    const refund = check(await db.from("booking_refunds").select("stripe_refund_id,amount_cents,currency,status,reason").eq("id", job.refund_id).single());
    if (!refund) throw new Error("Refund notification record is missing.");
    const amount = new Intl.NumberFormat("en-GB", { style: "currency", currency: refund.currency }).format(refund.amount_cents / 100);
    const state = job.refund_status || refund.status;
    const descriptions: Record<string, string> = {
      pending: "The refund has been submitted to Stripe and is pending. It has not yet completed.",
      requires_action: "The refund needs further action. Please contact support for help.",
      succeeded: "Stripe reports that the refund succeeded. The time it takes to appear depends on your payment provider.",
      failed: "The refund failed. Please contact support so we can help resolve it.",
      canceled: "The refund was cancelled. Please contact support if you need help.",
    };
    if (isOwner) parts.push(`<p>Approved exception: ${escape(refund.reason || "See the booking history for details.")}</p>`);
    parts.push(`<p>Refund amount: ${escape(amount)}</p><p>${escape(descriptions[state] || state)}</p><p>Stripe reference: ${escape(refund.stripe_refund_id || "Awaiting confirmation")}</p><p>This refund action does not cancel your reading. Current booking status: ${escape(order.status)}.</p><p>This is a test payment; no real money moves.</p>`);
  }
  if (["customer", "owner", "schedule_owner", "payment_received"].includes(kind) && order.payment_verified_at) {
    const amount = new Intl.NumberFormat("en-GB", { style: "currency", currency: order.currency_snapshot || "EUR" }).format((order.price_cents_snapshot || 0) / 100);
    parts.push(`<h2 style="font-size:18px">Payment receipt</h2><p>Amount paid: ${escape(amount)}</p><p>Payment reference: ${escape(order.stripe_payment_intent_id || order.id)}</p><p>Payment verified: ${escape(new Intl.DateTimeFormat("en-GB", { timeZone: order.customer_timezone || "UTC", dateStyle: "medium", timeStyle: "short" }).format(new Date(order.payment_verified_at)))} (${escape(order.customer_timezone || "UTC")})</p>`);
    if (order.stripe_receipt_url) parts.push(`<p><a href="${escape(order.stripe_receipt_url)}">View Stripe payment receipt</a></p>`);
    else parts.push("<p>The Stripe receipt link is not available yet. Your verified payment details are shown above and in your account.</p>");
    parts.push("<p>This is a test payment; no real money moves.</p>");
  }
  if (kind === "refund" && job.refund_status === "succeeded") {
    if (order.stripe_receipt_url) parts.push(`<p><a href="${escape(order.stripe_receipt_url)}">View Stripe receipt and refund details</a></p>`);
    else parts.push("<p>The refund confirmation amount and reference are shown above. The Stripe receipt link is not currently available.</p>");
  }
  if (kind === "payment_received") parts.push(order.status === "awaiting_schedule"
    ? "<p>Your payment is confirmed. Choose an available appointment time in your account. If no suitable time is available, contact support for help.</p>"
    : `<p>This confirms your original payment. Current booking status: ${escape(order.status)}. Open your account for the latest appointment and payment details.</p>`);
  if (order.format === "text" && kind === "customer")
    parts.push(
      "<p>Your payment has been received. The owner will personally contact you by email to discuss when to expect your reading, then email the completed reading to you.</p>",
    );
  if (kind === "schedule_owner")
    parts.push("<p>Please contact the customer to arrange a call if no suitable time is available.</p>");
  if (kind === "availability_customer")
    parts.push("<p>Available times have been added. Open your booking to choose one.</p>");
  if (
    order.format === "voice_call" &&
    order.scheduled_at &&
    !["cancelled", "refund", "payment_received"].includes(kind)
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
  if (kind === "cancelled")
    parts.push(
      isOwner ? `<p>This booking has been cancelled.${order.format === "voice_call" ? " Its reserved time has been released." : ""} This action did not issue a refund.</p>` : "<p>Your booking has been cancelled. This action did not issue a refund. Contact support if you need help.</p>",
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
      messageId: `<booking-${job.id}@${smtpUser.split("@")[1]}>`,
    });
  } catch (error) {
    if (!(error instanceof EmailDeliveryUncertain))
      check(await db.from("booking_jobs").update({ email_started_at: null })
        .eq("id", job.id).eq("lease_token", job.lease_token));
    throw error;
  }
}
