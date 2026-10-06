"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";

type OrderRow = Database["public"]["Tables"]["orders"]["Row"];
type FreeRequestRow = Database["public"]["Tables"]["free_reading_requests"]["Row"];

interface UnifiedReadingItem {
  id: string; // "order-[id]" or "free-[id]"
  rawId: string;
  sourceType: "paid" | "free";
  customerName: string;
  customerEmail: string;
  serviceTitle: string;
  format: string;
  price: string;
  paymentStatus: string;
  status: string;
  scheduledAt: string | null;
  createdAt: string;
  detailUrl: string;
}

type StatusFilter = "all" | "upcoming" | "in_progress" | "completed" | "cancelled";
type TypeFilter = "all" | "paid" | "free";

export default function AdminReadingsPage() {
  const supabase = createClient();
  const [readings, setReadings] = useState<UnifiedReadingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");

  const fetchReadings = async () => {
    try {
      setLoading(true);

      // 1. Fetch Orders with snapshot client information
      const { data: orders, error: ordersErr } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (ordersErr) throw ordersErr;

      // 2. Fetch Free Reading Requests
      const { data: freeReqs, error: freeErr } = await supabase
        .from("free_reading_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (freeErr) throw freeErr;

      // 3. Map into unified list
      const items: UnifiedReadingItem[] = [];

      (orders || []).forEach((o: OrderRow) => {
        items.push({
          id: `order-${o.id}`,
          rawId: o.id,
          sourceType: "paid",
          customerName: o.client_name || "Customer",
          customerEmail: "",
          serviceTitle: o.service_title,
          format: o.format === "voice_call" ? "Voice Call" : "Detailed Text",
          price: `€${Number(o.price_eur).toFixed(2)}`,
          paymentStatus: o.payment_status,
          status: o.status,
          scheduledAt: o.scheduled_at,
          createdAt: o.created_at || new Date().toISOString(),
          detailUrl: `/admin/readings/${o.id}`,
        });
      });

      (freeReqs || []).forEach((f: FreeRequestRow) => {
        items.push({
          id: `free-${f.id}`,
          rawId: f.id,
          sourceType: "free",
          customerName: f.full_name,
          customerEmail: f.email,
          serviceTitle: "Free Promotional Reading",
          format: "Email Analysis",
          price: "Free",
          paymentStatus: "n/a",
          status: f.status,
          scheduledAt: null,
          createdAt: f.created_at,
          detailUrl: `/admin/readings/free-${f.id}`,
        });
      });

      // Sort newest first
      items.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setReadings(items);
    } catch (err: any) {
      console.error("Error fetching admin readings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReadings();
  }, []);

  // Filter and Search logic
  const filteredReadings = useMemo(() => {
    return readings.filter((item) => {
      // Type filter
      if (typeFilter !== "all" && item.sourceType !== typeFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== "all") {
        if (statusFilter === "upcoming") {
          const isUpcoming =
            item.status === "confirmed" ||
            (item.status === "pending" &&
              item.scheduledAt &&
              new Date(item.scheduledAt) > new Date());
          if (!isUpcoming) return false;
        } else if (statusFilter === "in_progress") {
          if (item.status !== "in_progress" && item.status !== "pending") return false;
        } else if (statusFilter === "completed") {
          if (item.status !== "completed") return false;
        } else if (statusFilter === "cancelled") {
          if (item.status !== "cancelled") return false;
        }
      }

      // Search term
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesName = item.customerName.toLowerCase().includes(q);
        const matchesEmail = item.customerEmail.toLowerCase().includes(q);
        const matchesService = item.serviceTitle.toLowerCase().includes(q);
        if (!matchesName && !matchesEmail && !matchesService) return false;
      }

      return true;
    });
  }, [readings, statusFilter, typeFilter, search]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Not Scheduled";
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30";
      case "confirmed":
        return "bg-[#E5B842]/20 text-[#B8871E] dark:text-[#E5B842] border-[#E5B842]/40";
      case "in_progress":
        return "bg-sky-500/15 text-sky-800 dark:text-sky-300 border-sky-500/30";
      case "cancelled":
        return "bg-rose-500/15 text-rose-800 dark:text-rose-300 border-rose-500/30";
      default:
        return "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30";
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* ─── Header ─── */}
      <div className="border-b border-[#0F172A]/8 dark:border-[#FAF8F5]/8 pb-5 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/admin" className="text-[10px] font-bold tracking-widest text-[#E5B842] uppercase hover:underline">
              ADMIN
            </Link>
            <span className="text-[10px] text-[#0F172A]/40 dark:text-[#FAF8F5]/40">/</span>
            <span className="text-[10px] font-bold tracking-widest text-[#0F172A]/50 dark:text-[#FAF8F5]/50 uppercase">
              READINGS
            </span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-[#0F172A] dark:text-[#FAF8F5] tracking-tight uppercase">
            READINGS MANAGEMENT
          </h1>
          <p className="mt-1 text-sm text-[#0F172A]/60 dark:text-[#FAF8F5]/60">
            Operational bookings, snapshot charts, and reading delivery statuses.
          </p>
        </div>

        <button
          onClick={fetchReadings}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-[#131F33] border border-[#0F172A]/10 dark:border-[#FAF8F5]/10 text-[#0F172A] dark:text-[#FAF8F5] hover:border-[#E5B842]/50 hover:bg-[#E5B842]/5 transition-all cursor-pointer self-start sm:self-auto"
        >
          <span>↻</span>
          <span>Refresh</span>
        </button>
      </div>

      {/* ─── Search & Filter Bar ─── */}
      <div className="bg-[#FAF8F5] dark:bg-[#0D1829] border border-[#E5B842]/20 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xs">
        {/* Top search & Type filters */}
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search Box */}
          <div className="relative flex-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by customer name, email, or service..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-[#131F33] border border-[#0F172A]/15 dark:border-[#FAF8F5]/15 text-xs text-[#0F172A] dark:text-[#FAF8F5] placeholder:text-[#0F172A]/40 dark:placeholder:text-[#FAF8F5]/40 focus:outline-none focus:ring-2 focus:ring-[#E5B842]/40"
            />
            <span className="absolute left-3.5 top-3 text-[#0F172A]/40 dark:text-[#FAF8F5]/40 text-xs">
              🔍
            </span>
          </div>

          {/* Paid vs Free Type Filter */}
          <div className="inline-flex p-1 rounded-xl bg-white dark:bg-[#131F33] border border-[#0F172A]/10 dark:border-[#FAF8F5]/10 self-start md:self-auto">
            {(["all", "paid", "free"] as TypeFilter[]).map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all capitalize cursor-pointer ${
                  typeFilter === t
                    ? "bg-[#E5B842] text-[#0F172A] font-semibold shadow-xs"
                    : "text-[#0F172A]/60 dark:text-[#FAF8F5]/60 hover:text-[#0F172A] dark:hover:text-[#FAF8F5]"
                }`}
              >
                {t === "all" ? "All Types" : t === "paid" ? "Paid Only" : "Free Intakes"}
              </button>
            ))}
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-[#0F172A]/8 dark:border-[#FAF8F5]/8">
          {(
            [
              { key: "all", label: "All Readings" },
              { key: "upcoming", label: "Upcoming" },
              { key: "in_progress", label: "In Progress" },
              { key: "completed", label: "Completed" },
              { key: "cancelled", label: "Cancelled" },
            ] as { key: StatusFilter; label: string }[]
          ).map((tab) => {
            const active = statusFilter === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                  active
                    ? "bg-[#0F172A] dark:bg-[#FAF8F5] text-[#FAF8F5] dark:text-[#0F172A] font-semibold shadow-xs"
                    : "bg-white/60 dark:bg-[#131F33]/60 text-[#0F172A]/60 dark:text-[#FAF8F5]/60 hover:bg-white dark:hover:bg-[#131F33] border border-[#0F172A]/10 dark:border-[#FAF8F5]/10"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Readings List ─── */}
      {loading ? (
        <div className="py-20 text-center text-xs text-[#0F172A]/50 dark:text-[#FAF8F5]/50">
          Loading readings and snapshots…
        </div>
      ) : filteredReadings.length === 0 ? (
        <div className="bg-[#FAF8F5] dark:bg-[#0D1829] border border-dashed border-[#E5B842]/30 rounded-2xl p-12 text-center space-y-3">
          <p className="text-2xl text-[#E5B842]">✦</p>
          <p className="font-serif text-base text-[#0F172A] dark:text-[#FAF8F5]">
            No readings found matching your filter criteria
          </p>
          <button
            onClick={() => {
              setSearch("");
              setStatusFilter("all");
              setTypeFilter("all");
            }}
            className="text-xs font-semibold text-[#E5B842] underline cursor-pointer"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredReadings.map((item) => (
            <div
              key={item.id}
              className="bg-[#FAF8F5] dark:bg-[#0D1829] border border-[#E5B842]/20 hover:border-[#E5B842]/60 rounded-2xl p-5 sm:p-6 transition-all shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5 group"
            >
              {/* Left Column: Customer & Service */}
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-serif text-base sm:text-lg font-semibold text-[#0F172A] dark:text-[#FAF8F5] tracking-tight">
                    {item.serviceTitle.toUpperCase()}
                  </span>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${getStatusBadge(
                      item.status
                    )}`}
                  >
                    {item.status}
                  </span>
                  {item.sourceType === "free" && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-700 dark:text-purple-300">
                      Free Intake
                    </span>
                  )}
                </div>

                <p className="text-xs sm:text-sm font-medium text-[#0F172A]/80 dark:text-[#FAF8F5]/80">
                  {item.customerName}
                </p>

                <div className="flex items-center gap-4 text-xs text-[#0F172A]/50 dark:text-[#FAF8F5]/50 flex-wrap">
                  <span>📅 {formatDate(item.scheduledAt || item.createdAt)}</span>
                  <span>•</span>
                  <span>🎙 {item.format}</span>
                  {item.customerEmail && (
                    <>
                      <span>•</span>
                      <span>✉ {item.customerEmail}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Right Column: Pricing & View Button */}
              <div className="flex items-center justify-between md:justify-end gap-5 pt-3 md:pt-0 border-t md:border-t-0 border-[#0F172A]/6 dark:border-[#FAF8F5]/6">
                <div className="text-left md:text-right">
                  <p className="font-serif text-lg font-bold text-[#0F172A] dark:text-[#FAF8F5]">
                    {item.price}
                  </p>
                  <p className="text-[10px] text-[#0F172A]/50 dark:text-[#FAF8F5]/50 uppercase tracking-wider">
                    {item.paymentStatus === "paid" ? "✓ Paid" : item.paymentStatus}
                  </p>
                </div>

                <Link
                  href={item.detailUrl}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-[#E5B842] text-[#0F172A] hover:bg-[#F3CE6D] transition-all shadow-xs cursor-pointer whitespace-nowrap"
                >
                  View Reading →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
