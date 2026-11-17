import type { AvailabilityOverride, AvailabilityWindow } from "./types";

export interface TimeRange { start: string; end: string }
export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

export function availabilityDurationWarning(ranges: TimeRange[], durations: number[], buffer: number): string | null {
  const supported = durations.filter(duration => [30, 45].includes(duration));
  if (!ranges.length || !supported.length) return null;
  const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
  if (ranges.some(range => !range.start || !range.end || minutes(range.end) <= minutes(range.start))) return null;
  const shortest = Math.min(...supported);
  const required = shortest + buffer;
  const longest = Math.max(...ranges.map(range => minutes(range.end) - minutes(range.start)));
  if (longest >= required) return null;
  const suggestedEnd = ranges.length === 1 ? minutes(ranges[0].start) + required : null;
  const suggestion = suggestedEnd !== null && suggestedEnd < 1440
    ? ` Extend the end time to at least ${String(Math.floor(suggestedEnd / 60)).padStart(2, "0")}:${String(suggestedEnd % 60).padStart(2, "0")}.`
    : ` Add a continuous window of at least ${required} minutes.`;
  return `These hours cannot fit a reading. Your ${shortest}-minute reading${buffer ? ` plus ${buffer}-minute buffer` : ""} needs ${required} minutes; the longest available window is ${longest} minutes.${suggestion}`;
}

/** Saved working hours, before bookings, notice and booking-window restrictions. */
export function hoursForDate(windows: AvailabilityWindow[], overrides: AvailabilityOverride[], date: string): TimeRange[] {
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  const rules = overrides.filter(rule => rule.local_date === date);
  if (rules.some(rule => rule.mode === "blocked" && (!rule.start_local || !rule.end_local))) return [];
  const openings = [
    ...windows.filter(window => window.weekday === weekday && window.enabled !== false).map(window => ({ start: window.start_local.slice(0, 5), end: window.end_local.slice(0, 5) })),
    ...rules.filter(rule => rule.mode === "extra_open" && rule.start_local && rule.end_local).map(rule => ({ start: rule.start_local!.slice(0, 5), end: rule.end_local!.slice(0, 5) })),
  ].sort((a, b) => a.start.localeCompare(b.start));
  const merged: TimeRange[] = [];
  for (const range of openings) {
    const previous = merged.at(-1);
    if (previous && range.start <= previous.end) previous.end = previous.end > range.end ? previous.end : range.end;
    else merged.push({ ...range });
  }
  return rules.filter(rule => rule.mode === "blocked" && rule.start_local && rule.end_local).reduce((ranges, rule) => {
    const start = rule.start_local!.slice(0, 5), end = rule.end_local!.slice(0, 5);
    return ranges.flatMap(range => end <= range.start || start >= range.end ? [range] : [
      ...(range.start < start ? [{ start: range.start, end: start }] : []),
      ...(end < range.end ? [{ start: end, end: range.end }] : []),
    ]);
  }, merged);
}

