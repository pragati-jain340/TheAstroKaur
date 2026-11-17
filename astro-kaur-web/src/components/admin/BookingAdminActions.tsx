"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import type { BookingOrder } from "@/lib/booking/types";
import type { Database } from "@/lib/supabase/types";
import type { BookingRefund } from "@/lib/payments/refunds";
import SlotPicker, { formatAppointment } from "@/components/services/SlotPicker";

export interface BookingHistory { id: string; action: string; created_at: string; reason: string | null }
export interface AdminBookingSnapshot {
  order: BookingOrder;
  history: BookingHistory[];
  detail?: { status: Database["public"]["Tables"]["reading_details"]["Row"]["status"] } | null;
  refunds: BookingRefund[];
  refund_tracking_ready?: boolean;
}
const labels: Record<string, string> = { processing: "Awaiting Stripe confirmation", pending: "Pending", requires_action: "Action needed in Stripe", succeeded: "Succeeded", failed: "Failed", canceled: "Cancelled" };

export default function BookingAdminActions({ id, initialOrder, history, initialRefunds = [], refundTrackingReady = false, onUpdated }: {
  id: string; initialOrder: BookingOrder; history: BookingHistory[]; initialRefunds?: BookingRefund[]; refundTrackingReady?: boolean; onUpdated?: (snapshot: AdminBookingSnapshot) => void;
}) {
  const [order, setOrder] = useState(initialOrder);
  const [events, setEvents] = useState(history);
  const [refunds, setRefunds] = useState(initialRefunds);
  const [trackingReady, setTrackingReady] = useState(refundTrackingReady);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [start, setStart] = useState("");
  const [show, setShow] = useState(false);
  const [working, setWorking] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const money = (amount: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency: order.currency_snapshot || "EUR" }).format(amount / 100);
  const remaining = Math.max(0, (order.price_cents_snapshot || 0) - (order.refunded_amount_cents || 0));
  const active = refunds.find(refund => ["processing", "pending", "requires_action"].includes(refund.status));

  async function refresh(reconcile = false) {
    const response = await fetch(`/api/admin/bookings/${id}${reconcile ? "?reconcile_refunds=1" : ""}`, { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Unable to refresh this booking.");
    setOrder(result.order); setEvents(result.history || []); setRefunds(result.refunds || []); setTrackingReady(result.refund_tracking_ready === true);
    onUpdated?.(result);
  }
  async function action(kind: string) {
    if (["reschedule", "cancel"].includes(kind) && !window.confirm(kind === "cancel"
      ? "Cancel this booking? Any reserved call time will be released. No refund will be issued."
      : "Confirm this owner rescheduling exception?")) return;
    setWorking(true); setError(""); setMessage("");
    try {
      const response = await fetch(`/api/admin/bookings/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: kind, starts_at: start || null, confirmed: kind === "refund_payment" ? confirmed : true,
          reason: kind === "refund_payment" ? reason.trim() : "Owner action from reading management", amount_cents: remaining }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to complete this action.");
      if (kind === "refund_payment") {
        const status = result.refund?.status;
        setMessage(`${money(result.refund?.amount || remaining)} test refund: ${labels[status] || status}. Booking status is unchanged.`);
        setRefundOpen(false);
      } else setMessage(kind === "cancel" ? "Booking cancelled. No refund was issued." : kind === "delivered" ? "Reading marked as delivered." : "Booking updated.");
      setShow(false);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to complete this action.");
      // Recover a completed provider operation even if its response was lost.
      try { await refresh(); } catch { /* Keep the previous record and visible error. */ }
    } finally { setWorking(false); }
  }
  async function refreshStatus() {
    setWorking(true); setError("");
    try { await refresh(true); setMessage("Payment and refund status refreshed from Stripe."); }
    catch (err) { setError(err instanceof Error ? err.message : "Unable to refresh refund status."); }
    finally { setWorking(false); }
  }
  return <section className="space-y-5 rounded-2xl border border-border/60 bg-card p-5 sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">Booking and payment actions</h2><Button variant="outline" size="sm" disabled={working} onClick={() => void refreshStatus()}>{working ? "Working..." : "Refresh payment status"}</Button></div>
    {error && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
    {message && <p role="status" className="rounded-lg bg-muted/50 p-3 text-sm">{message}</p>}
    <dl className="grid grid-cols-2 gap-4 rounded-xl bg-muted/40 p-4 text-sm sm:grid-cols-4">
      <div><dt className="text-xs text-muted-foreground">Booking</dt><dd className="mt-1 font-medium capitalize">{order.status.replaceAll("_", " ")}</dd></div>
      <div><dt className="text-xs text-muted-foreground">Payment</dt><dd className="mt-1 font-medium capitalize">{order.payment_status}</dd></div>
      <div><dt className="text-xs text-muted-foreground">Order amount</dt><dd className="mt-1 font-medium">{money(order.price_cents_snapshot || 0)}</dd></div>
      <div><dt className="text-xs text-muted-foreground">Refunded</dt><dd className="mt-1 font-medium">{money(order.refunded_amount_cents || 0)}</dd></div>
    </dl>
    {order.format === "text" && <div className="flex flex-wrap items-center gap-3 text-sm"><div className="min-w-0 flex-1"><p className="font-medium">Contact this customer about their reading</p><p className="mt-1 truncate text-muted-foreground">{order.customer_email_snapshot}</p></div>{order.customer_email_snapshot && <Button variant="outline" size="sm" asChild><a href={`mailto:${order.customer_email_snapshot}`}>Email customer</a></Button>}{order.status === "confirmed" && order.payment_verified_at && <Button size="sm" disabled={working} onClick={() => void action("delivered")}>Mark delivered</Button>}</div>}
    {order.format === "voice_call" && order.scheduled_at && <p className="text-sm">{formatAppointment(order.scheduled_at, order.customer_timezone)} ({order.customer_timezone})</p>}
    <div className="flex flex-wrap gap-2">
      {order.payment_verified_at && ["confirmed", "awaiting_schedule", "in_progress"].includes(order.status) && <Button variant="outline" size="sm" disabled={working} onClick={() => void action("cancel")}>Cancel booking</Button>}
      {order.format === "voice_call" && order.service_id && ["confirmed", "awaiting_schedule"].includes(order.status) && ["paid", "refunded"].includes(order.payment_status) && order.payment_verified_at && <Button variant="outline" size="sm" disabled={working} onClick={() => setShow(value => !value)}>{order.status === "awaiting_schedule" ? "Schedule paid call" : "Reschedule call"}</Button>}
      {["requested", "review_required"].includes(order.refund_status) && <Button variant="ghost" size="sm" disabled={working} onClick={() => void action("resolve_request")}>Mark existing request reviewed</Button>}
    </div>
    <p className="text-xs text-muted-foreground">Cancelling a booking releases its reserved time. It does not issue a refund.</p>
    {show && order.service_id && <div className="space-y-3"><SlotPicker serviceId={order.service_id} orderId={id} admin={order.status === "awaiting_schedule"} zone={order.customer_timezone} value={start} onChange={setStart} /><Button disabled={!start || working} onClick={() => void action(order.status === "awaiting_schedule" ? "schedule" : "reschedule")}>Confirm new time</Button></div>}
    <details className="rounded-xl border border-border/60 p-4"><summary className="cursor-pointer text-sm font-medium">Exceptional payment actions</summary>
      <div className="mt-4 space-y-4"><p className="text-sm leading-relaxed text-muted-foreground">Bookings are non-refundable by default. An administrator can approve an exception or provide a remedy required by law. Issuing a refund does not cancel the reading.</p>
        <p className="text-sm">Refundable balance: <strong>{money(remaining)}</strong> <span className="text-xs text-muted-foreground">(Stripe test mode)</span></p>
        {!trackingReady && <p role="status" className="text-sm text-amber-900 dark:text-amber-200">Refund actions are unavailable until the refund-tracking database migration is installed. Other booking actions remain available.</p>}
        {active && <p className="text-sm">{labels[active.status]}. {active.status === "processing" ? "Refresh first. If no Stripe result appears, resume the same request." : "Use Refresh payment status to check the result; do not start another refund."}</p>}
        {trackingReady && order.payment_verified_at && order.payment_status === "paid" && remaining > 0 && (!active || active.status === "processing") && <Button variant="outline" disabled={working} onClick={() => { setReason(active?.reason || ""); setConfirmed(false); setError(""); setRefundOpen(true); }}>{active ? "Resume refund request" : "Issue exceptional refund"}</Button>}
        {refunds.length > 0 && <ul className="space-y-3">{refunds.map(refund => <li key={refund.id} className="rounded-lg bg-muted/40 p-3 text-sm"><p className="font-medium">{money(refund.amount_cents)} - {labels[refund.status]}</p><p className="mt-1 text-xs text-muted-foreground">{refund.reason}</p>{refund.stripe_refund_id && <p className="mt-1 break-all text-xs text-muted-foreground">Stripe reference: {refund.stripe_refund_id}</p>}{refund.failure_reason && <p className="mt-1 text-xs text-destructive">{refund.failure_reason}</p>}</li>)}</ul>}
      </div>
    </details>
    <details><summary className="cursor-pointer text-sm">Booking history ({events.length})</summary><ul className="mt-3 space-y-3">{events.map(item => <li key={item.id} className="text-xs leading-relaxed"><p className="font-medium">{item.action.replaceAll("_", " ")} - {new Date(item.created_at).toLocaleString()}</p><p className="mt-1 text-muted-foreground">{item.reason}</p></li>)}</ul></details>
    <Dialog open={refundOpen} onOpenChange={open => { if (!working) setRefundOpen(open); }}><DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md"><DialogTitle>Approve exceptional refund</DialogTitle><DialogDescription>Refund the remaining payment through Stripe. The reading and any reserved appointment stay active.</DialogDescription>
      <fieldset disabled={working} className="min-w-0 space-y-4"><div className="rounded-lg bg-muted/50 p-4 text-sm"><p>Original payment: <strong>{money(order.price_cents_snapshot || 0)}</strong></p><p className="mt-1">Refund amount: <strong>{money(remaining)}</strong></p><p className="mt-2 text-xs text-muted-foreground">Test mode - no real money moves.</p></div>
        <label className="block space-y-2 text-sm font-medium">Reason for this exception<Textarea maxLength={1000} minLength={3} rows={3} value={reason} onChange={event => setReason(event.target.value)} placeholder="Explain why this refund has been approved" /></label>
        <label className="flex items-start gap-2 text-sm leading-relaxed"><Checkbox className="mt-1" checked={confirmed} onCheckedChange={checked => setConfirmed(checked === true)} />I approve this refund and understand that the booking will not be cancelled.</label>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setRefundOpen(false)}>Back</Button><Button disabled={!confirmed || reason.trim().length < 3 || working} onClick={() => void action("refund_payment")}>{working ? "Submitting..." : `Confirm ${money(remaining)} test refund`}</Button></div>
      </fieldset>
    </DialogContent></Dialog>
  </section>;
}
