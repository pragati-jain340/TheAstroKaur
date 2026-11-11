"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Calendar,
  CalendarClock,
  ChevronDown,
  Clock,
  Globe,
  User,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import BookingAvailabilityPanel from "@/components/admin/BookingAvailabilityPanel";
import GoogleCalendarSettings from "@/components/services/GoogleCalendarSettings";
import { isUpcomingVoiceCall } from "@/lib/booking/display";
import type { Settings } from "@/lib/booking/types";

type Call = { id: string; client_name: string | null; scheduled_at: string | null; scheduled_end_at: string | null; status: string; payment_status: string };
type Data = {
  settings: Settings;
  connection: {
    organizer_email: string;
    calendar_id: string;
    busy_calendar_ids: string[];
    status: string;
    last_success_at: string | null;
    last_error: string | null;
  } | null;
  busy_error: string | null;
  services: Array<{ id: string; format: string; duration_minutes: number | null }>;
  windows?: unknown[];
  overrides?: unknown[];
  jobs?: unknown[];
  requests?: unknown[];
};
type Entry = { start: string; end: string; call?: Call; durations?: number[] };

export default function AdminCalendarPage() {
  const [data, setData] = useState<Data | null>(null);
  const [calls, setCalls] = useState<Call[]>([]);
  const [slots, setSlots] = useState<Entry[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [googleOpen, setGoogleOpen] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/availability?slots=1", { cache: "no-store" });
      const result: Data & { error?: string; slots?: Entry[]; calls?: Call[] } = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to load availability.");
      setSlots(result.slots || []);
      setCalls(result.calls || []);
      setData(result);
      setError("");
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to load availability."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void Promise.resolve().then(load); }, [load]);
  useEffect(() => { if (new URLSearchParams(window.location.search).has("google")) void Promise.resolve().then(() => setGoogleOpen(true)); }, []);
  const upcoming = calls.filter((call) => isUpcomingVoiceCall({ ...call, format: "voice_call" }));
  const zone = data?.settings.timezone || "Europe/Berlin";
  const entries: Entry[] = [...slots, ...upcoming.map((call) => ({ start: call.scheduled_at!, end: call.scheduled_end_at || call.scheduled_at!, call }))].sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
  const groups = new Map<string, Entry[]>();
  const dateFormat = new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" });
  for (const entry of entries) { const date = dateFormat.format(new Date(entry.start)); groups.set(date, [...(groups.get(date) || []), entry]); }
  const time = (value: string) => new Intl.DateTimeFormat("en-GB", { timeZone: zone, hour: "2-digit", minute: "2-digit" }).format(new Date(value));

  const totalAvailable = useMemo(() => {
    let count = 0;
    for (const items of groups.values()) {
      count += items.filter((item) => !item.call).length;
    }
    return count;
  }, [groups]);

  const totalBooked = useMemo(() => {
    let count = 0;
    for (const items of groups.values()) {
      count += items.filter((item) => !!item.call).length;
    }
    return count;
  }, [groups]);

  return <div className="mx-auto max-w-4xl space-y-6 pb-12">
    <header className="flex flex-wrap items-start justify-between gap-4 border-b border-[#0F172A]/10 pb-6 dark:border-white/10">
      <div>
        <h1 className="font-serif text-3xl sm:text-4xl">Voice Call Booking</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your schedule, availability windows, and view upcoming booked client consultations.
        </p>
      </div>
      <details open={googleOpen} onToggle={(event) => setGoogleOpen(event.currentTarget.open)} className="relative w-full sm:w-auto">
        <summary className={`cursor-pointer list-none rounded-xl border px-4 py-2.5 text-sm font-semibold flex items-center gap-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${data && data.connection?.status !== "connected" ? "border-amber-500/50 bg-amber-500/10 text-amber-900 dark:text-amber-200 hover:bg-amber-500/20" : "border-[#E5B842]/30 bg-card hover:bg-muted/50 text-foreground"}`}>
          <Calendar className="w-4 h-4 text-[#B87936] dark:text-[#E5B842]" />
          <span>Google Calendar · {data ? data.connection?.status === "connected" ? "Connected" : "Not connected" : "Loading…"}</span>
          <ChevronDown className="w-4 h-4 ml-auto text-muted-foreground transition-transform duration-200 group-open:rotate-180" />
        </summary>
        {googleOpen && <div className="relative z-20 mt-2 sm:absolute sm:right-0 sm:w-[420px] sm:shadow-xl"><GoogleCalendarSettings purpose="organizer" onConnectionChange={() => void load()} /></div>}
      </details>
    </header>
    {error && (
      <div role="alert" className="flex items-center justify-between text-sm text-red-700 dark:text-red-300">
        <span>{error}</span>
        <Button variant="link" size="sm" className="h-auto p-0 underline" onClick={() => void load()}>
          Try again
        </Button>
      </div>
    )}
    <div className="space-y-6">
    <BookingAvailabilityPanel initialData={data as any} calls={upcoming} onSaved={() => void load()} />
    <Card role="region" aria-labelledby="slots-heading" className="gap-0 rounded-2xl border border-[#E5B842]/20 bg-card p-5 sm:p-6 shadow-xs">
      <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-[#0F172A]/10 dark:border-white/10">
        <div>
          <h2 id="slots-heading" className="font-serif text-2xl font-medium tracking-tight text-[#0F172A] dark:text-[#FAF8F5] flex items-center gap-2.5">
            <CalendarClock className="w-5 h-5 text-[#B87936] dark:text-[#E5B842]" />
            Your slots
          </h2>
          <p className="text-xs text-muted-foreground mt-1 flex flex-wrap items-center gap-2">
            <span>{groups.size} active day{groups.size === 1 ? "" : "s"} in upcoming 30 days</span>
            {groups.size > 0 && (
              <>
                <span>•</span>
                <span className="text-emerald-700 dark:text-emerald-400 font-medium">{totalAvailable} open</span>
                {totalBooked > 0 && (
                  <>
                    <span>•</span>
                    <span className="text-amber-700 dark:text-amber-300 font-medium">{totalBooked} booked</span>
                  </>
                )}
              </>
            )}
          </p>
        </div>
        <Badge variant="outline" className="gap-1.5 py-1 px-2.5 border-[#E5B842]/30 bg-[#FAF8F5] dark:bg-muted/40 text-xs font-medium text-foreground">
          <Globe className="w-3.5 h-3.5 text-[#B87936] dark:text-[#E5B842]" />
          {zone}
        </Badge>
      </div>

      {data?.busy_error && <p role="alert" className="mt-3 text-sm text-amber-900 dark:text-amber-200">{data.busy_error}</p>}
      {loading && !data ? (
        <div role="status" className="py-12 text-center text-sm text-muted-foreground">
          <CalendarClock className="w-6 h-6 mx-auto mb-2 animate-spin text-[#B87936] dark:text-[#E5B842]" />
          Loading slots…
        </div>
      ) : groups.size ? (
        <div className="mt-4 space-y-2.5">
          {[...groups.entries()].map(([date, items], index) => {
            const booked = items.filter((item) => item.call);
            const available = items.filter((item) => !item.call);
            const durationGroups = [
              ...new Set(
                available.map((item) =>
                  item.durations ? [...item.durations].sort((a, b) => a - b).join(" / ") : ""
                )
              ),
            ].filter(Boolean);

            const dateObj = new Date(items[0].start);
            const weekday = new Intl.DateTimeFormat("en-GB", { timeZone: zone, weekday: "short" }).format(dateObj);
            const dayNum = new Intl.DateTimeFormat("en-GB", { timeZone: zone, day: "numeric" }).format(dateObj);
            const monthStr = new Intl.DateTimeFormat("en-GB", { timeZone: zone, month: "short" }).format(dateObj);
            const formattedDate = new Intl.DateTimeFormat("en-GB", { timeZone: zone, weekday: "short", day: "numeric", month: "short" }).format(dateObj);

            return (
              <details
                key={date}
                open={index === 0 || booked.length > 0}
                className="group rounded-xl border border-[#0F172A]/8 dark:border-white/8 bg-[#FAF8F5]/50 dark:bg-white/[0.02] hover:bg-[#FAF8F5] dark:hover:bg-white/[0.04] transition-all overflow-hidden [&[open]]:bg-card [&[open]]:border-[#E5B842]/30 [&[open]]:shadow-xs"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-3.5 sm:p-4 select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#805b11] dark:focus-visible:outline-[#E5B842]">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex flex-col items-center justify-center w-10 h-10 rounded-lg bg-background border border-[#E5B842]/25 shadow-2xs shrink-0">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-[#B87936] dark:text-[#E5B842] leading-none">
                        {weekday}
                      </span>
                      <span className="text-sm font-semibold tabular-nums text-foreground mt-0.5 leading-none">
                        {dayNum}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <span className="font-semibold text-sm sm:text-base text-[#0F172A] dark:text-[#FAF8F5] block truncate">
                        {formattedDate}
                      </span>
                      <span className="text-[11px] text-muted-foreground block">
                        {monthStr} · {items.length} slot{items.length === 1 ? "" : "s"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
                    {booked.length > 0 && (
                      <Badge
                        variant="secondary"
                        className="bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 text-[11px] font-medium px-2 py-0.5"
                      >
                        {booked.length} booked
                      </Badge>
                    )}
                    <Badge
                      variant="outline"
                      className="bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/20 text-[11px] font-medium px-2 py-0.5"
                    >
                      {available.length} available
                    </Badge>
                    <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform duration-200 group-open:rotate-180" />
                  </div>
                </summary>

                <div className="px-3.5 sm:px-4 pb-4 pt-1 border-t border-[#0F172A]/5 dark:border-white/5 space-y-4">
                  {/* Booked Consultations */}
                  {booked.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                        <User className="w-3.5 h-3.5 text-[#B87936] dark:text-[#E5B842]" />
                        <span>Confirmed Consultations ({booked.length})</span>
                      </div>
                      <ul className="space-y-2">
                        {booked.map((item) => (
                          <li
                            key={item.call!.id}
                            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-500/25 bg-amber-500/10 dark:bg-amber-950/20 p-3 text-sm"
                          >
                            <div className="flex items-center gap-2.5">
                              <Clock className="w-4 h-4 text-amber-700 dark:text-amber-300 shrink-0" />
                              <div>
                                <div className="font-medium text-foreground">
                                  <span className="tabular-nums font-semibold">
                                    {time(item.start)}–{time(item.end)}
                                  </span>
                                  <span className="mx-2 opacity-50">·</span>
                                  <span>{item.call!.client_name || "Customer"}</span>
                                </div>
                                <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-2">
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] uppercase tracking-wider py-0 px-1.5 h-4 border-amber-500/40"
                                  >
                                    {item.call!.payment_status || "paid"}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              asChild
                              className="h-8 text-xs font-medium text-amber-900 dark:text-amber-200 hover:bg-amber-500/20"
                            >
                              <Link href={`/admin/readings/${item.call!.id}`}>
                                View booking <ArrowUpRight className="w-3 h-3 ml-1" />
                              </Link>
                            </Button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Available Start Times */}
                  {durationGroups.length > 0 && (
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        <Clock className="w-3.5 h-3.5 text-[#B87936] dark:text-[#E5B842]" />
                        <span>Available Start Times</span>
                      </div>
                      {durationGroups.map((durations) => (
                        <div key={durations} className="space-y-1.5">
                          <p className="text-[11px] font-medium text-muted-foreground">
                            {durations} min consultation duration
                          </p>
                          <ul className="flex flex-wrap gap-2">
                            {available
                              .filter(
                                (item) =>
                                  item.durations &&
                                  [...item.durations].sort((a, b) => a - b).join(" / ") ===
                                    durations
                              )
                              .map((item) => (
                                <li
                                  key={item.start}
                                  className="inline-flex items-center px-2.5 py-1.5 rounded-lg text-xs font-medium tabular-nums bg-background border border-[#0F172A]/10 dark:border-white/10 shadow-2xs hover:border-[#E5B842] hover:text-[#B87936] dark:hover:text-[#E5B842] transition-colors"
                                >
                                  {time(item.start)}
                                </li>
                              ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </details>
            );
          })}
        </div>
      ) : (
        <div className="mt-6 rounded-xl border border-dashed border-[#E5B842]/30 bg-[#FAF8F5]/50 dark:bg-muted/10 px-5 py-10 text-center">
          <div className="w-12 h-12 mx-auto rounded-full bg-[#E5B842]/10 flex items-center justify-center text-[#B87936] dark:text-[#E5B842] mb-3">
            <CalendarClock className="w-6 h-6" />
          </div>
          <p className="font-medium text-foreground">No slots available yet</p>
          <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">
            Add weekly availability windows or special date overrides in the panel on the left to generate bookable slots.
          </p>
        </div>
      )}
    </Card>
    </div>
  </div>;
}
