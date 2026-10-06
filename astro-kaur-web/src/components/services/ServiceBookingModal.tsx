"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth, BookingService } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";

export default function ServiceBookingModal() {
  const {
    user,
    profile,
    bookingModalOpen,
    selectedBookingService,
    closeBookingModal,
    openProfileModal,
  } = useAuth();

  const supabase = createClient();
  const router = useRouter();

  // Client Details
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientDob, setClientDob] = useState("");
  const [clientTob, setClientTob] = useState("");
  const [clientPob, setClientPob] = useState("");
  const [clientTimeUncertain, setClientTimeUncertain] = useState(false);

  // Partner Details (ONLY for Matchmaking)
  const [partnerName, setPartnerName] = useState("");
  const [partnerDob, setPartnerDob] = useState("");
  const [partnerTob, setPartnerTob] = useState("");
  const [partnerPob, setPartnerPob] = useState("");
  const [partnerTimeUncertain, setPartnerTimeUncertain] = useState(false);

  // Additional Inquiries
  const [notes, setNotes] = useState("");

  // Submission States
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submittedOrder, setSubmittedOrder] = useState<any | null>(null);

  // Is this reading a matchmaking service requiring two people's details?
  const isMatchmaking =
    selectedBookingService?.id === "matchmaking-call" ||
    selectedBookingService?.title.toLowerCase().includes("matchmaking");

  // Pre-fill profile details when modal opens
  useEffect(() => {
    if (bookingModalOpen) {
      setErrorMsg(null);
      setSubmittedOrder(null);
      if (profile) {
        setClientName(profile.display_name || "");
        setClientEmail(profile.email || user?.email || "");
        setClientDob(profile.date_of_birth || "");
        setClientTob(profile.time_of_birth || "");
        setClientPob(profile.place_of_birth || "");
        setClientTimeUncertain(!!profile.time_uncertain);

        if (profile.partner_name) setPartnerName(profile.partner_name);
        if (profile.partner_date_of_birth) setPartnerDob(profile.partner_date_of_birth);
        if (profile.partner_time_of_birth) setPartnerTob(profile.partner_time_of_birth);
        if (profile.partner_place_of_birth) setPartnerPob(profile.partner_place_of_birth);
        if (profile.partner_time_uncertain !== undefined) setPartnerTimeUncertain(!!profile.partner_time_uncertain);
      } else if (user) {
        setClientEmail(user.email || "");
      }
    }
  }, [bookingModalOpen, profile, user]);

  if (!bookingModalOpen || !selectedBookingService) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Validation
    if (!clientName.trim()) {
      setErrorMsg("Please enter your full name.");
      return;
    }
    if (!clientDob) {
      setErrorMsg("Please provide your date of birth.");
      return;
    }
    if (!clientPob.trim()) {
      setErrorMsg("Please enter your place of birth (city & country).");
      return;
    }
    if (!clientTimeUncertain && !clientTob) {
      setErrorMsg("Please provide your time of birth, or check 'Time uncertain / approximate'.");
      return;
    }

    if (isMatchmaking) {
      if (!partnerName.trim()) {
        setErrorMsg("Please enter your partner's full name for matchmaking.");
        return;
      }
      if (!partnerDob) {
        setErrorMsg("Please provide your partner's date of birth.");
        return;
      }
      if (!partnerPob.trim()) {
        setErrorMsg("Please enter your partner's place of birth.");
        return;
      }
      if (!partnerTimeUncertain && !partnerTob) {
        setErrorMsg("Please provide your partner's time of birth, or check 'Time uncertain'.");
        return;
      }
    }

    setSubmitting(true);

    try {
      // Parse numeric price from string (e.g., "€60" -> 60)
      const numericPrice = parseFloat(selectedBookingService.price.replace(/[^0-9.]/g, "")) || 0;

      const orderData = {
        auth_user_id: user?.id || null,
        service_title: selectedBookingService.title,
        format: selectedBookingService.isCall ? ("voice_call" as const) : ("text" as const),
        price_eur: numericPrice,
        status: "confirmed" as const,
        client_name: clientName.trim(),
        client_dob: clientDob,
        client_tob: clientTimeUncertain ? null : clientTob || null,
        client_pob: clientPob.trim(),
        client_time_uncertain: clientTimeUncertain,
        requires_partner: isMatchmaking,
        partner_name: isMatchmaking ? partnerName.trim() : null,
        partner_dob: isMatchmaking ? partnerDob : null,
        partner_tob: isMatchmaking && !partnerTimeUncertain ? partnerTob || null : null,
        partner_pob: isMatchmaking ? partnerPob.trim() : null,
        partner_time_uncertain: isMatchmaking ? partnerTimeUncertain : false,
        notes: notes.trim() || null,
      };

      const { data, error } = await supabase.from("orders").insert(orderData).select().single();

      if (error) {
        throw new Error(error.message);
      }

      setSubmittedOrder(data || orderData);
    } catch (err: any) {
      console.error("Order submission error:", err);
      setErrorMsg(err.message || "Failed to submit booking intake. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/65 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-2xl bg-[#FAF8F5] dark:bg-[#0F172A] border border-[#E5B842]/40 rounded-3xl shadow-2xl overflow-hidden my-8">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#B87936] via-[#E5B842] to-[#B87936]" />

        {/* Modal Header */}
        <div className="p-6 sm:p-8 border-b border-[#0F172A]/8 dark:border-[#FAF8F5]/8 bg-white/50 dark:bg-[#1E293B]/40 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[11px] font-semibold tracking-widest uppercase px-3 py-1 rounded-full bg-[#E5B842]/15 text-[#6B3448] dark:text-[#E5B842] border border-[#E5B842]/30">
                ✦ Reading Intake
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#0F172A]/5 dark:bg-[#FAF8F5]/10 text-[#0F172A]/70 dark:text-[#FAF8F5]/70">
                {selectedBookingService.format}
              </span>
            </div>
            <h3 className="font-serif text-2xl sm:text-3xl text-[#0F172A] dark:text-[#FAF8F5] font-normal">
              {selectedBookingService.title}
            </h3>
            <p className="text-sm text-[#0F172A]/70 dark:text-[#FAF8F5]/70 mt-1 font-light">
              {selectedBookingService.description || "Enter your birth details for astrological analysis."}
            </p>
          </div>

          <div className="text-right shrink-0">
            <span className="font-serif text-2xl sm:text-3xl font-semibold text-[#6B3448] dark:text-[#E5B842]">
              {selectedBookingService.price}
            </span>
            <button
              onClick={closeBookingModal}
              className="block ml-auto mt-2 text-[#0F172A]/50 dark:text-[#FAF8F5]/50 hover:text-[#0F172A] dark:hover:text-[#FAF8F5] p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              aria-label="Close modal"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 max-h-[75vh] overflow-y-auto no-scrollbar">
          {submittedOrder ? (
            /* Celebration / Success Screen */
            <div className="text-center py-6 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#E5B842]/20 border border-[#E5B842]/50 flex items-center justify-center text-3xl">
                ✨
              </div>
              <h4 className="font-serif text-2xl text-[#0F172A] dark:text-[#FAF8F5] mb-2 font-normal">
                Reading Request Received
              </h4>
              <p className="text-sm text-[#0F172A]/70 dark:text-[#FAF8F5]/70 max-w-md mx-auto leading-relaxed mb-6 font-light">
                Your birth details and inquiry for <strong className="font-medium text-[#0F172A] dark:text-[#FAF8F5]">{selectedBookingService.title}</strong> have been securely recorded.
              </p>

              {/* Order Card Preview */}
              <div className="p-5 rounded-2xl bg-white dark:bg-[#1E293B]/80 border border-[#E5B842]/30 max-w-md mx-auto text-left mb-6 shadow-sm">
                <div className="flex items-center justify-between text-xs text-[#0F172A]/60 dark:text-[#FAF8F5]/60 pb-3 border-b border-[#0F172A]/5 dark:border-[#FAF8F5]/10">
                  <span>Order Reference</span>
                  <span className="font-mono text-[#0F172A] dark:text-[#FAF8F5] font-medium">
                    {submittedOrder.id ? submittedOrder.id.slice(0, 8).toUpperCase() : "CONFIRMED"}
                  </span>
                </div>
                <div className="mt-3 space-y-1.5 text-xs text-[#0F172A]/80 dark:text-[#FAF8F5]/80">
                  <div className="flex justify-between">
                    <span className="text-[#0F172A]/50 dark:text-[#FAF8F5]/50">Client:</span>
                    <span className="font-medium">{clientName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#0F172A]/50 dark:text-[#FAF8F5]/50">Birth Details:</span>
                    <span>{clientDob} {clientTimeUncertain ? "(Approx)" : clientTob} · {clientPob}</span>
                  </div>
                  {isMatchmaking && (
                    <div className="flex justify-between pt-1 border-t border-[#0F172A]/5 dark:border-[#FAF8F5]/10">
                      <span className="text-[#0F172A]/50 dark:text-[#FAF8F5]/50">Partner:</span>
                      <span>{partnerName} ({partnerDob})</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-1 font-semibold text-[#0F172A] dark:text-[#FAF8F5]">
                    <span>Amount:</span>
                    <span className="text-[#6B3448] dark:text-[#E5B842]">{selectedBookingService.price}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                {user ? (
                  <button
                    onClick={() => {
                      closeBookingModal();
                      router.push("/account?tab=readings");
                    }}
                    className="w-full sm:w-auto px-6 py-3 rounded-full bg-[#E5B842] hover:bg-[#d6a935] text-[#0F172A] font-semibold text-xs tracking-wider uppercase transition-all shadow-sm cursor-pointer"
                  >
                    View in My Readings →
                  </button>
                ) : (
                  <p className="text-xs text-[#0F172A]/60 dark:text-[#FAF8F5]/60 mb-2">
                    Tip: You can sign in anytime to link your reading to your profile.
                  </p>
                )}
                <button
                  onClick={closeBookingModal}
                  className="w-full sm:w-auto px-6 py-3 rounded-full border border-[#0F172A]/20 dark:border-[#FAF8F5]/20 text-[#0F172A] dark:text-[#FAF8F5] text-xs font-semibold tracking-wider uppercase hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {errorMsg && (
                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Verification & Notice Banner */}
              {isMatchmaking ? (
                <div className="p-4 rounded-2xl bg-[#E5B842]/10 border border-[#E5B842]/30 flex items-start gap-3 text-xs leading-relaxed text-[#0F172A]/80 dark:text-[#FAF8F5]/80">
                  <span className="text-lg">✦</span>
                  <div>
                    <strong className="text-[#6B3448] dark:text-[#E5B842] font-semibold block mb-0.5">
                      Please verify both birth profiles before continuing.
                    </strong>
                    Your saved profile details have been prefilled. You can adjust either person\'s information below specifically for this reading without altering your saved profile.
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-[#E5B842]/10 border border-[#E5B842]/30 text-xs text-[#0F172A]/80 dark:text-[#FAF8F5]/80 flex items-center gap-2.5">
                  <span className="text-base text-[#E5B842]">✦</span>
                  <span>
                    <strong>Please verify your birth details before continuing.</strong> Your saved profile has been prefilled. You may modify details for this booking without changing your profile.
                  </span>
                </div>
              )}

              {/* ── CLIENT DETAILS SECTION (Person 1) ── */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-[#0F172A]/10 dark:border-[#FAF8F5]/10">
                  <span className="w-5 h-5 rounded-full bg-[#E5B842]/20 text-[#6B3448] dark:text-[#E5B842] font-bold text-xs flex items-center justify-center">
                    1
                  </span>
                  <h4 className="font-serif text-lg text-[#0F172A] dark:text-[#FAF8F5] font-normal">
                    {isMatchmaking ? "PERSON 1 DETAILS — YOUR INFO" : "YOUR BIRTH DETAILS"}
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#0F172A]/70 dark:text-[#FAF8F5]/70 mb-1.5">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Amrita Kaur"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-[#1E293B] border border-[#0F172A]/15 dark:border-[#FAF8F5]/15 text-[#0F172A] dark:text-[#FAF8F5] text-sm focus:outline-none focus:border-[#E5B842] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#0F172A]/70 dark:text-[#FAF8F5]/70 mb-1.5">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="you@example.com"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-[#1E293B] border border-[#0F172A]/15 dark:border-[#FAF8F5]/15 text-[#0F172A] dark:text-[#FAF8F5] text-sm focus:outline-none focus:border-[#E5B842] transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#0F172A]/70 dark:text-[#FAF8F5]/70 mb-1.5">
                      Date of Birth (DOB) *
                    </label>
                    <input
                      type="date"
                      required
                      value={clientDob}
                      onChange={(e) => setClientDob(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-[#1E293B] border border-[#0F172A]/15 dark:border-[#FAF8F5]/15 text-[#0F172A] dark:text-[#FAF8F5] text-sm focus:outline-none focus:border-[#E5B842] transition-colors"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-[#0F172A]/70 dark:text-[#FAF8F5]/70">
                        Time of Birth *
                      </label>
                      <label className="inline-flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={clientTimeUncertain}
                          onChange={(e) => setClientTimeUncertain(e.target.checked)}
                          className="rounded text-[#E5B842] focus:ring-[#E5B842]"
                        />
                        <span className="text-[11px] text-[#0F172A]/60 dark:text-[#FAF8F5]/60">
                          Time uncertain
                        </span>
                      </label>
                    </div>
                    <input
                      type="time"
                      disabled={clientTimeUncertain}
                      value={clientTob}
                      onChange={(e) => setClientTob(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-[#1E293B] border border-[#0F172A]/15 dark:border-[#FAF8F5]/15 text-[#0F172A] dark:text-[#FAF8F5] text-sm focus:outline-none focus:border-[#E5B842] disabled:opacity-50 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#0F172A]/70 dark:text-[#FAF8F5]/70 mb-1.5">
                    Place of Birth (City, Country) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Amritsar, India or Berlin, Germany"
                    value={clientPob}
                    onChange={(e) => setClientPob(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-[#1E293B] border border-[#0F172A]/15 dark:border-[#FAF8F5]/15 text-[#0F172A] dark:text-[#FAF8F5] text-sm focus:outline-none focus:border-[#E5B842] transition-colors"
                  />
                </div>
              </div>

              {/* ── PARTNER DETAILS SECTION (Person 2 - ONLY FOR MATCHMAKING) ── */}
              {isMatchmaking && (
                <div className="space-y-4 pt-4 border-t border-[#0F172A]/10 dark:border-[#FAF8F5]/10">
                  <div className="flex items-center gap-2 pb-2 border-b border-[#0F172A]/10 dark:border-[#FAF8F5]/10">
                    <span className="w-5 h-5 rounded-full bg-[#E5B842]/20 text-[#6B3448] dark:text-[#E5B842] font-bold text-xs flex items-center justify-center">
                      2
                    </span>
                    <h4 className="font-serif text-lg text-[#0F172A] dark:text-[#FAF8F5] font-normal">
                      PERSON 2 DETAILS — PARTNER'S INFO
                    </h4>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#0F172A]/70 dark:text-[#FAF8F5]/70 mb-1.5">
                      Partner's Full Name *
                    </label>
                    <input
                      type="text"
                      required={isMatchmaking}
                      placeholder="e.g. Partner Full Name"
                      value={partnerName}
                      onChange={(e) => setPartnerName(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-[#1E293B] border border-[#0F172A]/15 dark:border-[#FAF8F5]/15 text-[#0F172A] dark:text-[#FAF8F5] text-sm focus:outline-none focus:border-[#E5B842] transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-[#0F172A]/70 dark:text-[#FAF8F5]/70 mb-1.5">
                        Partner's Date of Birth (DOB) *
                      </label>
                      <input
                        type="date"
                        required={isMatchmaking}
                        value={partnerDob}
                        onChange={(e) => setPartnerDob(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-[#1E293B] border border-[#0F172A]/15 dark:border-[#FAF8F5]/15 text-[#0F172A] dark:text-[#FAF8F5] text-sm focus:outline-none focus:border-[#E5B842] transition-colors"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wider text-[#0F172A]/70 dark:text-[#FAF8F5]/70">
                          Partner's Time of Birth *
                        </label>
                        <label className="inline-flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={partnerTimeUncertain}
                            onChange={(e) => setPartnerTimeUncertain(e.target.checked)}
                            className="rounded text-[#E5B842] focus:ring-[#E5B842]"
                          />
                          <span className="text-[11px] text-[#0F172A]/60 dark:text-[#FAF8F5]/60">
                            Time uncertain
                          </span>
                        </label>
                      </div>
                      <input
                        type="time"
                        disabled={partnerTimeUncertain}
                        value={partnerTob}
                        onChange={(e) => setPartnerTob(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-[#1E293B] border border-[#0F172A]/15 dark:border-[#FAF8F5]/15 text-[#0F172A] dark:text-[#FAF8F5] text-sm focus:outline-none focus:border-[#E5B842] disabled:opacity-50 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#0F172A]/70 dark:text-[#FAF8F5]/70 mb-1.5">
                      Partner's Place of Birth (City, Country) *
                    </label>
                    <input
                      type="text"
                      required={isMatchmaking}
                      placeholder="e.g. New Delhi, India"
                      value={partnerPob}
                      onChange={(e) => setPartnerPob(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-[#1E293B] border border-[#0F172A]/15 dark:border-[#FAF8F5]/15 text-[#0F172A] dark:text-[#FAF8F5] text-sm focus:outline-none focus:border-[#E5B842] transition-colors"
                    />
                  </div>
                </div>
              )}

              {/* Specific Questions / Notes */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#0F172A]/70 dark:text-[#FAF8F5]/70 mb-1.5">
                  Specific Questions or Focus Areas (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Share any particular questions, challenges, or current life situations you would like addressed in your reading..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-[#1E293B] border border-[#0F172A]/15 dark:border-[#FAF8F5]/15 text-[#0F172A] dark:text-[#FAF8F5] text-sm focus:outline-none focus:border-[#E5B842] transition-colors resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-[#0F172A]/10 dark:border-[#FAF8F5]/10 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs text-[#0F172A]/60 dark:text-[#FAF8F5]/60 text-center sm:text-left">
                  Total: <strong className="text-sm font-semibold text-[#6B3448] dark:text-[#E5B842]">{selectedBookingService.price}</strong>
                  {selectedBookingService.isCall ? " · 30–45 min Voice Call" : " · In-depth Written Reading"}
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={closeBookingModal}
                    className="w-1/2 sm:w-auto px-5 py-2.5 rounded-full border border-[#0F172A]/20 dark:border-[#FAF8F5]/20 text-xs font-semibold tracking-wider uppercase text-[#0F172A] dark:text-[#FAF8F5] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-1/2 sm:w-auto px-7 py-2.5 rounded-full bg-[#E5B842] hover:bg-[#d6a935] disabled:opacity-60 text-[#0F172A] font-semibold text-xs tracking-wider uppercase shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <svg className="animate-spin w-4 h-4 text-[#0F172A]" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        <span>Confirming...</span>
                      </>
                    ) : (
                      <>
                        <span>Submit Intake ✦</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
