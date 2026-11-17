import test from "node:test";
import assert from "node:assert/strict";
import { unavailableHolidayCalendars } from "../src/lib/google/conflictCalendars";

test("only missing optional public holiday calendars are automatically removed", () => {
  const holiday = "en.indian#holiday@group.v.calendar.google.com";
  const organizer = "organizer@example.invalid";
  assert.deepEqual(unavailableHolidayCalendars([organizer, holiday, "work"], organizer, {
    [holiday]: { errors: [{ reason: "notFound" }] },
    work: { errors: [{ reason: "notFound" }] },
  }), [holiday]);
  assert.deepEqual(unavailableHolidayCalendars([holiday], holiday, {
    [holiday]: { errors: [{ reason: "notFound" }] },
  }), []);
  assert.deepEqual(unavailableHolidayCalendars([holiday], organizer, {
    [holiday]: { errors: [{ reason: "internalError" }] },
  }), []);
});
