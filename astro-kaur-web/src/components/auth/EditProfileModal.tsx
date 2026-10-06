"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";

const CELESTIAL_AVATARS = [
  { id: "sun", label: "Solar", emoji: "☀️" },
  { id: "moon", label: "Lunar", emoji: "🌙" },
  { id: "star", label: "Celestial", emoji: "✨" },
  { id: "lotus", label: "Lotus", emoji: "🪷" },
  { id: "cosmos", label: "Cosmos", emoji: "🪐" },
];

type ProfileTab = "profile" | "orders" | "receipts" | "users" | "dashboard";

interface OrderItem {
  id: string;
  service_title: string;
  format: "text" | "voice_call";
  price_eur: number;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  payment_status?: "pending" | "paid" | "failed" | "refunded";
  stripe_payment_intent_id?: string | null;
  scheduled_at: string | null;
  stripe_receipt_url: string | null;
  client_name: string | null;
  client_dob: string | null;
  client_tob: string | null;
  client_pob: string | null;
  client_time_uncertain?: boolean;
  requires_partner?: boolean;
  partner_name?: string | null;
  partner_dob?: string | null;
  partner_tob?: string | null;
  partner_pob?: string | null;
  partner_time_uncertain?: boolean;
  notes?: string | null;
  review_rating?: number | null;
  review_text?: string | null;
  review_created_at?: string | null;
  created_at: string;
}

interface UserProfileItem {
  id: string;
  auth_user_id: string;
  display_name: string | null;
  email: string;
  role: "admin" | "customer";
  date_of_birth: string | null;
  time_of_birth: string | null;
  place_of_birth: string | null;
  time_uncertain: boolean;
  avatar_seed: string | null;
  created_at: string;
}

/**
 * Converts any user image file to optimized WebP format with quality compression to save storage
 */
async function convertImageToWebP(file: File, maxDimension = 256, quality = 0.8): Promise<{ dataUrl: string; sizeKb: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas rendering context is not available"));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Export as WebP format with quality factor
        const webpDataUrl = canvas.toDataURL("image/webp", quality);
        const approxSizeKb = Math.round((webpDataUrl.length * 3) / 4 / 1024);
        resolve({ dataUrl: webpDataUrl, sizeKb: approxSizeKb });
      };
      img.onerror = () => reject(new Error("Failed to decode image"));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Failed to read image file"));
    reader.readAsDataURL(file);
  });
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "12 Sep 2026";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = d.getDate();
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  } catch {
    return dateStr;
  }
}