export function nextTimeRange(ranges: TimeRange[]): TimeRange {
  const last = ranges.map(range => range.end.slice(0, 5)).filter(time => /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)).sort().at(-1);
  if (!last) return { start: "09:00", end: "17:00" };
  const end = Number(last.slice(0, 2)) * 60 + Number(last.slice(3));
  const start = Math.min(end + 60, 23 * 60);
  if (start <= end) throw new Error("There is no time left after this range. Adjust an existing range first.");
  const format = (minute: number) => `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
  return { start: format(start), end: format(Math.min(start + 60, 1439)) };
}

export function checkedRanges(ranges: TimeRange[]): TimeRange[] {
  if (!ranges.length) throw new Error("Add at least one time range.");
  const sorted = ranges.map(range => ({ start: range.start.slice(0, 5), end: range.end.slice(0, 5) }))
    .sort((a, b) => a.start.localeCompare(b.start));
  sorted.forEach((range, index) => {
    if (![range.start, range.end].every(time => /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) || range.start >= range.end) {
      throw new Error("Each time range must end after it starts, within the same day.");
    }
    if (index && range.start < sorted[index - 1].end) throw new Error("Time ranges cannot overlap. Adjust or remove the overlapping range.");
  });
  return sorted;
}

export function copyWeeklyHours(windows: AvailabilityWindow[], source: number, targets: number[]) {
  const ranges = checkedRanges(windows.filter(window => window.weekday === source && window.enabled !== false)
    .map(window => ({ start: window.start_local, end: window.end_local })));
  const days = [...new Set(targets)].filter(day => day !== source);
  if (!days.length || days.some(day => !WEEK_ORDER.includes(day))) throw new Error("Choose at least one other day.");
  const result = windows.filter(window => !days.includes(window.weekday));
  for (const weekday of days) for (const range of ranges) result.push({ weekday, start_local: range.start, end_local: range.end, enabled: true });
  if (result.length > 50) throw new Error("Use fewer weekly time ranges (maximum 50).");
  return result;
}

export function datesInRange(start: string, end: string, weekdays = WEEK_ORDER) {
  const parse = (date: string) => {
    const instant = Date.parse(`${date}T12:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(instant) || new Date(instant).toISOString().slice(0, 10) !== date) {
      throw new Error("Choose valid start and end dates.");
    }
    return instant;
  };
  const first = parse(start), last = parse(end);
  if (last < first) throw new Error("The end date must be on or after the start date.");
  if (last - first > 61 * 86400000) throw new Error("Apply changes to at most 62 days at a time.");
  const result: string[] = [];
  for (let instant = first; instant <= last; instant += 86400000) {
    if (weekdays.includes(new Date(instant).getUTCDay())) result.push(new Date(instant).toISOString().slice(0, 10));
  }
  if (!result.length) throw new Error("Choose at least one day within this date range.");
  return result;
}

/** Encode replacement hours using existing open/blocked rules, so SQL and preview agree. */
export function applyDateRule(overrides: AvailabilityOverride[], dates: string[], kind: "custom" | "unavailable", allDay: boolean, input: TimeRange[]) {
  const ranges = kind === "unavailable" && allDay ? [] : checkedRanges(input);
  const replace = kind === "custom" || allDay;
  const result = overrides.filter(override => !replace || !dates.includes(override.local_date));
  for (const date of [...new Set(dates)]) {
    if (kind === "unavailable" && allDay) {
      result.push({ local_date: date, mode: "blocked", start_local: null, end_local: null, note: "Time off" });
    } else if (kind === "unavailable") {
      for (const range of ranges) result.push({ local_date: date, mode: "blocked", start_local: range.start, end_local: range.end, note: "Time off" });
    } else {
      let cursor = "00:00";
      for (const range of ranges) {
        if (cursor < range.start) result.push({ local_date: date, mode: "blocked", start_local: cursor, end_local: range.start, note: "Custom hours" });
        result.push({ local_date: date, mode: "extra_open", start_local: range.start, end_local: range.end, note: "Custom hours" });
        cursor = range.end;
      }
      if (cursor < "23:59") result.push({ local_date: date, mode: "blocked", start_local: cursor, end_local: "23:59", note: "Custom hours" });
    }
  }
  const unique = [...new Map(result.map(rule => [`${rule.local_date}|${rule.mode}|${rule.start_local}|${rule.end_local}`, rule])).values()];
  if (unique.length > 200) throw new Error("This would create too many date exceptions. Select fewer dates or remove older exceptions.");
  return unique.sort((a, b) => a.local_date.localeCompare(b.local_date));
}

export function weeklyHoursErrors(windows: AvailabilityWindow[]): Partial<Record<number, string>> {
  const errors: Partial<Record<number, string>> = {};
  for (const day of WEEK_ORDER) {
    const ranges = windows.filter(window => window.weekday === day && window.enabled !== false);
    if (!ranges.length) continue;
    try { checkedRanges(ranges.map(window => ({ start: window.start_local, end: window.end_local }))); }
    catch (error) { errors[day] = `${WEEKDAYS[day]}: ${error instanceof Error ? error.message : "Check these hours."}`; }
  }
  return errors;
}

export function validateWeeklyHours(windows: AvailabilityWindow[]) {
  if (windows.length > 50) throw new Error("Use fewer weekly time ranges (maximum 50).");
  const errors = weeklyHoursErrors(windows);
  const messages = WEEK_ORDER.flatMap(day => errors[day] ? [errors[day]!] : []);
  if (messages.length) throw new Error(messages.join(" "));
}
