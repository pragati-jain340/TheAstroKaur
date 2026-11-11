"use client";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import type { BookingOrder } from "@/lib/booking/types";
import SlotPicker, {
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
        : action === "schedule"
          ? "Confirm this appointment?"
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
            timezone: zone,
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
              <Button
                size="lg"
                disabled={
                  working ||
                  Date.parse(order.hold_expires_at || "") <=
                    Date.parse(data.server_now)
                }
                onClick={pay}
              >
                Continue test payment
              </Button>
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
          {order.format === "voice_call" && order.status === "awaiting_schedule" && order.payment_status === "paid" && order.service_id && (
            <div className="space-y-4">
              <p>Payment received. Choose a time below. If no times are available, the owner will contact you to arrange your call.</p>
              <ZoneSelect value={zone} onChange={setZone} />
              <SlotPicker serviceId={order.service_id} orderId={id} zone={zone} value={start} onChange={setStart} />
              <Button disabled={!start || working} size="lg" onClick={() => change("schedule")}>
                Confirm appointment
              </Button>
            </div>
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
              {order.status === "confirmed" &&
                (data.detail?.meet_url && data.detail.calendar_sync_status === 'synced' ? (
                  <a
                    className={buttonVariants({ size: "lg" })}
                    href={data.detail.meet_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Join Google Meet
                  </a>
                ) : (
                  <p className="text-sm">
                    {data.detail?.calendar_sync_status === "error"
                      ? "Your booking is confirmed. The owner will contact you personally with the call details."
                      : "Your call details are being prepared. Your booking is confirmed."}
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
                  <Button
                    disabled={working}
                    variant="link"
                    onClick={() => setRescheduling((v) => !v)}
                  >
                    Reschedule
                  </Button>
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
                  <Button
                    disabled={!start || working}
                    size="lg"
                    onClick={() => change("reschedule")}
                  >
                    Confirm reschedule
                  </Button>
                </div>
              )}
              {order.status === "confirmed" &&
                Date.parse(order.scheduled_at) >
                  Date.parse(data.server_now) && (
                  <Button
                    variant="link"
                    disabled={working}
                    onClick={() => change("cancel")}
                  >
                    Cancel appointment
                  </Button>
                )}
            </>
          )}
          <div className="flex flex-wrap gap-4 text-sm">
            <Button onClick={openContactModal} variant="link">
              Contact support
            </Button>
            <Button variant="link" onClick={() => setRequest((v) => !v)}>
              Request withdrawal / refund
            </Button>
            <Button
              variant="link"
              onClick={() => load(true).catch((err) => setError(err.message))}
            >
              Refresh status
            </Button>
          </div>
          {request && (
            <div className="space-y-3">
              <p className="text-sm">
                This records a request for review and does not automatically
                cancel your order or issue a refund.
              </p>
              <label className="block text-sm">
                Reason
                <Textarea
                  className="mt-1"
                  rows={3}
                  maxLength={1000}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </label>
              <Button
                disabled={working || !reason.trim()}
                onClick={() => change("withdrawal")}
                size="lg"
              >
                Submit request
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
