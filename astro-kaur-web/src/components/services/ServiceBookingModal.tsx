"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useAuth, type BookingService } from "@/context/AuthContext";
import { POLICY_VERSION, type CatalogService } from "@/lib/booking/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

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

const bookingAction = "h-auto min-h-11 min-w-0 rounded-full border border-[#a7721b]/20 bg-[#E5B842] bg-linear-to-r from-[#efc96c] to-[#e5b842] px-4 py-2.5 text-sm font-semibold whitespace-normal text-[#211807] shadow-sm hover:from-[#f5d583] hover:to-[#ebbf4f]";

function generateUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function toCatalogService(s: BookingService): CatalogService {
  const isCall =
    s.isCall ||
    s.format === "voice_call" ||
    (typeof s.format === "string" && s.format.toLowerCase().includes("call"));
  return {
    id: s.id,
    title: s.title,
    format: isCall ? "voice_call" : "text",
    duration_minutes:
      s.durationMinutes !== undefined && s.durationMinutes !== null
        ? s.durationMinutes
        : isCall
          ? 30
          : null,
    price_cents:
      s.priceCents ??
      (s.price ? (parseInt(s.price.replace(/[^\d.]/g, ""), 10) || 0) * 100 : 2000),
    currency: s.currency || "EUR",
    requires_partner_details: !!s.requiresPartnerDetails,
  };
}

