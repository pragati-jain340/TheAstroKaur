"use client";
import { useEffect, useState } from "react";
import type { BookingOrder } from "@/lib/booking/types";
import SlotPicker, {
  bookingButton,
  formatAppointment,
} from "@/components/services/SlotPicker";
interface History {
  id: string;
  action: string;
  created_at: string;
  reason: string | null;
}
export default function BookingAdminActions({ id }: { id: string }) {
  const [order, setOrder] = useState<BookingOrder | null>(null),
    [history, setHistory] = useState<History[]>([]),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [start, setStart] = useState(""),
    [show, setShow] = useState(false),
    [working, setWorking] = useState(false);
  useEffect(() => {
    fetch(`/api/admin/bookings/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setOrder(data.order);
        setHistory(data.history);
      })
      .catch((err) => setError(err.message));
  }, [id]);
  async function action(kind: string) {
    if (
      !window.confirm(
        kind === "refund_payment"
          ? "Issue a full TEST Stripe refund? Appointment cancellation is a separate action."
          : kind === "reschedule"
            ? "Confirm this owner rescheduling exception?"
            : "Confirm this booking action?",
      )
    )
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
      setMessage("Saved. Refresh the reading to see the latest status.");
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
          <p className="text-sm">Customer contact: {order.customer_email_snapshot || 'See the customer account profile'}</p>
          <p className="text-sm">
            Payment verified:{" "}
            {order.payment_verified_at || "Legacy / not verified"} · Refund:{" "}
            {order.refund_status}
          </p>
          {order.scheduled_at && (
            <p className="text-sm">
              {formatAppointment(order.scheduled_at, order.customer_timezone)} (
              {order.customer_timezone}) · Customer reschedules used:{" "}
              {order.reschedule_count}
            </p>
          )}
          <div className="flex gap-4 flex-wrap text-sm">
            {order.payment_verified_at && order.status === "confirmed" && (
              <button
                className="underline"
                disabled={working}
                onClick={() => action("cancel")}
              >
                Cancel booking
              </button>
            )}
            {order.payment_verified_at && order.payment_status === "paid" && (
              <button
                className="underline"
                disabled={working}
                onClick={() => action("refund_payment")}
              >
                Issue full test refund
              </button>
            )}
            {order.format === "voice_call" &&
              order.service_id &&
              order.status === "confirmed" &&
              order.payment_verified_at && (
                <button
                  className="underline"
                  onClick={() => setShow((v) => !v)}
                >
                  Owner reschedule exception
                </button>
              )}
            <button
              className="underline"
              disabled={working}
              onClick={() => action("resolve_request")}
            >
              Mark withdrawal/refund request reviewed
            </button>
          </div>
          {show && order.service_id && (
            <div className="space-y-3">
              <SlotPicker
                serviceId={order.service_id}
                orderId={id}
                zone={order.customer_timezone}
                value={start}
                onChange={setStart}
              />
              <button
                className={bookingButton}
                disabled={!start || working}
                onClick={() => action("reschedule")}
              >
                Confirm owner change
              </button>
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
