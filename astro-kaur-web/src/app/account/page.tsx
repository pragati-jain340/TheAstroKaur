"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import SubpageBackground from "@/components/layout/SubpageBackground";
import AvatarDisplay from "@/components/avatar/AvatarDisplay";
import AvatarPickerModal from "@/components/avatar/AvatarPickerModal";

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = "profile" | "readings" | "receipts";

interface Order {
  id: string;
  service_title: string;
  format: "text" | "voice_call";
  price_eur: number;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  payment_status: "pending" | "paid" | "failed" | "refunded";
  scheduled_at: string | null;
  stripe_receipt_url: string | null;
  review_rating: number | null;
  review_text: string | null;
  review_created_at: string | null;
  created_at: string;
}

type ReadingsFilter = "all" | "upcoming" | "completed";

// ─── Formatting Helpers ───────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return "Not set";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatTime(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatPrice(eur: number): string {
  return `€${Number(eur).toFixed(2)}`;
}

function formatBirthTime(t: string | null): string {
  if (!t) return "Not set";
  const parts = t.split(":");
  const hour = parseInt(parts[0], 10);
  const m = parts[1] || "00";
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

// ─── Inline Review Form Component ─────────────────────────────────────────────

function LeaveReviewInline({
  orderId,
  onSubmitted,
}: {
  orderId: string;
  onSubmitted: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const supabase = createClient();

  const submit = async () => {
    if (!rating) {
      setError("Please select a star rating.");
      return;
    }
    setSaving(true);
    const { error: err } = await supabase
      .from("orders")
      .update({
        review_rating: rating,
        review_text: text.trim() || null,
        review_created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    setOpen(false);
    onSubmitted();
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0F172A]/70 dark:text-[#FAF8F5]/70 hover:text-[#E5B842] transition-colors cursor-pointer"
      >
        <span className="text-[#E5B842] text-sm">☆</span> Leave a Review
      </button>
    );
  }

  return (
    <div className="w-full mt-4 pt-4 border-t border-[#0F172A]/10 dark:border-[#FAF8F5]/10 space-y-3">
      <p className="text-[11px] font-bold uppercase tracking-widest text-[#0F172A]/60 dark:text-[#FAF8F5]/60">
        Leave a Review
      </p>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            className="text-2xl transition-transform hover:scale-110 cursor-pointer"
          >
            <span
              className={
                (hovered || rating) >= star
                  ? "text-[#E5B842]"
                  : "text-[#0F172A]/20 dark:text-[#FAF8F5]/20"
              }
            >
              ★
            </span>
          </button>
        ))}
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Share your experience (optional)..."
        rows={3}
        className="w-full text-sm px-4 py-2.5 rounded-xl bg-[#0F172A]/5 dark:bg-[#FAF8F5]/5 border border-[#0F172A]/10 dark:border-[#FAF8F5]/10 text-[#0F172A] dark:text-[#FAF8F5] placeholder:text-[#0F172A]/30 dark:placeholder:text-[#FAF8F5]/30 resize-none focus:outline-none focus:ring-2 focus:ring-[#E5B842]/40"
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex items-center gap-2">
        <button
          onClick={submit}
          disabled={saving}
          className="px-5 py-2 rounded-xl text-xs font-semibold bg-[#E5B842] text-[#0F172A] hover:bg-[#F3CE6D] transition-colors disabled:opacity-60 cursor-pointer"
        >
          {saving ? "Submitting…" : "Submit Review"}
        </button>
        <button
          onClick={() => {
            setOpen(false);
            setError("");
          }}
          className="px-4 py-2 rounded-xl text-xs font-medium text-[#0F172A]/50 dark:text-[#FAF8F5]/50 hover:bg-[#0F172A]/5 dark:hover:bg-[#FAF8F5]/5 transition-colors cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Reading Card Component ───────────────────────────────────────────────────

function ReadingCard({ order, onReviewSubmitted }: { order: Order; onReviewSubmitted: () => void }) {
  const router = useRouter();
  const isUpcoming = order.status === "confirmed" || order.status === "pending";
  const isCompleted = order.status === "completed";
  const hasReview = !!order.review_rating;

  return (
    <div className="relative bg-[#FAF8F5] dark:bg-[#0D1829] border border-[#E5B842]/20 hover:border-[#E5B842]/40 rounded-2xl md:rounded-3xl p-6 md:p-8 transition-all duration-300 shadow-sm hover:shadow-[0_8px_30px_rgba(229,184,66,0.08)]">
      <div className="flex items-start gap-4 sm:gap-5">
        {/* Astrology Emblem */}
        <div className="w-10 h-10 rounded-full bg-[#E5B842]/10 flex items-center justify-center flex-shrink-0 text-[#E5B842] text-lg font-serif">
          ✦
        </div>

        {/* Content Details */}
        <div className="flex-1 min-w-0">
          <h3 className="font-serif text-lg sm:text-xl font-semibold text-[#0F172A] dark:text-[#FAF8F5] uppercase tracking-wide leading-snug">
            {order.service_title}
          </h3>
          <p className="text-xs text-[#0F172A]/50 dark:text-[#FAF8F5]/50 mt-1">
            {order.service_title} · Vedic Astrology
          </p>

          {/* Status & Date */}
          <div className="mt-4">
            {isUpcoming ? (
              <div>
                <p className="text-[10px] font-bold tracking-widest text-[#E5B842] uppercase">
                  UPCOMING
                </p>
                <p className="text-xs font-medium text-[#0F172A]/80 dark:text-[#FAF8F5]/80 mt-0.5">
                  {order.scheduled_at
                    ? `${formatDate(order.scheduled_at).toUpperCase()} · ${formatTime(order.scheduled_at)}`
                    : formatDate(order.created_at).toUpperCase()}
                </p>
              </div>
            ) : isCompleted ? (
              <p className="text-xs font-medium tracking-wide text-[#0F172A]/70 dark:text-[#FAF8F5]/70 uppercase">
                COMPLETED · {formatDate(order.created_at)}
              </p>
            ) : (
              <p className="text-xs font-medium tracking-wide text-[#0F172A]/60 dark:text-[#FAF8F5]/60 uppercase">
                {order.status} · {formatDate(order.created_at)}
              </p>
            )}
          </div>

          {/* Format & Price */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#0F172A]/6 dark:border-[#FAF8F5]/6">
            <span className="text-xs font-medium text-[#0F172A]/60 dark:text-[#FAF8F5]/60">
              {order.format === "voice_call" ? "Voice Call" : "Text Reading"}
            </span>
            <span className="font-serif text-lg font-semibold text-[#0F172A] dark:text-[#FAF8F5]">
              {formatPrice(order.price_eur)}
            </span>
          </div>

          {/* Actions */}
          <div className="mt-4 pt-3 border-t border-[#0F172A]/6 dark:border-[#FAF8F5]/6 flex flex-wrap items-center justify-between gap-3">
            <button
              onClick={() => router.push(`/account/readings/${order.id}`)}
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-[#0F172A] dark:text-[#FAF8F5] hover:text-[#E5B842] transition-colors cursor-pointer group"
            >
              <span>View Details</span>
              <span className="text-[#E5B842] transition-transform duration-200 group-hover:translate-x-1">→</span>
            </button>

            {/* Leave a review button for completed readings without review */}
            {isCompleted && !hasReview && (
              <LeaveReviewInline orderId={order.id} onSubmitted={onReviewSubmitted} />
            )}
          </div>

          {/* Already reviewed display */}
          {isCompleted && hasReview && (
            <div className="mt-4 pt-4 border-t border-[#0F172A]/6 dark:border-[#FAF8F5]/6 space-y-1">
              <div className="flex gap-0.5 text-sm">
                {[1, 2, 3, 4, 5].map((s) => (
                  <span
                    key={s}
                    className={
                      s <= (order.review_rating ?? 0)
                        ? "text-[#E5B842]"
                        : "text-[#0F172A]/15 dark:text-[#FAF8F5]/15"
                    }
                  >
                    ★
                  </span>
                ))}
              </div>
              {order.review_text && (
                <p className="text-xs italic text-[#0F172A]/70 dark:text-[#FAF8F5]/70 line-clamp-2">
                  "{order.review_text}"
                </p>
              )}
              <p className="text-[10px] text-[#0F172A]/40 dark:text-[#FAF8F5]/40">
                Your review · {formatDate(order.review_created_at)}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Profile Tab with INLINE Editing (No Modal) ───────────────────────────────

function ProfileTab() {
  const { user, profile, updateProfile, refreshProfile, isAdmin } = useAuth();
  const isAdminUser = isAdmin || profile?.role === "admin";

  const [isEditing, setIsEditing] = useState(false);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form State
  const [displayName, setDisplayName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [timeOfBirth, setTimeOfBirth] = useState("");
  const [placeOfBirth, setPlaceOfBirth] = useState("");
  const [timeUncertain, setTimeUncertain] = useState(false);

  // Partner Form State
  const [partnerName, setPartnerName] = useState("");
  const [partnerDateOfBirth, setPartnerDateOfBirth] = useState("");
  const [partnerTimeOfBirth, setPartnerTimeOfBirth] = useState("");
  const [partnerPlaceOfBirth, setPartnerPlaceOfBirth] = useState("");
  const [partnerTimeUncertain, setPartnerTimeUncertain] = useState(false);

  // Sync form state when profile loads or editing begins
  const syncFormFromProfile = useCallback(() => {
    if (!profile) return;
    setDisplayName(profile.display_name || "");
    setDateOfBirth(profile.date_of_birth || "");
    setTimeOfBirth(profile.time_of_birth || "");
    setPlaceOfBirth(profile.place_of_birth || "");
    setTimeUncertain(!!profile.time_uncertain);

    setPartnerName(profile.partner_name || "");
    setPartnerDateOfBirth(profile.partner_date_of_birth || "");
    setPartnerTimeOfBirth(profile.partner_time_of_birth || "");
    setPartnerPlaceOfBirth(profile.partner_place_of_birth || "");
    setPartnerTimeUncertain(!!profile.partner_time_uncertain);
  }, [profile]);

  useEffect(() => {
    syncFormFromProfile();
  }, [syncFormFromProfile]);

  const handleStartEdit = () => {
    syncFormFromProfile();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    syncFormFromProfile();
    setErrorMsg(null);
    setIsEditing(false);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setSaving(true);

    const updatePayload: Parameters<typeof updateProfile>[0] = {
      displayName: displayName.trim() || undefined,
      dateOfBirth: dateOfBirth || null,
      timeOfBirth: timeUncertain ? null : timeOfBirth || null,
      placeOfBirth: placeOfBirth.trim() || null,
      timeUncertain,
    };

    if (!isAdminUser) {
      updatePayload.partnerName = partnerName.trim() || null;
      updatePayload.partnerDateOfBirth = partnerDateOfBirth || null;
      updatePayload.partnerTimeOfBirth = partnerTimeUncertain ? null : partnerTimeOfBirth || null;
      updatePayload.partnerPlaceOfBirth = partnerPlaceOfBirth.trim() || null;
      updatePayload.partnerTimeUncertain = partnerTimeUncertain;
    }

    const res = await updateProfile(updatePayload);

    setSaving(false);

    if (res.error) {
      setErrorMsg(res.error);
    } else {
      setSuccessMsg("Your profile and birth details have been saved successfully.");
      setIsEditing(false);
      // Auto clear success message after 4 seconds
      setTimeout(() => setSuccessMsg(null), 4000);
    }
  };

  const hasSavedPartner = !!(
    profile?.partner_name ||
    profile?.partner_date_of_birth ||
    profile?.partner_place_of_birth
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-[#0F172A]/8 dark:border-[#FAF8F5]/8">
        <div>
          {isAdminUser ? (
            <div className="flex items-center gap-2 mb-1">
              <p className="text-[10px] font-bold tracking-widest text-[#E5B842] uppercase">
                ADMINISTRATOR ACCOUNT
              </p>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold tracking-widest uppercase bg-[#E5B842] text-[#0F172A] shadow-xs">
                ADMIN
              </span>
            </div>
          ) : (
            <p className="text-[10px] font-bold tracking-widest text-[#E5B842] uppercase mb-1">
              YOUR DETAILS
            </p>
          )}
          <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-[#0F172A] dark:text-[#FAF8F5]">
            {isAdminUser ? "Profile" : "My Profile"}
          </h2>
          <p className="mt-1 text-sm text-[#0F172A]/60 dark:text-[#FAF8F5]/60 leading-relaxed">
            {isAdminUser
              ? "Manage your personal administrator details and account settings."
              : "Keep your personal and birth details up to date for your astrology readings."}
          </p>
        </div>

        {!isEditing && (
          <button
            onClick={handleStartEdit}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-semibold bg-[#E5B842] text-[#0F172A] hover:bg-[#F3CE6D] transition-all shadow-sm cursor-pointer whitespace-nowrap self-start sm:self-end"
          >
            <span>Edit Profile</span>
            <span>→</span>
          </button>
        )}
      </div>

      {/* ─── Profile Avatar Area ─── */}
      <div className="p-5 sm:p-6 rounded-2xl md:rounded-3xl bg-[#FAF8F5] dark:bg-[#0D1829] border border-[#E5B842]/25 flex items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-4 sm:gap-5">
          <button
            type="button"
            onClick={() => setAvatarModalOpen(true)}
            className="group relative cursor-pointer focus:outline-none rounded-full"
            title="Click to change avatar"
          >
            <AvatarDisplay
              avatarUrl={profile?.avatar_url}
              avatarSeed={profile?.avatar_seed}
              name={displayName || profile?.display_name}
              size="xl"
              showBorder={true}
            />
            <span className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[11px] font-semibold">
              Change
            </span>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-serif text-lg sm:text-xl font-semibold text-[#0F172A] dark:text-[#FAF8F5]">
                {displayName || profile?.display_name || (isAdminUser ? "Administrator" : "Celestial Member")}
              </h3>
              {isAdminUser && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold tracking-widest uppercase bg-[#E5B842] text-[#0F172A] shadow-xs">
                  ADMIN
                </span>
              )}
            </div>
            <p className="text-xs text-[#0F172A]/60 dark:text-[#FAF8F5]/60 mt-0.5">
              {profile?.avatar_url
                ? "Custom Photo (WebP)"
                : profile?.avatar_seed
                ? `Celestial Avatar (${profile.avatar_seed.toUpperCase()})`
                : "Initial Monogram Fallback"}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setAvatarModalOpen(true)}
          className="px-4 py-2 rounded-full text-xs font-semibold border border-[#E5B842] text-[#0F172A] dark:text-[#FAF8F5] hover:bg-[#E5B842]/15 transition-colors cursor-pointer shrink-0 shadow-2xs"
        >
          Change Avatar
        </button>
      </div>

      {/* Success Banner */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-3 animate-in fade-in duration-200">
          <span className="text-base text-emerald-600">✓</span>
          <span className="font-medium">{successMsg}</span>
        </div>
      )}

      {/* Error Banner */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-300 text-xs flex items-center gap-3 animate-in fade-in duration-200">
          <span className="text-base">✕</span>
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ─── INLINE EDIT MODE ─── */}
      {isEditing ? (
        <form onSubmit={handleSaveProfile} className="space-y-8 animate-in fade-in duration-200">
          {/* Top 2 Columns in Edit Mode */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card A: Personal Info Edit */}
            <div className="bg-[#FAF8F5] dark:bg-[#0D1829] border border-[#E5B842]/30 rounded-2xl md:rounded-3xl p-6 md:p-8 space-y-5 shadow-sm">
              <p className="text-[10px] font-bold tracking-widest text-[#0F172A]/50 dark:text-[#FAF8F5]/50 uppercase">
                PERSONAL INFORMATION
              </p>
              <div>
                <label className="block text-xs font-semibold text-[#0F172A]/70 dark:text-[#FAF8F5]/70 mb-1.5 uppercase tracking-wider">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Pragati Jain"
                  className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-[#1E293B] border border-[#0F172A]/15 dark:border-[#FAF8F5]/15 text-[#0F172A] dark:text-[#FAF8F5] text-sm focus:outline-none focus:ring-2 focus:ring-[#E5B842]/40"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#0F172A]/70 dark:text-[#FAF8F5]/70 mb-1.5 uppercase tracking-wider">
                  Email Address
                </label>
                <input
                  type="email"
                  disabled
                  value={profile?.email || user?.email || ""}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#0F172A]/5 dark:bg-[#FAF8F5]/5 border border-[#0F172A]/10 dark:border-[#FAF8F5]/10 text-[#0F172A]/60 dark:text-[#FAF8F5]/60 text-sm cursor-not-allowed"
                />
                <p className="text-[11px] text-[#0F172A]/40 dark:text-[#FAF8F5]/40 mt-1">
                  Email is linked to your login account.
                </p>
              </div>

              {isAdminUser && (
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A]/70 dark:text-[#FAF8F5]/70 mb-1.5 uppercase tracking-wider">
                    Role
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase bg-[#E5B842]/20 text-[#B8871E] dark:text-[#E5B842] border border-[#E5B842]/30">
                      ADMINISTRATOR
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Card B: Birth Details Edit */}
            <div className="bg-[#FAF8F5] dark:bg-[#0D1829] border border-[#E5B842]/30 rounded-2xl md:rounded-3xl p-6 md:p-8 space-y-4 shadow-sm">
              <p className="text-[10px] font-bold tracking-widest text-[#0F172A]/50 dark:text-[#FAF8F5]/50 uppercase">
                {isAdminUser ? "BIRTH DETAILS (OPTIONAL)" : "YOUR BIRTH DETAILS"}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A]/70 dark:text-[#FAF8F5]/70 mb-1.5 uppercase tracking-wider">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-[#1E293B] border border-[#0F172A]/15 dark:border-[#FAF8F5]/15 text-[#0F172A] dark:text-[#FAF8F5] text-sm focus:outline-none focus:ring-2 focus:ring-[#E5B842]/40"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A]/70 dark:text-[#FAF8F5]/70 mb-1.5 uppercase tracking-wider">
                    Time of Birth
                  </label>
                  <input
                    type="time"
                    disabled={timeUncertain}
                    value={timeOfBirth}
                    onChange={(e) => setTimeOfBirth(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-[#1E293B] border border-[#0F172A]/15 dark:border-[#FAF8F5]/15 text-[#0F172A] dark:text-[#FAF8F5] text-sm disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-[#E5B842]/40"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 text-xs text-[#0F172A]/70 dark:text-[#FAF8F5]/70 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={timeUncertain}
                    onChange={(e) => setTimeUncertain(e.target.checked)}
                    className="w-4 h-4 rounded text-[#E5B842] focus:ring-[#E5B842]"
                  />
                  <span>Birth time is uncertain / approximate</span>
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F172A]/70 dark:text-[#FAF8F5]/70 mb-1.5 uppercase tracking-wider">
                  Place of Birth
                </label>
                <input
                  type="text"
                  value={placeOfBirth}
                  onChange={(e) => setPlaceOfBirth(e.target.value)}
                  placeholder="City, State / Country (e.g. New Delhi, India)"
                  className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-[#1E293B] border border-[#0F172A]/15 dark:border-[#FAF8F5]/15 text-[#0F172A] dark:text-[#FAF8F5] text-sm focus:outline-none focus:ring-2 focus:ring-[#E5B842]/40"
                />
              </div>
            </div>
          </div>

          {/* Card C: Partner Details Edit (Customer Only) */}
          {!isAdminUser && (
            <div className="bg-[#FAF8F5] dark:bg-[#0D1829] border border-[#E5B842]/30 rounded-2xl md:rounded-3xl p-6 md:p-8 space-y-4 shadow-sm">
              <div className="flex items-center justify-between pb-2 border-b border-[#0F172A]/8 dark:border-[#FAF8F5]/8">
                <div>
                  <p className="text-[10px] font-bold tracking-widest text-[#E5B842] uppercase">
                    PARTNER DETAILS
                  </p>
                  <p className="text-xs text-[#0F172A]/60 dark:text-[#FAF8F5]/60 mt-0.5">
                    Optional — Save partner details for faster relationship and matchmaking bookings.
                  </p>
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-[#0F172A]/5 dark:bg-[#FAF8F5]/10 text-[#0F172A]/60 dark:text-[#FAF8F5]/60">
                  Optional
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A]/70 dark:text-[#FAF8F5]/70 mb-1.5 uppercase tracking-wider">
                    Partner Full Name
                  </label>
                  <input
                    type="text"
                    value={partnerName}
                    onChange={(e) => setPartnerName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-[#1E293B] border border-[#0F172A]/15 dark:border-[#FAF8F5]/15 text-[#0F172A] dark:text-[#FAF8F5] text-sm focus:outline-none focus:ring-2 focus:ring-[#E5B842]/40"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A]/70 dark:text-[#FAF8F5]/70 mb-1.5 uppercase tracking-wider">
                    Partner Place of Birth
                  </label>
                  <input
                    type="text"
                    value={partnerPlaceOfBirth}
                    onChange={(e) => setPartnerPlaceOfBirth(e.target.value)}
                    placeholder="City, Country"
                    className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-[#1E293B] border border-[#0F172A]/15 dark:border-[#FAF8F5]/15 text-[#0F172A] dark:text-[#FAF8F5] text-sm focus:outline-none focus:ring-2 focus:ring-[#E5B842]/40"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A]/70 dark:text-[#FAF8F5]/70 mb-1.5 uppercase tracking-wider">
                    Partner Date of Birth
                  </label>
                  <input
                    type="date"
                    value={partnerDateOfBirth}
                    onChange={(e) => setPartnerDateOfBirth(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-[#1E293B] border border-[#0F172A]/15 dark:border-[#FAF8F5]/15 text-[#0F172A] dark:text-[#FAF8F5] text-sm focus:outline-none focus:ring-2 focus:ring-[#E5B842]/40"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A]/70 dark:text-[#FAF8F5]/70 mb-1.5 uppercase tracking-wider">
                    Partner Time of Birth
                  </label>
                  <input
                    type="time"
                    disabled={partnerTimeUncertain}
                    value={partnerTimeOfBirth}
                    onChange={(e) => setPartnerTimeOfBirth(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-[#1E293B] border border-[#0F172A]/15 dark:border-[#FAF8F5]/15 text-[#0F172A] dark:text-[#FAF8F5] text-sm disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-[#E5B842]/40"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 text-xs text-[#0F172A]/70 dark:text-[#FAF8F5]/70 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={partnerTimeUncertain}
                    onChange={(e) => setPartnerTimeUncertain(e.target.checked)}
                    className="w-4 h-4 rounded text-[#E5B842] focus:ring-[#E5B842]"
                  />
                  <span>Partner birth time is uncertain / approximate</span>
                </label>
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleCancelEdit}
              disabled={saving}
              className="px-6 py-2.5 rounded-full text-xs font-medium text-[#0F172A]/70 dark:text-[#FAF8F5]/70 hover:bg-[#0F172A]/5 dark:hover:bg-[#FAF8F5]/5 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-8 py-2.5 rounded-full text-xs font-semibold bg-[#E5B842] text-[#0F172A] hover:bg-[#F3CE6D] transition-all shadow-sm disabled:opacity-60 cursor-pointer"
            >
              {saving ? "Saving Changes…" : "Save Changes"}
            </button>
          </div>
        </form>
      ) : (
        /* ─── READ-ONLY DISPLAY MODE ─── */
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Top 2 Columns on Desktop — Compact ~220-240px tall cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card A: Personal Information */}
            <div className="bg-[#FAF8F5] dark:bg-[#0D1829] border border-[#E5B842]/20 rounded-2xl md:rounded-3xl p-6 md:p-7 shadow-sm">
              <p className="text-[10px] font-bold tracking-widest text-[#0F172A]/40 dark:text-[#FAF8F5]/40 uppercase mb-4">
                PERSONAL INFORMATION
              </p>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-[#0F172A]/50 dark:text-[#FAF8F5]/50 mb-1">Full Name</p>
                  <p className="text-[#0F172A] dark:text-[#FAF8F5] font-medium text-base">
                    {profile?.display_name || user?.user_metadata?.display_name || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#0F172A]/50 dark:text-[#FAF8F5]/50 mb-1">Email</p>
                  <p className="text-[#0F172A] dark:text-[#FAF8F5] font-medium text-base">
                    {profile?.email || user?.email || "—"}
                  </p>
                </div>
                {isAdminUser && (
                  <div>
                    <p className="text-xs text-[#0F172A]/50 dark:text-[#FAF8F5]/50 mb-1">Role</p>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold tracking-wider uppercase bg-[#E5B842]/20 text-[#B8871E] dark:text-[#E5B842] border border-[#E5B842]/30">
                      ADMINISTRATOR
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Card B: Birth Details */}
            <div className="bg-[#FAF8F5] dark:bg-[#0D1829] border border-[#E5B842]/20 rounded-2xl md:rounded-3xl p-6 md:p-7 shadow-sm">
              <p className="text-[10px] font-bold tracking-widest text-[#0F172A]/40 dark:text-[#FAF8F5]/40 uppercase mb-4">
                {isAdminUser ? "BIRTH DETAILS (OPTIONAL)" : "YOUR BIRTH DETAILS"}
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-[#0F172A]/50 dark:text-[#FAF8F5]/50 mb-1">Date of Birth</p>
                  <p className="text-[#0F172A] dark:text-[#FAF8F5] font-medium text-base">
                    {formatDate(profile?.date_of_birth ?? null)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#0F172A]/50 dark:text-[#FAF8F5]/50 mb-1">Time of Birth</p>
                  <p className="text-[#0F172A] dark:text-[#FAF8F5] font-medium text-base">
                    {formatBirthTime(profile?.time_of_birth ?? null)}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-[#0F172A]/50 dark:text-[#FAF8F5]/50 mb-1">Place of Birth</p>
                  <p className="text-[#0F172A] dark:text-[#FAF8F5] font-medium text-base">
                    {profile?.place_of_birth || "Not set"}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2 text-xs text-[#0F172A]/70 dark:text-[#FAF8F5]/70">
                <span className="font-semibold text-[#E5B842]">
                  {profile?.time_uncertain ? "☐" : "☑"}
                </span>
                <span>
                  Birth Time: {profile?.time_uncertain ? "Uncertain / Approximate" : "Accurate"}
                </span>
              </div>
            </div>
          </div>

          {/* Card C: Partner Details (Customer Only) */}
          {!isAdminUser && (
          <div className="bg-[#FAF8F5] dark:bg-[#0D1829] border border-[#E5B842]/20 rounded-2xl md:rounded-3xl p-6 md:p-7 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-[#0F172A]/8 dark:border-[#FAF8F5]/8 mb-5">
              <div>
                <h3 className="text-[10px] font-bold tracking-widest text-[#E5B842] uppercase">
                  PARTNER DETAILS
                </h3>
                <p className="text-xs text-[#0F172A]/60 dark:text-[#FAF8F5]/60 mt-0.5">
                  Save partner details for relationship and matchmaking readings so you don't need to enter them every time.
                </p>
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-[#0F172A]/5 dark:bg-[#FAF8F5]/10 text-[#0F172A]/60 dark:text-[#FAF8F5]/60">
                Optional
              </span>
            </div>

            {hasSavedPartner ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-[#0F172A]/50 dark:text-[#FAF8F5]/50 mb-1">Partner Name</p>
                    <p className="text-[#0F172A] dark:text-[#FAF8F5] font-medium text-base">
                      {profile?.partner_name || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#0F172A]/50 dark:text-[#FAF8F5]/50 mb-1">Date of Birth</p>
                    <p className="text-[#0F172A] dark:text-[#FAF8F5] font-medium text-base">
                      {formatDate(profile?.partner_date_of_birth ?? null)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#0F172A]/50 dark:text-[#FAF8F5]/50 mb-1">Time of Birth</p>
                    <p className="text-[#0F172A] dark:text-[#FAF8F5] font-medium text-base">
                      {formatBirthTime(profile?.partner_time_of_birth ?? null)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#0F172A]/50 dark:text-[#FAF8F5]/50 mb-1">Place of Birth</p>
                    <p className="text-[#0F172A] dark:text-[#FAF8F5] font-medium text-base">
                      {profile?.partner_place_of_birth || "Not set"}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#0F172A]/6 dark:border-[#FAF8F5]/6 flex items-center gap-2 text-xs text-[#0F172A]/70 dark:text-[#FAF8F5]/70">
                  <span className="font-semibold text-[#E5B842]">
                    {profile?.partner_time_uncertain ? "☐" : "☑"}
                  </span>
                  <span>
                    Birth Time: {profile?.partner_time_uncertain ? "Uncertain / Approximate" : "Accurate"}
                  </span>
                </div>
              </div>
            ) : (
              /* Clean Empty State Card for Partner */
              <div className="text-center py-7 px-4 bg-[#FAF8F5]/60 dark:bg-[#0D1829]/60 rounded-2xl border border-dashed border-[#E5B842]/25">
                <p className="text-2xl mb-2 text-[#E5B842]">✦</p>
                <p className="text-sm font-medium text-[#0F172A] dark:text-[#FAF8F5]">
                  Save your partner's birth information for faster relationship and matchmaking bookings.
                </p>
                <div className="mt-4">
                  <button
                    onClick={handleStartEdit}
                    className="inline-flex items-center gap-2 px-6 py-2 rounded-full text-xs font-semibold bg-[#E5B842] text-[#0F172A] hover:bg-[#F3CE6D] transition-all shadow-sm cursor-pointer"
                  >
                    <span>Add Partner Details</span>
                    <span>+</span>
                  </button>
                </div>
              </div>
            )}
          </div>
          )}
        </div>
      )}

      {/* Change Avatar Modal */}
      {user && (
        <AvatarPickerModal
          isOpen={avatarModalOpen}
          onClose={() => setAvatarModalOpen(false)}
          userId={user.id}
          currentAvatarUrl={profile?.avatar_url}
          currentAvatarSeed={profile?.avatar_seed}
          userName={displayName || profile?.display_name}
          onSaved={async () => {
            await refreshProfile();
            setSuccessMsg("Avatar updated successfully.");
          }}
        />
      )}
    </div>
  );
}

// ─── Readings Tab ─────────────────────────────────────────────────────────────

function ReadingsTab() {
  const { user } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ReadingsFilter>("all");
  const supabase = createClient();

  const fetchOrders = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("orders")
      .select(
        "id,service_title,format,price_eur,status,payment_status,scheduled_at,stripe_receipt_url,review_rating,review_text,review_created_at,created_at"
      )
      .eq("auth_user_id", user.id)
      .order("created_at", { ascending: false });
    setOrders((data as Order[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const filtered = orders.filter((o) => {
    if (filter === "upcoming") return o.status === "confirmed" || o.status === "pending";
    if (filter === "completed") return o.status === "completed";
    return true;
  });

  const FILTERS: { key: ReadingsFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "upcoming", label: "Upcoming" },
    { key: "completed", label: "Completed" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-2 border-b border-[#0F172A]/8 dark:border-[#FAF8F5]/8">
        <p className="text-[10px] font-bold tracking-widest text-[#E5B842] uppercase mb-1">
          YOUR ASTROLOGY JOURNEY
        </p>
        <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-[#0F172A] dark:text-[#FAF8F5]">
          My Readings
        </h2>
        <p className="mt-1 text-sm text-[#0F172A]/60 dark:text-[#FAF8F5]/60">
          Revisit your bookings, reading details, and reflections whenever you need them.
        </p>
      </div>

      {/* Filter Tabs with Gold Underline on Active Filter */}
      <div className="flex gap-8 border-b border-[#0F172A]/10 dark:border-[#FAF8F5]/10 pb-1">
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`pb-3 text-sm font-medium transition-all relative cursor-pointer ${
                active
                  ? "text-[#0F172A] dark:text-[#FAF8F5] font-semibold"
                  : "text-[#0F172A]/50 dark:text-[#FAF8F5]/50 hover:text-[#0F172A] dark:hover:text-[#FAF8F5]"
              }`}
            >
              {f.label}
              {active && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#E5B842] rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-[#E5B842] animate-spin text-2xl font-serif">✦</div>
        </div>
      ) : filtered.length === 0 ? (
        /* Empty State */
        <div className="text-center py-16 px-4 bg-[#FAF8F5]/50 dark:bg-[#0D1829]/50 border border-[#E5B842]/15 rounded-3xl">
          <p className="text-3xl mb-4 text-[#E5B842]">✦</p>
          <p className="text-[11px] font-bold tracking-widest text-[#E5B842] uppercase mb-1">
            {orders.length === 0 ? "YOUR JOURNEY BEGINS HERE" : "NO READINGS FOUND"}
          </p>
          <p className="text-sm text-[#0F172A]/60 dark:text-[#FAF8F5]/60 max-w-sm mx-auto mb-6">
            {orders.length === 0
              ? "Your astrology readings will appear here once you book your first reading."
              : `You have no ${filter} readings at this time.`}
          </p>
          <button
            onClick={() => router.push("/#readings")}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-xs font-semibold bg-[#E5B842] text-[#0F172A] hover:bg-[#F3CE6D] shadow-sm transition-all cursor-pointer"
          >
            <span>Explore My Readings</span>
            <span>→</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.map((order) => (
            <ReadingCard key={order.id} order={order} onReviewSubmitted={fetchOrders} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Receipt Modal Component ──────────────────────────────────────────────────

function ReceiptModal({
  order,
  onClose,
}: {
  order: Order;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-[#FAF8F5] dark:bg-[#0D1829] border border-[#E5B842]/30 rounded-3xl max-w-md w-full p-8 md:p-10 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-[#0F172A]/40 dark:text-[#FAF8F5]/40 hover:text-[#0F172A] dark:hover:text-[#FAF8F5] text-lg cursor-pointer"
        >
          ✕
        </button>

        <div className="text-center mb-6">
          <p className="text-[11px] font-bold tracking-widest text-[#E5B842] uppercase">
            THEASTROKAUR
          </p>
          <h3 className="font-serif text-2xl font-semibold text-[#0F172A] dark:text-[#FAF8F5] mt-1">
            PAYMENT RECEIPT
          </h3>
        </div>

        <div className="border-t border-dashed border-[#0F172A]/15 dark:border-[#FAF8F5]/15 my-6" />

        <div className="space-y-4 text-sm">
          <div>
            <p className="text-xs text-[#0F172A]/50 dark:text-[#FAF8F5]/50">Service</p>
            <p className="font-medium text-[#0F172A] dark:text-[#FAF8F5] mt-0.5">{order.service_title}</p>
          </div>
          <div>
            <p className="text-xs text-[#0F172A]/50 dark:text-[#FAF8F5]/50">Date</p>
            <p className="font-medium text-[#0F172A] dark:text-[#FAF8F5] mt-0.5">{formatDate(order.created_at)}</p>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[#0F172A]/50 dark:text-[#FAF8F5]/50">Amount</p>
              <p className="font-serif text-2xl font-semibold text-[#0F172A] dark:text-[#FAF8F5] mt-0.5">
                {formatPrice(order.price_eur)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-[#0F172A]/50 dark:text-[#FAF8F5]/50">Payment status</p>
              <p className="font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest text-xs mt-1">
                {order.payment_status}
              </p>
            </div>
          </div>
          <div>
            <p className="text-xs text-[#0F172A]/50 dark:text-[#FAF8F5]/50">Payment method</p>
            <p className="font-medium text-[#0F172A] dark:text-[#FAF8F5] mt-0.5">Card Payment</p>
          </div>
        </div>

        <div className="border-t border-dashed border-[#0F172A]/15 dark:border-[#FAF8F5]/15 my-6" />

        <p className="text-center text-sm text-[#0F172A]/60 dark:text-[#FAF8F5]/60 italic">
          Thank you for choosing TheAstroKaur.
        </p>

        <div className="mt-6 flex flex-col gap-2.5">
          {order.stripe_receipt_url ? (
            <a
              href={order.stripe_receipt_url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full text-center py-2.5 rounded-xl text-xs font-semibold bg-[#E5B842] text-[#0F172A] hover:bg-[#F3CE6D] transition-colors"
            >
              Download Receipt
            </a>
          ) : (
            <button
              onClick={() => window.print()}
              className="w-full text-center py-2.5 rounded-xl text-xs font-semibold border border-[#E5B842]/50 text-[#0F172A] dark:text-[#FAF8F5] hover:bg-[#E5B842]/10 transition-colors cursor-pointer"
            >
              Print Receipt
            </button>
          )}
          <button
            onClick={onClose}
            className="w-full text-center py-2 text-xs font-medium text-[#0F172A]/40 dark:text-[#FAF8F5]/40 hover:text-[#0F172A] dark:hover:text-[#FAF8F5] transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Receipts Tab ─────────────────────────────────────────────────────────────

function ReceiptsTab() {
  const { user } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeReceipt, setActiveReceipt] = useState<Order | null>(null);
  const supabase = createClient();

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("orders")
        .select(
          "id,service_title,format,price_eur,status,payment_status,scheduled_at,stripe_receipt_url,review_rating,review_text,review_created_at,created_at"
        )
        .eq("auth_user_id", user.id)
        .order("created_at", { ascending: false });
      setOrders((data as Order[]) || []);
      setLoading(false);
    })();
  }, [user]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-2 border-b border-[#0F172A]/8 dark:border-[#FAF8F5]/8">
        <p className="text-[10px] font-bold tracking-widest text-[#E5B842] uppercase mb-1">
          PAYMENT HISTORY
        </p>
        <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-[#0F172A] dark:text-[#FAF8F5]">
          Receipts
        </h2>
        <p className="mt-1 text-sm text-[#0F172A]/60 dark:text-[#FAF8F5]/60">
          View your TheAstroKaur purchases and payment receipts.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-[#E5B842] animate-spin text-2xl font-serif">✦</div>
        </div>
      ) : orders.length === 0 ? (
        /* Empty State */
        <div className="text-center py-16 px-4 bg-[#FAF8F5]/50 dark:bg-[#0D1829]/50 border border-[#E5B842]/15 rounded-3xl">
          <p className="text-3xl mb-4 text-[#E5B842]">✦</p>
          <p className="text-[11px] font-bold tracking-widest text-[#E5B842] uppercase mb-1">
            NO RECEIPTS YET
          </p>
          <p className="text-sm text-[#0F172A]/50 dark:text-[#FAF8F5]/50 max-w-sm mx-auto mb-6">
            Your payment history will appear here after your first booking.
          </p>
          <button
            onClick={() => router.push("/#readings")}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-xs font-semibold bg-[#E5B842] text-[#0F172A] hover:bg-[#F3CE6D] transition-colors cursor-pointer"
          >
            <span>Explore My Readings</span>
            <span>→</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-[#FAF8F5] dark:bg-[#0D1829] border border-[#E5B842]/20 hover:border-[#E5B842]/40 rounded-2xl md:rounded-3xl p-6 md:p-8 transition-all shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-serif text-base sm:text-lg font-semibold text-[#0F172A] dark:text-[#FAF8F5] uppercase tracking-wide">
                      {order.service_title}
                    </h3>
                    <p className="text-xs text-[#0F172A]/50 dark:text-[#FAF8F5]/50 mt-1">
                      {formatDate(order.created_at)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-serif text-lg sm:text-xl font-semibold text-[#0F172A] dark:text-[#FAF8F5]">
                      {formatPrice(order.price_eur)}
                    </p>
                    <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mt-0.5">
                      {order.payment_status === "paid" ? "PAID" : order.payment_status.toUpperCase()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-3 border-t border-[#0F172A]/6 dark:border-[#FAF8F5]/6 flex justify-end">
                <button
                  onClick={() => setActiveReceipt(order)}
                  className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-[#0F172A] dark:text-[#FAF8F5] hover:text-[#E5B842] transition-colors cursor-pointer"
                >
                  <span>View Receipt</span>
                  <span className="text-[#E5B842]">→</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Render Receipt Modal */}
      {activeReceipt && (
        <ReceiptModal order={activeReceipt} onClose={() => setActiveReceipt(null)} />
      )}
    </div>
  );
}

// ─── Main Account Page ────────────────────────────────────────────────────────

function AccountContent() {
  const { user, profile, loading, openAuthModal, isAdmin } = useAuth();
  const isAdminUser = isAdmin || profile?.role === "admin";
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlTab = searchParams.get("tab") as Tab | null;
  const [tab, setTab] = useState<Tab>(
    !isAdminUser && urlTab && ["profile", "readings", "receipts"].includes(urlTab) ? urlTab : "profile"
  );

  useEffect(() => {
    if (isAdminUser) {
      if (tab !== "profile") setTab("profile");
      return;
    }
    if (urlTab && ["profile", "readings", "receipts"].includes(urlTab)) {
      setTab(urlTab);
    }
  }, [urlTab, isAdminUser, tab]);

  // Redirect unauthenticated users
  useEffect(() => {
    if (!loading && !user) {
      openAuthModal("signin");
      router.push("/");
    }
  }, [loading, user]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[#FFFDF9] dark:bg-[#0F172A] flex items-center justify-center">
        <div className="text-[#E5B842] text-3xl animate-pulse font-serif">✦</div>
      </div>
    );
  }

  const displayName = profile?.display_name || user?.user_metadata?.display_name || "Stargazer";

  const TABS: { key: Tab; label: string }[] = isAdminUser
    ? [{ key: "profile", label: "Profile" }]
    : [
        { key: "profile", label: "Profile" },
        { key: "readings", label: "My Readings" },
        { key: "receipts", label: "Receipts" },
      ];

  return (
    <div className="min-h-screen bg-[#FFFDF9] dark:bg-[#0F172A] flex flex-col relative selection:bg-[#E5B842]/30 selection:text-[#0F172A]">
      <SubpageBackground />
      <Navbar />

      {/* Main Container - Controlled 1100px – 1150px wide container with calibrated spacing */}
      <main className="flex-1 pt-10 sm:pt-14 pb-20 relative z-10">
        <div className="max-w-[1140px] w-full mx-auto px-4 sm:px-6 lg:px-8">
          {/* Account Title Header (with subtle circular avatar above) */}
          <div className="text-center mb-7 sm:mb-8 flex flex-col items-center">
            <div className="mb-3">
              <AvatarDisplay
                avatarUrl={profile?.avatar_url}
                avatarSeed={profile?.avatar_seed}
                name={displayName}
                size="lg"
                showBorder={true}
              />
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl lg:text-[50px] lg:leading-[1.15] font-medium text-[#0F172A] dark:text-[#FAF8F5] tracking-tight uppercase">
              MY ACCOUNT
            </h1>
            <p className="mt-2 text-base sm:text-lg text-[#0F172A]/70 dark:text-[#FAF8F5]/70">
              Welcome back, <span className="font-semibold text-[#0F172A] dark:text-[#FAF8F5]">{displayName}</span>
            </p>
          </div>

          {/* Elegant Horizontal Tabs Navigation (Active Navy, Gold Underline, Muted Inactive, Gap 48–55px to content) */}
          <div className="flex justify-center mb-12 sm:mb-14">
            <div className="inline-flex items-center gap-8 sm:gap-14 border-b border-[#0F172A]/10 dark:border-[#FAF8F5]/10 px-4 sm:px-8">
              {TABS.map((t) => {
                const active = tab === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => {
                      setTab(t.key);
                      router.replace(`/account?tab=${t.key}`);
                    }}
                    className={`pb-3.5 text-sm sm:text-[15px] tracking-wide transition-all relative cursor-pointer select-none ${
                      active
                        ? "text-[#0F172A] dark:text-[#FAF8F5] font-semibold"
                        : "text-[#0F172A]/50 dark:text-[#FAF8F5]/50 hover:text-[#0F172A] dark:hover:text-[#FAF8F5] font-normal"
                    }`}
                  >
                    <span>{t.label}</span>
                    {active && (
                      <span className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-[#E5B842] rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab Content Section */}
          <div className="w-full">
            {tab === "profile" && <ProfileTab />}
            {!isAdminUser && tab === "readings" && <ReadingsTab />}
            {!isAdminUser && tab === "receipts" && <ReceiptsTab />}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}


export default function AccountPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-[#FAF8F5] dark:bg-[#070D18] flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-[#E5B842] border-t-transparent animate-spin" />
        </div>
      }
    >
      <AccountContent />
    </React.Suspense>
  );
}
