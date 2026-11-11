import test from "node:test";
import assert from "node:assert/strict";
import { isUpcomingVoiceCall } from "../src/lib/booking/display";

const now = Date.parse("2026-11-11T10:00:00.000Z");

test("only paid voice calls with a real future appointment are upcoming", () => {
  const base = {
    status: "confirmed",
    payment_status: "paid",
    scheduled_at: "2026-11-11T11:00:00.000Z",
  };
  assert.equal(isUpcomingVoiceCall({ ...base, format: "voice_call" }, now), true);
  assert.equal(isUpcomingVoiceCall({ ...base, format: "text" }, now), false);
  assert.equal(isUpcomingVoiceCall({ ...base, payment_status: "pending", format: "voice_call" }, now), false);
  assert.equal(isUpcomingVoiceCall({ ...base, scheduled_at: null, format: "voice_call" }, now), false);
  assert.equal(isUpcomingVoiceCall({ ...base, scheduled_at: "2026-11-11T09:00:00.000Z", format: "voice_call" }, now), false);
  assert.equal(isUpcomingVoiceCall({ ...base, scheduled_at: "not-a-date", format: "voice_call" }, now), false);
});
