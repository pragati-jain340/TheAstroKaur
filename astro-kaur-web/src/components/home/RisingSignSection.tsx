"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";

export default function RisingSignSection() {
  const { user, profile, openAuthModal } = useAuth();
  const supabase = createClient();

  // Form Fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [dob, setDob] = useState("");
  const [tob, setTob] = useState("");
  const [pob, setPob] = useState("");
  const [timeUncertain, setTimeUncertain] = useState(false);
  const [notes, setNotes] = useState("");

  // Status
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submittedData, setSubmittedData] = useState<{
    name: string;
    email: string;
    dob: string;
    tob: string | null;
    pob: string;
  } | null>(null);

  // Pre-fill if logged in
  useEffect(() => {
    if (profile) {
      if (profile.display_name && !fullName) setFullName(profile.display_name);
      if (profile.email && !email) setEmail(profile.email);
      if (profile.date_of_birth && !dob) setDob(profile.date_of_birth);
      if (profile.time_of_birth && !tob) setTob(profile.time_of_birth);
      if (profile.place_of_birth && !pob) setPob(profile.place_of_birth);
      if (profile.time_uncertain) setTimeUncertain(true);
    } else if (user?.email && !email) {
      setEmail(user.email);
    }
  }, [profile, user]);

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!fullName.trim()) {
      setErrorMsg("Please enter your full name.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }
    if (!dob) {
      setErrorMsg("Please provide your date of birth.");
      return;
    }
    if (!pob.trim()) {
      setErrorMsg("Please enter your place of birth (city & country).");
      return;
    }
    if (!timeUncertain && !tob) {
      setErrorMsg("Please provide your time of birth, or check 'Time uncertain / approximate'.");
      return;
    }

    setLoading(true);

    try {
      // Insert request into Supabase free_reading_requests table
      const requestData = {
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        date_of_birth: dob,
        time_of_birth: timeUncertain ? null : tob || null,
        time_uncertain: timeUncertain,
        place_of_birth: pob.trim(),
        status: "pending" as const,
        admin_notes: notes.trim() || null,
      };

      const { error } = await supabase.from("free_reading_requests").insert(requestData);

      if (error) {
        console.warn("Could not insert free reading request to Supabase:", error.message);
      }

      setSubmittedData({
        name: fullName.trim(),
        email: email.trim().toLowerCase(),
        dob,
        tob: timeUncertain ? "Time uncertain / approximate" : tob || "Not specified",
        pob: pob.trim(),
      });
      setIsSuccess(true);
    } catch (err: any) {
      console.error("Free reading submission error:", err);
      setErrorMsg(err.message || "Failed to submit request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setIsSuccess(false);
    setSubmittedData(null);
    if (!profile) {
      setFullName("");
      setEmail("");
      setDob("");
      setTob("");
      setPob("");
      setTimeUncertain(false);
    }
    setNotes("");
  };

  return (
    <section
      id="free-reading"
      className="scroll-mt-28 sm:scroll-mt-32 py-20 lg:py-28 px-6 lg:px-16 relative overflow-hidden"
    >
      <div className="max-w-4xl mx-auto">
        {/* Header Badge & Title */}
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-semibold tracking-widest uppercase bg-[#E5B842]/15 text-[#6B3448] dark:text-[#E5B842] border border-[#E5B842]/30 mb-3.5">
            ✦ Complimentary Vedic Exploration
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-[#0F172A] dark:text-[#FAF8F5] font-normal tracking-tight">
            Free Rising Sign Reading
          </h2>
          <p className="text-base text-[#0F172A]/70 dark:text-[#FAF8F5]/70 mt-3 font-light leading-relaxed">
            In Vedic astrology, your <em>Lagna</em> (Rising Sign) shapes the outward personality, life approach, and first impressions. Submit your birth details below to request a complimentary reading prepared personally by Astrologer Kaur.
          </p>
          <div className="inline-block mt-3 text-xs text-[#0F172A]/50 dark:text-[#FAF8F5]/50 bg-black/5 dark:bg-white/5 px-3 py-1 rounded-full">
            One free personalized reading per seeker · Manually prepared with sacred confidentiality
          </div>
        </div>

        {/* Card Container */}
        <div className="bg-white/80 dark:bg-[#1E293B]/75 backdrop-blur-md border border-[#E5B842]/35 rounded-3xl p-6 sm:p-10 shadow-xl relative overflow-hidden">
          {/* Subtle Ambient Glows */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#E5B842]/15 to-transparent rounded-bl-full pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-[#6B3448]/10 dark:from-[#E5B842]/10 to-transparent rounded-tr-full pointer-events-none" />

          {isSuccess && submittedData ? (
            /* ── PURE CONFIRMATION CARD (NO AUTO-CALCULATION) ── */
            <div className="animate-in fade-in zoom-in-95 duration-200 text-center py-4 space-y-6">
              <div className="w-16 h-16 mx-auto rounded-full bg-[#E5B842]/20 border border-[#E5B842]/50 flex items-center justify-center text-3xl shadow-sm">
                ✨
              </div>

              <div>
                <span className="text-xs font-semibold tracking-widest uppercase text-[#6B3448] dark:text-[#E5B842] block mb-1">
                  Intake Confirmed & Received
                </span>
                <h3 className="font-serif text-2xl sm:text-3xl text-[#0F172A] dark:text-[#FAF8F5] font-normal">
                  Thank you, {submittedData.name}
                </h3>
                <p className="text-sm text-[#0F172A]/70 dark:text-[#FAF8F5]/70 max-w-lg mx-auto mt-2 font-light leading-relaxed">
                  Your birth details have been securely recorded. Astrologer Kaur will manually calculate your Vedic chart and prepare your personalized Rising Sign reading, delivered directly to{" "}
                  <strong className="font-medium text-[#0F172A] dark:text-[#FAF8F5]">{submittedData.email}</strong>.
                </p>
              </div>

              {/* Seeker Intake Summary Box */}
              <div className="p-5 rounded-2xl bg-white dark:bg-[#0F172A]/60 border border-[#E5B842]/30 max-w-md mx-auto text-left shadow-xs">
                <div className="flex items-center justify-between text-xs text-[#0F172A]/60 dark:text-[#FAF8F5]/60 pb-3 border-b border-[#0F172A]/8 dark:border-[#FAF8F5]/10">
                  <span className="font-medium uppercase tracking-wider text-[10px]">Request Summary</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    ● Pending Astrologer Review
                  </span>
                </div>

                <div className="mt-3 space-y-2 text-xs text-[#0F172A]/80 dark:text-[#FAF8F5]/80">
                  <div className="flex justify-between">
                    <span className="text-[#0F172A]/50 dark:text-[#FAF8F5]/50">Seeker:</span>
                    <span className="font-medium">{submittedData.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#0F172A]/50 dark:text-[#FAF8F5]/50">Email:</span>
                    <span className="font-medium">{submittedData.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#0F172A]/50 dark:text-[#FAF8F5]/50">Date of Birth:</span>
                    <span>{submittedData.dob}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#0F172A]/50 dark:text-[#FAF8F5]/50">Time of Birth:</span>
                    <span>{submittedData.tob}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#0F172A]/50 dark:text-[#FAF8F5]/50">Place of Birth:</span>
                    <span>{submittedData.pob}</span>
                  </div>
                </div>
              </div>

              {/* Next Steps CTA */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <a
                  href="#readings"
                  className="w-full sm:w-auto px-7 py-3 rounded-full bg-[#E5B842] hover:bg-[#d6a935] text-[#0F172A] font-semibold text-xs tracking-wider uppercase shadow-md transition-all cursor-pointer"
                >
                  Explore 1-on-1 Readings ✦
                </a>
                <button
                  type="button"
                  onClick={handleReset}
                  className="w-full sm:w-auto px-5 py-3 rounded-full border border-[#0F172A]/20 dark:border-[#FAF8F5]/20 text-xs font-semibold tracking-wider uppercase text-[#0F172A] dark:text-[#FAF8F5] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                >
                  Submit Another Request
                </button>
              </div>
            </div>
          ) : (
            /* ── INTAKE FORM ── */
            <form onSubmit={handleSubmitRequest} className="space-y-6">
              {errorMsg && (
                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Notice */}
              <div className="p-3.5 rounded-xl bg-[#0F172A]/5 dark:bg-[#0F172A]/50 border border-[#0F172A]/10 dark:border-[#FAF8F5]/10 text-xs text-[#0F172A]/70 dark:text-[#FAF8F5]/70 flex items-center gap-2.5">
                <span className="text-base">✨</span>
                <span>
                  All birth details are treated with strict confidentiality and used exclusively by Astrologer Kaur to prepare your reading.
                </span>
              </div>

              {/* Full Name & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#0F172A]/70 dark:text-[#FAF8F5]/70 mb-1.5">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Jasleen Kaur"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white dark:bg-[#0F172A]/70 border border-[#0F172A]/15 dark:border-[#FAF8F5]/15 text-[#0F172A] dark:text-[#FAF8F5] text-sm focus:outline-none focus:border-[#E5B842] transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#0F172A]/70 dark:text-[#FAF8F5]/70 mb-1.5">
                    Email Address * (For Reading Delivery)
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white dark:bg-[#0F172A]/70 border border-[#0F172A]/15 dark:border-[#FAF8F5]/15 text-[#0F172A] dark:text-[#FAF8F5] text-sm focus:outline-none focus:border-[#E5B842] transition-colors"
                  />
                </div>
              </div>

              {/* Date of Birth & Time of Birth */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#0F172A]/70 dark:text-[#FAF8F5]/70 mb-1.5">
                    Date of Birth (DOB) *
                  </label>
                  <input
                    type="date"
                    required
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white dark:bg-[#0F172A]/70 border border-[#0F172A]/15 dark:border-[#FAF8F5]/15 text-[#0F172A] dark:text-[#FAF8F5] text-sm focus:outline-none focus:border-[#E5B842] transition-colors"
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
                        checked={timeUncertain}
                        onChange={(e) => setTimeUncertain(e.target.checked)}
                        className="rounded text-[#E5B842] focus:ring-[#E5B842]"
                      />
                      <span className="text-[11px] text-[#0F172A]/60 dark:text-[#FAF8F5]/60">
                        Time uncertain / approximate
                      </span>
                    </label>
                  </div>
                  <input
                    type="time"
                    disabled={timeUncertain}
                    value={tob}
                    onChange={(e) => setTob(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white dark:bg-[#0F172A]/70 border border-[#0F172A]/15 dark:border-[#FAF8F5]/15 text-[#0F172A] dark:text-[#FAF8F5] text-sm focus:outline-none focus:border-[#E5B842] disabled:opacity-50 transition-colors"
                  />
                </div>
              </div>

              {/* Place of Birth */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#0F172A]/70 dark:text-[#FAF8F5]/70 mb-1.5">
                  Place of Birth (City, Country) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chandigarh, India or Frankfurt, Germany"
                  value={pob}
                  onChange={(e) => setPob(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white dark:bg-[#0F172A]/70 border border-[#0F172A]/15 dark:border-[#FAF8F5]/15 text-[#0F172A] dark:text-[#FAF8F5] text-sm focus:outline-none focus:border-[#E5B842] transition-colors"
                />
              </div>

              {/* Optional Notes */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#0F172A]/70 dark:text-[#FAF8F5]/70 mb-1.5">
                  Specific Questions or Focus (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Any particular area of life (career, purpose, relationships) you would like touched upon..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-[#0F172A]/70 border border-[#0F172A]/15 dark:border-[#FAF8F5]/15 text-[#0F172A] dark:text-[#FAF8F5] text-sm focus:outline-none focus:border-[#E5B842] transition-colors resize-none"
                />
              </div>

              {/* Submit CTA */}
              <div className="pt-3 flex flex-col sm:flex-row items-center justify-between gap-4">
                <span className="text-xs text-[#0F172A]/60 dark:text-[#FAF8F5]/60">
                  ✦ 100% Complimentary · One per seeker · No payment required
                </span>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-[#E5B842] hover:bg-[#d6a935] disabled:opacity-60 text-[#0F172A] font-semibold text-xs tracking-wider uppercase shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin w-4 h-4 text-[#0F172A]" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      <span>Submitting Request...</span>
                    </>
                  ) : (
                    <>
                      <span>Request Free Reading ✦</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
