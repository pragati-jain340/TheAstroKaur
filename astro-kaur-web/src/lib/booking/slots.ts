import type {
  AvailabilityOverride,
  AvailabilityWindow,
  Interval,
  Settings,
} from "./types";

export function zonedParts(instant: number, zone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);
  const v = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  const date = `${v.year}-${v.month}-${v.day}`;
  return {
    date,
    minute: Number(v.hour) * 60 + Number(v.minute),
    weekday: new Date(`${date}T12:00:00Z`).getUTCDay(),
    wall: Date.UTC(
      Number(v.year),
      Number(v.month) - 1,
      Number(v.day),
      Number(v.hour),
      Number(v.minute),
    ),
  };
}
const minute = (time: string) =>
  Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
export function overlaps(a: number, b: number, c: number, d: number) {
  return a < d && b > c;
}

// Iterate real UTC instants rather than constructing local dates. This skips nonexistent
// spring times. Only the first occurrence of an ambiguous autumn wall time is offered.
export function calculateSlots(
  settings: Settings,
  windows: AvailabilityWindow[],
  overrides: AvailabilityOverride[],
  busy: Interval[],
  duration: number,
  now = Date.now(),
): Interval[] {
  if (!settings.booking_enabled || ![30, 45].includes(duration)) return [];
  const result: Interval[] = [],
    seen = new Set<string>();
  const wallLimit =
    zonedParts(now, settings.timezone).wall +
    settings.advance_window_days * 86400000;
  const first =
    Math.ceil((now + settings.min_notice_minutes * 60000) / 60000) * 60000;
  const last = now + (settings.advance_window_days + 1) * 86400000;
  const ranges = busy.map((b) => [Date.parse(b.start), Date.parse(b.end)]);
  for (let start = first; start <= last; start += 60000) {
    const p = zonedParts(start, settings.timezone);
    if (p.wall > wallLimit || p.minute % settings.slot_step_minutes) continue;
    const key = `${p.date}:${p.minute}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const end = start + duration * 60000,
      blocked = end + settings.buffer_minutes * 60000;
    const q = zonedParts(blocked, settings.timezone);
    if (
      q.date !== p.date ||
      q.wall - p.wall !== (duration + settings.buffer_minutes) * 60000
    )
      continue;
    const daily = overrides.filter((o) => o.local_date === p.date);
    const allowed =
      windows.some(
        (w) =>
          w.enabled !== false &&
          w.weekday === p.weekday &&
          p.minute >= minute(w.start_local) &&
          q.minute <= minute(w.end_local),
      ) ||
      daily.some(
        (o) =>
          o.mode === "extra_open" &&
          o.start_local &&
          o.end_local &&
          p.minute >= minute(o.start_local) &&
          q.minute <= minute(o.end_local),
      );
    if (
      !allowed ||
      daily.some(
        (o) =>
          o.mode === "blocked" &&
          (!o.start_local ||
            !o.end_local ||
            overlaps(
              p.minute,
              q.minute,
              minute(o.start_local),
              minute(o.end_local),
            )),
      )
    )
      continue;
    if (ranges.some(([a, b]) => overlaps(start, blocked, a, b))) continue;
    result.push({
      start: new Date(start).toISOString(),
      end: new Date(end).toISOString(),
    });
  }
  return result;
}
