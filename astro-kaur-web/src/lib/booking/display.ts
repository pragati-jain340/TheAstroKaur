type ReadingSchedule = {
  format: "text" | "voice_call";
  status: string;
  payment_status: string;
  scheduled_at: string | null;
};

export function isUpcomingVoiceCall(order: ReadingSchedule, now = Date.now()): boolean {
  const startsAt = order.scheduled_at ? Date.parse(order.scheduled_at) : Number.NaN;
  return order.format === "voice_call"
    && order.payment_status === "paid"
    && (order.status === "confirmed" || order.status === "pending")
    && Number.isFinite(startsAt)
    && startsAt > now;
}