export default function ServiceBookingModal() {
  const auth = useAuth();
  if (auth.isAdmin || auth.loading || !auth.bookingModalOpen || !auth.selectedBookingService) return null;
  return (
    <BookingDialog
      key={auth.selectedBookingService.id}
      selectedService={auth.selectedBookingService}
    />
  );
}
function BookingDialog({ selectedService }: { selectedService: BookingService }) {
  const { user, profile, closeBookingModal, openAuthModal } = useAuth();
  const [service, setService] = useState<CatalogService>(() =>
    toCatalogService(selectedService),
  );
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  const [step, setStep] = useState<"details" | "review" | "checkout">(
      "details",
    );
  const [zone] = useState(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Berlin",
  );
  const [accepted, setAccepted] = useState(false),
    [hold, setHold] = useState<Hold | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stepHeadingRef = useRef<HTMLParagraphElement>(null);
  const previousStep = useRef(step);
  const requestKey = useRef(generateUUID());
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
    if (previousStep.current === step) return;
    previousStep.current = step;
    scrollRef.current?.scrollTo({ top: 0, behavior: "instant" });
    stepHeadingRef.current?.focus({ preventScroll: true });
  }, [step]);

  useEffect(() => {
    if (error) scrollRef.current?.scrollTo({ top: 0, behavior: "instant" });
  }, [error]);

  // Sync profile details into intake if profile finishes loading after modal opens
  useEffect(() => {
    if (!profile && !user) return;
    setIntake((v) => ({
      ...v,
      email: v.email || profile?.email || user?.email || "",
      client_name: v.client_name || profile?.display_name || "",
      client_dob: v.client_dob || profile?.date_of_birth || "",
      client_tob: v.client_tob || profile?.time_of_birth || "",
      client_pob: v.client_pob || profile?.place_of_birth || "",
      client_time_uncertain: v.client_time_uncertain || !!profile?.time_uncertain,
      partner_name: v.partner_name || profile?.partner_name || "",
      partner_dob: v.partner_dob || profile?.partner_date_of_birth || "",
      partner_tob: v.partner_tob || profile?.partner_time_of_birth || "",
      partner_pob: v.partner_pob || profile?.partner_place_of_birth || "",
      partner_time_uncertain: v.partner_time_uncertain || !!profile?.partner_time_uncertain,
    }));
  }, [profile, user]);

  // Background refresh to pick up any live database changes without blocking UI
  useEffect(() => {
    let active = true;
    fetch("/api/content")
      .then(async (r) => {
        if (!r.ok) return null;
        return r.json();
      })
      .then((data) => {
        if (!active || !Array.isArray(data?.services)) return;
        const found = data.services.find(
          (s: CatalogService) => s.id === selectedService.id,
        );
        if (active && found) {
          setService(found);
        }
      })
      .catch((err: unknown) => {
        console.warn("Background service catalog refresh skipped:", err);
      });
    return () => {
      active = false;
    };
  }, [selectedService.id]);
  const field = (
    key: keyof Intake,
    label: string,
    type = "text",
    required = true,
  ) => (
    <label className="block min-w-0 text-sm font-medium" key={key}>
      {label}
      {required ? " *" : ""}
      <Input
        className="mt-1 min-h-11 rounded-xl bg-white px-3 text-base font-normal dark:bg-[#172337] sm:text-sm"
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
          service_id: service.id,
          starts_at: null,
          timezone: zone,
          intake,
          idempotency_key: requestKey.current,
          policy_version: POLICY_VERSION,
          acknowledged: accepted,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setHold(result);
      setStep("checkout");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to prepare your order.",
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
  function next(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setStep("review");
  }
  return (
    <Dialog open onOpenChange={(open) => { if (!open) closeBookingModal(); }}>
      <DialogContent
        aria-describedby={undefined}
        onOpenAutoFocus={(event) => {
          if (window.matchMedia("(width < 40rem)").matches && event.currentTarget instanceof HTMLElement) {
            event.preventDefault();
            event.currentTarget.focus();
          }
        }}
        overlayClassName="max-sm:bg-black/25"
        className="flex max-h-[calc(100dvh-2rem)] max-w-[min(24rem,calc(100%-1.5rem))] flex-col gap-0 overflow-hidden rounded-2xl border-[#E5B842]/40 bg-[#FAF8F5] p-0 text-[#0F172A] dark:bg-[#0F172A] dark:text-[#FAF8F5] min-[320px]:max-sm:w-[calc(100%-3rem)] sm:max-w-2xl max-sm:[&>[data-slot=dialog-close]]:top-1 max-sm:[&>[data-slot=dialog-close]]:right-1 max-sm:[&>[data-slot=dialog-close]]:grid max-sm:[&>[data-slot=dialog-close]]:size-11 max-sm:[&>[data-slot=dialog-close]]:place-items-center"
      >
        <header className="shrink-0 space-y-2 border-b border-[#E5B842]/25 px-4 pt-4 pr-12 pb-3 sm:px-7 sm:pt-6 sm:pr-14 sm:pb-4">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs">
            <p ref={stepHeadingRef} tabIndex={-1} className="font-semibold text-[#6B3448] dark:text-[#E5B842]">
              {step === "details" ? "1 of 3 · Reading details" : step === "review" ? "2 of 3 · Review your order" : "3 of 3 · Secure checkout"}
            </p>
            <span className="rounded-full border border-[#E5B842]/35 bg-[#E5B842]/10 px-2 py-0.5 text-[11px] text-[#805B11] dark:text-[#E5B842]">Test payments</span>
          </div>
          <DialogTitle className="font-serif text-xl leading-tight tracking-tight [overflow-wrap:anywhere] sm:text-3xl">
            {service.title}
          </DialogTitle>
          <p className="flex flex-wrap items-baseline gap-x-2 text-xs text-[#0F172A]/75 dark:text-[#FAF8F5]/75 sm:text-sm">
            <strong className="font-semibold text-[#6B3448] dark:text-[#E5B842]">
              {new Intl.NumberFormat("en-IE", {
                style: "currency",
                currency: service.currency,
              }).format(service.price_cents / 100)}
            </strong>
            <span>{service.format === "voice_call" ? `${service.duration_minutes} minute voice call` : "Written reading"}</span>
          </p>
        </header>
        <div ref={scrollRef} className="min-h-0 overflow-y-auto overscroll-contain px-4 py-3 [overflow-wrap:anywhere] sm:px-7 sm:py-5">
          {error && (
            <p
              role="alert"
              className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300"
            >
              {error}
            </p>
          )}
          {!user ? (
            <p>Sign in to book and manage your reading.</p>
          ) : (
            <>
              {step === "details" && (
                <form id="reading-booking-details" onSubmit={next} className="space-y-3 sm:space-y-4">
                  <p className="rounded-xl bg-[#E5B842]/10 px-3 py-2.5 text-sm leading-relaxed text-[#0F172A]/80 dark:text-[#FAF8F5]/80">
                    Please check your details. Any edits apply to this reading only.
                  </p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                    {field("client_name", "Full name")}
                    {field("email", "Contact email", "email")}
                    {field("client_dob", "Date of birth", "date")}
                    {!intake.client_time_uncertain &&
                      field("client_tob", "Time of birth", "time")}
                  </div>
                  <label className="flex min-h-8 cursor-pointer items-center gap-2 text-sm">
                    <Checkbox
                      checked={intake.client_time_uncertain}
                      onCheckedChange={(checked) =>
                        setIntake((v) => ({
                          ...v,
                          client_time_uncertain: checked === true,
                        }))
                      }
                    />
                    Birth time uncertain / approximate
                  </label>
                  {field("client_pob", "Birthplace (city and country)")}
                  {service.requires_partner_details && (
                    <fieldset className="min-w-0 space-y-3 rounded-xl border border-[#E5B842]/30 p-3 sm:p-4">
                      <legend className="font-serif text-xl">
                        Partner details
                      </legend>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                        {field("partner_name", "Partner name")}
                        {field("partner_dob", "Partner date of birth", "date")}
                        {!intake.partner_time_uncertain &&
                          field("partner_tob", "Partner time of birth", "time")}
                        {field("partner_pob", "Partner birthplace")}
                      </div>
                      <label className="flex min-h-8 cursor-pointer items-center gap-2 text-sm">
                        <Checkbox
                          checked={intake.partner_time_uncertain}
                          onCheckedChange={(checked) =>
                            setIntake((v) => ({
                              ...v,
                              partner_time_uncertain: checked === true,
                            }))
                          }
                        />
                        Partner birth time uncertain
                      </label>
                    </fieldset>
                  )}
                  <label className="block text-sm font-medium">
                    Questions or focus areas (optional)
                    <Textarea
                      rows={3}
                      maxLength={3000}
                      value={intake.notes}
                      onChange={(e) =>
                        setIntake((v) => ({ ...v, notes: e.target.value }))
                      }
                      className="mt-1 min-h-20 rounded-xl bg-white px-3 text-base font-normal dark:bg-[#172337] sm:text-sm"
                    />
                  </label>
                </form>
              )}
              {step === "review" && (
                <div className="space-y-4 text-sm leading-relaxed">
                  <div className="rounded-xl border border-[#E5B842]/25 bg-[#E5B842]/10 px-3 py-2.5">
                    <p className="font-semibold">{intake.client_name}</p>
                    <p>{intake.email}</p>
                  </div>
                  {service.format === "text" ? (
                    <p className="text-sm">
                      After payment, you will receive an order confirmation. The
                      owner will contact you personally by email about timing
                      and send the completed reading directly to you.
                    </p>
                  ) : (
                    <p className="text-sm">
                      After payment, choose an available time. If no times are
                      available, the owner will contact you to arrange your call.
                      Your booking includes a Google Meet link.
                    </p>
                  )}
                  <p className="text-sm leading-relaxed">Bookings are non-refundable, except where required by law. Contact support if you need help. Cancelling a booking does not issue a refund.</p>
                  <label className="flex items-start gap-3 text-sm">
                    <Checkbox
                      className="mt-1"
                      checked={accepted}
                      onCheckedChange={(checked) => setAccepted(checked === true)}
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
                </div>
              )}
              {step === "checkout" && hold && (
                <div className="space-y-5">
                  <p className="text-sm">
                    Continue to Stripe to pay for your reading. Payment is verified before your order is confirmed.
                  </p>
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
          )}
        </div>

        <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-[#E5B842]/25 px-4 py-3 sm:px-7 sm:py-4">
          {!user ? (
            <Button
              type="button"
              className={`${bookingAction} w-full sm:w-auto`}
              onClick={() => {
                closeBookingModal();
                openAuthModal("signin");
              }}
            >
              Sign in
            </Button>
          ) : step === "details" ? (
            <Button type="submit" form="reading-booking-details" className={`${bookingAction} w-full sm:w-auto`}>
              Continue
              <ArrowRight aria-hidden="true" className="size-4" />
            </Button>
          ) : step === "review" ? (
            <>
              <Button
                type="button"
                variant="outline"
                className="min-h-11 rounded-full"
                onClick={(event) => {
                  event.preventDefault();
                  setStep("details");
                }}
              >
                Back
              </Button>
              <Button type="button" disabled={!accepted || working} onClick={reserve} className={`${bookingAction} flex-1 sm:flex-none`}>
                {working ? "Preparing…" : "Continue to payment"}
              </Button>
            </>
          ) : hold ? (
            <Button type="button" disabled={working} onClick={pay} className={`${bookingAction} w-full sm:w-auto`}>
              {working ? "Opening Stripe…" : "Pay securely with Stripe"}
            </Button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
