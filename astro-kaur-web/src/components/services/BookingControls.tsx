"use client";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import type { BookingOrder } from "@/lib/booking/types";
import SlotPicker, {
  bookingButton,
  bookingInput,
  formatAppointment,
  ZoneSelect,
} from "./SlotPicker";
interface BookingState {
  order: BookingOrder;
  detail: {
    status: string;
    meet_url: string | null;
    calendar_sync_status: string;
    calendar_invitation_status: string;
    delivered_at: string | null;
  } | null;
  can_reschedule: boolean;
  reschedule_deadline: number;
  server_now: string;
}
export default function BookingControls({ id }: { id: string }) {
  const { openContactModal } = useAuth();
  const [data, setData] = useState<BookingState | null>(null),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [working, setWorking] = useState(false);
  const [rescheduling, setRescheduling] = useState(false),
    [start, setStart] = useState(""),
    [zone, setZone] = useState(
      () => Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Berlin",
    );
  const [request, setRequest] = useState(false),
    [reason, setReason] = useState("");
  const load = useCallback(
    async (reconcile = false) => {
      const response = await fetch(
          `/api/bookings/${id}${reconcile ? "?reconcile=1" : ""}`,
          { cache: "no-store" },
        ),
        result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setData(result);
    },
    [id],
  );
  useEffect(() => {
    let active = true;
    let count = 0;
    fetch(`/api/bookings/${id}`, { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        return result;
      })
      .then((result) => {
        if (active) setData(result);
      })
      .catch((err) => {
        if (active) setError(err.message);
      });
    const timer = setInterval(() => {
      if (++count <= 12) load(count === 1).catch(() => {});
    }, 5000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [load, id]);
  async function change(action: string) {
    const prompt =
      action === "cancel"
        ? "Cancel this appointment? This releases your time and does not automatically issue a refund."
        : action === "reschedule"
          ? "Confirm this new appointment? This uses your one self-service reschedule."
          : "Submit this withdrawal/refund request for owner review?";
    if (!window.confirm(prompt)) return;
    setWorking(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/bookings/${id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action,
            starts_at: start,
            reason,
            confirmed: true,
          }),
        }),
        result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setRescheduling(false);
      setRequest(false);
      setMessage(
        action === "withdrawal"
          ? "Your request has been recorded. The owner will review it and contact you."
          : "Your booking has been updated.",
      );
      await load();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to complete this change.",
      );
    } finally {
      setWorking(false);
    }
  }
  async function pay() {
    setWorking(true);
    setError("");
    try {
      const response = await fetch("/api/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order_id: id }),
        }),
        result = await response.json();
      if (!response.ok) throw new Error(result.error);
      window.location.assign(result.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to open checkout.");
      setWorking(false);
    }
  }
  const order = data?.order;
  return (
    <section className="rounded-2xl border border-[#E5B842]/30 bg-[#FAF8F5] dark:bg-[#0D1829] p-6 sm:p-8 text-[#0F172A] dark:text-[#FAF8F5] space-y-4">
      <h2 className="font-serif text-2xl">
        {order?.format === "text" ? "Your written reading" : "Your booking"}
      </h2>
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
          <p className="text-sm">
            Payment: {order.payment_status} · Order:{" "}
            {order.status.replaceAll("_", " ")}
          </p>
          {order.status === "pending_payment" && (
            <>
              <p className="text-sm">
                Payment has not yet been verified. Returning from checkout does
                not confirm your order.
              </p>
              <button
                className={bookingButton}
                disabled={
                  working ||
                  Date.parse(order.hold_expires_at || "") <=
                    Date.parse(data.server_now)
                }
                onClick={pay}
              >
                Continue test payment
              </button>
            </>
          )}
          {order.status === "payment_review" && order.payment_status === 'paid' && (
            <p>
              Your payment was received and needs owner attention before a
              consultation can be confirmed. Please contact support.
            </p>
          )}
          {order.format === "text" && (
            <p>
              {data.detail?.delivered_at
                ? "The owner marked your reading as delivered. Please check your email."
                : order.payment_status === "paid"
                  ? "The owner will contact you personally by email about timing and send your completed reading directly to you."
                  : "Your reading will be prepared after payment is confirmed."}
            </p>
          )}
          {order.format === "text" && (
            <p className="text-sm">
              Preparation status:{" "}
              {data.detail?.status.replaceAll("_", " ") || "pending"}
            </p>
          )}
          {order.format === "voice_call" && order.scheduled_at && (
            <>
              <p>
                {formatAppointment(order.scheduled_at, order.customer_timezone)}{" "}
                ({order.customer_timezone})
              </p>
              {order.scheduled_end_at && (
                <p className="text-sm">
                  {Math.round(
                    (Date.parse(order.scheduled_end_at) -
                      Date.parse(order.scheduled_at)) /
                      60000,
                  )}{" "}
                  minute consultation
                </p>
              )}
              <p className="text-sm">
                Calendar invitation:{" "}
                {data.detail?.calendar_invitation_status || "pending"}
              </p>
              {order.status === "confirmed" &&
                (data.detail?.meet_url && data.detail.calendar_sync_status === 'synced' ? (
                  <a
                    className={`inline-block ${bookingButton}`}
                    href={data.detail.meet_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Join Google Meet
                  </a>
                ) : (
                  <p className="text-sm">
                    Your Meet link is being prepared. Your paid booking remains
                    confirmed.
                  </p>
                ))}
              {data.can_reschedule && (
                <>
                  <p className="text-sm">
                    One reschedule available until{" "}
                    {formatAppointment(
                      new Date(data.reschedule_deadline).toISOString(),
                      order.customer_timezone,
                    )}{" "}
                    ({order.customer_timezone}).
                  </p>
                  <button
                    disabled={working}
                    className="underline text-sm"
                    onClick={() => setRescheduling((v) => !v)}
                  >
                    Reschedule
                  </button>
                </>
              )}
              {rescheduling && order.service_id && (
                <div className="space-y-4">
                  <ZoneSelect value={zone} onChange={setZone} />
                  <SlotPicker
                    serviceId={order.service_id}
                    orderId={id}
                    zone={zone}
                    value={start}
                    onChange={setStart}
                  />
                  {start && (
                    <p>
                      {formatAppointment(start, zone)} ({zone})
                    </p>
                  )}
                  <button
                    disabled={!start || working}
                    className={bookingButton}
                    onClick={() => change("reschedule")}
                  >
                    Confirm reschedule
                  </button>
                </div>
              )}
              {order.status === "confirmed" &&
                Date.parse(order.scheduled_at) >
                  Date.parse(data.server_now) && (
                  <button
                    className="block text-sm underline"
                    disabled={working}
                    onClick={() => change("cancel")}
                  >
                    Cancel appointment
                  </button>
                )}
            </>
          )}
          <div className="flex flex-wrap gap-4 text-sm">
            <button onClick={openContactModal} className="underline">
              Contact support
            </button>
            <button className="underline" onClick={() => setRequest((v) => !v)}>
              Request withdrawal / refund
            </button>
            <button
              className="underline"
              onClick={() => load(true).catch((err) => setError(err.message))}
            >
              Refresh status
            </button>
          </div>
          {request && (
            <div className="space-y-3">
              <p className="text-sm">
                This records a request for review and does not automatically
                cancel your order or issue a refund.
              </p>
              <label className="block text-sm">
                Reason
                <textarea
                  className={`${bookingInput} mt-1`}
                  rows={3}
                  maxLength={1000}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </label>
              <button
                disabled={working || !reason.trim()}
                onClick={() => change("withdrawal")}
                className={bookingButton}
              >
                Submit request
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
