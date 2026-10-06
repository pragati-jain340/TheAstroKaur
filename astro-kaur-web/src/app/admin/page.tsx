"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";

type OrderRow = Database["public"]["Tables"]["orders"]["Row"];
type FreeRequestRow = Database["public"]["Tables"]["free_reading_requests"]["Row"];
type TestimonialRow = Database["public"]["Tables"]["testimonials"]["Row"];

interface DashboardMetrics {
  totalCustomers: number;
  revenueThisMonth: number;
  freeRequests: number;
  pendingTestimonials: number;
}

interface ActivityItem {
  id: string;
  category: "New paid booking" | "Free reading request" | "New testimonial" | "Reading completed" | "New customer";
  name: string;
  date: string;
  timestamp: number;
  linkHref: string;
}

export default function AdminDashboardPage() {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalCustomers: 0,
    revenueThisMonth: 0,
    freeRequests: 0,
    pendingTestimonials: 0,
  });

  const [activities, setActivities] = useState<ActivityItem[]>([]);

  const fetchDashboardData = useCallback(async () => {
    try {
      setError(null);
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth(); // 0-indexed

      // 1. Fetch Total Customers
      const { count: customerCount, error: customerErr } = await supabase
        .from("customer_profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "customer");

      if (customerErr) throw customerErr;

      // 2. Fetch Recent Customers for Activity Feed
      const { data: recentCustomers } = await supabase
        .from("customer_profiles")
        .select("id, display_name, email, created_at")
        .eq("role", "customer")
        .order("created_at", { ascending: false })
        .limit(5);

      // 3. Fetch Orders
      const { data: orders, error: ordersErr } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (ordersErr) throw ordersErr;

      // 4. Fetch Free Reading Requests
      const { data: freeReqs, error: freeErr } = await supabase
        .from("free_reading_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (freeErr) throw freeErr;

      // 5. Fetch Testimonials
      const { data: testimonials, error: testErr } = await supabase
        .from("testimonials")
        .select("*")
        .order("created_at", { ascending: false });

      if (testErr) throw testErr;

      // ─── Calculate Revenue This Month ───
      const allOrders: OrderRow[] = (orders as OrderRow[]) || [];
      const paidOrders = allOrders.filter(
        (o: OrderRow) => o.payment_status === "paid" && o.status !== "cancelled"
      );

      let revThisMonth = 0;
      paidOrders.forEach((o: OrderRow) => {
        const val = Number(o.price_eur) || 0;
        const orderDate = new Date(o.created_at || now.toISOString());
        if (orderDate.getFullYear() === currentYear && orderDate.getMonth() === currentMonth) {
          revThisMonth += val;
        }
      });

      // Free Requests needing attention (all pending or total intake count)
      const allFreeReqs: FreeRequestRow[] = (freeReqs as FreeRequestRow[]) || [];
      const freeCount = allFreeReqs.length;

      // Pending Reviews (not published and consent given or awaiting approval)
      const allTestimonials: TestimonialRow[] = (testimonials as TestimonialRow[]) || [];
      const pendingReviewsCount = allTestimonials.filter(
        (t: TestimonialRow) => !t.is_published
      ).length;

      setMetrics({
        totalCustomers: customerCount || 0,
        revenueThisMonth: revThisMonth,
        freeRequests: freeCount,
        pendingTestimonials: pendingReviewsCount,
      });

      // ─── Build Latest 5 Recent Activities ───
      const feed: ActivityItem[] = [];

      // A. Paid bookings
      paidOrders.forEach((o: OrderRow) => {
        const d = new Date(o.created_at);
        feed.push({
          id: `paid-${o.id}`,
          category: "New paid booking",
          name: o.client_name || "Customer",
          date: d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
          timestamp: d.getTime(),
          linkHref: `/admin/readings/${o.id}`,
        });
      });

      // B. Completed readings
      allOrders
        .filter((o: OrderRow) => o.status === "completed")
        .forEach((o: OrderRow) => {
          const d = new Date(o.updated_at || o.created_at);
          feed.push({
            id: `completed-${o.id}`,
            category: "Reading completed",
            name: o.client_name || "Customer",
            date: d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
            timestamp: d.getTime(),
            linkHref: `/admin/readings/${o.id}`,
          });
        });

      // C. Free reading requests
      allFreeReqs.forEach((fr: FreeRequestRow) => {
        const d = new Date(fr.created_at);
        feed.push({
          id: `free-${fr.id}`,
          category: "Free reading request",
          name: fr.full_name || "Requester",
          date: d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
          timestamp: d.getTime(),
          linkHref: `/admin/readings`,
        });
      });

      // D. Testimonials submitted
      allTestimonials.forEach((t: TestimonialRow) => {
        const d = new Date(t.created_at);
        feed.push({
          id: `testimonial-${t.id}`,
          category: "New testimonial",
          name: t.author_name,
          date: d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
          timestamp: d.getTime(),
          linkHref: `/admin/testimonials`,
        });
      });

      // E. New registered customers
      (recentCustomers || []).forEach((c: { id: string; display_name: string | null; email: string; created_at: string }) => {
        const d = new Date(c.created_at);
        feed.push({
          id: `customer-${c.id}`,
          category: "New customer",
          name: c.display_name || c.email.split("@")[0],
          date: d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
          timestamp: d.getTime(),
          linkHref: `/admin/users/${c.id}`,
        });
      });

      // Sort newest first and strictly take top 5
      feed.sort((a, b) => b.timestamp - a.timestamp);
      setActivities(feed.slice(0, 5));
    } catch (err: unknown) {
      console.error("Error fetching dashboard metrics:", err);
      const msg =
        (err as any)?.message ||
        (err as any)?.details ||
        (err instanceof Error ? err.message : String(err));
      setError(msg || "Failed to load dashboard metrics");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleManualRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const getCategoryDotColor = (category: ActivityItem["category"]) => {
    switch (category) {
      case "New paid booking":
        return "text-emerald-500";
      case "Free reading request":
        return "text-sky-500";
      case "New testimonial":
        return "text-[#E5B842]";
      case "Reading completed":
        return "text-purple-500";
      case "New customer":
        return "text-indigo-500";
      default:
        return "text-[#E5B842]";
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200 max-w-6xl pb-16">
      {/* ─── Header ─── */}
      <div className="border-b border-[#0F172A]/8 dark:border-[#FAF8F5]/8 pb-5 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-[#0F172A] dark:text-[#FAF8F5] tracking-tight uppercase">
            ADMIN DASHBOARD
          </h1>
          <p className="mt-1 text-sm text-[#0F172A]/60 dark:text-[#FAF8F5]/60">
            Overview of TheAstroKaur
          </p>
        </div>

        <div>
          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-[#070D18] border border-[#0F172A]/10 dark:border-[#FAF8F5]/10 text-[#0F172A] dark:text-[#FAF8F5] hover:border-[#E5B842]/50 hover:bg-[#E5B842]/5 transition-all shadow-xs disabled:opacity-50 cursor-pointer"
          >
            <span className={`text-sm ${refreshing ? "animate-spin" : ""}`}>↻</span>
            <span>{refreshing ? "Refreshing..." : "Refresh Data"}</span>
          </button>
        </div>
      </div>

      {/* ─── Error Notification ─── */}
      {error && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/25 text-red-600 dark:text-red-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>⚠</span>
            <span>{error}</span>
          </div>
          <button
            onClick={handleManualRefresh}
            className="underline font-semibold hover:text-red-700 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* ─── Small Summary Row (4 High-Level Cards) ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: CUSTOMERS */}
        <Link
          href="/admin/users"
          className="bg-white dark:bg-[#070D18] border border-[#0F172A]/8 dark:border-[#FAF8F5]/8 rounded-2xl p-5 hover:border-[#E5B842]/60 hover:shadow-sm transition-all group cursor-pointer"
        >
          <span className="text-[10px] font-bold tracking-wider text-[#0F172A]/50 dark:text-[#FAF8F5]/50 uppercase">
            CUSTOMERS
          </span>
          <p className="font-serif text-3xl font-semibold text-[#0F172A] dark:text-[#FAF8F5] mt-2 group-hover:text-[#E5B842] transition-colors">
            {loading ? "…" : metrics.totalCustomers}
          </p>
          <p className="text-[11px] text-[#0F172A]/50 dark:text-[#FAF8F5]/50 mt-1">
            Active
          </p>
        </Link>

        {/* Card 2: REVENUE */}
        <Link
          href="/admin/readings"
          className="bg-white dark:bg-[#070D18] border border-[#0F172A]/8 dark:border-[#FAF8F5]/8 rounded-2xl p-5 hover:border-[#E5B842]/60 hover:shadow-sm transition-all group cursor-pointer"
        >
          <span className="text-[10px] font-bold tracking-wider text-[#0F172A]/50 dark:text-[#FAF8F5]/50 uppercase">
            REVENUE
          </span>
          <p className="font-serif text-3xl font-semibold text-[#0F172A] dark:text-[#FAF8F5] mt-2 group-hover:text-[#E5B842] transition-colors">
            {loading ? "…" : `€${metrics.revenueThisMonth.toFixed(0)}`}
          </p>
          <p className="text-[11px] text-[#0F172A]/50 dark:text-[#FAF8F5]/50 mt-1">
            This month
          </p>
        </Link>

        {/* Card 3: FREE REQUESTS */}
        <Link
          href="/admin/readings"
          className="bg-white dark:bg-[#070D18] border border-[#0F172A]/8 dark:border-[#FAF8F5]/8 rounded-2xl p-5 hover:border-[#E5B842]/60 hover:shadow-sm transition-all group cursor-pointer"
        >
          <span className="text-[10px] font-bold tracking-wider text-[#0F172A]/50 dark:text-[#FAF8F5]/50 uppercase">
            FREE REQUESTS
          </span>
          <p className="font-serif text-3xl font-semibold text-[#0F172A] dark:text-[#FAF8F5] mt-2 group-hover:text-[#E5B842] transition-colors">
            {loading ? "…" : metrics.freeRequests}
          </p>
          <p className="text-[11px] text-[#0F172A]/50 dark:text-[#FAF8F5]/50 mt-1">
            Need attention
          </p>
        </Link>

        {/* Card 4: PENDING REVIEWS */}
        <Link
          href="/admin/testimonials"
          className="bg-white dark:bg-[#070D18] border border-[#0F172A]/8 dark:border-[#FAF8F5]/8 rounded-2xl p-5 hover:border-[#E5B842]/60 hover:shadow-sm transition-all group cursor-pointer"
        >
          <span className="text-[10px] font-bold tracking-wider text-[#0F172A]/50 dark:text-[#FAF8F5]/50 uppercase">
            PENDING REVIEWS
          </span>
          <p className="font-serif text-3xl font-semibold text-[#0F172A] dark:text-[#FAF8F5] mt-2 group-hover:text-[#E5B842] transition-colors">
            {loading ? "…" : metrics.pendingTestimonials}
          </p>
          <p className="text-[11px] text-[#0F172A]/50 dark:text-[#FAF8F5]/50 mt-1">
            Need approval
          </p>
        </Link>
      </div>

      {/* ─── Recent Activity (Latest 5 items) ─── */}
      <div className="space-y-4 pt-2">
        <h2 className="font-serif text-sm font-semibold tracking-wider text-[#0F172A] dark:text-[#FAF8F5] uppercase">
          RECENT ACTIVITY
        </h2>

        {loading ? (
          <div className="bg-white dark:bg-[#070D18] border border-[#0F172A]/8 dark:border-[#FAF8F5]/8 rounded-2xl p-8 text-center text-xs text-[#0F172A]/40 dark:text-[#FAF8F5]/40">
            Loading recent activity…
          </div>
        ) : activities.length === 0 ? (
          <div className="bg-white dark:bg-[#070D18] border border-[#0F172A]/8 dark:border-[#FAF8F5]/8 rounded-2xl p-8 text-center text-xs text-[#0F172A]/50 dark:text-[#FAF8F5]/50">
            No recent activity recorded yet.
          </div>
        ) : (
          <div className="bg-white dark:bg-[#070D18] border border-[#0F172A]/8 dark:border-[#FAF8F5]/8 rounded-2xl divide-y divide-[#0F172A]/5 dark:divide-[#FAF8F5]/5 overflow-hidden shadow-xs">
            {activities.map((act) => (
              <Link
                key={act.id}
                href={act.linkHref}
                className="p-4 sm:px-6 flex items-center justify-between gap-4 hover:bg-[#FAF8F5] dark:hover:bg-[#0D1829] transition-colors group cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`text-sm ${getCategoryDotColor(act.category)} shrink-0`}>
                    ●
                  </span>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4 min-w-0">
                    <span className="text-xs font-medium text-[#0F172A]/70 dark:text-[#FAF8F5]/70 shrink-0">
                      {act.category}
                    </span>
                    <span className="text-xs font-semibold text-[#0F172A] dark:text-[#FAF8F5] truncate group-hover:text-[#E5B842] transition-colors">
                      {act.name}
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-[#0F172A]/40 dark:text-[#FAF8F5]/40 shrink-0">
                  {act.date}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
