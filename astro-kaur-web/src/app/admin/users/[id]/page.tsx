"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";

type CustomerProfile = Database["public"]["Tables"]["customer_profiles"]["Row"];
type OrderRow = Database["public"]["Tables"]["orders"]["Row"];

export default function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const userId = resolvedParams.id;
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Edit User Drawer State
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editDob, setEditDob] = useState("");
  const [editTob, setEditTob] = useState("");
  const [editPob, setEditPob] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Role Confirmation Dialog
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [targetRole, setTargetRole] = useState<"admin" | "customer">("customer");
  const [savingRole, setSavingRole] = useState(false);

  // Status Dialog
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState<"active" | "suspended" | "deactivated">("active");
  const [savingStatus, setSavingStatus] = useState(false);

  // Delete Dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      setActionError(null);

      // 1. Fetch user profile
      const { data: userProfile, error: profileErr } = await supabase
        .from("customer_profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (profileErr) throw profileErr;
      setProfile(userProfile);

      setEditName(userProfile.display_name || "");
      setEditEmail(userProfile.email);
      setEditDob(userProfile.date_of_birth || "");
      setEditTob(userProfile.time_of_birth || "");
      setEditPob(userProfile.place_of_birth || "");

      // 2. Fetch user's orders
      const { data: userOrders, error: orderErr } = await supabase
        .from("orders")
        .select("*")
        .eq("auth_user_id", userProfile.auth_user_id)
        .order("created_at", { ascending: false });

      if (orderErr) throw orderErr;
      setOrders(userOrders || []);
    } catch (err: any) {
      console.error("Error fetching user detail:", err);
      setActionError(err.message || "Failed to load user details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, [userId]);

  // Handle Profile Update
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingEdit(true);
      setActionError(null);

      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: userId,
          displayName: editName,
          email: editEmail,
          dateOfBirth: editDob || null,
          timeOfBirth: editTob || null,
          placeOfBirth: editPob || null,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update user profile");

      setActionSuccess("Profile details updated successfully.");
      setIsEditing(false);
      await fetchUserData();
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      setActionError(err.message || "Failed to save profile.");
    } finally {
      setSavingEdit(false);
    }
  };

  // Handle Role Change with Last Admin Protection
  const handleConfirmRoleChange = async () => {
    try {
      setSavingRole(true);
      setActionError(null);

      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: userId,
          role: targetRole,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update role");

      setActionSuccess(`User role changed to ${targetRole.toUpperCase()} successfully.`);
      setRoleDialogOpen(false);
      await fetchUserData();
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      setActionError(err.message || "Failed to change role.");
    } finally {
      setSavingRole(false);
    }
  };

  // Handle Account Status Change
  const handleConfirmStatusChange = async () => {
    try {
      setSavingStatus(true);
      setActionError(null);

      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: userId,
          accountStatus: targetStatus,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update account status");

      setActionSuccess(`Account status updated to ${targetStatus.toUpperCase()}.`);
      setStatusDialogOpen(false);
      await fetchUserData();
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      setActionError(err.message || "Failed to change status.");
    } finally {
      setSavingStatus(false);
    }
  };

  // Handle User Deletion
  const handleConfirmDelete = async () => {
    try {
      setDeleting(true);
      setActionError(null);

      const res = await fetch(`/api/admin/users?userId=${userId}`, {
        method: "DELETE",
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to delete user");

      router.push("/admin/users");
    } catch (err: any) {
      setActionError(err.message || "Failed to delete user.");
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  // Derived Metrics
  const totalReadings = orders.length;
  const upcomingReadings = orders.filter(
    (o) =>
      o.status === "confirmed" ||
      (o.status === "pending" && o.scheduled_at && new Date(o.scheduled_at) > new Date())
  ).length;
  const completedReadings = orders.filter((o) => o.status === "completed").length;
  const cancelledReadings = orders.filter((o) => o.status === "cancelled").length;

  const totalPaidSpending = orders
    .filter((o) => o.payment_status === "paid")
    .reduce((acc, curr) => acc + Number(curr.price_eur || 0), 0);

  const reviews = orders.filter((o) => o.review_rating !== null && o.review_rating !== undefined);

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="text-3xl text-[#E5B842] animate-pulse font-serif">✦</div>
        <p className="mt-3 text-xs tracking-wider uppercase text-[#0F172A]/50 dark:text-[#FAF8F5]/50">
          Loading user record…
        </p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-8 text-center space-y-3">
        <p className="font-serif text-lg text-[#0F172A] dark:text-[#FAF8F5]">User not found</p>
        <Link href="/admin/users" className="text-xs text-[#E5B842] underline">
          ← Back to Users
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-200 max-w-5xl mx-auto">
      {/* ─── Breadcrumb & Header ─── */}
      <div className="border-b border-[#0F172A]/8 dark:border-[#FAF8F5]/8 pb-5 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5 text-[10px] font-bold tracking-widest uppercase">
            <Link href="/admin" className="text-[#E5B842] hover:underline">
              ADMIN
            </Link>
            <span className="text-[#0F172A]/30 dark:text-[#FAF8F5]/30">/</span>
            <Link href="/admin/users" className="text-[#E5B842] hover:underline">
              USERS
            </Link>
            <span className="text-[#0F172A]/30 dark:text-[#FAF8F5]/30">/</span>
            <span className="text-[#0F172A]/50 dark:text-[#FAF8F5]/50">
              {profile.display_name || profile.email}
            </span>
          </div>

          <h1 className="font-serif text-3xl font-semibold text-[#0F172A] dark:text-[#FAF8F5] tracking-tight">
            {profile.display_name || "Customer Profile"}
          </h1>
          <p className="mt-1 text-sm text-[#0F172A]/60 dark:text-[#FAF8F5]/60">
            {profile.email}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-[#131F33] border border-[#0F172A]/10 dark:border-[#FAF8F5]/10 text-[#0F172A] dark:text-[#FAF8F5] hover:border-[#E5B842]/50 hover:bg-[#E5B842]/5 transition-all shadow-xs cursor-pointer"
          >
            Edit User
          </button>

          <button
            onClick={() => {
              setTargetRole(profile.role === "admin" ? "customer" : "admin");
              setRoleDialogOpen(true);
            }}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#E5B842] text-[#0F172A] hover:bg-[#F3CE6D] transition-all shadow-xs cursor-pointer"
          >
            {profile.role === "admin" ? "Demote to Customer" : "Promote to Admin"}
          </button>
        </div>
      </div>

      {/* Notifications */}
      {actionError && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/25 text-red-600 dark:text-red-400 text-xs flex items-center justify-between">
          <span>⚠ {actionError}</span>
          <button onClick={() => setActionError(null)} className="underline ml-4">
            Dismiss
          </button>
        </div>
      )}

      {actionSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-800 dark:text-emerald-300 text-xs">
          ✓ {actionSuccess}
        </div>
      )}

      {/* ─── 1. SECTION: ACCOUNT ─── */}
      <div className="bg-[#FAF8F5] dark:bg-[#0D1829] border border-[#E5B842]/20 rounded-2xl p-6 sm:p-7 shadow-xs space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-[#0F172A]/8 dark:border-[#FAF8F5]/8">
          <p className="text-[10px] font-bold tracking-widest text-[#E5B842] uppercase">
            1. ACCOUNT INFORMATION
          </p>
          <div className="flex items-center gap-2">
            <span
              className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                profile.account_status === "active"
                  ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300"
                  : profile.account_status === "suspended"
                  ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                  : "bg-rose-500/15 text-rose-700 dark:text-rose-300"
              }`}
            >
              {profile.account_status || "active"}
            </span>

            <button
              onClick={() => {
                setTargetStatus(profile.account_status === "active" ? "suspended" : "active");
                setStatusDialogOpen(true);
              }}
              className="text-xs text-[#E5B842] hover:underline font-medium ml-1"
            >
              Change Status
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
          <div>
            <p className="text-[11px] text-[#0F172A]/50 dark:text-[#FAF8F5]/50 mb-1">Full Name</p>
            <p className="text-sm font-semibold text-[#0F172A] dark:text-[#FAF8F5]">
              {profile.display_name || "—"}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-[#0F172A]/50 dark:text-[#FAF8F5]/50 mb-1">Email</p>
            <p className="text-sm font-semibold text-[#0F172A] dark:text-[#FAF8F5]">
              {profile.email}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-[#0F172A]/50 dark:text-[#FAF8F5]/50 mb-1">Role</p>
            {profile.role === "admin" ? (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-widest uppercase bg-[#E5B842] text-[#0F172A] shadow-xs">
                ADMIN
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium tracking-wide uppercase bg-[#0F172A]/5 dark:bg-[#FAF8F5]/10 text-[#0F172A]/60 dark:text-[#FAF8F5]/60">
                Customer
              </span>
            )}
          </div>
          <div>
            <p className="text-[11px] text-[#0F172A]/50 dark:text-[#FAF8F5]/50 mb-1">Created Date</p>
            <p className="text-sm font-medium text-[#0F172A] dark:text-[#FAF8F5]">
              {formatDate(profile.created_at)}
            </p>
          </div>
        </div>

        {/* Birth Details Snapshot */}
        <div className="pt-4 border-t border-[#0F172A]/6 dark:border-[#FAF8F5]/6">
          <p className="text-[10px] font-bold tracking-widest text-[#0F172A]/40 dark:text-[#FAF8F5]/40 uppercase mb-3">
            Profile Birth Details
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <span className="text-[#0F172A]/50 dark:text-[#FAF8F5]/50">DOB: </span>
              <span className="font-medium text-[#0F172A] dark:text-[#FAF8F5]">
                {profile.date_of_birth ? formatDate(profile.date_of_birth) : "Not set"}
              </span>
            </div>
            <div>
              <span className="text-[#0F172A]/50 dark:text-[#FAF8F5]/50">Time: </span>
              <span className="font-medium text-[#0F172A] dark:text-[#FAF8F5]">
                {profile.time_of_birth || "Not set"}{" "}
                {profile.time_uncertain ? "(Uncertain)" : ""}
              </span>
            </div>
            <div>
              <span className="text-[#0F172A]/50 dark:text-[#FAF8F5]/50">Place: </span>
              <span className="font-medium text-[#0F172A] dark:text-[#FAF8F5]">
                {profile.place_of_birth || "Not set"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 2 & 3. SECTION: READINGS & SPENDING SUMMARY ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Readings Metric Card */}
        <div className="bg-[#FAF8F5] dark:bg-[#0D1829] border border-[#E5B842]/20 rounded-2xl p-6 shadow-xs space-y-4">
          <p className="text-[10px] font-bold tracking-widest text-[#E5B842] uppercase">
            2. READINGS OVERVIEW
          </p>
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="p-3 rounded-xl bg-white/60 dark:bg-[#131F33]/60 border border-[#0F172A]/8 dark:border-[#FAF8F5]/8">
              <span className="text-[10px] text-[#0F172A]/50 dark:text-[#FAF8F5]/50 uppercase">Total</span>
              <p className="font-serif text-xl font-bold text-[#0F172A] dark:text-[#FAF8F5] mt-1">{totalReadings}</p>
            </div>
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <span className="text-[10px] text-amber-700 dark:text-amber-300 uppercase">Upcoming</span>
              <p className="font-serif text-xl font-bold text-amber-900 dark:text-amber-200 mt-1">{upcomingReadings}</p>
            </div>
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <span className="text-[10px] text-emerald-700 dark:text-emerald-300 uppercase">Done</span>
              <p className="font-serif text-xl font-bold text-emerald-900 dark:text-emerald-200 mt-1">{completedReadings}</p>
            </div>
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
              <span className="text-[10px] text-rose-700 dark:text-rose-300 uppercase">Cancel</span>
              <p className="font-serif text-xl font-bold text-rose-900 dark:text-rose-200 mt-1">{cancelledReadings}</p>
            </div>
          </div>
        </div>

        {/* Spending Card */}
        <div className="bg-[#FAF8F5] dark:bg-[#0D1829] border border-[#E5B842]/20 rounded-2xl p-6 shadow-xs space-y-4">
          <p className="text-[10px] font-bold tracking-widest text-[#E5B842] uppercase">
            3. CUSTOMER SPENDING
          </p>
          <div className="flex items-center justify-between p-4 rounded-xl bg-white/70 dark:bg-[#131F33]/70 border border-[#0F172A]/8 dark:border-[#FAF8F5]/8">
            <div>
              <span className="text-[11px] text-[#0F172A]/50 dark:text-[#FAF8F5]/50 uppercase tracking-wide">
                Total Settled Paid Amount
              </span>
              <p className="font-serif text-3xl font-bold text-[#0F172A] dark:text-[#FAF8F5] mt-1">
                €{totalPaidSpending.toFixed(2)}
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-800 dark:text-emerald-300">
              EUR Paid
            </span>
          </div>
          <p className="text-[11px] text-[#0F172A]/50 dark:text-[#FAF8F5]/50 italic">
            * Includes all confirmed paid orders placed by this customer account.
          </p>
        </div>
      </div>

      {/* ─── 4. SECTION: BOOKING HISTORY ─── */}
      <div className="bg-[#FAF8F5] dark:bg-[#0D1829] border border-[#E5B842]/20 rounded-2xl p-6 sm:p-7 shadow-xs space-y-4">
        <p className="text-[10px] font-bold tracking-widest text-[#E5B842] uppercase">
          4. BOOKING HISTORY
        </p>

        {orders.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#0F172A]/50 dark:text-[#FAF8F5]/50">
            No booking orders found for this user.
          </div>
        ) : (
          <div className="divide-y divide-[#0F172A]/6 dark:divide-[#FAF8F5]/6">
            {orders.map((o) => (
              <div
                key={o.id}
                className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
              >
                <div>
                  <p className="text-sm font-semibold text-[#0F172A] dark:text-[#FAF8F5]">
                    {o.service_title}
                  </p>
                  <p className="text-xs text-[#0F172A]/50 dark:text-[#FAF8F5]/50 mt-0.5">
                    {formatDate(o.created_at)} • {o.format === "voice_call" ? "Voice Call" : "Detailed Text"}
                  </p>
                </div>

                <div className="flex items-center gap-4 sm:justify-end">
                  <span className="text-xs font-bold text-[#0F172A] dark:text-[#FAF8F5]">
                    €{Number(o.price_eur || 0).toFixed(2)}
                  </span>
                  <span
                    className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${
                      o.payment_status === "paid"
                        ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300"
                        : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                    }`}
                  >
                    {o.payment_status}
                  </span>
                  <span
                    className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-[#0F172A]/5 dark:bg-[#FAF8F5]/10 text-[#0F172A]/70 dark:text-[#FAF8F5]/70"
                  >
                    {o.status}
                  </span>
                  <Link
                    href={`/admin/readings/${o.id}`}
                    className="text-xs font-semibold text-[#E5B842] hover:underline"
                  >
                    Details →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── 5. SECTION: REVIEWS ─── */}
      <div className="bg-[#FAF8F5] dark:bg-[#0D1829] border border-[#E5B842]/20 rounded-2xl p-6 sm:p-7 shadow-xs space-y-4">
        <p className="text-[10px] font-bold tracking-widest text-[#E5B842] uppercase">
          5. SUBMITTED REVIEWS
        </p>

        {reviews.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#0F172A]/50 dark:text-[#FAF8F5]/50">
            No reviews submitted by this customer yet.
          </div>
        ) : (
          <div className="space-y-3">
            {reviews.map((r) => (
              <div
                key={r.id}
                className="p-4 rounded-xl bg-white/60 dark:bg-[#131F33]/60 border border-[#0F172A]/8 dark:border-[#FAF8F5]/8 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#E5B842]">
                    {"★".repeat(r.review_rating || 5)}{" "}
                    <span className="text-[#0F172A]/40 dark:text-[#FAF8F5]/40 font-normal">
                      ({r.review_rating}/5)
                    </span>
                  </span>
                  <span className="text-[11px] text-[#0F172A]/40 dark:text-[#FAF8F5]/40">
                    {formatDate(r.review_created_at)}
                  </span>
                </div>
                <p className="text-xs text-[#0F172A]/80 dark:text-[#FAF8F5]/80 italic">
                  "{r.review_text || "Rated without review text."}"
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── 6. SECTION: DANGER ZONE / DESTRUCTIVE ACTIONS ─── */}
      <div className="p-6 rounded-2xl border border-red-500/20 bg-red-500/5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-red-600 dark:text-red-400">
              Destructive Administrative Zone
            </h3>
            <p className="text-xs text-[#0F172A]/60 dark:text-[#FAF8F5]/60 mt-0.5">
              Prefer suspending or deactivating accounts to retain historical financial and reading audit records.
            </p>
          </div>
          <button
            onClick={() => setDeleteDialogOpen(true)}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors cursor-pointer shadow-xs"
          >
            Delete Account…
          </button>
        </div>
      </div>

      {/* ─── ROLE CONFIRMATION MODAL ─── */}
      {roleDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-[#FAF8F5] dark:bg-[#0D1829] border border-[#E5B842]/30 rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-4 shadow-2xl">
            <h3 className="font-serif text-xl font-semibold text-[#0F172A] dark:text-[#FAF8F5]">
              {targetRole === "admin"
                ? "Make this user an administrator?"
                : "Demote administrator to customer?"}
            </h3>

            <p className="text-xs text-[#0F172A]/70 dark:text-[#FAF8F5]/70 leading-relaxed">
              {targetRole === "admin" ? (
                <>
                  Administrators have full operational access to TheAstroKaur. They can:
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li>View private customer and chart details</li>
                    <li>Manage readings, calendar appointments, and services</li>
                    <li>Manage user accounts and promote/demote roles</li>
                    <li>Publish and moderate testimonials</li>
                    <li>Access business revenue and financial summaries</li>
                  </ul>
                </>
              ) : (
                <>
                  This will remove administrative privileges from{" "}
                  <strong>{profile.email}</strong>. They will only have standard customer access to their personal account.
                </>
              )}
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#0F172A]/8 dark:border-[#FAF8F5]/8">
              <button
                type="button"
                onClick={() => setRoleDialogOpen(false)}
                disabled={savingRole}
                className="px-4 py-2 rounded-xl text-xs font-medium text-[#0F172A]/60 dark:text-[#FAF8F5]/60 hover:bg-[#0F172A]/5 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRoleChange}
                disabled={savingRole}
                className="px-6 py-2.5 rounded-full text-xs font-semibold bg-[#E5B842] text-[#0F172A] hover:bg-[#F3CE6D] shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {savingRole ? "Updating Role…" : "Confirm Role Change"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── STATUS CHANGE MODAL ─── */}
      {statusDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-[#FAF8F5] dark:bg-[#0D1829] border border-[#E5B842]/30 rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-4 shadow-2xl">
            <h3 className="font-serif text-xl font-semibold text-[#0F172A] dark:text-[#FAF8F5]">
              Update Account Status
            </h3>
            <p className="text-xs text-[#0F172A]/60 dark:text-[#FAF8F5]/60">
              Select the operational status for <strong>{profile.email}</strong>:
            </p>

            <div className="space-y-2">
              {(["active", "suspended", "deactivated"] as const).map((st) => (
                <label
                  key={st}
                  className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                    targetStatus === st
                      ? "border-[#E5B842] bg-[#E5B842]/10"
                      : "border-[#0F172A]/10 dark:border-[#FAF8F5]/10 hover:border-[#E5B842]/40"
                  }`}
                >
                  <div>
                    <p className="text-xs font-semibold capitalize text-[#0F172A] dark:text-[#FAF8F5]">
                      {st}
                    </p>
                    <p className="text-[11px] text-[#0F172A]/50 dark:text-[#FAF8F5]/50 mt-0.5">
                      {st === "active"
                        ? "Normal account privileges enabled."
                        : st === "suspended"
                        ? "Temporarily restricts account access while retaining records."
                        : "Account deactivated; cannot log in."}
                    </p>
                  </div>
                  <input
                    type="radio"
                    name="targetStatus"
                    checked={targetStatus === st}
                    onChange={() => setTargetStatus(st)}
                    className="text-[#E5B842] focus:ring-[#E5B842]"
                  />
                </label>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#0F172A]/8 dark:border-[#FAF8F5]/8">
              <button
                type="button"
                onClick={() => setStatusDialogOpen(false)}
                disabled={savingStatus}
                className="px-4 py-2 rounded-xl text-xs font-medium text-[#0F172A]/60 dark:text-[#FAF8F5]/60 hover:bg-[#0F172A]/5 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmStatusChange}
                disabled={savingStatus}
                className="px-6 py-2.5 rounded-full text-xs font-semibold bg-[#E5B842] text-[#0F172A] hover:bg-[#F3CE6D] shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {savingStatus ? "Saving Status…" : "Save Status"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── DELETE USER MODAL ─── */}
      {deleteDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-[#FAF8F5] dark:bg-[#0D1829] border border-red-500/30 rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-4 shadow-2xl">
            <h3 className="font-serif text-xl font-semibold text-red-600 dark:text-red-400">
              Permanently Delete Account?
            </h3>
            <p className="text-xs text-[#0F172A]/70 dark:text-[#FAF8F5]/70 leading-relaxed">
              Are you sure you want to permanently delete <strong>{profile.email}</strong>?
              This will remove the user from Supabase Auth and customer profiles.
            </p>
            <p className="text-[11px] text-amber-600 dark:text-amber-400 bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">
              Tip: If you want to retain historical booking records and receipts, choose <strong>Deactivate</strong> instead of deleting.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#0F172A]/8 dark:border-[#FAF8F5]/8">
              <button
                type="button"
                onClick={() => setDeleteDialogOpen(false)}
                disabled={deleting}
                className="px-4 py-2 rounded-xl text-xs font-medium text-[#0F172A]/60 dark:text-[#FAF8F5]/60 hover:bg-[#0F172A]/5 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="px-6 py-2.5 rounded-full text-xs font-semibold bg-red-600 text-white hover:bg-red-700 shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {deleting ? "Deleting…" : "Permanently Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── EDIT PROFILE DRAWER ─── */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-[#FAF8F5] dark:bg-[#0D1829] border border-[#E5B842]/30 rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#0F172A]/8 dark:border-[#FAF8F5]/8">
              <h3 className="font-serif text-xl font-semibold text-[#0F172A] dark:text-[#FAF8F5]">
                Edit User Details
              </h3>
              <button
                onClick={() => setIsEditing(false)}
                className="p-1 rounded-full text-[#0F172A]/50 dark:text-[#FAF8F5]/50 hover:bg-[#0F172A]/5 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#0F172A]/70 dark:text-[#FAF8F5]/70 mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-[#131F33] border border-[#0F172A]/15 dark:border-[#FAF8F5]/15 text-xs text-[#0F172A] dark:text-[#FAF8F5]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F172A]/70 dark:text-[#FAF8F5]/70 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-[#131F33] border border-[#0F172A]/15 dark:border-[#FAF8F5]/15 text-xs text-[#0F172A] dark:text-[#FAF8F5]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A]/70 dark:text-[#FAF8F5]/70 mb-1">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={editDob}
                    onChange={(e) => setEditDob(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#131F33] border border-[#0F172A]/15 dark:border-[#FAF8F5]/15 text-xs text-[#0F172A] dark:text-[#FAF8F5]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A]/70 dark:text-[#FAF8F5]/70 mb-1">
                    Time of Birth
                  </label>
                  <input
                    type="time"
                    value={editTob}
                    onChange={(e) => setEditTob(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#131F33] border border-[#0F172A]/15 dark:border-[#FAF8F5]/15 text-xs text-[#0F172A] dark:text-[#FAF8F5]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F172A]/70 dark:text-[#FAF8F5]/70 mb-1">
                  Place of Birth
                </label>
                <input
                  type="text"
                  value={editPob}
                  onChange={(e) => setEditPob(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-[#131F33] border border-[#0F172A]/15 dark:border-[#FAF8F5]/15 text-xs text-[#0F172A] dark:text-[#FAF8F5]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#0F172A]/8 dark:border-[#FAF8F5]/8">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  disabled={savingEdit}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-[#0F172A]/60 dark:text-[#FAF8F5]/60 hover:bg-[#0F172A]/5 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-6 py-2.5 rounded-full text-xs font-semibold bg-[#E5B842] text-[#0F172A] hover:bg-[#F3CE6D] shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {savingEdit ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
