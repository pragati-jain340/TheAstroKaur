"use client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";

import { useCallback, useEffect, useState, useMemo } from "react";
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

type StatusFilter = "all" | "upcoming" | "in_progress" | "completed" | "cancelled" | "pending_payment" | "payment_review" | "awaiting_schedule";
type TypeFilter = "all" | "paid" | "free";

export default function AdminReadingsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [readings, setReadings] = useState<UnifiedReadingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [formatFilter, setFormatFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");

  const fetchReadings = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

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
          customerEmail: (o as OrderRow & { customer_email_snapshot?: string }).customer_email_snapshot || "",
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
    } catch (err: unknown) {
      console.error("Error fetching admin readings:", err);
      setError("Readings could not be loaded. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void Promise.resolve().then(() => {
      const params = new URLSearchParams(window.location.search);
      const format = params.get("format");
      const status = params.get("status");
      if (!params.has("type") && !status && !format) { window.location.replace("/admin"); return; }
      if (format === "text") { window.location.replace("/admin/text-booking"); return; }
      if (format === "voice_call" || status === "awaiting_schedule" || status === "upcoming") { window.location.replace("/admin/calendar"); return; }
      if (params.get("type") === "free") setTypeFilter("free");
      if (status === "payment_review" || status === "awaiting_schedule") setStatusFilter(status);
      return fetchReadings();
    });
  }, [fetchReadings]);

  // Filter and Search logic
  const filteredReadings = useMemo(() => {
    return readings.filter((item) => {
      if (formatFilter !== "all" && item.format !== formatFilter) return false;
      // Type filter
      if (typeFilter !== "all" && item.sourceType !== typeFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== "all") {
        if (statusFilter === "upcoming") {
          const isUpcoming =
            item.format === "Voice Call" &&
            (item.status === "confirmed" || item.status === "pending") &&
            item.scheduledAt &&
            new Date(item.scheduledAt) > new Date();
          if (!isUpcoming) return false;
        } else if (statusFilter === "pending_payment" || statusFilter === "payment_review" || statusFilter === "awaiting_schedule") {
          if (item.status !== statusFilter) return false;
        } else if (statusFilter === "in_progress") {
          if (
            item.status !== "in_progress" &&
            item.status !== "pending" &&
            !(item.format === "Detailed Text" && item.paymentStatus === "paid" && item.status === "confirmed")
          ) return false;
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
  }, [readings, statusFilter, typeFilter, search, formatFilter]);

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
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[#0F172A]/10 pb-6 dark:border-white/10">
        <div>
          <h1 className="font-serif text-3xl sm:text-4xl text-[#0F172A] dark:text-[#FAF8F5]">{typeFilter === "free" ? "Free Reading Requests" : "Payment reviews"}</h1>
          <p className="mt-2 text-sm text-[#0F172A]/70 dark:text-[#FAF8F5]/70">Find a reading and open it to manage the details.</p>
        </div>
        <Button variant="outline" onClick={() => void fetchReadings()} disabled={loading}>Refresh</Button>
      </header>

      <Card className="gap-0 rounded-2xl p-5 shadow-none">
        <div className="flex flex-wrap gap-2" aria-label="Reading type">
          {[
            { label: "All readings", type: "all" as TypeFilter, format: "all" },
            { label: "Voice calls", type: "paid" as TypeFilter, format: "Voice Call" },
            { label: "Text readings", type: "paid" as TypeFilter, format: "Detailed Text" },
            { label: "Free requests", type: "free" as TypeFilter, format: "all" },
          ].map((option) => {
            const active = typeFilter === option.type && formatFilter === option.format;
            return (
              <Button key={option.label} type="button" variant={active ? "default" : "outline"} aria-pressed={active} onClick={() => { setTypeFilter(option.type); setFormatFilter(option.format); }}>
                {option.label}
              </Button>
            );
          })}
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-[minmax(0,1fr)_210px]">
          <label className="text-sm font-medium text-[#0F172A] dark:text-[#FAF8F5]">
            Search
            <Input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Customer or reading"
              className="mt-1.5 w-full rounded-xl border border-[#0F172A]/20 bg-[#FAF8F5] px-3 py-2.5 text-sm text-[#0F172A] placeholder:text-[#0F172A]/55 focus:outline-none focus:ring-2 focus:ring-[#B88A2E] dark:border-white/20 dark:bg-[#131F33] dark:text-[#FAF8F5] dark:placeholder:text-[#FAF8F5]/55" />
          </label>
          <label className="text-sm font-medium text-[#0F172A] dark:text-[#FAF8F5]">
            Status
            <NativeSelect value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
              className="mt-1.5 w-full rounded-xl border border-[#0F172A]/20 bg-[#FAF8F5] px-3 py-2.5 text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#B88A2E] dark:border-white/20 dark:bg-[#131F33] dark:text-[#FAF8F5]">
              <option value="all">All statuses</option>
              <option value="upcoming">Upcoming</option>
              <option value="pending_payment">Pending payment</option>
              <option value="awaiting_schedule">Needs a time</option>
              <option value="payment_review">Payment review</option>
              <option value="in_progress">Open</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </NativeSelect>
          </label>
        </div>
      </Card>

      {/* ─── Readings List ─── */}
      {loading ? (
        <div className="py-20 text-center text-xs text-[#0F172A]/50 dark:text-[#FAF8F5]/50">
          Loading readings and snapshots…
        </div>
      ) : error ? (
        <div role="alert" className="flex items-center justify-between rounded-xl border border-red-500/30 p-5 text-sm text-red-700 dark:text-red-300">
          <span>{error}</span>
          <Button variant="link" size="sm" className="h-auto p-0 underline" onClick={() => void fetchReadings()}>
            Try again
          </Button>
        </div>
      ) : filteredReadings.length === 0 ? (
        <div className="bg-[#FAF8F5] dark:bg-[#0D1829] border border-dashed border-[#E5B842]/30 rounded-2xl p-12 text-center space-y-3">
          <p className="text-2xl text-[#E5B842]">✦</p>
          <p className="font-serif text-base text-[#0F172A] dark:text-[#FAF8F5]">
            No readings found matching your filter criteria
          </p>
          <Button
            variant="link"
            size="sm"
            onClick={() => {
              setSearch("");
              setStatusFilter("all");
              setTypeFilter("all");
              setFormatFilter("all");
            }}
            className="text-xs font-semibold text-[#E5B842] underline"
          >
            Clear Filters
          </Button>
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
                    {item.status.replaceAll("_", " ")}
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
                  {item.sourceType === "free" && <span>Submitted {formatDate(item.createdAt)}</span>}
                  {item.format === "Voice Call" && item.scheduledAt && <span>Call {formatDate(item.scheduledAt)}</span>}
                  {(item.sourceType === "free" || (item.format === "Voice Call" && item.scheduledAt)) && <span aria-hidden="true">•</span>}
                  <span>{item.format}</span>
                  {item.customerEmail && (
                    <>
                      <span>•</span>
                      <span>{item.customerEmail}</span>
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
