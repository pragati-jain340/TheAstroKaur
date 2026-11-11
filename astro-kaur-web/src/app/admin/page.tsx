"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { CalendarCheck, Euro, FileText, Video } from "lucide-react";

type BookingItem = {
  id: string;
  client_name: string | null;
  service_title: string;
  format: "text" | "voice_call";
  price_eur: number;
  status: string;
  payment_status: string;
  scheduled_at: string | null;
  created_at: string;
};

type OverviewData = {
  totalEarned: number;
  totalBookings: number;
  recentBookings: BookingItem[];
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

function formatScheduled(iso: string | null): string {
  if (!iso) return "To be scheduled";
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function getMeetStatus(item: BookingItem): "Upcoming" | "Done" {
  if (item.status === "completed") {
    return "Done";
  }
  if (item.scheduled_at) {
    const scheduledTime = new Date(item.scheduled_at).getTime();
    if (!Number.isNaN(scheduledTime) && scheduledTime <= Date.now()) {
      return "Done";
    }
  }
  return "Upcoming";
}

export default function AdminDashboardPage() {
  const supabase = useMemo(() => createClient(), []);
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data: orders, count, error: queryError } = await supabase
        .from("orders")
        .select("id,client_name,service_title,format,price_eur,status,payment_status,scheduled_at,created_at", { count: "exact" })
        .eq("payment_status", "paid")
        .neq("status", "cancelled")
        .order("created_at", { ascending: false });

      if (queryError) {
        throw queryError;
      }

      const paidOrders = (orders || []) as BookingItem[];
      const totalEarned = paidOrders.reduce((sum, o) => sum + Number(o.price_eur || 0), 0);
      const totalBookings = count ?? paidOrders.length;

      setData({
        totalEarned,
        totalBookings,
        recentBookings: paidOrders,
      });
    } catch {
      setError("Failed to load dashboard bookings. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  return (
    <div className="mx-auto max-w-6xl space-y-7 pb-16 text-[#0F172A] dark:text-[#FAF8F5]">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[#0F172A]/10 pb-6 dark:border-white/10">
        <div>
          <h1 className="font-serif text-3xl sm:text-4xl">Overview</h1>
          <p className="mt-2 text-sm text-[#46505F] dark:text-[#BCC4D0]">
            Your earnings, bookings, and recent appointments.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={() => void load()} disabled={loading}>
          {loading && data ? "Refreshing…" : "Refresh"}
        </Button>
      </header>

      {error && (
        <div role="alert" className="flex items-center justify-between rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-800 dark:text-red-200">
          <span>{error}</span>
          <Button variant="link" size="sm" onClick={() => void load()} className="h-auto p-0 underline">
            Try again
          </Button>
        </div>
      )}

      {loading && !data ? (
        <p role="status" className="py-10 text-sm text-[#46505F] dark:text-[#BCC4D0]">
          Loading your dashboard…
        </p>
      ) : data && (
        <>
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Card className="border-border bg-card p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-[#46505F] dark:text-[#BCC4D0]">
                  Total Money Earned
                </p>
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#E5B842]/15 text-[#805b11] dark:text-[#E5B842]">
                  <Euro className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-3 font-serif text-3xl font-bold tracking-tight text-[#0F172A] dark:text-[#FAF8F5] sm:text-4xl">
                €{data.totalEarned.toFixed(2)}
              </p>
              <p className="mt-1 text-xs text-[#46505F] dark:text-[#BCC4D0]">
                All-time earnings from paid bookings
              </p>
            </Card>

            <Card className="border-border bg-card p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-[#46505F] dark:text-[#BCC4D0]">
                  Total Bookings
                </p>
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#E5B842]/15 text-[#805b11] dark:text-[#E5B842]">
                  <CalendarCheck className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-3 font-serif text-3xl font-bold tracking-tight text-[#0F172A] dark:text-[#FAF8F5] sm:text-4xl">
                {data.totalBookings}
              </p>
              <p className="mt-1 text-xs text-[#46505F] dark:text-[#BCC4D0]">
                Total confirmed and completed bookings
              </p>
            </Card>
          </div>

          {/* Recent Bookings List */}
          <Card className="gap-0 overflow-hidden border-border bg-card shadow-sm">
            <CardHeader className="border-b border-border px-5 py-5 sm:px-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle className="font-serif text-2xl font-normal text-[#0F172A] dark:text-[#FAF8F5]">
                    Recent Bookings
                  </CardTitle>
                  <CardDescription className="mt-1 text-xs text-[#46505F] dark:text-[#BCC4D0] sm:text-sm">
                    All recent bookings with format and meeting status.
                  </CardDescription>
                </div>
                <Link
                  href="/admin/readings"
                  className="text-xs font-semibold text-[#805b11] underline underline-offset-4 hover:text-[#573b06] dark:text-[#F2D37B] dark:hover:text-[#FFE7A0] sm:text-sm"
                >
                  View all readings →
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {data.recentBookings.length === 0 ? (
                <div className="p-8 text-center text-sm text-[#46505F] dark:text-[#BCC4D0]">
                  No bookings found yet.
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {data.recentBookings.map((booking) => {
                    const isMeet = booking.format === "voice_call" || (booking.format as string) === "meet";
                    const meetStatus = isMeet ? getMeetStatus(booking) : null;

                    return (
                      <li key={booking.id}>
                        <Link
                          href={`/admin/readings/${booking.id}`}
                          className="group flex flex-col gap-3 p-5 transition-colors hover:bg-[#0F172A]/[0.02] dark:hover:bg-white/[0.03] sm:flex-row sm:items-center sm:justify-between sm:px-6"
                        >
                          <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium text-sm text-[#0F172A] group-hover:underline dark:text-[#FAF8F5]">
                                {booking.client_name || "Customer"}
                              </span>

                              {isMeet ? (
                                <>
                                  <span className="inline-flex items-center gap-1 rounded-full border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 text-xs font-medium text-purple-700 dark:text-purple-300">
                                    <Video className="h-3 w-3" />
                                    Meet
                                  </span>
                                  {meetStatus === "Upcoming" ? (
                                    <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-800 dark:text-amber-300">
                                      Upcoming
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:text-emerald-300">
                                      Done
                                    </span>
                                  )}
                                </>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-xs font-medium text-sky-800 dark:text-sky-300">
                                  <FileText className="h-3 w-3" />
                                  Text
                                </span>
                              )}
                            </div>
                            <p className="truncate text-xs text-[#46505F] dark:text-[#BCC4D0]">
                              {booking.service_title}
                            </p>
                            <p className="text-[11px] text-[#46505F]/80 dark:text-[#BCC4D0]/80">
                              {isMeet && booking.scheduled_at
                                ? `Scheduled: ${formatScheduled(booking.scheduled_at)}`
                                : isMeet
                                ? `Booked on ${formatDate(booking.created_at)} (Awaiting schedule)`
                                : `Booked on ${formatDate(booking.created_at)}`}
                            </p>
                          </div>

                          <div className="flex items-center justify-between gap-4 sm:justify-end">
                            <span className="font-serif text-base font-semibold text-[#0F172A] dark:text-[#FAF8F5]">
                              €{Number(booking.price_eur || 0).toFixed(2)}
                            </span>
                            <span aria-hidden="true" className="text-base text-[#805b11] transition-transform group-hover:translate-x-0.5 dark:text-[#E5B842]">
                              →
                            </span>
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
