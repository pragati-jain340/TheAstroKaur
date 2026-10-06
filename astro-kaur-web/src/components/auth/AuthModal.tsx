"use client";

import React, { useState, useRef } from "react";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { CELESTIAL_AVATARS } from "@/lib/avatar/celestialAvatars";
import { validateImageFile, convertImageToWebP } from "@/lib/avatar/imageToWebP";

export default function AuthModal() {
  const {
    authModalOpen,
    authModalTab,
    setAuthModalTab,
    closeAuthModal,
    signIn,
    signUp,
  } = useAuth();

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState<string>("moon");
  const [customAvatarBlob, setCustomAvatarBlob] = useState<Blob | null>(null);
  const [customAvatarPreview, setCustomAvatarPreview] = useState<string | null>(null);
  const [convertingPhoto, setConvertingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Optional Astrological Birth Details
  const [showBirthDetails, setShowBirthDetails] = useState(false);
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [timeOfBirth, setTimeOfBirth] = useState("");
  const [placeOfBirth, setPlaceOfBirth] = useState("");
  const [timeUncertain, setTimeUncertain] = useState(false);

  if (!authModalOpen) return null;

  const handleCustomPhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      setErrorMsg(validation.error || "Invalid image file.");
      if (photoInputRef.current) photoInputRef.current.value = "";
      return;
    }

    setConvertingPhoto(true);
    try {
      const { blob, previewUrl } = await convertImageToWebP(file, 512, 0.85);
      setCustomAvatarBlob(blob);
      setCustomAvatarPreview(previewUrl);
      setSelectedAvatar(""); // Custom photo overrides preset
    } catch (err: unknown) {
      console.error("Photo processing failed:", err);
      setErrorMsg(err instanceof Error ? err.message : "Failed to process image.");
    } finally {
      setConvertingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setSubmitting(true);

    const res = await signIn(email.trim(), password);
    setSubmitting(false);

    if (res.error) {
      setErrorMsg(res.error);
    } else {
      // Clear inputs
      setEmail("");
      setPassword("");
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!displayName.trim()) {
      setErrorMsg("Please enter your name.");
      return;
    }

    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters long.");
      return;
    }

    setSubmitting(true);

    const birthPayload =
      showBirthDetails && (dateOfBirth || placeOfBirth || timeOfBirth || timeUncertain)
        ? {
            dateOfBirth: dateOfBirth || undefined,
            timeOfBirth: timeUncertain ? undefined : timeOfBirth || undefined,
            placeOfBirth: placeOfBirth.trim() || undefined,
            timeUncertain,
          }
        : undefined;

    const res = await signUp(
      email.trim(),
      password,
      displayName.trim(),
      customAvatarBlob ? null : selectedAvatar || null,
      birthPayload,
      customAvatarBlob
    );
    setSubmitting(false);

    if (res.error) {
      setErrorMsg(res.error);
    } else {
      setSuccessMsg("Account created successfully!");
      setEmail("");
      setPassword("");
      setDisplayName("");
      setDateOfBirth("");
      setTimeOfBirth("");
      setPlaceOfBirth("");
      setTimeUncertain(false);
      setCustomAvatarBlob(null);
      setCustomAvatarPreview(null);
      setSelectedAvatar("moon");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-md animate-in fade-in duration-200"
      onClick={closeAuthModal}
    >
      {/* Modal Container */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl bg-[#FAF8F5] dark:bg-[#0D1829] border border-[#E5B842]/35 shadow-2xl p-6 sm:p-8 text-[#0F172A] dark:text-[#FAF8F5] scrollbar-thin scrollbar-thumb-[#E5B842]/20"
      >
        {/* Subtle Ambient Background Glow */}
        <div className="absolute -top-20 -right-20 w-52 h-52 bg-[#E5B842]/15 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-52 h-52 bg-[#6B3448]/15 dark:bg-[#1E3A8A]/25 rounded-full blur-[80px] pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={closeAuthModal}
          className="absolute top-5 right-5 w-8 h-8 rounded-full border border-[#0F172A]/10 dark:border-[#FAF8F5]/10 flex items-center justify-center text-[#0F172A]/60 dark:text-[#FAF8F5]/60 hover:text-[#0F172A] dark:hover:text-[#FAF8F5] hover:bg-[#E5B842]/10 transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          ✕
        </button>

        {/* Brand Emblem Logo Header */}
        <div className="flex flex-col items-center text-center mb-5">
          <div className="relative w-14 h-14 mb-2">
            <Image
              src="/astro-emblem-light.png?v=6"
              alt="TheAstroKaur"
              fill
              unoptimized
              className="object-contain dark:hidden"
            />
            <Image
              src="/astro-emblem-dark.png?v=6"
              alt="TheAstroKaur"
              fill
              unoptimized
              className="object-contain hidden dark:block"
            />
          </div>
          <h3 className="font-serif text-2xl font-medium tracking-tight">
            TheAstroKaur
          </h3>
          <p className="text-xs text-[#6B3448] dark:text-[#E5B842] tracking-[0.2em] uppercase font-semibold mt-0.5">
            Vedic Astrology Sanctuary
          </p>
        </div>

        {/* Tab Switcher: Sign In / Create Account */}
        <div className="grid grid-cols-2 p-1 rounded-full bg-[#0F172A]/5 dark:bg-[#FAF8F5]/5 border border-[#E5B842]/20 mb-5">
          <button
            type="button"
            onClick={() => {
              setAuthModalTab("signin");
              setErrorMsg(null);
            }}
            className={`py-2 rounded-full text-xs font-semibold tracking-wider uppercase transition-all duration-300 cursor-pointer ${
              authModalTab === "signin"
                ? "bg-[#E5B842] text-[#0F172A] shadow-sm font-bold"
                : "text-[#0F172A]/70 dark:text-[#FAF8F5]/70 hover:text-[#0F172A] dark:hover:text-[#FAF8F5]"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthModalTab("signup");
              setErrorMsg(null);
            }}
            className={`py-2 rounded-full text-xs font-semibold tracking-wider uppercase transition-all duration-300 cursor-pointer ${
              authModalTab === "signup"
                ? "bg-[#E5B842] text-[#0F172A] shadow-sm font-bold"
                : "text-[#0F172A]/70 dark:text-[#FAF8F5]/70 hover:text-[#0F172A] dark:hover:text-[#FAF8F5]"
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Feedback Messages */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-green-500/10 border border-green-500/30 text-green-600 dark:text-green-400 text-xs">
            {successMsg}
          </div>
        )}

        {/* ── Form: SIGN IN ── */}
        {authModalTab === "signin" ? (
          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-[#0F172A]/70 dark:text-[#FAF8F5]/70 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-[#131F33] border border-[#0F172A]/15 dark:border-[#FAF8F5]/15 text-sm focus:outline-none focus:border-[#E5B842] focus:ring-1 focus:ring-[#E5B842] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-[#0F172A]/70 dark:text-[#FAF8F5]/70 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-[#131F33] border border-[#0F172A]/15 dark:border-[#FAF8F5]/15 text-sm focus:outline-none focus:border-[#E5B842] focus:ring-1 focus:ring-[#E5B842] transition-colors pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-[#0F172A]/50 dark:text-[#FAF8F5]/50 hover:text-[#0F172A] dark:hover:text-[#FAF8F5] cursor-pointer"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-2 py-3 rounded-full bg-gradient-to-r from-[#E5B842] via-[#F3CE6D] to-[#E5B842] hover:opacity-95 text-[#0F172A] font-bold text-xs tracking-widest uppercase shadow-[0_4px_16px_rgba(229,184,66,0.35)] transition-all active:scale-[0.98] disabled:opacity-60 cursor-pointer"
            >
              {submitting ? "Signing in..." : "Sign In"}
            </button>
          </form>
        ) : (
          /* ── Form: CREATE ACCOUNT ── */
          <form onSubmit={handleSignUp} className="space-y-3.5">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-[#0F172A]/70 dark:text-[#FAF8F5]/70 mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your Full Name"
                className="w-full px-4 py-2 rounded-xl bg-white dark:bg-[#131F33] border border-[#0F172A]/15 dark:border-[#FAF8F5]/15 text-sm focus:outline-none focus:border-[#E5B842] focus:ring-1 focus:ring-[#E5B842] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-[#0F172A]/70 dark:text-[#FAF8F5]/70 mb-1">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className={`w-full px-4 py-2 rounded-xl bg-white dark:bg-[#131F33] text-sm focus:outline-none transition-all ${
                  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
                    ? "border border-emerald-500/60 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30"
                    : email.length > 2
                    ? "border border-amber-500/50 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30"
                    : "border border-[#0F172A]/15 dark:border-[#FAF8F5]/15 focus:border-[#E5B842] focus:ring-1 focus:ring-[#E5B842]"
                }`}
              />
              {email.length > 2 && (
                <div className="flex items-center gap-1.5 text-[11px] mt-1 transition-all">
                  {/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ? (
                    <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span>✓ Valid email address</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      <span>Please enter a full email (e.g. name@domain.com)</span>
                    </span>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-[#0F172A]/70 dark:text-[#FAF8F5]/70 mb-1">
                Create Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => {
                    const val = e.target.value;
                    setPassword(val);
                    if (val.length >= 6 && errorMsg === "Password must be at least 6 characters long.") {
                      setErrorMsg(null);
                    }
                  }}
                  placeholder="At least 6 characters"
                  className={`w-full px-4 py-2 rounded-xl bg-white dark:bg-[#131F33] text-sm focus:outline-none transition-all pr-12 ${
                    password.length >= 6
                      ? "border border-emerald-500/60 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30"
                      : password.length > 0
                      ? "border border-amber-500/50 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30"
                      : "border border-[#0F172A]/15 dark:border-[#FAF8F5]/15 focus:border-[#E5B842] focus:ring-1 focus:ring-[#E5B842]"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-[#0F172A]/50 dark:text-[#FAF8F5]/50 hover:text-[#0F172A] dark:hover:text-[#FAF8F5] cursor-pointer"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>

              {/* Live Password Requirement Status (Green Light / Amber Countdown) */}
              {password.length > 0 && (
                <div className="flex items-center justify-between text-[11px] mt-1.5 transition-all">
                  {password.length >= 6 ? (
                    <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                      <span>✓ Ready! Minimum 6 characters satisfied</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      <span>{6 - password.length} more character{6 - password.length > 1 ? "s" : ""} required (min 6)</span>
                    </span>
                  )}
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md ${
                    password.length >= 6
                      ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 font-bold"
                      : "text-[#0F172A]/50 dark:text-[#FAF8F5]/50 bg-[#0F172A]/5 dark:bg-[#FAF8F5]/5"
                  }`}>
                    {password.length}/6
                  </span>
                </div>
              )}
            </div>

            {/* Optional Profile Avatar: Upload Photo or Celestial Avatar */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium uppercase tracking-wider text-[#0F172A]/70 dark:text-[#FAF8F5]/70">
                  Profile Avatar <span className="text-[10px] lowercase text-[#E5B842]">(optional)</span>
                </label>
                {(customAvatarPreview || selectedAvatar) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedAvatar("");
                      setCustomAvatarBlob(null);
                      setCustomAvatarPreview(null);
                    }}
                    className="text-[10px] text-[#0F172A]/40 dark:text-[#FAF8F5]/40 hover:text-red-500 transition-colors cursor-pointer"
                  >
                    Skip
                  </button>
                )}
              </div>

              <input
                ref={photoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                onChange={handleCustomPhotoSelect}
                className="hidden"
              />

              <div className="flex items-center gap-2">
                {/* Upload Photo Option */}
                {customAvatarPreview ? (
                  <div className="relative w-11 h-9 rounded-xl overflow-hidden border-2 border-[#E5B842] shrink-0 group">
                    <img src={customAvatarPreview} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        setCustomAvatarBlob(null);
                        setCustomAvatarPreview(null);
                      }}
                      className="absolute inset-0 bg-black/60 text-white text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      title="Remove uploaded photo"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    disabled={convertingPhoto}
                    className="px-2.5 py-1.5 rounded-xl border border-dashed border-[#E5B842]/60 hover:border-[#E5B842] hover:bg-[#E5B842]/10 text-xs font-semibold text-[#0F172A] dark:text-[#FAF8F5] flex items-center gap-1 transition-all cursor-pointer shrink-0 disabled:opacity-50"
                    title="Upload your own photo (PNG, JPG)"
                  >
                    <span>📷</span>
                    <span className="text-[11px]">{convertingPhoto ? "…" : "+ Photo"}</span>
                  </button>
                )}

                {/* Celestial Avatar Options */}
                <div className="flex items-center gap-1 flex-1">
                  {CELESTIAL_AVATARS.map((av) => {
                    const active = !customAvatarPreview && selectedAvatar === av.id;
                    return (
                      <button
                        key={av.id}
                        type="button"
                        onClick={() => {
                          setCustomAvatarBlob(null);
                          setCustomAvatarPreview(null);
                          setSelectedAvatar(av.id);
                        }}
                        className={`flex-1 py-1.5 rounded-xl border text-sm flex flex-col items-center justify-center transition-all cursor-pointer ${
                          active
                            ? "border-[#E5B842] bg-[#E5B842]/20 scale-105 shadow-2xs"
                            : "border-[#0F172A]/10 dark:border-[#FAF8F5]/10 hover:border-[#E5B842]/50 hover:bg-[#E5B842]/5"
                        }`}
                        title={`${av.label} — ${av.meaning}`}
                      >
                        <span>{av.symbol}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ── Optional Astrological Birth Details Accordion ── */}
            <div className="pt-1 border-t border-[#0F172A]/10 dark:border-[#FAF8F5]/10">
              <button
                type="button"
                onClick={() => setShowBirthDetails(!showBirthDetails)}
                className="w-full flex items-center justify-between py-2 text-xs font-medium text-[#6B3448] dark:text-[#E5B842] hover:opacity-80 transition-opacity cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <span>✦</span>
                  <span className="font-semibold tracking-wide">
                    Birth Chart Details (Optional)
                  </span>
                </span>
                <span className="text-xs transition-transform duration-200">
                  {showBirthDetails ? "▲" : "▼"}
                </span>
              </button>

              {showBirthDetails && (
                <div className="p-3.5 rounded-2xl bg-[#0F172A]/[0.03] dark:bg-[#FAF8F5]/[0.03] border border-[#E5B842]/20 space-y-3 mt-1 animate-in fade-in duration-200">
                  <p className="text-[11px] text-[#0F172A]/60 dark:text-[#FAF8F5]/60 leading-relaxed font-light">
                    Used to calculate your Vedic rising sign & planetary placements for consultations.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-[#0F172A]/70 dark:text-[#FAF8F5]/70 mb-1">
                        Date of Birth
                      </label>
                      <input
                        type="date"
                        value={dateOfBirth}
                        onChange={(e) => setDateOfBirth(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-[#131F33] border border-[#0F172A]/15 dark:border-[#FAF8F5]/15 text-xs focus:outline-none focus:border-[#E5B842]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-[#0F172A]/70 dark:text-[#FAF8F5]/70 mb-1">
                        Time of Birth
                      </label>
                      <input
                        type="time"
                        disabled={timeUncertain}
                        value={timeOfBirth}
                        onChange={(e) => setTimeOfBirth(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-[#131F33] border border-[#0F172A]/15 dark:border-[#FAF8F5]/15 text-xs focus:outline-none focus:border-[#E5B842] disabled:opacity-40"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-[#0F172A]/70 dark:text-[#FAF8F5]/70 mb-1">
                      Place of Birth
                    </label>
                    <input
                      type="text"
                      value={placeOfBirth}
                      onChange={(e) => setPlaceOfBirth(e.target.value)}
                      placeholder="e.g. New Delhi, India or Berlin, Germany"
                      className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-[#131F33] border border-[#0F172A]/15 dark:border-[#FAF8F5]/15 text-xs focus:outline-none focus:border-[#E5B842]"
                    />
                  </div>

                  <label className="flex items-center gap-2 text-[11px] text-[#0F172A]/70 dark:text-[#FAF8F5]/70 cursor-pointer pt-0.5">
                    <input
                      type="checkbox"
                      checked={timeUncertain}
                      onChange={(e) => setTimeUncertain(e.target.checked)}
                      className="rounded accent-[#E5B842]"
                    />
                    <span>I don&apos;t know my exact birth time</span>
                  </label>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-2 py-3 rounded-full bg-gradient-to-r from-[#E5B842] via-[#F3CE6D] to-[#E5B842] hover:opacity-95 text-[#0F172A] font-bold text-xs tracking-widest uppercase shadow-[0_4px_16px_rgba(229,184,66,0.35)] transition-all active:scale-[0.98] disabled:opacity-60 cursor-pointer"
            >
              {submitting ? "Creating Account..." : "Create Account"}
            </button>
          </form>
        )}

        {/* Footer Note */}
        <p className="mt-4 text-center text-[11px] text-[#0F172A]/60 dark:text-[#FAF8F5]/60">
          By signing in, you agree to our Terms of Service & Privacy Policy.
        </p>
      </div>
    </div>
  );
}
