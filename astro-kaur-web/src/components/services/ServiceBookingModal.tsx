"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { POLICY_VERSION, type CatalogService } from "@/lib/booking/types";
import SlotPicker, {
  bookingButton,
  bookingInput,
  formatAppointment,
  ZoneSelect,
} from "./SlotPicker";

type Intake = {
  email: string;
  client_name: string;
  client_dob: string;
  client_tob: string;
  client_pob: string;
  client_time_uncertain: boolean;
  partner_name: string;
  partner_dob: string;
  partner_tob: string;
  partner_pob: string;
  partner_time_uncertain: boolean;
  notes: string;
};
type Hold = { order_id: string; hold_expires_at: string; server_now: string };
export default function ServiceBookingModal() {
  const auth = useAuth();
  if (!auth.bookingModalOpen || !auth.selectedBookingService) return null;
  return (
    <BookingDialog
      key={auth.selectedBookingService.id}
      serviceId={auth.selectedBookingService.id}
    />
  );
}
function BookingDialog({ serviceId }: { serviceId: string }) {
  const { user, profile, closeBookingModal, openAuthModal } = useAuth();
  const [service, setService] = useState<CatalogService | null>(null),
    [error, setError] = useState(""),
    [working, setWorking] = useState(false);
  const [step, setStep] = useState<"details" | "time" | "review" | "checkout">(
      "details",
    ),
    [start, setStart] = useState("");
  const [zone, setZone] = useState(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Berlin",
  );
  const [accepted, setAccepted] = useState(false),
    [hold, setHold] = useState<Hold | null>(null),
    [seconds, setSeconds] = useState(300);
  const requestKey = useRef(crypto.randomUUID()),
    dialog = useRef<HTMLDivElement>(null);
  const closeRef = useRef(closeBookingModal);
  useEffect(() => {
    closeRef.current = closeBookingModal;
  }, [closeBookingModal]);
  const [intake, setIntake] = useState<Intake>(() => ({
    email: profile?.email || user?.email || "",
    client_name: profile?.display_name || "",
    client_dob: profile?.date_of_birth || "",
    client_tob: profile?.time_of_birth || "",
    client_pob: profile?.place_of_birth || "",
    client_time_uncertain: !!profile?.time_uncertain,
    partner_name: profile?.partner_name || "",
    partner_dob: profile?.partner_date_of_birth || "",
    partner_tob: profile?.partner_time_of_birth || "",
    partner_pob: profile?.partner_place_of_birth || "",
    partner_time_uncertain: !!profile?.partner_time_uncertain,
    notes: "",
  }));
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null,
      overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeRef.current();
      if (event.key === "Tab") {
        const items = dialog.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled),input:not(:disabled),select,textarea,a[href],[tabindex="0"]',
        );
        if (!items?.length) return;
        const first = items[0],
          last = items[items.length - 1];
        if (
          event.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === dialog.current)
        ) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, []);
  useEffect(() => {
    let active = true;
    fetch("/api/content")
      .then((r) => r.json())
      .then((data) => {
        const found = data.services?.find(
          (s: CatalogService) => s.id === serviceId,
        );
        if (active) {
          if (found) setService(found);
          else
            setError("Please reload the page and choose an available service.");
        }
      })
      .catch(() => {
        if (active) setError("Could not load this service. Please try again.");
      });
    return () => {
      active = false;
    };
  }, [serviceId]);
  useEffect(() => {
    if (!hold) return;
    const initial =
        Date.parse(hold.hold_expires_at) - Date.parse(hold.server_now),
      began = performance.now();
    const tick = () =>
      setSeconds(
        Math.max(0, Math.ceil((initial - (performance.now() - began)) / 1000)),
      );
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [hold]);
  const field = (
    key: keyof Intake,
    label: string,
    type = "text",
    required = true,
  ) => (
    <label className="block text-sm" key={key}>
      {label}
      {required ? " *" : ""}
      <input
        className={`${bookingInput} mt-1`}
        type={type}
        required={required}
        value={String(intake[key])}
        maxLength={type === "email" ? 254 : 200}
        max={
          type === "date" ? new Date().toISOString().slice(0, 10) : undefined
        }
        onChange={(e) => setIntake((v) => ({ ...v, [key]: e.target.value }))}
      />
    </label>
  );
  async function reserve() {
    setWorking(true);
    setError("");
    try {
      const response = await fetch("/api/bookings/hold", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service_id: serviceId,
          starts_at: start || null,
          timezone: zone,
          intake,
          idempotency_key: requestKey.current,
          policy_version: POLICY_VERSION,
          acknowledged: accepted,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setSeconds(
        Math.max(
          0,
          Math.ceil(
            (Date.parse(result.hold_expires_at) -
              Date.parse(result.server_now)) /
              1000,
          ),
        ),
      );
      setHold(result);
      setStep("checkout");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to reserve this booking.",
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
        body: JSON.stringify({ order_id: hold?.order_id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      window.location.assign(result.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to open checkout.");
      setWorking(false);
    }
  }
  function next(event: FormEvent) {
    event.preventDefault();
    setError("");
    setStep(service?.format === "voice_call" ? "time" : "review");
  }
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/65 backdrop-blur-sm p-4"
      role="presentation"
    >
      <div
        ref={dialog}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-title"
        className="relative w-full max-w-2xl max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-3xl border border-[#E5B842]/40 bg-[#FAF8F5] dark:bg-[#0F172A] text-[#0F172A] dark:text-[#FAF8F5] p-5 sm:p-8 shadow-2xl focus:outline-none"
      >
        <button
          aria-label="Close booking"
          onClick={closeBookingModal}
          className="absolute right-4 top-4 p-3 rounded-full hover:bg-[#E5B842]/15"
        >
          ✕
        </button>
        <p className="text-xs uppercase tracking-widest text-[#6B3448] dark:text-[#E5B842] mb-2">
          Your personal reading
        </p>
        <h2
          id="booking-title"
          className="font-serif text-2xl sm:text-3xl pr-10"
        >
          {service?.title || "Reading details"}
        </h2>
        {service && (
          <p className="my-3">
            {new Intl.NumberFormat("en-IE", {
              style: "currency",
              currency: service.currency,
            }).format(service.price_cents / 100)}{" "}
            ·{" "}
            {service.format === "voice_call"
              ? `${service.duration_minutes} minute voice call`
              : "Written reading"}
          </p>
        )}
        <p className="text-xs mb-6 opacity-70">
          {step === "details"
            ? "1 · Reading details"
            : step === "time"
              ? "2 · Date and time"
              : step === "review"
                ? "Review your order"
                : "Secure checkout"}{" "}
          · Test payments
        </p>
        {error && (
          <p
            role="alert"
            className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300"
          >
            {error}
          </p>
        )}
        {!user ? (
          <div className="space-y-4">
            <p>Sign in to book and manage your reading.</p>
            <button
              className={bookingButton}
              onClick={() => {
                closeBookingModal();
                openAuthModal("signin");
              }}
            >
              Sign in
            </button>
          </div>
        ) : (
          service && (
            <>
              {step === "details" && (
                <form onSubmit={next} className="space-y-4">
                  <p className="text-sm opacity-75">
                    Check your prefilled details. Changes here apply to this
                    reading and do not change your saved profile.
                  </p>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {field("client_name", "Full name")}
                    {field("email", "Contact email", "email")}
                    {field("client_dob", "Date of birth", "date")}
                    {!intake.client_time_uncertain &&
                      field("client_tob", "Time of birth", "time")}
                  </div>
                  <label className="flex gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={intake.client_time_uncertain}
                      onChange={(e) =>
                        setIntake((v) => ({
                          ...v,
                          client_time_uncertain: e.target.checked,
                        }))
                      }
                    />
                    Birth time uncertain / approximate
                  </label>
                  {field("client_pob", "Birthplace (city and country)")}
                  {service.requires_partner_details && (
                    <fieldset className="space-y-4 border-t border-[#E5B842]/30 pt-4">
                      <legend className="font-serif text-xl">
                        Partner details
                      </legend>
                      <div className="grid sm:grid-cols-2 gap-4">
                        {field("partner_name", "Partner name")}
                        {field("partner_dob", "Partner date of birth", "date")}
                        {!intake.partner_time_uncertain &&
                          field("partner_tob", "Partner time of birth", "time")}
                        {field("partner_pob", "Partner birthplace")}
                      </div>
                      <label className="flex gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={intake.partner_time_uncertain}
                          onChange={(e) =>
                            setIntake((v) => ({
                              ...v,
                              partner_time_uncertain: e.target.checked,
                            }))
                          }
                        />
                        Partner birth time uncertain
                      </label>
                    </fieldset>
                  )}
                  <label className="block text-sm">
                    Questions or focus areas (optional)
                    <textarea
                      rows={3}
                      maxLength={3000}
                      value={intake.notes}
                      onChange={(e) =>
                        setIntake((v) => ({ ...v, notes: e.target.value }))
                      }
                      className={`${bookingInput} mt-1`}
                    />
                  </label>
                  <button className={bookingButton}>Continue →</button>
                </form>
              )}
              {step === "time" && (
                <div className="space-y-5">
                  <ZoneSelect value={zone} onChange={setZone} />
                  <SlotPicker
                    serviceId={serviceId}
                    zone={zone}
                    value={start}
                    onChange={setStart}
                  />
                  <div className="flex gap-3">
                    <button onClick={() => setStep("details")} className="p-3">
                      Back
                    </button>
                    <button
                      disabled={!start}
                      className={bookingButton}
                      onClick={() => setStep("review")}
                    >
                      Review booking →
                    </button>
                  </div>
                </div>
              )}
              {step === "review" && (
                <div className="space-y-5">
                  <p>
                    {intake.client_name} · {intake.email}
                  </p>
                  {start && (
                    <p>
                      {formatAppointment(start, zone)}
                      <br />
                      <strong>{zone}</strong>
                    </p>
                  )}
                  {service.format === "text" ? (
                    <p className="text-sm">
                      After payment, you will receive an order confirmation. The
                      owner will contact you personally by email about timing
                      and send the completed reading directly to you.
                    </p>
                  ) : (
                    <p className="text-sm">
                      Your time is held for 5 minutes when you continue. One
                      self-service reschedule is available within 12 hours of
                      payment-confirmed booking, ending sooner if your original
                      appointment starts. Voluntary cancellation does not
                      automatically issue a refund. Mandatory rights remain
                      available.
                    </p>
                  )}
                  <label className="flex items-start gap-3 text-sm">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={accepted}
                      onChange={(e) => setAccepted(e.target.checked)}
                    />
                    <span>
                      I have reviewed the{" "}
                      <Link
                        href="/cancellation-policy"
                        target="_blank"
                        className="underline"
                      >
                        booking and cancellation information
                      </Link>{" "}
                      and{" "}
                      <Link
                        href="/terms-of-service"
                        target="_blank"
                        className="underline"
                      >
                        Terms of Service
                      </Link>
                      .
                    </span>
                  </label>
                  <div className="flex gap-3">
                    <button
                      className="p-3"
                      onClick={() =>
                        setStep(
                          service.format === "voice_call" ? "time" : "details",
                        )
                      }
                    >
                      Back
                    </button>
                    <button
                      disabled={!accepted || working}
                      onClick={reserve}
                      className={bookingButton}
                    >
                      {working ? "Preparing…" : "Continue to payment"}
                    </button>
                  </div>
                </div>
              )}
              {step === "checkout" && hold && (
                <div className="space-y-5">
                  {service.format === "text" ? (
                    <>
                      <p className="text-sm">
                        Continue to Stripe to pay for your written reading. Your
                        order is confirmed after payment verification.
                      </p>
                      <button
                        className={bookingButton}
                        disabled={working}
                        onClick={pay}
                      >
                        {working
                          ? "Opening Stripe…"
                          : "Pay securely with Stripe"}
                      </button>
                    </>
                  ) : seconds > 0 ? (
                    <>
                      <p
                        role="timer"
                        aria-live="off"
                        className="font-serif text-3xl"
                      >
                        {Math.floor(seconds / 60)}:
                        {String(seconds % 60).padStart(2, "0")}
                      </p>
                      <p className="text-sm">
                        Complete test payment before the timer ends. Your order
                        is confirmed after Stripe verifies payment.
                      </p>
                      <button
                        onClick={pay}
                        disabled={working}
                        className={bookingButton}
                      >
                        {working
                          ? "Opening Stripe…"
                          : "Pay securely with Stripe"}
                      </button>
                    </>
                  ) : (
                    <>
                      <p role="alert">
                        This time is no longer reserved. Please choose another
                        available slot.
                      </p>
                      <button
                        className={bookingButton}
                        onClick={() => {
                          setHold(null);
                          requestKey.current = crypto.randomUUID();
                          setStart("");
                          setAccepted(false);
                          setStep(
                            service.format === "voice_call" ? "time" : "review",
                          );
                        }}
                      >
                        Choose again
                      </button>
                    </>
                  )}
                  <Link
                    className="block text-sm underline"
                    onClick={closeBookingModal}
                    href={`/account/readings/${hold.order_id}`}
                  >
                    View payment status in my account
                  </Link>
                </div>
              )}
            </>
          )
        )}
      </div>
    </div>
  );
}
