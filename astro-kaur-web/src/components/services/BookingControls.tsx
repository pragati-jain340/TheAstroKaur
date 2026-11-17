"use client";
import { Button, buttonVariants } from "@/components/ui/button";
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
  server_now: string;
}
export default function BookingControls({ id }: { id: string }) {
  const { openContactModal, isAdmin } = useAuth();
  const [data, setData] = useState<BookingState | null>(null),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [working, setWorking] = useState(false);
  const [start, setStart] = useState(""),
    [zone, setZone] = useState(
      () => Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Berlin",
    );
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
  async function change(action: "schedule" | "cancel") {
    if (isAdmin) return;
    const prompt =
      action === "cancel"
        ? "Cancel this appointment? This releases your time and does not automatically issue a refund."
        : "Confirm this appointment?";
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
            confirmed: true,
          }),
        }),
        result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setMessage(action === "cancel" ? "Booking cancelled. No refund was issued." : "Your booking has been updated.");
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
    if (isAdmin) return;
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
          {["processing", "pending", "requires_action", "refunded", "partially_refunded", "failed", "canceled"].includes(order.refund_status) && <p className="rounded-lg bg-muted/50 p-3 text-sm leading-relaxed">Refund: {order.refund_status === "processing" ? "awaiting Stripe confirmation" : order.refund_status.replaceAll("_", " ")}.{(order.refunded_amount_cents || 0) > 0 && ` Refunded amount: ${new Intl.NumberFormat("en-GB", { style: "currency", currency: order.currency_snapshot || "EUR" }).format((order.refunded_amount_cents || 0) / 100)}.`} A refund does not cancel your reading. Contact support if you need help.</p>}
          {!isAdmin && order.status === "pending_payment" && (
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
                : ["paid", "refunded"].includes(order.payment_status)
                  ? "The owner will contact you personally by email about timing and send your completed reading directly to you."
                  : "Your reading will be prepared after payment is confirmed."}
            </p>
          )}
          {!isAdmin && order.format === "voice_call" && order.status === "awaiting_schedule" && ["paid", "refunded"].includes(order.payment_status) && order.service_id && (
            <div className="space-y-4">
              <p>Your reading is active. Choose a time below. If no times are available, the owner will contact you to arrange your call.</p>
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
              {order.status === "confirmed" && <p className="text-sm text-muted-foreground">Need to change your appointment time? Use Get help with this booking below to contact support.</p>}
              {!isAdmin && order.status === "confirmed" &&
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
            <Button onClick={() => openContactModal(id)} variant="link">
              Get help with this booking
            </Button>
            <Button
              variant="link"
              onClick={() => load(true).catch((err) => setError(err.message))}
            >
              Refresh status
            </Button>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">Bookings are non-refundable, except where required by law. Contact support for help, an approved exception, or to exercise applicable statutory rights. Cancelling a booking does not issue a refund.</p>

        </>
      )}
    </section>
  );
}
