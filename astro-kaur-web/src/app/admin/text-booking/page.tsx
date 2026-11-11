"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";

type OrderRow = Database["public"]["Tables"]["orders"]["Row"];
type TextBooking = Pick<OrderRow, "id" | "client_name" | "service_title" | "price_eur" | "status" | "payment_status">;


export default function TextBookingPage() {
  const supabase = useMemo(() => createClient(), []);
  const [bookings, setBookings] = useState<TextBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showAll, setShowAll] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const { data, error: queryError } = await supabase
      .from("orders")
      .select("id,client_name,service_title,price_eur,status,payment_status")
      .eq("format", "text")
      .order("created_at", { ascending: false });

    if (queryError) {
      setError("Text bookings could not be loaded. Please try again.");
    } else {
      setBookings((data || []) as TextBooking[]);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => { void Promise.resolve().then(load); }, [load]);

  const followUpCount = bookings.filter((booking) => booking.payment_status === "paid" && !["completed", "cancelled"].includes(booking.status)).length;
  const visible = bookings.filter((booking) => {
    const needsFollowUp = booking.payment_status === "paid" && !["completed", "cancelled"].includes(booking.status);
    if (!showAll && !needsFollowUp) return false;
    const query = search.trim().toLowerCase();
    return !query || booking.client_name?.toLowerCase().includes(query) || booking.service_title.toLowerCase().includes(query);
  });

  return (
    <div className="mx-auto max-w-5xl space-y-7 pb-12">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[#0F172A]/10 pb-6 dark:border-white/10">
        <div>
          <h1 className="font-serif text-3xl sm:text-4xl">Text Booking</h1>
          <p className="mt-2 max-w-[65ch] text-sm text-[#46505F] dark:text-[#BCC4D0]">There is no appointment for a text reading. Contact each customer when you are ready.</p>
        </div>
        <Button type="button" variant="outline" onClick={() => void load()} disabled={loading}>
          {loading ? "Refreshing…" : "Refresh"}
        </Button>
      </header>

      <Card role="region" className="gap-0 overflow-hidden rounded-2xl py-0 shadow-none" aria-labelledby="text-bookings-heading">
        <div className="flex flex-col gap-4 border-b border-[#0F172A]/10 px-4 py-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <div className="flex items-baseline gap-3">
              <h2 id="text-bookings-heading" className="text-lg font-semibold">Paid readings to follow up</h2>
              <span className="text-sm tabular-nums text-[#46505F] dark:text-[#BCC4D0]">{followUpCount}</span>
            </div>
            <p className="mt-1 text-sm text-[#46505F] dark:text-[#BCC4D0]">Mark a reading delivered after you have sent it to the customer.</p>
          </div>
          <label className="flex items-center gap-2 text-sm text-[#46505F] dark:text-[#BCC4D0]">
            <Checkbox checked={showAll} onCheckedChange={(checked) => setShowAll(checked === true)} />
            Show all text bookings
          </label>
        </div>

        <div className="px-4 py-4 sm:px-6">
          <label className="block max-w-md text-sm font-medium">
            Search bookings
            <Input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Customer or reading" className="mt-1.5 h-11" />
          </label>
        </div>

        {error ? (
          <div role="alert" className="flex items-center justify-between border-t border-red-500/20 px-4 py-5 text-sm text-red-800 dark:text-red-200 sm:px-6">
            <span>{error}</span>
            <Button type="button" variant="link" size="sm" onClick={() => void load()} className="h-auto p-0 font-semibold underline underline-offset-4">Try again</Button>
          </div>
        ) : loading ? (
          <p role="status" className="border-t border-[#0F172A]/10 px-4 py-6 text-sm text-[#46505F] dark:border-white/10 dark:text-[#BCC4D0] sm:px-6">Loading text bookings…</p>
        ) : visible.length === 0 ? (
          <div className="border-t border-[#0F172A]/10 px-4 py-8 dark:border-white/10 sm:px-6">
            <p className="font-medium">{bookings.length === 0 ? "No text bookings yet" : "No bookings match this view"}</p>
            <p className="mt-1 text-sm text-[#46505F] dark:text-[#BCC4D0]">{showAll ? "New text bookings will appear here after checkout." : "You are all caught up. Show all text bookings to review older readings."}</p>
          </div>
        ) : (
          <ul className="divide-y divide-[#0F172A]/10 dark:divide-white/10">
            {visible.map((booking) => {
              const needsFollowUp = booking.payment_status === "paid" && !["completed", "cancelled"].includes(booking.status);
              return (
                <li key={booking.id}>
                  <Link href={`/admin/readings/${booking.id}`} className="flex flex-col gap-4 px-4 py-4 outline-none transition-colors hover:bg-[#0F172A]/[0.025] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#805b11] dark:hover:bg-white/[0.025] dark:focus-visible:ring-[#E5B842] sm:flex-row sm:items-center sm:justify-between sm:px-6">
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{booking.client_name || "Customer"}</span>
                      <span className="mt-1 block truncate text-sm text-[#46505F] dark:text-[#BCC4D0]">{booking.service_title}</span>
                    </span>
                    <span className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                      <span className="text-[#46505F] dark:text-[#BCC4D0]">€{Number(booking.price_eur).toFixed(2)} · {booking.payment_status === "paid" ? "Paid" : booking.payment_status}</span>
                      <span className={`font-medium ${needsFollowUp ? "text-[#805b11] dark:text-[#F2D37B]" : booking.status === "completed" ? "text-emerald-800 dark:text-emerald-300" : "text-[#46505F] dark:text-[#BCC4D0]"}`}>
                        {booking.status === "completed" ? "Delivered" : needsFollowUp ? "Needs follow-up" : booking.status.replaceAll("_", " ")}
                      </span>
                      <span aria-hidden="true" className="text-lg">→</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
