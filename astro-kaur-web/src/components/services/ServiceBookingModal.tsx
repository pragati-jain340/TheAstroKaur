"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
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
  if (!auth.bookingModalOpen || !auth.selectedBookingService) return null;
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
  const requestKey = useRef(crypto.randomUUID());
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
    <label className="block text-sm" key={key}>
      {label}
      {required ? " *" : ""}
      <Input
        className="mt-1 h-11"
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
  function next(event: FormEvent) {
    event.preventDefault();
    setError("");
    setStep("review");
  }
  return (
    <Dialog open onOpenChange={(open) => { if (!open) closeBookingModal(); }}>
      <DialogContent aria-describedby={undefined} className="block max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl border-[#E5B842]/40 bg-[#FAF8F5] p-5 text-[#0F172A] dark:bg-[#0F172A] dark:text-[#FAF8F5] sm:max-w-2xl sm:p-8">
        <p className="text-xs uppercase tracking-widest text-[#6B3448] dark:text-[#E5B842] mb-2">
          Your personal reading
        </p>
        <DialogTitle
          className="font-serif text-2xl sm:text-3xl pr-10"
        >
          {service?.title || "Reading details"}
        </DialogTitle>
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
        {user && !service && !error && <p role="status" className="text-sm text-muted-foreground">Loading reading details…</p>}
        {!user ? (
          <div className="space-y-4">
            <p>Sign in to book and manage your reading.</p>
            <Button
              size="lg"
              onClick={() => {
                closeBookingModal();
                openAuthModal("signin");
              }}
            >
              Sign in
            </Button>
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
                  <label className="block text-sm">
                    Questions or focus areas (optional)
                    <Textarea
                      rows={3}
                      maxLength={3000}
                      value={intake.notes}
                      onChange={(e) =>
                        setIntake((v) => ({ ...v, notes: e.target.value }))
                      }
                      className="mt-1"
                    />
                  </label>
                  <Button size="lg">Continue →</Button>
                </form>
              )}
              {step === "review" && (
                <div className="space-y-5">
                  <p>
                    {intake.client_name} · {intake.email}
                  </p>
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
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() =>
                        setStep("details")
                      }
                    >
                      Back
                    </Button>
                    <Button
                      disabled={!accepted || working}
                      onClick={reserve}
                      size="lg"
                    >
                      {working ? "Preparing…" : "Continue to payment"}
                    </Button>
                  </div>
                </div>
              )}
              {step === "checkout" && hold && (
                <div className="space-y-5">
                  <p className="text-sm">
                    Continue to Stripe to pay for your reading. Payment is verified before your order is confirmed.
                  </p>
                  <Button size="lg" disabled={working} onClick={pay}>
                    {working ? "Opening Stripe…" : "Pay securely with Stripe"}
                  </Button>
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
      </DialogContent>
    </Dialog>
  );
}
