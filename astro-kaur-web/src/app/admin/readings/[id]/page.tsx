"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";

type ReadingDetailRow = Database["public"]["Tables"]["reading_details"]["Row"];
type OrderRow = Database["public"]["Tables"]["orders"]["Row"];
type FreeRequestRow = Database["public"]["Tables"]["free_reading_requests"]["Row"];

export default function AdminReadingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const readingId = resolvedParams.id;
  const router = useRouter();
  const supabase = createClient();

  const isFreeReading = readingId.startsWith("free-");
  const rawId = isFreeReading ? readingId.replace("free-", "") : readingId;

  const [loading, setLoading] = useState(true);
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Paid Order & Reading Details
  const [readingDetail, setReadingDetail] = useState<ReadingDetailRow | null>(null);
  const [order, setOrder] = useState<OrderRow | null>(null);

  // Free Reading Request
  const [freeRequest, setFreeRequest] = useState<FreeRequestRow | null>(null);

  // Form states
  const [currentStatus, setCurrentStatus] = useState<string>("pending");
  const [adminNotes, setAdminNotes] = useState<string>("");

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);

        if (isFreeReading) {
          // Load from free_reading_requests
          const { data, error } = await supabase
            .from("free_reading_requests")
            .select("*")
            .eq("id", rawId)
            .single();

          if (error) throw error;
          if (data) {
            setFreeRequest(data);
            setCurrentStatus(data.status);
            setAdminNotes(data.admin_notes || "");
          }
        } else {
          // 1. First fetch order
          const { data: orderData, error: orderErr } = await supabase
            .from("orders")
            .select("*")
            .eq("id", rawId)
            .single();

          if (orderErr) throw orderErr;
          setOrder(orderData);

          // 2. Fetch authoritative snapshot from reading_details
          const { data: detailData, error: detailErr } = await supabase
            .from("reading_details")
            .select("*")
            .eq("order_id", rawId)
            .maybeSingle();

          if (detailData) {
            setReadingDetail(detailData);
            setCurrentStatus(detailData.status || orderData.status);
            setAdminNotes(detailData.admin_notes || "");
          } else {
            // Fallback to order status if reading_details row pending
            setCurrentStatus(orderData.status);
          }
        }
      } catch (err: any) {
        console.error("Error loading reading details:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [rawId, isFreeReading, supabase]);

  // Handle Status Update
  const handleUpdateStatus = async (newStatus: string) => {
    try {
      setSavingStatus(true);
      setCurrentStatus(newStatus);

      if (isFreeReading) {
        const { error } = await supabase
          .from("free_reading_requests")
          .update({ status: newStatus, updated_at: new Date().toISOString() })
          .eq("id", rawId);
        if (error) throw error;
      } else {
        // Update both reading_details and orders
        if (readingDetail?.id) {
          await supabase
            .from("reading_details")
            .update({ status: newStatus as any, updated_at: new Date().toISOString() })
            .eq("id", readingDetail.id);
        }
        await supabase
          .from("orders")
          .update({ status: newStatus as any, updated_at: new Date().toISOString() })
          .eq("id", rawId);
      }

      setStatusMessage("Reading status updated successfully.");
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      console.error("Error updating status:", err);
      alert("Failed to update reading status: " + err.message);
    } finally {
      setSavingStatus(false);
    }
  };

  // Handle Admin Notes Save
  const handleSaveNotes = async () => {
    try {
      setSavingNotes(true);
      if (isFreeReading) {
        const { error } = await supabase
          .from("free_reading_requests")
          .update({ admin_notes: adminNotes, updated_at: new Date().toISOString() })
          .eq("id", rawId);
        if (error) throw error;
      } else {
        if (readingDetail?.id) {
          const { error } = await supabase
            .from("reading_details")
            .update({ admin_notes: adminNotes, updated_at: new Date().toISOString() })
            .eq("id", readingDetail.id);
          if (error) throw error;
        } else {
          // Update orders notes if reading_details not linked yet
          const { error } = await supabase
            .from("orders")
            .update({ notes: adminNotes, updated_at: new Date().toISOString() })
            .eq("id", rawId);
          if (error) throw error;
        }
      }

      setStatusMessage("Private admin notes saved.");
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      console.error("Error saving admin notes:", err);
      alert("Failed to save admin notes: " + err.message);
    } finally {
      setSavingNotes(false);
    }
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "Not specified";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const formatTime = (timeStr: string | null | undefined) => {
    if (!timeStr) return "Not specified";
    return timeStr.slice(0, 5);
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="text-3xl text-[#E5B842] animate-pulse font-serif">✦</div>
        <p className="mt-3 text-xs tracking-wider uppercase text-[#0F172A]/50 dark:text-[#FAF8F5]/50">
          Loading reading snapshot…
        </p>
      </div>
    );
  }

  // Authoritative snapshot values:
  // Prefer reading_details snapshot, fallback to orders snapshot
  const serviceTitle = isFreeReading
    ? "Free Promotional Reading"
    : order?.service_title || "Astrology Reading";

  const clientName = isFreeReading
    ? freeRequest?.full_name || "Client"
    : readingDetail?.client_name || order?.client_name || "Client";

  const clientDob = isFreeReading
    ? freeRequest?.date_of_birth
    : readingDetail?.client_date_of_birth || order?.client_dob;

  const clientTob = isFreeReading
    ? freeRequest?.time_of_birth
    : readingDetail?.client_time_of_birth || order?.client_tob;

  const clientTimeUncertain = isFreeReading
    ? freeRequest?.time_uncertain
    : readingDetail?.client_time_uncertain ?? order?.client_time_uncertain;

  const clientPob = isFreeReading
    ? freeRequest?.place_of_birth
    : readingDetail?.client_place_of_birth || order?.client_pob;

  const hasPartner =
    !isFreeReading &&
    (Boolean(readingDetail?.partner_name) ||
      Boolean(order?.partner_name) ||
      Boolean(order?.requires_partner));

  const partnerName = readingDetail?.partner_name || order?.partner_name;
  const partnerDob = readingDetail?.partner_date_of_birth || order?.partner_dob;
  const partnerTob = readingDetail?.partner_time_of_birth || order?.partner_tob;
  const partnerTimeUncertain =
    readingDetail?.partner_time_uncertain ?? order?.partner_time_uncertain;
  const partnerPob = readingDetail?.partner_place_of_birth || order?.partner_pob;

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
            <Link href="/admin/readings" className="text-[#E5B842] hover:underline">
              READINGS
            </Link>
            <span className="text-[#0F172A]/30 dark:text-[#FAF8F5]/30">/</span>
            <span className="text-[#0F172A]/50 dark:text-[#FAF8F5]/50 truncate max-w-[200px]">
              {serviceTitle}
            </span>
          </div>

          <h1 className="font-serif text-3xl font-semibold text-[#0F172A] dark:text-[#FAF8F5] tracking-tight">
            {serviceTitle}
          </h1>
          <p className="mt-1 text-sm text-[#0F172A]/60 dark:text-[#FAF8F5]/60">
            Client: <strong className="font-medium text-[#0F172A] dark:text-[#FAF8F5]">{clientName}</strong>
          </p>
        </div>

        {/* Status Dropdown Controller */}
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-[#0F172A]/60 dark:text-[#FAF8F5]/60 uppercase tracking-wider">
            Status:
          </label>
          <select
            value={currentStatus}
            disabled={savingStatus}
            onChange={(e) => handleUpdateStatus(e.target.value)}
            className="text-xs font-semibold px-4 py-2 rounded-xl bg-white dark:bg-[#131F33] border border-[#E5B842]/40 text-[#0F172A] dark:text-[#FAF8F5] focus:outline-none focus:ring-2 focus:ring-[#E5B842]/40 cursor-pointer"
          >
            <option value="pending">Pending</option>
            <option value="birth_details_received">Birth Details Received</option>
            <option value="confirmed">Confirmed</option>
            <option value="in_progress">In Progress</option>
            <option value="delivered">Delivered</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Status Toast */}
      {statusMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
          <span>✓</span>
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Snapshot Authority Notice */}
      <div className="px-4 py-3 rounded-xl bg-[#E5B842]/10 border border-[#E5B842]/25 text-xs text-[#0F172A]/70 dark:text-[#FAF8F5]/70 flex items-center gap-2.5">
        <span className="text-[#E5B842] text-base">✦</span>
        <span>
          <strong>Authoritative Reading Snapshot:</strong> Chart information shown below reflects the client snapshot verified at the time of booking.
        </span>
      </div>

      {/* ─── 1. SECTION: READING ─── */}
      <div className="bg-[#FAF8F5] dark:bg-[#0D1829] border border-[#E5B842]/20 rounded-2xl p-6 sm:p-7 shadow-xs space-y-4">
        <p className="text-[10px] font-bold tracking-widest text-[#E5B842] uppercase">
          1. READING OVERVIEW
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
          <div>
            <p className="text-[11px] text-[#0F172A]/50 dark:text-[#FAF8F5]/50 mb-1">Service</p>
            <p className="text-sm font-semibold text-[#0F172A] dark:text-[#FAF8F5]">
              {serviceTitle}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-[#0F172A]/50 dark:text-[#FAF8F5]/50 mb-1">Format</p>
            <p className="text-sm font-semibold text-[#0F172A] dark:text-[#FAF8F5]">
              {isFreeReading ? "Email Reading" : order?.format === "voice_call" ? "Voice Call" : "Detailed Text"}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-[#0F172A]/50 dark:text-[#FAF8F5]/50 mb-1">Current Status</p>
            <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#E5B842]/20 text-[#B8871E] dark:text-[#E5B842] uppercase tracking-wider">
              {currentStatus}
            </span>
          </div>
          <div>
            <p className="text-[11px] text-[#0F172A]/50 dark:text-[#FAF8F5]/50 mb-1">Scheduled Date/Time</p>
            <p className="text-sm font-medium text-[#0F172A] dark:text-[#FAF8F5]">
              {order?.scheduled_at ? formatDate(order.scheduled_at) : "To be scheduled"}
            </p>
          </div>
        </div>
      </div>

      {/* ─── 2. SECTION: CLIENT SNAPSHOT ─── */}
      <div className="bg-[#FAF8F5] dark:bg-[#0D1829] border border-[#E5B842]/20 rounded-2xl p-6 sm:p-7 shadow-xs space-y-4">
        <p className="text-[10px] font-bold tracking-widest text-[#E5B842] uppercase">
          2. CLIENT CHART INFORMATION
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
          <div>
            <p className="text-[11px] text-[#0F172A]/50 dark:text-[#FAF8F5]/50 mb-1">Full Name</p>
            <p className="text-sm font-semibold text-[#0F172A] dark:text-[#FAF8F5]">
              {clientName}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-[#0F172A]/50 dark:text-[#FAF8F5]/50 mb-1">Date of Birth</p>
            <p className="text-sm font-medium text-[#0F172A] dark:text-[#FAF8F5]">
              {formatDate(clientDob)}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-[#0F172A]/50 dark:text-[#FAF8F5]/50 mb-1">Time of Birth</p>
            <p className="text-sm font-medium text-[#0F172A] dark:text-[#FAF8F5]">
              {formatTime(clientTob)}
            </p>
            <span className="text-[10px] text-[#0F172A]/50 dark:text-[#FAF8F5]/50 mt-0.5 block">
              {clientTimeUncertain ? "⚠ Uncertain / Approximate" : "✓ Exact Time"}
            </span>
          </div>
          <div>
            <p className="text-[11px] text-[#0F172A]/50 dark:text-[#FAF8F5]/50 mb-1">Place of Birth</p>
            <p className="text-sm font-medium text-[#0F172A] dark:text-[#FAF8F5]">
              {clientPob || "Not provided"}
            </p>
          </div>
        </div>
      </div>

      {/* ─── 3. SECTION: PARTNER SNAPSHOT (Rendered Only When Applicable) ─── */}
      {hasPartner && (
        <div className="bg-[#FAF8F5] dark:bg-[#0D1829] border border-[#E5B842]/20 rounded-2xl p-6 sm:p-7 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold tracking-widest text-[#E5B842] uppercase">
              3. PARTNER CHART INFORMATION
            </p>
            <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-[#E5B842]/15 text-[#B8871E] dark:text-[#E5B842]">
              Synastry / Matchmaking
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
            <div>
              <p className="text-[11px] text-[#0F172A]/50 dark:text-[#FAF8F5]/50 mb-1">Partner Name</p>
              <p className="text-sm font-semibold text-[#0F172A] dark:text-[#FAF8F5]">
                {partnerName || "Not set"}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-[#0F172A]/50 dark:text-[#FAF8F5]/50 mb-1">Date of Birth</p>
              <p className="text-sm font-medium text-[#0F172A] dark:text-[#FAF8F5]">
                {formatDate(partnerDob)}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-[#0F172A]/50 dark:text-[#FAF8F5]/50 mb-1">Time of Birth</p>
              <p className="text-sm font-medium text-[#0F172A] dark:text-[#FAF8F5]">
                {formatTime(partnerTob)}
              </p>
              <span className="text-[10px] text-[#0F172A]/50 dark:text-[#FAF8F5]/50 mt-0.5 block">
                {partnerTimeUncertain ? "⚠ Uncertain" : "✓ Exact Time"}
              </span>
            </div>
            <div>
              <p className="text-[11px] text-[#0F172A]/50 dark:text-[#FAF8F5]/50 mb-1">Place of Birth</p>
              <p className="text-sm font-medium text-[#0F172A] dark:text-[#FAF8F5]">
                {partnerPob || "Not provided"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ─── 4. SECTION: PAYMENT DETAILS ─── */}
      <div className="bg-[#FAF8F5] dark:bg-[#0D1829] border border-[#E5B842]/20 rounded-2xl p-6 sm:p-7 shadow-xs space-y-4">
        <p className="text-[10px] font-bold tracking-widest text-[#E5B842] uppercase">
          4. PAYMENT & INVOICE
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 items-center">
          <div>
            <p className="text-[11px] text-[#0F172A]/50 dark:text-[#FAF8F5]/50 mb-1">Price</p>
            <p className="font-serif text-2xl font-bold text-[#0F172A] dark:text-[#FAF8F5]">
              {isFreeReading ? "€0.00 (Free)" : `€${Number(order?.price_eur || 0).toFixed(2)}`}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-[#0F172A]/50 dark:text-[#FAF8F5]/50 mb-1">Payment Status</p>
            <span
              className={`inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
                (order?.payment_status || "unpaid") === "paid"
                  ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300"
                  : "bg-amber-500/15 text-amber-800 dark:text-amber-300"
              }`}
            >
              {isFreeReading ? "Free Reading" : order?.payment_status || "Pending"}
            </span>
          </div>
          <div>
            <p className="text-[11px] text-[#0F172A]/50 dark:text-[#FAF8F5]/50 mb-1">Receipt / Invoice</p>
            {order?.stripe_receipt_url ? (
              <a
                href={order.stripe_receipt_url}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-semibold text-[#E5B842] hover:underline inline-flex items-center gap-1"
              >
                <span>View Stripe Receipt</span>
                <span>↗</span>
              </a>
            ) : (
              <span className="text-xs text-[#0F172A]/40 dark:text-[#FAF8F5]/40 italic">
                {isFreeReading ? "Promotional intake" : "No receipt generated yet"}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ─── 5. SECTION: APPOINTMENT & GOOGLE CALENDAR ─── */}
      <div className="bg-[#FAF8F5] dark:bg-[#0D1829] border border-[#E5B842]/20 rounded-2xl p-6 sm:p-7 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold tracking-widest text-[#E5B842] uppercase">
            5. APPOINTMENT & CALENDAR SYNCHRONIZATION
          </p>
          <span className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full bg-[#0F172A]/5 dark:bg-[#FAF8F5]/10 text-[#0F172A]/60 dark:text-[#FAF8F5]/60">
            Scheduling
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-white/60 dark:bg-[#131F33]/60 border border-[#0F172A]/10 dark:border-[#FAF8F5]/10">
          <div>
            <p className="text-xs font-medium text-[#0F172A] dark:text-[#FAF8F5]">
              Google Calendar Status:{" "}
              <strong className="text-[#0F172A]/60 dark:text-[#FAF8F5]/60 font-semibold">
                Not Connected
              </strong>
            </p>
            <p className="text-[11px] text-[#0F172A]/50 dark:text-[#FAF8F5]/50 mt-0.5">
              Scheduled date/time: {order?.scheduled_at ? formatDate(order.scheduled_at) : "Awaiting appointment booking"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/admin/calendar"
              className="px-4 py-2 rounded-xl text-xs font-semibold border border-[#E5B842]/50 text-[#0F172A] dark:text-[#FAF8F5] hover:bg-[#E5B842]/10 transition-colors"
            >
              Open Calendar
            </Link>
          </div>
        </div>
      </div>

      {/* ─── 6. SECTION: PRIVATE ADMIN NOTES ─── */}
      <div className="bg-[#FAF8F5] dark:bg-[#0D1829] border border-[#E5B842]/25 rounded-2xl p-6 sm:p-7 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold tracking-widest text-[#E5B842] uppercase">
              6. PRIVATE ASTROLOGER NOTES
            </p>
            <p className="text-xs text-[#0F172A]/60 dark:text-[#FAF8F5]/60 mt-0.5">
              Private working notes for your analysis, planetary observations, and follow-ups.
            </p>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400">
            Confidential • Astrologer Only
          </span>
        </div>

        <textarea
          rows={5}
          value={adminNotes}
          onChange={(e) => setAdminNotes(e.target.value)}
          placeholder="Enter private observations, astrological interpretations, planetary transit notes, or reminders..."
          className="w-full text-xs sm:text-sm p-4 rounded-xl bg-white dark:bg-[#131F33] border border-[#0F172A]/15 dark:border-[#FAF8F5]/15 text-[#0F172A] dark:text-[#FAF8F5] placeholder:text-[#0F172A]/30 dark:placeholder:text-[#FAF8F5]/30 focus:outline-none focus:ring-2 focus:ring-[#E5B842]/40"
        />

        <div className="flex items-center justify-between pt-1">
          <p className="text-[11px] text-[#0F172A]/40 dark:text-[#FAF8F5]/40 italic">
            * Admin notes are stored server-side and are NEVER visible to customers.
          </p>

          <button
            type="button"
            onClick={handleSaveNotes}
            disabled={savingNotes}
            className="px-6 py-2 rounded-xl text-xs font-semibold bg-[#E5B842] text-[#0F172A] hover:bg-[#F3CE6D] transition-all shadow-xs disabled:opacity-50 cursor-pointer"
          >
            {savingNotes ? "Saving Notes…" : "Save Admin Notes"}
          </button>
        </div>
      </div>
    </div>
  );
}
