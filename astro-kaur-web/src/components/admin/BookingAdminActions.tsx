"use client";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import type { BookingOrder } from "@/lib/booking/types";
import SlotPicker, {
  formatAppointment,
} from "@/components/services/SlotPicker";
interface History {
  id: string;
  action: string;
  created_at: string;
  reason: string | null;
}
export default function BookingAdminActions({
  id,
  initialOrder,
  history,
}: {
  id: string;
  initialOrder: BookingOrder;
  history: History[];
}) {
  const [order, setOrder] = useState<BookingOrder>(initialOrder),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [start, setStart] = useState(""),
    [show, setShow] = useState(false),
    [working, setWorking] = useState(false);
  async function action(kind: string) {
    if (["refund_payment", "reschedule", "cancel"].includes(kind) && (
      !window.confirm(
        kind === "refund_payment"
          ? "Issue a full TEST Stripe refund? Appointment cancellation is a separate action."
          : kind === "reschedule"
            ? "Confirm this owner rescheduling exception?"
            : "Confirm this booking action?",
      )
    ))
      return;
    setWorking(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/bookings/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: kind,
            starts_at: start || null,
            confirmed: true,
            reason: "Owner action from reading management",
          }),
        }),
        result = await response.json();
      if (!response.ok) throw new Error(result.error);
      if (kind === "delivered" && order) setOrder({ ...order, status: "completed" });
      setMessage(kind === "delivered" ? "Reading marked as delivered." : "Saved.");
      setShow(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save.");
    } finally {
      setWorking(false);
    }
  }
  return (
    <section className="p-5 rounded-2xl border border-[#E5B842]/30 text-[#0F172A] dark:text-[#FAF8F5] space-y-3">
      <h2 className="font-serif text-xl">Booking and payment actions</h2>
      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-300">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="text-sm">
          {message}
        </p>
      )}
      {order && (
        <>
          {order.format === "text" && (
            <div className="flex flex-wrap items-center gap-3 rounded-xl bg-[#FAF8F5] p-4 dark:bg-[#131F33]">
              <div className="min-w-0 flex-1">
                <p className="font-medium">The owner will contact this customer</p>
                <p className="mt-1 truncate text-sm text-[#46505F] dark:text-[#BCC4D0]">{order.customer_email_snapshot || "Email address is available in the customer profile."}</p>
              </div>
              {order.customer_email_snapshot && <a href={`mailto:${order.customer_email_snapshot}`} className="rounded-lg border border-[#0F172A]/20 px-3 py-2 text-sm font-medium hover:border-[#805b11] dark:border-white/20 dark:hover:border-[#E5B842]">Email customer</a>}
              {order.payment_status === "paid" && !["completed", "cancelled"].includes(order.status) && <Button type="button" disabled={working} onClick={() => action("delivered")} variant="default">{working ? "Saving…" : "Mark delivered"}</Button>}
            </div>
          )}
          <p className="text-sm">
            Payment verified:{" "}
            {order.payment_verified_at || "Legacy / not verified"} · Refund:{" "}
            {order.refund_status}
          </p>
          {order.format === "voice_call" && order.scheduled_at && (
            <p className="text-sm">
              {formatAppointment(order.scheduled_at, order.customer_timezone)} (
              {order.customer_timezone}) · Customer reschedules used:{" "}
              {order.reschedule_count}
            </p>
          )}
          <div className="flex gap-4 flex-wrap text-sm">
            {order.payment_verified_at && order.status === "confirmed" && (
              <Button
                variant="link"
                disabled={working}
                onClick={() => action("cancel")}
              >
                Cancel booking
              </Button>
            )}
            {order.payment_verified_at && order.payment_status === "paid" && (
              <Button
                variant="link"
                disabled={working}
                onClick={() => action("refund_payment")}
              >
                Issue full test refund
              </Button>
            )}
            {order.format === "voice_call" &&
              order.service_id &&
              ["confirmed", "awaiting_schedule"].includes(order.status) &&
              order.payment_verified_at && (
                <Button
                  variant="link"
                  onClick={() => setShow((v) => !v)}
                >
                  {order.status === "awaiting_schedule" ? "Schedule paid call" : "Owner reschedule exception"}
                </Button>
              )}
            <Button
              variant="link"
              disabled={working}
              onClick={() => action("resolve_request")}
            >
              Mark withdrawal/refund request reviewed
            </Button>
          </div>
          {show && order.service_id && (
            <div className="space-y-3">
              <SlotPicker
                serviceId={order.service_id}
                orderId={id}
                admin={order.status === "awaiting_schedule"}
                zone={order.customer_timezone}
                value={start}
                onChange={setStart}
              />
              <Button
                size="lg"
                disabled={!start || working}
                onClick={() => action(order.status === "awaiting_schedule" ? "schedule" : "reschedule")}
              >
                Confirm owner change
              </Button>
            </div>
          )}
          <details>
            <summary className="cursor-pointer text-sm">
              Booking history ({history.length})
            </summary>
            {history.map((item) => (
              <p key={item.id} className="text-xs py-2">
                {new Date(item.created_at).toLocaleString()} · {item.action}{" "}
                {item.reason}
              </p>
            ))}
          </details>
        </>
      )}
    </section>
  );
}
