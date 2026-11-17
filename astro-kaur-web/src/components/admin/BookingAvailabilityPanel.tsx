"use client";

import { useImperativeHandle, useState, type Ref } from "react";
import { CalendarRange, ChevronDown, Copy, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { NativeSelect } from "@/components/ui/native-select";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { zonedParts } from "@/lib/booking/slots";
import { availabilityDurationWarning, applyDateRule, copyWeeklyHours, datesInRange, nextTimeRange, validateWeeklyHours, weeklyHoursErrors, WEEKDAYS, WEEK_ORDER, type TimeRange } from "@/lib/booking/scheduleEditing";
import type { AvailabilityOverride, AvailabilityWindow, Settings } from "@/lib/booking/types";

export interface AdminAvailabilityData {
  settings: Settings;
  windows: AvailabilityWindow[];
  overrides: AvailabilityOverride[];
  services: Array<{ id: string; title: string; format: string; duration_minutes: number | null }>;
  connection: { organizer_email: string; calendar_id: string; busy_calendar_ids: string[]; status: string; last_success_at: string | null; last_error: string | null } | null;
  busy_error: string | null;
}
export interface AvailabilityEditorHandle { editDate: (date: string) => void }

const timezones = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : ["Europe/Berlin", "Europe/London", "Asia/Kolkata", "America/New_York", "America/Los_Angeles"];
const defaultRanges = (): TimeRange[] => [{ start: "09:00", end: "17:00" }];

function RangeInputs({ range, label, errorId, onChange, onRemove }: { range: TimeRange; label: string; errorId?: string; onChange: (range: TimeRange) => void; onRemove: () => void }) {
  return <div className="flex min-w-0 items-center gap-2">
    <Input type="time" aria-invalid={!!errorId} aria-describedby={errorId} aria-label={`${label} start`} value={range.start.slice(0, 5)} onChange={event => onChange({ ...range, start: event.target.value })} className="h-10 min-w-0 flex-1 bg-background px-2" />
    <span aria-hidden="true" className="text-xs text-muted-foreground">to</span>
    <Input type="time" aria-invalid={!!errorId} aria-describedby={errorId} aria-label={`${label} end`} value={range.end.slice(0, 5)} onChange={event => onChange({ ...range, end: event.target.value })} className="h-10 min-w-0 flex-1 bg-background px-2" />
    <Button type="button" variant="ghost" size="icon-sm" onClick={onRemove} aria-label={`Remove ${label}`} className="shrink-0 text-muted-foreground"><Trash2 aria-hidden="true" className="size-3.5" /></Button>
  </div>;
}

export default function BookingAvailabilityPanel({ onSaved, initialData, editorRef }: { onSaved?: () => void; initialData: AdminAvailabilityData | null; editorRef?: Ref<AvailabilityEditorHandle> }) {
  const [bulkDates, setBulkDates] = useState(false);
  const [data, setData] = useState(initialData);
  const [savedData, setSavedData] = useState(initialData);
  const [expanded, setExpanded] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [copyDay, setCopyDay] = useState<number | null>(null);
  const [copyTargets, setCopyTargets] = useState<number[]>([]);
  const [dialogError, setDialogError] = useState("");
  const [datesOpen, setDatesOpen] = useState(false);
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [dateDays, setDateDays] = useState<number[]>(WEEK_ORDER);
  const [dateKind, setDateKind] = useState<"custom" | "unavailable" | "weekly">("unavailable");
  const [allDay, setAllDay] = useState(true);
  const [dateRanges, setDateRanges] = useState<TimeRange[]>(defaultRanges);

  const weeklyErrors = weeklyHoursErrors(data?.windows || []);
  const dirty = !!data && JSON.stringify(data) !== JSON.stringify(savedData);
  const edit = (next: AdminAvailabilityData) => { setData(next); setMessage(""); setError(""); };

  function toggleDay(day: number, enabled: boolean) {
    if (!data) return;
    const existing = data.windows.some(window => window.weekday === day);
    edit({ ...data, windows: existing ? data.windows.map(window => window.weekday === day ? { ...window, enabled } : window)
      : [...data.windows, { weekday: day, start_local: "09:00", end_local: "17:00", enabled }] });
  }
  function addWeeklyRange(day: number) {
    if (!data) return;
    try {
      const range = nextTimeRange(data.windows.filter(window => window.weekday === day && window.enabled !== false).map(window => ({ start: window.start_local, end: window.end_local })));
      edit({ ...data, windows: [...data.windows, { weekday: day, start_local: range.start, end_local: range.end, enabled: true }] });
    } catch (error) { setError(error instanceof Error ? error.message : "Adjust the existing hours first."); }
  }
  function openDates(date?: string) {
    if (!data) return;
    const today = zonedParts(Date.now(), data.settings.timezone).date;
    const rules = date ? data.overrides.filter(rule => rule.local_date === date) : [];
    const openings = rules.filter(rule => rule.mode === "extra_open" && rule.start_local && rule.end_local);
    const blocks = rules.filter(rule => rule.mode === "blocked" && rule.note !== "Custom hours");
    setDateStart(date || today); setDateEnd(date || today); setDateDays(WEEK_ORDER);
    const useWeekly = !!date && rules.length === 0;
    setDateKind(openings.length || useWeekly ? "custom" : "unavailable");
    setAllDay(!date || blocks.some(rule => !rule.start_local || !rule.end_local));
    const ranges = openings.length ? openings : blocks.filter(rule => rule.start_local && rule.end_local);
    const weekday = date ? new Date(`${date}T12:00:00Z`).getUTCDay() : -1;
    const weeklyRanges = data.windows.filter(window => window.weekday === weekday && window.enabled !== false).map(window => ({ start: window.start_local.slice(0, 5), end: window.end_local.slice(0, 5) }));
    setDateRanges(ranges.length ? ranges.map(rule => ({ start: rule.start_local!.slice(0, 5), end: rule.end_local!.slice(0, 5) })) : useWeekly && weeklyRanges.length ? weeklyRanges : defaultRanges());
    setBulkDates(!date);
    setDialogError(""); setDatesOpen(true);
  }
  async function applyDates() {
    if (!data) return;
    try {
      const dates = datesInRange(dateStart, dateEnd, dateDays);
      const overrides = dateKind === "weekly" ? data.overrides.filter(rule => !dates.includes(rule.local_date)) : applyDateRule(data.overrides, dates, dateKind, allDay, dateRanges);
      const next = { ...data, overrides };
      if (await save(next)) setDatesOpen(false);
    } catch (error) { setDialogError(error instanceof Error ? error.message : "Check the selected dates and hours."); }
  }
  function requestSave() {
    if (!data) return;
    setError("");
    try {
      validateWeeklyHours(data.windows);
      if (!Number.isInteger(data.settings.buffer_minutes) || data.settings.buffer_minutes < 0 || data.settings.buffer_minutes > 120) throw new Error("Choose a whole-number buffer between 0 and 120 minutes.");
      new Intl.DateTimeFormat("en", { timeZone: data.settings.timezone });
      void save();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Check your schedule.");
      document.querySelector<HTMLInputElement>('#booking-settings input[aria-invalid="true"]')?.focus();
    }
  }
  async function save(next = data) {
    if (!next) return false;
    setWorking(true); setError(""); setMessage("");
    try {
      validateWeeklyHours(next.windows);
      if (!Number.isInteger(next.settings.buffer_minutes) || next.settings.buffer_minutes < 0 || next.settings.buffer_minutes > 120) throw new Error("Choose a whole-number buffer between 0 and 120 minutes.");
      new Intl.DateTimeFormat("en", { timeZone: next.settings.timezone });
      const response = await fetch("/api/admin/availability", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ settings: next.settings, windows: next.windows, overrides: next.overrides }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to save availability.");
      setData(next); setSavedData(next); setMessage("Schedule saved. Bookable start times have been updated."); onSaved?.();
      return true;
    } catch (error) { const message = error instanceof Error ? error.message : "Unable to save availability."; setError(message); setDialogError(message); return false; }
    finally { setWorking(false); }
  }
  useImperativeHandle(editorRef, () => ({ editDate: (date: string) => { openDates(date); } }));
  const formatDate = (date: string) => {
    const instant = new Date(`${date}T12:00:00Z`);
    return Number.isNaN(instant.getTime()) ? date : new Intl.DateTimeFormat("en-GB", { dateStyle: "full", timeZone: "UTC" }).format(instant);
  };

  const durationWarning = data && dateKind === "custom" ? availabilityDurationWarning(dateRanges, data.services.filter(service => service.format === "voice_call").map(service => service.duration_minutes || 0), data.settings.buffer_minutes) : null;
  const exceptionDates = data ? [...new Set(data.overrides.map(rule => rule.local_date))].sort() : [];

  return <>
    <details id="booking-settings" open={expanded} onToggle={event => setExpanded(event.currentTarget.open)} className="rounded-2xl border border-border/60 bg-card p-4 sm:p-6">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2.5"><CalendarRange aria-hidden="true" className="size-5 text-primary" /><span className="text-lg font-semibold">Weekly hours & booking settings</span></span>
        <span className="flex items-center gap-2 text-xs text-muted-foreground">{dirty ? "Unsaved changes" : data?.settings.timezone}<ChevronDown aria-hidden="true" className={`size-4 transition-transform ${expanded ? "rotate-180" : ""}`} /></span>
      </summary>
      <div className="mt-5 space-y-6">
        {message && <p role="status" className="rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-800 dark:text-emerald-300">{message}</p>}
        {!data ? <p role="status" className="text-sm text-muted-foreground">Loading schedule...</p> : <fieldset disabled={working} className="min-w-0 space-y-7 disabled:opacity-70">
          <p className="text-sm leading-relaxed text-muted-foreground">Set one shared schedule for all readings. A booked call blocks the reader&apos;s time for every reading. Available starts account for the selected reading&apos;s duration and your buffer.</p>
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-muted/40 p-4">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium"><Checkbox checked={data.settings.booking_enabled} onCheckedChange={checked => edit({ ...data, settings: { ...data.settings, booking_enabled: checked === true } })} />Accept new call bookings</label>
            <span className="text-xs text-muted-foreground">{data.settings.booking_enabled ? "Booking is open" : "New bookings are paused"}</span>
          </div>
          <section aria-labelledby="weekly-hours-heading" className="space-y-4">
            <div><h3 id="weekly-hours-heading" className="text-sm font-semibold">Weekly hours</h3><p className="mt-1 text-xs text-muted-foreground">Changes here apply to every occurrence of that weekday. To change one specific date, select a date in the calendar above.</p></div>
            <div className="divide-y divide-border/60 rounded-xl border border-border/60">
              {WEEK_ORDER.map(day => {
                const windows = data.windows.map((window, index) => ({ ...window, index })).filter(window => window.weekday === day);
                const enabled = windows.some(window => window.enabled !== false);
                return <div key={day} className="flex flex-col gap-3 p-3 sm:flex-row sm:items-start sm:gap-4 sm:p-4">
                  <label className="flex w-40 shrink-0 cursor-pointer items-center gap-2.5 pt-2 text-sm font-medium"><Checkbox checked={enabled} onCheckedChange={checked => toggleDay(day, checked === true)} />Every {WEEKDAYS[day]}</label>
                  <div className="min-w-0 flex-1 space-y-2">
                    {enabled ? windows.filter(window => window.enabled !== false).map((window, index) => <RangeInputs key={window.index} label={`${WEEKDAYS[day]} range ${index + 1}`} errorId={weeklyErrors[day] ? `weekly-hours-error-${day}` : undefined} range={{ start: window.start_local, end: window.end_local }} onChange={range => edit({ ...data, windows: data.windows.map((item, i) => i === window.index ? { ...item, start_local: range.start, end_local: range.end } : item) })} onRemove={() => edit({ ...data, windows: data.windows.filter((_, i) => i !== window.index) })} />) : <p className="py-2 text-sm text-muted-foreground">Unavailable</p>}
                    {weeklyErrors[day] && <p id={`weekly-hours-error-${day}`} className="text-xs leading-relaxed text-destructive">{weeklyErrors[day]}</p>}
                  </div>
                  <div className="flex shrink-0 gap-1 self-end sm:self-start">
                    <Button type="button" variant="ghost" size="sm" aria-label={`Add time range on ${WEEKDAYS[day]}`} disabled={!enabled} onClick={() => addWeeklyRange(day)}><Plus aria-hidden="true" className="size-4" />Add</Button>
                    <Button type="button" variant="ghost" size="sm" disabled={!enabled} aria-label={`Copy ${WEEKDAYS[day]} hours to other days`} onClick={() => { setCopyDay(day); setCopyTargets(WEEK_ORDER.filter(target => target !== day && target >= 1 && target <= 5)); setDialogError(""); }}><Copy aria-hidden="true" className="size-4" />Copy</Button>
                  </div>
                </div>;
              })}
            </div>
          </section>
          <section aria-labelledby="date-exceptions-heading" className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 id="date-exceptions-heading" className="text-sm font-semibold">Date-specific hours &amp; time off</h3><p className="mt-1 text-xs text-muted-foreground">Change one date or apply the same change to a range of dates.</p></div><Button type="button" variant="outline" size="sm" onClick={() => openDates()}><Plus aria-hidden="true" className="size-4" />Add dates</Button></div>
            {!exceptionDates.length ? <p className="rounded-lg border border-dashed border-border/60 p-4 text-xs text-muted-foreground">No exceptions. Your weekly hours apply to every date.</p> : <div className="max-h-80 divide-y divide-border/60 overflow-y-auto rounded-xl border border-border/60">
              {exceptionDates.map(date => {
                const rules = data.overrides.filter(rule => rule.local_date === date);
                const closed = rules.some(rule => rule.mode === "blocked" && (!rule.start_local || !rule.end_local));
                const openings = rules.filter(rule => rule.mode === "extra_open");
                const custom = rules.some(rule => rule.note === "Custom hours");
                const blocks = rules.filter(rule => rule.mode === "blocked" && rule.note !== "Custom hours" && rule.start_local && rule.end_local);
                return <div key={date} className="flex flex-wrap items-center justify-between gap-3 p-3">
                  <div><p className="text-sm font-medium">{new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`))}</p><p className="mt-1 text-xs text-muted-foreground">{closed ? "Unavailable all day" : openings.length ? `${custom ? "Custom" : "Extra"} hours: ${openings.map(rule => `${rule.start_local?.slice(0, 5)} - ${rule.end_local?.slice(0, 5)}`).join(", ")}` : ""}{!closed && blocks.length > 0 && ` ${openings.length ? "; " : ""}Time off: ${blocks.map(rule => `${rule.start_local?.slice(0, 5)} - ${rule.end_local?.slice(0, 5)}`).join(", ")}`}</p></div>
                  <div className="flex gap-1"><Button type="button" variant="ghost" size="sm" onClick={() => openDates(date)}>Edit</Button><Button type="button" variant="ghost" size="sm" onClick={() => edit({ ...data, overrides: data.overrides.filter(rule => rule.local_date !== date) })}>Use weekly hours</Button></div>
                </div>;
              })}
            </div>}
          </section>
          <details className="rounded-xl border border-border/60 p-4">
            <summary className="cursor-pointer text-sm font-medium">Time zone &amp; booking rules</summary>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="space-y-1.5 text-xs">Schedule time zone<NativeSelect value={data.settings.timezone} onChange={event => edit({ ...data, settings: { ...data.settings, timezone: event.target.value } })} className="h-10 bg-background">{[...new Set([data.settings.timezone, "UTC", ...timezones])].map(zone => <option key={zone} value={zone}>{zone}</option>)}</NativeSelect></label>
              <label className="space-y-1.5 text-xs">Start times every<NativeSelect value={data.settings.slot_step_minutes} onChange={event => edit({ ...data, settings: { ...data.settings, slot_step_minutes: Number(event.target.value) } })} className="h-10 bg-background">{[5, 10, 15, 20, 30, 60].map(minutes => <option key={minutes} value={minutes}>{minutes} minutes</option>)}</NativeSelect></label>
              <label className="space-y-1.5 text-xs">Buffer after a call (minutes)<Input type="number" min={0} max={120} value={data.settings.buffer_minutes} onChange={event => edit({ ...data, settings: { ...data.settings, buffer_minutes: Number(event.target.value) } })} className="h-10 bg-background" /></label>
              <p className="self-center text-xs leading-relaxed text-muted-foreground">Customers see times in their time zone. The booking window is {data.settings.advance_window_days} days, with {data.settings.min_notice_minutes / 60} hours minimum notice. Reading durations are managed in Website content.</p>
            </div>
          </details>
          {dirty && <p role="status" className="text-xs text-amber-800 dark:text-amber-300">You have unsaved changes. The booking preview updates after you save.</p>}
          {error && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">Could not save. {error}</p>}
          <div className="flex flex-wrap justify-end gap-2 border-t border-border/60 pt-4"><Button type="button" variant="ghost" disabled={!dirty || working} onClick={() => { setData(savedData); setError(""); setMessage(""); }}>Discard changes</Button><Button id="save-booking-schedule" type="button" disabled={!dirty || working} onClick={requestSave}>{working ? "Saving..." : "Save schedule"}</Button></div>
        </fieldset>}
      </div>
    </details>

    <Dialog open={copyDay !== null} onOpenChange={open => { if (!open) setCopyDay(null); }}>
      <DialogContent className="sm:max-w-sm"><DialogTitle>Copy {copyDay === null ? "" : WEEKDAYS[copyDay]} hours</DialogTitle><DialogDescription>This replaces the weekly hours on the days you select. Date exceptions stay as they are.</DialogDescription>
        <div className="flex gap-2"><Button type="button" variant="outline" size="sm" onClick={() => setCopyTargets(WEEK_ORDER.filter(day => day !== copyDay && day >= 1 && day <= 5))}>Mon–Fri</Button><Button type="button" variant="outline" size="sm" onClick={() => setCopyTargets(WEEK_ORDER.filter(day => day !== copyDay))}>Every day</Button></div>
        <div className="grid grid-cols-2 gap-3">{WEEK_ORDER.filter(day => day !== copyDay).map(day => <label key={day} className="flex cursor-pointer items-center gap-2 text-sm"><Checkbox checked={copyTargets.includes(day)} onCheckedChange={checked => setCopyTargets(checked ? [...copyTargets, day] : copyTargets.filter(value => value !== day))} />{WEEKDAYS[day]}</label>)}</div>
        {dialogError && <p role="alert" className="text-sm text-destructive">{dialogError}</p>}
        <Button type="button" disabled={!copyTargets.length} onClick={() => { if (!data || copyDay === null) return; try { edit({ ...data, windows: copyWeeklyHours(data.windows, copyDay, copyTargets) }); setCopyDay(null); } catch (error) { setDialogError(error instanceof Error ? error.message : "Check the selected hours."); } }}>Apply to {copyTargets.length} days</Button>
      </DialogContent>
    </Dialog>
    <Dialog open={datesOpen} onOpenChange={open => { if (!working) setDatesOpen(open); }}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg"><DialogTitle>Edit availability</DialogTitle><DialogDescription>Set available hours or take time off. Changes apply to all readings.</DialogDescription>
        <fieldset disabled={working} className="min-w-0 space-y-4 disabled:opacity-60">
        {dateStart && dateEnd && <p aria-live="polite" className="rounded-lg bg-muted/50 p-3 text-sm font-medium leading-relaxed">
          {dateStart === dateEnd ? formatDate(dateStart) : `${formatDate(dateStart)} to ${formatDate(dateEnd)}`}
          <span className="mt-1 block text-xs font-normal text-muted-foreground">{dateStart === dateEnd ? "Applies to this date only. Weekly hours stay unchanged." : "Applies to the selected weekdays in this date range."} {data?.settings.timezone}</span>
        </p>}
        {bulkDates && <><div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><label className="space-y-1 text-xs">From<Input type="date" value={dateStart} onChange={event => { const date = event.target.value; setDateStart(date); if (dateEnd < date) setDateEnd(date); }} /></label><label className="space-y-1 text-xs">Through<Input type="date" min={dateStart} value={dateEnd} onChange={event => setDateEnd(event.target.value)} /></label></div>
        <fieldset><legend className="mb-2 text-xs font-medium">Include weekdays</legend><div className="flex flex-wrap gap-2">{WEEK_ORDER.map(day => <label key={day} className="flex cursor-pointer items-center gap-1.5 rounded-md border border-border/60 px-2 py-2 text-xs"><Checkbox checked={dateDays.includes(day)} onCheckedChange={checked => setDateDays(checked ? [...dateDays, day] : dateDays.filter(value => value !== day))} />{WEEKDAYS[day].slice(0, 3)}</label>)}</div></fieldset></>}
        {!bulkDates && <Button type="button" variant="link" size="sm" className="h-auto px-0 text-xs" onClick={() => setBulkDates(true)}>Apply to more dates</Button>}
        <label className="space-y-1 text-xs">Change<NativeSelect value={dateKind} onChange={event => setDateKind(event.target.value as typeof dateKind)}><option value="unavailable">Mark unavailable / time off</option><option value="custom">Use custom hours</option><option value="weekly">Restore weekly hours</option></NativeSelect></label>
        {dateKind === "unavailable" ? <label className="flex items-center gap-2 text-sm"><Checkbox checked={allDay} onCheckedChange={checked => setAllDay(checked === true)} />Unavailable all day</label> : dateKind === "custom" ? <p className="text-xs text-muted-foreground">Custom hours replace the weekly hours and existing date exceptions on these dates. Other dates keep their schedule.</p> : <p className="text-xs text-muted-foreground">Removes changes on these dates and uses your repeating weekly hours.</p>}
        {(dateKind === "custom" || (dateKind === "unavailable" && !allDay)) && <div className="space-y-2">{dateRanges.map((range, index) => <RangeInputs key={index} range={range} label={`Date range ${index + 1}`} onChange={value => setDateRanges(dateRanges.map((item, i) => i === index ? value : item))} onRemove={() => setDateRanges(dateRanges.filter((_, i) => i !== index))} />)}<Button type="button" variant="link" size="sm" className="px-0" onClick={() => { try { setDateRanges([...dateRanges, nextTimeRange(dateRanges)]); } catch (error) { setDialogError(error instanceof Error ? error.message : "Adjust the existing hours first."); } }}><Plus aria-hidden="true" className="size-4" />Add time range</Button></div>}
        {dateKind === "custom" && <p className="text-xs leading-relaxed text-muted-foreground">Allow time for the full reading plus your {data?.settings.buffer_minutes || 0}-minute buffer after the call.</p>}
        {durationWarning && <p role="status" className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm leading-relaxed text-amber-900 dark:text-amber-200">{durationWarning} You can save these hours, but customers will see no slots.</p>}
        {dialogError && <p role="alert" className="text-sm text-destructive">{dialogError}</p>}
        <div className="flex justify-end gap-2 border-t border-border/60 pt-4"><Button type="button" variant="ghost" onClick={() => setDatesOpen(false)}>Cancel</Button><Button type="button" onClick={() => void applyDates()}>{working ? "Saving..." : dateStart === dateEnd ? "Save date" : "Save selected dates"}</Button></div>
        </fieldset>
      </DialogContent>
    </Dialog>
  </>;
}
