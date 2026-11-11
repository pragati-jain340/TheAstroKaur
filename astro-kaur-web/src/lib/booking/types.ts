import type { Order } from "@/lib/supabase/types";

export interface BookingOrder extends Omit<Order, "status"> {
  status: string;
  service_id: string | null;
  scheduled_end_at: string | null;
  original_scheduled_at: string | null;
  customer_timezone: string;
  customer_email_snapshot: string | null;
  price_cents_snapshot: number | null;
  currency_snapshot: string | null;
  stripe_checkout_session_id: string | null;
  checkout_key: string | null;
  checkout_created_at: string | null;
  hold_expires_at: string | null;
  payment_verified_at: string | null;
  booking_confirmed_at: string | null;
  reschedule_count: number;
  booking_version: number;
  refund_status: string;
  duration_minutes_snapshot: number | null;
  availability_notified_at: string | null;
}
export interface Settings {
  worker_last_seen_at?: string | null;
  timezone: string;
  min_notice_minutes: number;
  advance_window_days: number;
  hold_minutes: number;
  buffer_minutes: number;
  slot_step_minutes: number;
  booking_enabled: boolean;
}
export interface AvailabilityWindow {
  weekday: number;
  start_local: string;
  end_local: string;
  enabled?: boolean;
}
export interface AvailabilityOverride {
  local_date: string;
  mode: "blocked" | "extra_open";
  start_local: string | null;
  end_local: string | null;
  note?: string;
}
export interface Interval {
  start: string;
  end: string;
}
export interface CatalogService {
  id: string;
  title: string;
  format: "voice_call" | "text";
  duration_minutes: number | null;
  price_cents: number;
  currency: string;
  requires_partner_details: boolean;
}
export interface Job {
  id: string;
  order_id: string;
  kind: string;
  version: number;
  attempts: number;
  lease_token: string;
  created_at: string;
  email_started_at: string | null;
}
export interface Connection {
  auth_user_id: string;
  calendar_id: string;
  busy_calendar_ids: string[];
  encrypted_refresh_token: string;
  organizer_email: string | null;
  status: string;
  last_success_at: string | null;
  last_error: string | null;
}
export const POLICY_VERSION = "2026-10-19-test-v1";

export function rescheduleDeadline(
  order: Pick<BookingOrder, "booking_confirmed_at" | "original_scheduled_at">,
): number {
  if (!order.booking_confirmed_at || !order.original_scheduled_at) return 0;
  return Math.min(
    Date.parse(order.booking_confirmed_at) + 12 * 3600000,
    Date.parse(order.original_scheduled_at),
  );
}
export function canReschedule(order: BookingOrder, now = Date.now()): boolean {
  return (
    order.format === "voice_call" &&
    order.status === "confirmed" &&
    order.payment_status === "paid" &&
    !!order.payment_verified_at &&
    order.reschedule_count === 0 &&
    now < rescheduleDeadline(order)
  );
}