export default function EditProfileModal() {
  const {
    user,
    profile,
    isAdmin,
    profileModalOpen,
    profileModalTab,
    closeProfileModal,
    updateProfile,
    refreshProfile,
  } = useAuth();
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState<ProfileTab>("profile");

  // Profile Form States
  const [displayName, setDisplayName] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState("star");

  const [dateOfBirth, setDateOfBirth] = useState("");
  const [timeOfBirth, setTimeOfBirth] = useState("");
  const [placeOfBirth, setPlaceOfBirth] = useState("");
  const [timeUncertain, setTimeUncertain] = useState(false);

  // Matchmaking / Partner Details
  const [showPartnerDetails, setShowPartnerDetails] = useState(false);
  const [partnerName, setPartnerName] = useState("");
  const [partnerDob, setPartnerDob] = useState("");
  const [partnerTob, setPartnerTob] = useState("");
  const [partnerPob, setPartnerPob] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Orders & Receipts States
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Review & View States inside My Readings
  const [reviewingOrderId, setReviewingOrderId] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewText, setReviewText] = useState<string>("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [expandedReadingId, setExpandedReadingId] = useState<string | null>(null);

  const handleStartReview = (order: OrderItem) => {
    setReviewingOrderId(order.id);
    setReviewRating(order.review_rating || 5);
    setReviewText(order.review_text || "");
  };

  const handleSubmitReview = async (orderId: string) => {
    if (!reviewText.trim()) return;
    setSubmittingReview(true);
    setErrorMsg(null);
    try {
      const nowIso = new Date().toISOString();

      // Update orders table with review
      const { error: orderErr } = await supabase
        .from("orders")
        .update({
          review_rating: reviewRating,
          review_text: reviewText.trim(),
          review_created_at: nowIso,
          updated_at: nowIso,
        })
        .eq("id", orderId);

      if (orderErr) {
        console.warn("Could not save review on order:", orderErr.message);
      }

      // Also create a published testimonial entry linked to the order
      const { error: testErr } = await supabase
        .from("testimonials")
        .insert({
          order_id: orderId,
          customer_id: user?.id || null,
          author_name: displayName || user?.email?.split("@")[0] || "Seeker",
          rating: reviewRating,
          content: reviewText.trim(),
          consent_given: true,
          is_published: true,
        });

      if (testErr) {
        console.warn("Could not insert testimonial:", testErr.message);
      }

      // Update local state
      setOrders((prev) =>
        prev.map((ord) =>
          ord.id === orderId
            ? {
                ...ord,
                review_rating: reviewRating,
                review_text: reviewText.trim(),
                review_created_at: nowIso,
              }
            : ord
        )
      );

      setReviewingOrderId(null);
      setSuccessMsg("Thank you! Your review has been saved.");
    } catch (err: any) {
      console.error("Error submitting review:", err);
      setErrorMsg(err.message || "Failed to submit review.");
    } finally {
      setSubmittingReview(false);
    }
  };

  // ── ADMIN USER MANAGEMENT STATES ──
  const [userList, setUserList] = useState<UserProfileItem[]>([]);
  const [freeRequestsList, setFreeRequestsList] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState<"all" | "admin" | "customer">("all");

  // Add User Modal State
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<"customer" | "admin">("customer");
  const [newDob, setNewDob] = useState("");
  const [newTob, setNewTob] = useState("");
  const [newPob, setNewPob] = useState("");
  const [creatingUser, setCreatingUser] = useState(false);
  const [addUserError, setAddUserError] = useState<string | null>(null);

  // Edit User Modal State
  const [editingUser, setEditingUser] = useState<UserProfileItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState<"customer" | "admin">("customer");
  const [editDob, setEditDob] = useState("");
  const [editTob, setEditTob] = useState("");
  const [editPob, setEditPob] = useState("");
  const [editTimeUncertain, setEditTimeUncertain] = useState(false);
  const [savingEditUser, setSavingEditUser] = useState(false);
  const [editUserError, setEditUserError] = useState<string | null>(null);

  // Sync activeTab when profileModalTab changes
  useEffect(() => {
    if (profileModalTab) {
      setActiveTab(profileModalTab);
    }
  }, [profileModalTab, profileModalOpen]);

  // Sync inputs with current profile
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || "");
      setSelectedAvatar(profile.avatar_seed || "star");
      setDateOfBirth(profile.date_of_birth || "");
      setTimeOfBirth(profile.time_of_birth || "");
      setPlaceOfBirth(profile.place_of_birth || "");
      setTimeUncertain(!!profile.time_uncertain);
      setErrorMsg(null);
      setSuccessMsg(null);


    }
  }, [profile, profileModalOpen]);

  // Fetch orders when switching to orders, receipts, or dashboard tab
  const fetchOrders = async () => {
    setLoadingOrders(true);
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data) {
        setOrders(data as OrderItem[]);
      }
    } catch (err) {
      console.warn("Could not load orders:", err);
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    if (user && profileModalOpen && (activeTab === "orders" || activeTab === "receipts" || activeTab === "dashboard")) {
      fetchOrders();
    }
    if (isAdmin && profileModalOpen && activeTab === "dashboard") {
      const fetchFreeRequests = async () => {
        try {
          const { data } = await supabase
            .from("free_reading_requests")
            .select("*")
            .order("created_at", { ascending: false });
          if (data) setFreeRequestsList(data);
        } catch (err) {
          console.warn("Could not fetch free reading requests:", err);
        }
      };
      fetchFreeRequests();
      fetchAllUsers();
    }
  }, [user, isAdmin, profileModalOpen, activeTab]);

  // Fetch all user profiles for Admin tab
  const fetchAllUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      if (data.users) {
        setUserList(data.users as UserProfileItem[]);
      }
    } catch (err) {
      console.warn("Could not fetch user profiles:", err);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (isAdmin && profileModalOpen && activeTab === "users") {
      fetchAllUsers();
    }
  }, [isAdmin, profileModalOpen, activeTab]);

  if (!profileModalOpen || !user) return null;



  const handleSubmitProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setSubmitting(true);

    const res = await updateProfile({
      displayName: displayName.trim(),
      avatarSeed: selectedAvatar,
      dateOfBirth: dateOfBirth || null,
      timeOfBirth: timeUncertain ? null : timeOfBirth || null,
      placeOfBirth: placeOfBirth.trim() || null,
      timeUncertain,
    });

    setSubmitting(false);

    if (res.error) {
      setErrorMsg(res.error);
    } else {
      setSuccessMsg("Your profile and Vedic birth details have been saved.");
      refreshProfile();
      setTimeout(() => setSuccessMsg(null), 4000);
    }
  };

  // ── ADMIN: CREATE NEW USER ──
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddUserError(null);

    if (!newEmail || !newEmail.includes("@")) {
      setAddUserError("Please enter a valid email address.");
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setAddUserError("Password must be at least 6 characters.");
      return;
    }

    setCreatingUser(true);

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newEmail,
          password: newPassword,
          displayName: newName,
          role: newRole,
          dateOfBirth: newDob || null,
          timeOfBirth: newTob || null,
          placeOfBirth: newPob || null,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to create user.");
      }

      setShowAddUserModal(false);
      setNewEmail("");
      setNewPassword("");
      setNewName("");
      setNewRole("customer");
      setNewDob("");
      setNewTob("");
      setNewPob("");
      fetchAllUsers();
    } catch (err: any) {
      setAddUserError(err.message || "Failed to create user.");
    } finally {
      setCreatingUser(false);
    }
  };

  // ── ADMIN: SAVE EDITED USER ──
  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setEditUserError(null);
    setSavingEditUser(true);

    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingUser.id,
          auth_user_id: editingUser.auth_user_id,
          displayName: editName,
          role: editRole,
          dateOfBirth: editDob || null,
          timeOfBirth: editTimeUncertain ? null : editTob || null,
          placeOfBirth: editPob || null,
          timeUncertain: editTimeUncertain,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to update user.");
      }

      setEditingUser(null);
      fetchAllUsers();
      if (editingUser.auth_user_id === user.id) {
        refreshProfile();
      }
    } catch (err: any) {
      setEditUserError(err.message || "Failed to update user.");
    } finally {
      setSavingEditUser(false);
    }
  };

  // ── ADMIN: DELETE USER ──
  const handleDeleteUser = async (targetUser: UserProfileItem) => {
    if (targetUser.auth_user_id === user.id) {
      alert("You cannot remove your own currently logged-in admin account.");
      return;
    }

    const confirmDelete = window.confirm(
      `Are you sure you want to remove user "${targetUser.display_name || targetUser.email}" (${targetUser.email})?\n\nThis will permanently delete their account and profile.`
    );
    if (!confirmDelete) return;

    try {
      const res = await fetch(`/api/admin/users?userId=${targetUser.auth_user_id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to delete user.");
      }
      fetchAllUsers();
    } catch (err: any) {
      alert(err.message || "Failed to delete user.");
    }
  };

  // Filtered users for admin tab
  const filteredUsers = userList.filter((u) => {
    const matchesSearch =
      u.email.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      (u.display_name && u.display_name.toLowerCase().includes(userSearchQuery.toLowerCase()));
    const matchesRole = userRoleFilter === "all" || u.role === userRoleFilter;
    return matchesSearch && matchesRole;
  });

  const isCustomPhoto = selectedAvatar.startsWith("data:") || selectedAvatar.startsWith("http");

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/65 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-2xl bg-[#FAF8F5] dark:bg-[#0D1829] border border-[#E5B842]/40 rounded-3xl shadow-2xl overflow-hidden my-8">
        {/* Top Celestial Glow */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#B87936] via-[#E5B842] to-[#B87936]" />

        {/* Modal Header */}
        <div className="p-6 border-b border-[#0F172A]/10 dark:border-[#FAF8F5]/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-12 h-12 rounded-full border border-[#E5B842] bg-[#E5B842]/15 flex items-center justify-center text-xl overflow-hidden shrink-0">
              {isCustomPhoto ? (
                <img src={selectedAvatar} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span>{CELESTIAL_AVATARS.find((a) => a.id === selectedAvatar)?.emoji || "✨"}</span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif text-xl sm:text-2xl text-[#0F172A] dark:text-[#FAF8F5]">
                  {profile?.display_name || user.email?.split("@")[0] || "Account Hub"}
                </h3>
                {isAdmin && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-widest uppercase bg-[#E5B842] text-[#0F172A]">
                    ✦ ADMIN
                  </span>
                )}
              </div>
              <p className="text-xs text-[#0F172A]/60 dark:text-[#FAF8F5]/60 mt-0.5 font-light">
                {user.email} · Unique Seeker Profile
              </p>
            </div>
          </div>

          <button
            onClick={closeProfileModal}
            className="text-[#0F172A]/50 dark:text-[#FAF8F5]/50 hover:text-[#0F172A] dark:hover:text-[#FAF8F5] p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
            aria-label="Close Profile Hub"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Subtabs Navigation Bar: Role-Separated ── */}
        <div className="px-6 pt-4 pb-2 flex gap-2 border-b border-[#0F172A]/8 dark:border-[#FAF8F5]/8 bg-white/40 dark:bg-[#131F33]/40 overflow-x-auto no-scrollbar">
          {/* ✦ My Profile (Available for both) */}
          <button
            type="button"
            onClick={() => setActiveTab("profile")}
            className={`py-2 px-3.5 rounded-full text-xs font-semibold tracking-wider transition-all shrink-0 cursor-pointer ${
              activeTab === "profile"
                ? "bg-[#E5B842] text-[#0F172A] shadow-sm font-bold"
                : "text-[#0F172A]/70 dark:text-[#FAF8F5]/70 hover:text-[#0F172A] dark:hover:text-[#FAF8F5]"
            }`}
          >
            ✦ My Profile
          </button>

          {isAdmin ? (
            <>
              {/* ♛ Admin Dashboard (Admin only) */}
              <button
                type="button"
                onClick={() => setActiveTab("dashboard")}
                className={`py-2 px-3.5 rounded-full text-xs font-semibold tracking-wider transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "dashboard"
                    ? "bg-[#E5B842] text-[#0F172A] shadow-sm font-bold"
                    : "text-[#B8871E] dark:text-[#E5B842] hover:bg-[#E5B842]/15"
                }`}
              >
                <span>♛ Admin Dashboard</span>
              </button>

              {/* ♛ User Management (Admin only) */}
              <button
                type="button"
                onClick={() => setActiveTab("users")}
                className={`py-2 px-3.5 rounded-full text-xs font-semibold tracking-wider transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  activeTab === "users"
                    ? "bg-[#6B3448] text-[#E5B842] shadow-sm font-bold border border-[#E5B842]/40"
                    : "text-[#6B3448] dark:text-[#E5B842] hover:bg-[#E5B842]/15"
                }`}
              >
                <span>♛ User Management</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-[#E5B842] text-[#0F172A] font-extrabold">
                  ADMIN
                </span>
              </button>
            </>
          ) : (
            <>
              {/* 🔮 My Readings (Customer only — Admin does NOT get My Readings) */}
              <button
                type="button"
                onClick={() => setActiveTab("orders")}
                className={`py-2 px-3.5 rounded-full text-xs font-semibold tracking-wider transition-all shrink-0 cursor-pointer ${
                  activeTab === "orders"
                    ? "bg-[#E5B842] text-[#0F172A] shadow-sm font-bold"
                    : "text-[#0F172A]/70 dark:text-[#FAF8F5]/70 hover:text-[#0F172A] dark:hover:text-[#FAF8F5]"
                }`}
              >
                🔮 My Readings
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("receipts")}
                className={`py-2 px-3.5 rounded-full text-xs font-semibold tracking-wider transition-all shrink-0 cursor-pointer ${
                  activeTab === "receipts"
                    ? "bg-[#E5B842] text-[#0F172A] shadow-sm font-bold"
                    : "text-[#0F172A]/70 dark:text-[#FAF8F5]/70 hover:text-[#0F172A] dark:hover:text-[#FAF8F5]"
                }`}
              >
                🧾 Receipts
              </button>
            </>
          )}
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-6 max-h-[72vh] overflow-y-auto no-scrollbar">
          {/* Feedback Messages */}
          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs">
              {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="mb-4 p-3 rounded-xl bg-green-500/10 border border-green-500/30 text-green-600 dark:text-green-400 text-xs flex items-center gap-1.5">
              <span>{successMsg}</span>
            </div>
          )}

          {/* ══════════════════════════════════════════════════
              SUBTAB 1: PROFILE, PHOTO & BIRTH DETAILS
          ══════════════════════════════════════════════════ */}
          {activeTab === "profile" && (
            <form onSubmit={handleSubmitProfile} className="space-y-5">
              {/* Display Name */}
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-[#0F172A]/70 dark:text-[#FAF8F5]/70 mb-1.5">
                  Full Name / Display Name
                </label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your Name"
                  className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-[#131F33] border border-[#0F172A]/15 dark:border-[#FAF8F5]/15 text-sm focus:outline-none focus:border-[#E5B842] transition-colors"
                />
              </div>

              {/* ── CELESTIAL SYMBOL SELECTION ── */}
              <div className="p-4 rounded-2xl bg-white/70 dark:bg-[#131F33]/70 border border-[#E5B842]/25 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#6B3448] dark:text-[#E5B842]">
                      Celestial Symbol
                    </label>
                    <p className="text-[11px] text-[#0F172A]/60 dark:text-[#FAF8F5]/60 mt-0.5">
                      Select your personal celestial emblem for readings and profile display.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-5 gap-2 pt-1">
                  {CELESTIAL_AVATARS.map((av) => (
                    <button
                      key={av.id}
                      type="button"
                      onClick={() => setSelectedAvatar(av.id)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border transition-all cursor-pointer ${
                        selectedAvatar === av.id
                          ? "border-[#E5B842] bg-[#E5B842]/15 shadow-sm scale-102"
                          : "border-[#0F172A]/10 dark:border-[#FAF8F5]/10 hover:border-[#E5B842]/40 bg-white/50 dark:bg-[#0F172A]/40"
                      }`}
                    >
                      <span className="text-2xl">{av.emoji}</span>
                      <span className="text-[10px] font-medium tracking-wide uppercase text-[#0F172A]/70 dark:text-[#FAF8F5]/70">
                        {av.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Astrological Birth Details */}
              <div className="pt-3 border-t border-[#0F172A]/10 dark:border-[#FAF8F5]/10 space-y-3">
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-[#6B3448] dark:text-[#E5B842] flex items-center gap-1.5">
                    <span>✦</span> Your Birth Chart Details (Required for Readings)
                  </h4>
                  <p className="text-[11px] text-[#0F172A]/60 dark:text-[#FAF8F5]/60 mt-0.5 leading-relaxed">
                    Used to calculate your Vedic Lagna (Rising Sign) and planetary placements during bookings.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-[#0F172A]/70 dark:text-[#FAF8F5]/70 mb-1">
                      Date of Birth (DOB)
                    </label>
                    <input
                      type="date"
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#131F33] border border-[#0F172A]/15 dark:border-[#FAF8F5]/15 text-xs focus:outline-none focus:border-[#E5B842]"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-medium text-[#0F172A]/70 dark:text-[#FAF8F5]/70">
                        Time of Birth
                      </label>
                      <label className="inline-flex items-center gap-1 text-[10px] text-[#0F172A]/60 dark:text-[#FAF8F5]/60 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={timeUncertain}
                          onChange={(e) => setTimeUncertain(e.target.checked)}
                          className="rounded text-[#E5B842]"
                        />
                        <span>Uncertain</span>
                      </label>
                    </div>
                    <input
                      type="time"
                      disabled={timeUncertain}
                      value={timeOfBirth}
                      onChange={(e) => setTimeOfBirth(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#131F33] border border-[#0F172A]/15 dark:border-[#FAF8F5]/15 text-xs focus:outline-none focus:border-[#E5B842] disabled:opacity-50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[#0F172A]/70 dark:text-[#FAF8F5]/70 mb-1">
                    Place of Birth (City, Country)
                  </label>
                  <input
                    type="text"
                    value={placeOfBirth}
                    onChange={(e) => setPlaceOfBirth(e.target.value)}
                    placeholder="e.g. Amritsar, India or Berlin, Germany"
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#131F33] border border-[#0F172A]/15 dark:border-[#FAF8F5]/15 text-xs focus:outline-none focus:border-[#E5B842]"
                  />
                </div>
              </div>

              {/* Matchmaking Partner Toggle */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowPartnerDetails(!showPartnerDetails)}
                  className="text-xs font-semibold text-[#6B3448] dark:text-[#E5B842] flex items-center gap-1.5 hover:underline cursor-pointer"
                >
                  <span>{showPartnerDetails ? "▼" : "▶"}</span>
                  <span>Matchmaking Partner Details (Optional saved profile)</span>
                </button>

                {showPartnerDetails && (
                  <div className="mt-3 p-3.5 rounded-xl bg-black/5 dark:bg-white/5 space-y-3">
                    <p className="text-[11px] text-[#0F172A]/60 dark:text-[#FAF8F5]/60">
                      If you regularly explore relationship compatibility or matchmaking, you can store your partner's details here for easy auto-fill.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] uppercase text-[#0F172A]/70 dark:text-[#FAF8F5]/70 mb-1">
                          Partner Name
                        </label>
                        <input
                          type="text"
                          value={partnerName}
                          onChange={(e) => setPartnerName(e.target.value)}
                          placeholder="Partner's Name"
                          className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-[#131F33] border border-[#0F172A]/15 dark:border-[#FAF8F5]/15 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase text-[#0F172A]/70 dark:text-[#FAF8F5]/70 mb-1">
                          Partner DOB
                        </label>
                        <input
                          type="date"
                          value={partnerDob}
                          onChange={(e) => setPartnerDob(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-[#131F33] border border-[#0F172A]/15 dark:border-[#FAF8F5]/15 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="pt-3 border-t border-[#0F172A]/10 dark:border-[#FAF8F5]/10 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={closeProfileModal}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#0F172A]/60 dark:text-[#FAF8F5]/60 hover:text-[#0F172A] dark:hover:text-[#FAF8F5] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-full bg-[#E5B842] hover:bg-[#d6a935] text-[#0F172A] font-semibold text-xs tracking-wider uppercase transition-all shadow-md cursor-pointer flex items-center gap-2"
                >
                  {submitting ? "Saving Profile..." : "Save Changes ✦"}
                </button>
              </div>
            </form>
          )}

          {/* ══════════════════════════════════════════════════
              SUBTAB 2: ORDER HISTORY
          ══════════════════════════════════════════════════ */}
          {/* ══════════════════════════════════════════════════
              SUBTAB 2: MY READINGS & REVIEWS
          ══════════════════════════════════════════════════ */}
          {activeTab === "orders" && (
            <div className="space-y-4">
              {loadingOrders ? (
                <div className="py-12 text-center text-xs text-[#0F172A]/60 dark:text-[#FAF8F5]/60">
                  <div className="animate-spin w-6 h-6 border-2 border-[#E5B842] border-t-transparent rounded-full mx-auto mb-2" />
                  Loading your readings...
                </div>
              ) : orders.length === 0 ? (
                <div className="py-12 text-center">
                  <span className="text-3xl block mb-2">🔮</span>
                  <h4 className="font-serif text-lg text-[#0F172A] dark:text-[#FAF8F5]">
                    No Readings on File Yet
                  </h4>
                  <p className="text-xs text-[#0F172A]/60 dark:text-[#FAF8F5]/60 max-w-sm mx-auto mt-1 leading-relaxed">
                    When you book a Vedic reading or explore matchmaking, your intake, analysis, and reviews will appear here.
                  </p>
                  <a
                    href="#readings"
                    onClick={closeProfileModal}
                    className="inline-flex items-center gap-1.5 mt-4 px-5 py-2 rounded-full text-xs font-semibold bg-[#E5B842] text-[#0F172A] hover:opacity-90 transition-opacity"
                  >
                    <span>✦ Book a Reading</span>
                  </a>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((order) => {
                    const statusText = order.status
                      ? order.status.charAt(0).toUpperCase() + order.status.slice(1)
                      : "Completed";
                    const isExpanded = expandedReadingId === order.id;
                    const isReviewing = reviewingOrderId === order.id;

                    return (
                      <div
                        key={order.id}
                        className="p-5 rounded-2xl bg-white dark:bg-[#131F33] border border-[#E5B842]/20 hover:border-[#E5B842]/40 transition-all shadow-sm space-y-3"
                      >
                        {/* Reading Header: Title & Status · Date */}
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div>
                            <h4 className="font-serif text-base sm:text-lg font-bold tracking-wide text-[#0F172A] dark:text-[#FAF8F5] uppercase">
                              {order.service_title}
                            </h4>
                            <p className="text-xs text-[#B87936] dark:text-[#E5B842] font-semibold mt-0.5">
                              {order.format === "voice_call" ? "Voice Consultation" : "Text Reading"} · €{order.price_eur}
                            </p>
                            <p className="text-xs text-[#0F172A]/65 dark:text-[#FAF8F5]/65 font-medium mt-1 flex items-center gap-1.5">
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  order.status === "completed"
                                    ? "bg-emerald-500"
                                    : order.status === "confirmed"
                                    ? "bg-[#E5B842]"
                                    : "bg-blue-400"
                                }`}
                              />
                              <span>{statusText} · {formatDate(order.created_at)}</span>
                            </p>
                          </div>

                          {/* [View Reading] Button */}
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => setExpandedReadingId(isExpanded ? null : order.id)}
                              className="px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wider text-[#6B3448] dark:text-[#E5B842] border border-[#E5B842]/40 bg-[#E5B842]/10 hover:bg-[#E5B842]/20 transition-all flex items-center gap-1.5 cursor-pointer"
                            >
                              <span>{isExpanded ? "Hide Details" : "View Details →"}</span>
                              <span className="text-[9px]">{isExpanded ? "▲" : "▼"}</span>
                            </button>
                          </div>
                        </div>

                        {/* Collapsible Reading Details */}
                        {isExpanded && (
                          <div className="p-4 rounded-xl bg-[#FAF8F5] dark:bg-[#0D1829] border border-[#0F172A]/10 dark:border-[#FAF8F5]/10 text-xs space-y-2.5 animate-in fade-in duration-150">
                            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#0F172A]/10 dark:border-[#FAF8F5]/10">
                              <span className="text-[#0F172A]/60 dark:text-[#FAF8F5]/60 font-medium">Format:</span>
                              <span className="font-semibold text-[#6B3448] dark:text-[#E5B842] uppercase tracking-wider text-[11px]">
                                {order.format === "voice_call" ? "Voice Consultation" : "Written In-Depth Reading"} · €{order.price_eur}
                              </span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[#0F172A]/80 dark:text-[#FAF8F5]/80">
                              <div>
                                <span className="text-[#0F172A]/50 dark:text-[#FAF8F5]/50 block text-[10px] uppercase tracking-wider">Client</span>
                                <span className="font-medium">{order.client_name || displayName}</span>
                              </div>
                              <div>
                                <span className="text-[#0F172A]/50 dark:text-[#FAF8F5]/50 block text-[10px] uppercase tracking-wider">Birth Details</span>
                                <span>
                                  {order.client_dob || "Date not recorded"}
                                  {order.client_tob ? ` · ${order.client_tob}` : ""}
                                  {order.client_pob ? ` (${order.client_pob})` : ""}
                                </span>
                              </div>
                              {order.requires_partner && order.partner_name && (
                                <div className="sm:col-span-2 pt-1 border-t border-[#0F172A]/5 dark:border-[#FAF8F5]/5">
                                  <span className="text-[#0F172A]/50 dark:text-[#FAF8F5]/50 block text-[10px] uppercase tracking-wider">Partner</span>
                                  <span>{order.partner_name} · {order.partner_dob || ""} {order.partner_pob ? `(${order.partner_pob})` : ""}</span>
                                </div>
                              )}
                              {order.notes && (
                                <div className="sm:col-span-2 pt-1">
                                  <span className="text-[#0F172A]/50 dark:text-[#FAF8F5]/50 block text-[10px] uppercase tracking-wider">Intake Focus & Questions</span>
                                  <p className="italic text-[#0F172A]/70 dark:text-[#FAF8F5]/70 bg-white/60 dark:bg-black/25 p-2 rounded-lg mt-0.5">
                                    "{order.notes}"
                                  </p>
                                </div>
                              )}
                              {order.stripe_receipt_url && (
                                <div className="sm:col-span-2 pt-1">
                                  <a
                                    href={order.stripe_receipt_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[#B8871E] dark:text-[#E5B842] underline hover:opacity-80 inline-flex items-center gap-1 font-medium"
                                  >
                                    <span>Download Official Payment Receipt</span>
                                    <span>↗</span>
                                  </a>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Review Section */}
                        <div className="pt-2 border-t border-[#0F172A]/8 dark:border-[#FAF8F5]/8">
                          {order.review_text && !isReviewing ? (
                            /* State 2: Submitted Review Display */
                            <div className="p-3.5 rounded-xl bg-[#FAF8F5]/90 dark:bg-[#0D1829]/90 border border-[#E5B842]/30 space-y-1.5">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-0.5 text-[#E5B842] text-sm tracking-wider">
                                  {Array.from({ length: order.review_rating || 5 }).map((_, i) => (
                                    <span key={i}>★</span>
                                  ))}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleStartReview(order)}
                                  className="text-[11px] text-[#0F172A]/50 dark:text-[#FAF8F5]/50 hover:text-[#E5B842] underline cursor-pointer"
                                >
                                  Edit review
                                </button>
                              </div>
                              <p className="font-serif italic text-sm text-[#0F172A] dark:text-[#FAF8F5] leading-relaxed">
                                “{order.review_text}”
                              </p>
                              <p className="text-[11px] text-[#0F172A]/50 dark:text-[#FAF8F5]/50 font-medium">
                                Your review · {formatDate(order.review_created_at || order.created_at)}
                              </p>
                            </div>
                          ) : isReviewing ? (
                            /* State 3: Active Review Form */
                            <div className="p-4 rounded-xl bg-[#FAF8F5] dark:bg-[#0D1829] border border-[#E5B842]/40 space-y-3 animate-in fade-in duration-150">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-[#0F172A] dark:text-[#FAF8F5] uppercase tracking-wider">
                                  Leave a Review
                                </span>
                                <div className="flex items-center gap-1">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                      key={star}
                                      type="button"
                                      onClick={() => setReviewRating(star)}
                                      className={`text-lg transition-transform hover:scale-125 cursor-pointer ${
                                        star <= reviewRating ? "text-[#E5B842]" : "text-gray-300 dark:text-gray-600"
                                      }`}
                                      aria-label={`Rate ${star} stars`}
                                    >
                                      ★
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <textarea
                                value={reviewText}
                                onChange={(e) => setReviewText(e.target.value)}
                                rows={3}
                                placeholder="“Such a clear and insightful reading...”"
                                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#131F33] border border-[#0F172A]/15 dark:border-[#FAF8F5]/15 text-xs text-[#0F172A] dark:text-[#FAF8F5] focus:outline-none focus:border-[#E5B842] transition-colors resize-none font-serif italic"
                              />

                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => setReviewingOrderId(null)}
                                  className="px-3 py-1.5 rounded-full text-xs font-medium text-[#0F172A]/60 dark:text-[#FAF8F5]/60 hover:text-[#0F172A] dark:hover:text-[#FAF8F5] cursor-pointer"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  disabled={submittingReview || !reviewText.trim()}
                                  onClick={() => handleSubmitReview(order.id)}
                                  className="px-4 py-1.5 rounded-full text-xs font-semibold tracking-wider text-[#0F172A] bg-gradient-to-r from-[#E5B842] to-[#F3CE6D] hover:opacity-90 disabled:opacity-50 transition-all cursor-pointer shadow-sm"
                                >
                                  {submittingReview ? "Submitting..." : "Submit Review"}
                                </button>
                              </div>
                            </div>
                          ) : (
                            /* State 1: Initial Button ☆ Leave a Review */
                            <button
                              type="button"
                              onClick={() => handleStartReview(order)}
                              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#6B3448] dark:text-[#E5B842] hover:opacity-80 transition-opacity cursor-pointer group"
                            >
                              <span className="text-sm transition-transform group-hover:scale-110">☆</span>
                              <span>Leave a Review</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════
              SUBTAB 3: PAYMENT RECEIPTS
          ══════════════════════════════════════════════════ */}
          {activeTab === "receipts" && (
            <div className="space-y-4">
              {loadingOrders ? (
                <div className="py-12 text-center text-xs text-[#0F172A]/60 dark:text-[#FAF8F5]/60">
                  <div className="animate-spin w-6 h-6 border-2 border-[#E5B842] border-t-transparent rounded-full mx-auto mb-2" />
                  Loading receipts...
                </div>
              ) : orders.length === 0 ? (
                <div className="py-12 text-center">
                  <span className="text-3xl block mb-2">🧾</span>
                  <h4 className="font-serif text-lg text-[#0F172A] dark:text-[#FAF8F5]">
                    No Payment Invoices Found
                  </h4>
                  <p className="text-xs text-[#0F172A]/60 dark:text-[#FAF8F5]/60 max-w-sm mx-auto mt-1 leading-relaxed">
                    All payment receipts and transaction records for your completed bookings will be documented here.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {orders.map((order) => (
                    <div
                      key={order.id}
                      className="p-4 rounded-2xl bg-white dark:bg-[#131F33] border border-[#0F172A]/10 dark:border-[#FAF8F5]/10 flex items-center justify-between gap-4"
                    >
                      <div>
                        <div className="font-medium text-xs text-[#0F172A] dark:text-[#FAF8F5]">
                          Invoice #{order.id.slice(0, 8).toUpperCase()}
                        </div>
                        <div className="text-[11px] text-[#0F172A]/60 dark:text-[#FAF8F5]/60 mt-0.5">
                          {order.service_title} · €{order.price_eur}
                        </div>
                      </div>
                      <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">
                        Paid / Confirmed
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════
              SUBTAB 4: ✦ ADMIN USER MANAGEMENT & ROLES ✦
          ══════════════════════════════════════════════════ */}
          {activeTab === "users" && isAdmin && (
            <div className="space-y-4">
              {/* Header & Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#0F172A]/10 dark:border-[#FAF8F5]/10">
                <div>
                  <h4 className="font-serif text-lg text-[#0F172A] dark:text-[#FAF8F5] flex items-center gap-1.5">
                    <span className="text-[#E5B842]">✦</span> Admin Seeker & Role Directory
                  </h4>
                  <p className="text-xs text-[#0F172A]/60 dark:text-[#FAF8F5]/60 mt-0.5">
                    Edit user profiles, manage birth charts, and assign Admin or Customer roles. Multiple admins are supported.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAddUserModal(true)}
                  className="px-4 py-2 rounded-full bg-[#E5B842] hover:bg-[#d6a935] text-[#0F172A] font-semibold text-xs tracking-wider uppercase shadow-sm transition-all cursor-pointer shrink-0"
                >
                  + Add User / Admin
                </button>
              </div>

              {/* Filter and Search Bar */}
              <div className="flex flex-col sm:flex-row items-center gap-2.5">
                <div className="relative w-full sm:flex-1">
                  <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="w-full px-3.5 py-2 pl-9 rounded-xl bg-white dark:bg-[#131F33] border border-[#0F172A]/15 dark:border-[#FAF8F5]/15 text-xs focus:outline-none focus:border-[#E5B842]"
                  />
                  <svg
                    className="w-4 h-4 text-[#0F172A]/40 dark:text-[#FAF8F5]/40 absolute left-3 top-2.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>

                <div className="flex items-center gap-1 self-start sm:self-auto">
                  {(["all", "admin", "customer"] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setUserRoleFilter(r)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
                        userRoleFilter === r
                          ? "bg-[#E5B842] text-[#0F172A]"
                          : "bg-black/5 dark:bg-white/5 text-[#0F172A]/60 dark:text-[#FAF8F5]/60 hover:text-[#0F172A] dark:hover:text-[#FAF8F5]"
                      }`}
                    >
                      {r === "all" ? "All Users" : r === "admin" ? "✦ Admins" : "Customers"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Users List */}
              {loadingUsers ? (
                <div className="py-12 text-center text-xs text-[#0F172A]/60 dark:text-[#FAF8F5]/60">
                  <div className="animate-spin w-6 h-6 border-2 border-[#E5B842] border-t-transparent rounded-full mx-auto mb-2" />
                  Loading seeker directory...
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#0F172A]/60 dark:text-[#FAF8F5]/60">
                  No users found matching "{userSearchQuery}".
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filteredUsers.map((item) => {
                    const isItemCustomPhoto =
                      item.avatar_seed?.startsWith("data:") || item.avatar_seed?.startsWith("http");
                    return (
                      <div
                        key={item.id}
                        className="p-3.5 rounded-2xl bg-white dark:bg-[#131F33] border border-[#0F172A]/10 dark:border-[#FAF8F5]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative w-10 h-10 rounded-full border border-[#E5B842]/40 bg-[#FAF8F5] dark:bg-[#0D1829] flex items-center justify-center text-lg overflow-hidden shrink-0">
                            {isItemCustomPhoto ? (
                              <img src={item.avatar_seed!} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                              <span>
                                {CELESTIAL_AVATARS.find((a) => a.id === item.avatar_seed)?.emoji || "✨"}
                              </span>
                            )}
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-xs text-[#0F172A] dark:text-[#FAF8F5]">
                                {item.display_name || item.email.split("@")[0]}
                              </span>
                              {item.role === "admin" ? (
                                <span className="px-2 py-0.2 rounded-full text-[9px] font-bold tracking-widest uppercase bg-[#E5B842] text-[#0F172A]">
                                  ✦ ADMIN
                                </span>
                              ) : (
                                <span className="px-2 py-0.2 rounded-full text-[9px] font-semibold tracking-widest uppercase bg-black/5 dark:bg-white/10 text-[#0F172A]/60 dark:text-[#FAF8F5]/60">
                                  CUSTOMER
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-[#0F172A]/60 dark:text-[#FAF8F5]/60 mt-0.5">
                              {item.email}
                              {item.date_of_birth && ` · DOB: ${item.date_of_birth}`}
                              {item.place_of_birth && ` · ${item.place_of_birth}`}
                            </p>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingUser(item);
                              setEditName(item.display_name || "");
                              setEditRole(item.role);
                              setEditDob(item.date_of_birth || "");
                              setEditTob(item.time_of_birth || "");
                              setEditPob(item.place_of_birth || "");
                              setEditTimeUncertain(!!item.time_uncertain);
                              setEditUserError(null);
                            }}
                            className="px-3 py-1.5 rounded-lg border border-[#0F172A]/15 dark:border-[#FAF8F5]/15 hover:border-[#E5B842] text-xs font-medium text-[#0F172A] dark:text-[#FAF8F5] transition-colors cursor-pointer"
                          >
                            Edit Profile & Role ✏️
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(item)}
                            className="p-1.5 rounded-lg border border-red-500/20 hover:border-red-500 text-red-500 transition-colors cursor-pointer"
                            title="Remove User"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── MODAL 1: ADD NEW USER / ADMIN ── */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-[#FAF8F5] dark:bg-[#0D1829] border border-[#E5B842]/50 rounded-3xl p-6 shadow-2xl">
            <h4 className="font-serif text-xl text-[#0F172A] dark:text-[#FAF8F5] mb-1">
              Add New Seeker / Admin
            </h4>
            <p className="text-xs text-[#0F172A]/60 dark:text-[#FAF8F5]/60 mb-4">
              Enter user credentials and choose their role. Email is strictly unique across all accounts.
            </p>

            {addUserError && (
              <div className="mb-3 p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs">
                {addUserError}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold uppercase text-[#0F172A]/70 dark:text-[#FAF8F5]/70 mb-1">
                  Email Address * (Unique Key)
                </label>
                <input
                  type="email"
                  required
                  placeholder="admin2@example.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#131F33] border border-[#0F172A]/15 dark:border-[#FAF8F5]/15 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase text-[#0F172A]/70 dark:text-[#FAF8F5]/70 mb-1">
                  Temporary Password * (Min 6 Chars)
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#131F33] border border-[#0F172A]/15 dark:border-[#FAF8F5]/15 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold uppercase text-[#0F172A]/70 dark:text-[#FAF8F5]/70 mb-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#131F33] border border-[#0F172A]/15 dark:border-[#FAF8F5]/15 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase text-[#6B3448] dark:text-[#E5B842] mb-1">
                    Role *
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as "customer" | "admin")}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#131F33] border border-[#E5B842]/40 text-xs font-semibold"
                  >
                    <option value="customer">Customer (Standard)</option>
                    <option value="admin">✦ Admin (Full Access)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] uppercase text-[#0F172A]/70 dark:text-[#FAF8F5]/70 mb-1">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={newDob}
                    onChange={(e) => setNewDob(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#131F33] border border-[#0F172A]/15 dark:border-[#FAF8F5]/15 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase text-[#0F172A]/70 dark:text-[#FAF8F5]/70 mb-1">
                    Place of Birth
                  </label>
                  <input
                    type="text"
                    placeholder="City, Country"
                    value={newPob}
                    onChange={(e) => setNewPob(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#131F33] border border-[#0F172A]/15 dark:border-[#FAF8F5]/15 text-xs"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-[#0F172A]/60 dark:text-[#FAF8F5]/60 hover:text-[#0F172A] dark:hover:text-[#FAF8F5]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingUser}
                  className="px-5 py-2 rounded-full bg-[#E5B842] hover:bg-[#d6a935] text-[#0F172A] font-semibold text-xs tracking-wider uppercase transition-all shadow-sm"
                >
                  {creatingUser ? "Creating..." : "Create Account ✦"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: EDIT USER & ROLE ── */}
      {editingUser && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-[#FAF8F5] dark:bg-[#0D1829] border border-[#E5B842]/50 rounded-3xl p-6 shadow-2xl">
            <h4 className="font-serif text-xl text-[#0F172A] dark:text-[#FAF8F5] mb-1">
              Edit Seeker Profile & Role
            </h4>
            <p className="text-xs text-[#0F172A]/60 dark:text-[#FAF8F5]/60 mb-4">
              Editing profile for <strong className="text-[#0F172A] dark:text-[#FAF8F5]">{editingUser.email}</strong>.
            </p>

            {editUserError && (
              <div className="mb-3 p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs">
                {editUserError}
              </div>
            )}

            <form onSubmit={handleSaveEditUser} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold uppercase text-[#0F172A]/70 dark:text-[#FAF8F5]/70 mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#131F33] border border-[#0F172A]/15 dark:border-[#FAF8F5]/15 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase text-[#6B3448] dark:text-[#E5B842] mb-1">
                  Account Role (Assign Admin / Customer)
                </label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as "customer" | "admin")}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#131F33] border border-[#E5B842]/40 text-xs font-semibold"
                >
                  <option value="customer">Customer (Normal Role)</option>
                  <option value="admin">✦ Admin (Full Administrative Powers)</option>
                </select>
                <p className="text-[10px] text-[#0F172A]/50 dark:text-[#FAF8F5]/50 mt-1">
                  Changing to Admin grants full access to user management and order controls.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] uppercase text-[#0F172A]/70 dark:text-[#FAF8F5]/70 mb-1">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={editDob}
                    onChange={(e) => setEditDob(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#131F33] border border-[#0F172A]/15 dark:border-[#FAF8F5]/15 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase text-[#0F172A]/70 dark:text-[#FAF8F5]/70 mb-1">
                    Time of Birth
                  </label>
                  <input
                    type="time"
                    disabled={editTimeUncertain}
                    value={editTob}
                    onChange={(e) => setEditTob(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#131F33] border border-[#0F172A]/15 dark:border-[#FAF8F5]/15 text-xs disabled:opacity-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] uppercase text-[#0F172A]/70 dark:text-[#FAF8F5]/70 mb-1">
                  Place of Birth (City, Country)
                </label>
                <input
                  type="text"
                  value={editPob}
                  onChange={(e) => setEditPob(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#131F33] border border-[#0F172A]/15 dark:border-[#FAF8F5]/15 text-xs"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 rounded-xl text-xs text-[#0F172A]/60 dark:text-[#FAF8F5]/60 hover:text-[#0F172A] dark:hover:text-[#FAF8F5]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEditUser}
                  className="px-5 py-2 rounded-full bg-[#E5B842] hover:bg-[#d6a935] text-[#0F172A] font-semibold text-xs tracking-wider uppercase transition-all shadow-sm"
                >
                  {savingEditUser ? "Saving..." : "Update User ✦"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
