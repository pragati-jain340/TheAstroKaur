import test from "node:test";
import assert from "node:assert/strict";
import { calculateSlots } from "../src/lib/booking/slots";
import {
  canReschedule,
  rescheduleDeadline,
  type BookingOrder,
  type Settings,
} from "../src/lib/booking/types";
const settings: Settings = {
  timezone: "Europe/Berlin",
  min_notice_minutes: 15,
  advance_window_days: 3,
  hold_minutes: 5,
  buffer_minutes: 15,
  slot_step_minutes: 15,
  booking_enabled: true,
};
const windows = Array.from({ length: 7 }, (_, weekday) => ({
  weekday,
  start_local: "09:00",
  end_local: "11:00",
  enabled: true,
}));
test("45 minute calls plus buffer cannot fit a 30 minute gap", () => {
  const slots = calculateSlots(
    settings,
    windows,
    [],
    [{ start: "2026-10-20T07:30:00Z", end: "2026-10-20T09:00:00Z" }],
    45,
    Date.parse("2026-10-20T06:00:00Z"),
  );
  assert.ok(!slots.some((s) => s.start.startsWith("2026-10-20")));
});
test("minimum notice, buffer and 3 day bound are applied", () => {
  const now = Date.parse("2026-10-20T07:00:00Z"),
    slots = calculateSlots(settings, windows, [], [], 30, now);
  assert.ok(slots.length > 0);
  assert.ok(
    slots.every(
      (s) =>
        Date.parse(s.start) >= now + 15 * 60000 &&
        Date.parse(s.start) <= now + 3 * 86400000,
    ),
  );
  assert.ok(!slots.some((s) => s.start === "2026-10-20T08:30:00.000Z")); // 10:30 + 30 + 15 passes closing.
  assert.equal(slots[0].start, "2026-10-20T07:15:00.000Z");
});
test("whole-day blocks override special and weekly hours; partial blocks intersect buffers", () => {
  const slots = calculateSlots(
    settings,
    windows,
    [
      {
        local_date: "2026-10-20",
        mode: "blocked",
        start_local: null,
        end_local: null,
      },
      {
        local_date: "2026-10-20",
        mode: "extra_open",
        start_local: "12:00",
        end_local: "14:00",
      },
      {
        local_date: "2026-10-21",
        mode: "blocked",
        start_local: "09:45",
        end_local: "10:00",
      },
    ],
    [],
    30,
    Date.parse("2026-10-20T06:00:00Z"),
  );
  assert.ok(!slots.some((s) => s.start.startsWith("2026-10-20")));
  assert.ok(!slots.some((s) => s.start === "2026-10-21T07:15:00.000Z"));
});
test("spring DST never offers nonexistent 02:xx Berlin wall times", () => {
  const slots = calculateSlots(
    { ...settings, buffer_minutes: 0 },
    [{ weekday: 0, start_local: "01:00", end_local: "05:00" }],
    [],
    [],
    30,
    Date.parse("2026-03-28T12:00:00Z"),
  );
  const wall = slots.map((s) =>
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Berlin",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(s.start)),
  );
  assert.ok(wall.includes("03:00"));
  assert.ok(!wall.some((s) => s.startsWith("02:")));
});
test("autumn DST slots have unique local labels and no consultation crosses a clock fold", () => {
  const slots = calculateSlots(
    { ...settings, buffer_minutes: 0 },
    [{ weekday: 0, start_local: "01:00", end_local: "05:00" }],
    [],
    [],
    30,
    Date.parse("2026-10-24T12:00:00Z"),
  );
  const wall = slots.map((s) =>
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Berlin",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(s.start)),
  );
  assert.equal(new Set(wall).size, wall.length);
  assert.ok(!slots.some((s) => s.start === "2026-10-25T00:45:00.000Z"));
});
test("back-to-back start at the blocked interval end is allowed", () => {
  const slots = calculateSlots(
    settings,
    windows,
    [],
    [{ start: "2026-10-20T07:00:00Z", end: "2026-10-20T08:00:00Z" }],
    30,
    Date.parse("2026-10-20T06:00:00Z"),
  );
  assert.ok(slots.some((s) => s.start === "2026-10-20T08:00:00.000Z"));
});
test("rescheduling closes 12 hours after confirmation or original start, whichever is earlier", () => {
  const order = {
    format: "voice_call",
    status: "confirmed",
    payment_status: "paid",
    payment_verified_at: "2026-10-19T12:00:00Z",
    booking_confirmed_at: "2026-10-19T12:00:00Z",
    original_scheduled_at: "2026-10-20T10:00:00Z",
    reschedule_count: 0,
  } as BookingOrder;
  assert.equal(rescheduleDeadline(order), Date.parse("2026-10-20T00:00:00Z"));
  assert.ok(canReschedule(order, Date.parse("2026-10-19T23:59:59Z")));
  assert.ok(!canReschedule(order, Date.parse("2026-10-20T00:00:00Z")));
  assert.ok(
    !canReschedule(
      { ...order, reschedule_count: 1 },
      Date.parse("2026-10-19T13:00:00Z"),
    ),
  );
  assert.equal(
    rescheduleDeadline({
      ...order,
      original_scheduled_at: "2026-10-19T14:00:00Z",
    }),
    Date.parse("2026-10-19T14:00:00Z"),
  );
});
test("written and disabled service schedules never offer slots", () => {
  assert.deepEqual(
    calculateSlots(
      { ...settings, booking_enabled: false },
      windows,
      [],
      [],
      30,
    ),
    [],
  );
  assert.deepEqual(calculateSlots(settings, windows, [], [], 0), []);
});
