"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Calendar,
  ChevronDown,
  Clock,
  Globe,
} from "lucide-react";
import { Calendar as MonthCalendar } from "@/components/ui/calendar";
import { availabilityDurationWarning, hoursForDate } from "@/lib/booking/scheduleEditing";
import { zonedParts } from "@/lib/booking/slots";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import BookingAvailabilityPanel, { type AdminAvailabilityData, type AvailabilityEditorHandle } from "@/components/admin/BookingAvailabilityPanel";
import GoogleCalendarSettings from "@/components/services/GoogleCalendarSettings";
import { isUpcomingVoiceCall } from "@/lib/booking/display";

type Call = { id: string; client_name: string | null; scheduled_at: string | null; scheduled_end_at: string | null; status: string; payment_status: string };
type Data = AdminAvailabilityData;
type Entry = { start: string; end: string; call?: Call; durations?: number[] };

export default function AdminCalendarPage() {
  const availabilityEditor = useRef<AvailabilityEditorHandle>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [month, setMonth] = useState<Date>();
  const [today, setToday] = useState("");
  const [data, setData] = useState<Data | null>(null);
  const [scheduleRevision, setScheduleRevision] = useState(0);
  const [scheduleNotice, setScheduleNotice] = useState("");
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
      const currentDate = zonedParts(Date.now(), result.settings.timezone).date;
      setToday(currentDate);
      setSelectedDate(current => current || currentDate);
      setScheduleRevision(value => value + 1);
      setError("");
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to load availability."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void Promise.resolve().then(load); }, [load]);
  useEffect(() => { if (new URLSearchParams(window.location.search).has("google")) void Promise.resolve().then(() => setGoogleOpen(true)); }, []);
  const upcoming = calls.filter((call) => isUpcomingVoiceCall({ ...call, format: "voice_call" }));
  const zone = data?.settings.timezone || "Europe/Berlin";
  const offeredDurations = [...new Set(data?.services.filter(service => service.format === "voice_call" && service.duration_minutes).map(service => service.duration_minutes!) || [])];
  const entries: Entry[] = [...slots, ...upcoming.map((call) => ({ start: call.scheduled_at!, end: call.scheduled_end_at || call.scheduled_at!, call }))].sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
  const groups = new Map<string, Entry[]>();
  for (const entry of entries) { const date = zonedParts(Date.parse(entry.start), zone).date; groups.set(date, [...(groups.get(date) || []), entry]); }
  const time = (value: string) => new Intl.DateTimeFormat("en-GB", { timeZone: zone, hour: "2-digit", minute: "2-digit" }).format(new Date(value));

  const dateObject = (key: string) => { const [y, m, d] = key.split("-").map(Number); return new Date(y, m - 1, d, 12); };
  const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const selectedItems = groups.get(selectedDate) || [];
  const available = selectedItems.filter(item => !item.call);
  const booked = selectedItems.filter(item => item.call);
  const dateRules = data?.overrides.filter(rule => rule.local_date === selectedDate) || [];
  const dayOff = dateRules.some(rule => rule.mode === "blocked" && !rule.start_local && !rule.end_local);
  const savedHours = data && selectedDate ? hoursForDate(data.windows, data.overrides, selectedDate) : [];
  const durationWarning = data ? availabilityDurationWarning(savedHours, offeredDurations, data.settings.buffer_minutes) : null;
  const fullDate = selectedDate ? new Intl.DateTimeFormat("en-GB", { dateStyle: "full" }).format(dateObject(selectedDate)) : "";

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
    {scheduleNotice && <p role="status" className="rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-800 dark:text-emerald-300">{scheduleNotice}</p>}
    <Card className="gap-0 overflow-hidden rounded-2xl border-border/60 bg-card p-0 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-5 py-4 sm:px-6">
        <div><h2 className="text-lg font-semibold">Your availability</h2><p className="mt-1 text-sm text-muted-foreground">Select a date to change its hours. One schedule for all readings.</p></div>
        <Badge variant="outline" className="gap-1.5"><Globe className="size-3.5" />{zone}</Badge>
      </div>
      {loading && !data ? <p role="status" className="p-10 text-center text-sm text-muted-foreground">Loading calendar...</p> : data && selectedDate && <div className="grid min-w-0 md:grid-cols-[minmax(280px,1fr)_1.15fr]">
        <div className="min-w-0 p-4 sm:p-6 md:border-r md:border-border/60">
          <div className="mb-3 flex items-center justify-between"><span className="text-xs text-muted-foreground">Choose any date</span><Button variant="ghost" size="sm" onClick={() => { setSelectedDate(today); setMonth(dateObject(today)); }}>Today</Button></div>
          <MonthCalendar mode="single" required selected={dateObject(selectedDate)} month={month} onMonthChange={setMonth} defaultMonth={dateObject(selectedDate)} today={dateObject(today)}
            onSelect={date => { if (date) { setSelectedDate(dateKey(date)); setMonth(new Date(date.getFullYear(), date.getMonth(), 1)); } }}
            modifiers={{ available: date => (groups.get(dateKey(date)) || []).some(item => !item.call), booked: date => (groups.get(dateKey(date)) || []).some(item => !!item.call), changed: date => data.overrides.some(rule => rule.local_date === dateKey(date)) }}
            modifiersClassNames={{ available: "after:pointer-events-none after:absolute after:bottom-1.5 after:left-1/2 after:size-1 after:-translate-x-1/2 after:rounded-full after:bg-emerald-600 dark:after:bg-emerald-400", booked: "before:pointer-events-none before:absolute before:right-1.5 before:top-1.5 before:size-1.5 before:rounded-full before:bg-amber-500", changed: "[&_button]:ring-1 [&_button]:ring-inset [&_button]:ring-border" }} />
          <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground"><span className="flex items-center gap-1.5"><i className="size-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400" />Bookable</span><span className="flex items-center gap-1.5"><i className="size-1.5 rounded-full bg-amber-500" />Booking</span><span className="flex items-center gap-1.5"><i className="size-2.5 rounded-sm border border-border" />Custom date</span></div>
          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">Customers can book up to {data.settings.advance_window_days} days ahead. You can plan hours beyond that window.</p>
        </div>
        <section aria-labelledby="selected-date-heading" className="min-w-0 border-t border-border/60 p-5 sm:p-6 md:border-t-0" aria-busy={loading}>
          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">Selected date</p>
          <h3 id="selected-date-heading" className="text-lg font-semibold">{fullDate}</h3>
          <p className="mt-2 text-sm text-muted-foreground">{dayOff ? "Marked unavailable all day" : dateRules.length ? "Custom hours for this date" : "Uses your repeating weekly hours"}</p>
          <div className="mt-4 rounded-lg bg-muted/40 p-3"><p className="text-xs text-muted-foreground">Working hours</p><p className="mt-1 text-sm font-medium tabular-nums">{savedHours.length ? savedHours.map(range => `${range.start} to ${range.end}`).join(", ") : "Unavailable"}</p></div>
          <Button className="mt-5" disabled={loading} onClick={() => availabilityEditor.current?.editDate(selectedDate)}><Clock className="size-4" />Edit hours or add time off</Button>
          <div className="mt-6 border-t border-border/60 pt-5">
            <h4 className="text-sm font-semibold">{available.length ? `${available.length} bookable start times` : "No bookable start times"}</h4>
            {!available.length && <p className={`mt-2 text-xs leading-relaxed ${durationWarning ? "text-amber-900 dark:text-amber-200" : "text-muted-foreground"}`}>{selectedDate < today ? "This date has passed." : !data.settings.booking_enabled ? "New call bookings are currently paused." : dayOff ? "You have taken this day off." : durationWarning || (!offeredDurations.length ? "There are no active call readings to book. Add or enable a call reading in Website content." : "Hours, booking notice, existing bookings and the booking window determine which times customers can select.")}</p>}
            {available.length > 0 && <ul className="mt-3 flex flex-wrap gap-2">{available.map(item => {
              const durations = [...(item.durations || [])].sort((a, b) => a - b);
              const restricted = durations.length > 0 && offeredDurations.some(duration => !durations.includes(duration));
              return <li key={item.start} className="rounded-lg border border-border/60 bg-background px-2.5 py-2 text-xs tabular-nums">{time(item.start)}{restricted && <span className="ml-1 text-muted-foreground">{durations.join(" / ")} min only</span>}</li>;
            })}</ul>}
          </div>
          {booked.length > 0 && <div className="mt-6 space-y-3 border-t border-border/60 pt-5"><h4 className="text-sm font-semibold">Bookings ({booked.length})</h4>{booked.map(item => <div key={item.call!.id} className="rounded-lg border border-amber-500/25 bg-amber-500/5 p-3 text-sm"><p className="font-medium">{time(item.start)} to {time(item.end)}</p><p className="mt-1 text-muted-foreground">{item.call!.client_name || "Customer"}</p><Button variant="link" size="sm" className="mt-1 h-auto px-0" asChild><Link href={`/admin/readings/${item.call!.id}`}>View booking<ArrowUpRight className="size-3" /></Link></Button></div>)}</div>}
        </section>
      </div>}
    </Card>
    {data?.busy_error && <details className="rounded-lg border border-amber-500/30 px-4 py-3 text-sm text-amber-900 dark:text-amber-200"><summary className="cursor-pointer font-medium">Google Calendar needs attention</summary><p className="mt-2 leading-relaxed">{data.busy_error}</p></details>}
    <BookingAvailabilityPanel key={scheduleRevision} initialData={data} editorRef={availabilityEditor} onSaved={() => { setScheduleNotice("Availability saved."); void load(); }} />
    </div>
  </div>;
}
