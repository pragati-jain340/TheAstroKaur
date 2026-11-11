import "server-only";
import { BookingError, check, database, loadOrder } from "./server";
import { calculateSlots } from "./slots";
import { freeBusy } from "@/lib/google/calendar";
import type {
  AvailabilityOverride,
  AvailabilityWindow,
  CatalogService,
  Settings,
} from "./types";

export async function availability(serviceId: string, excludeOrderId?: string, admin = false) {
  const db = database();
  const order = excludeOrderId ? await loadOrder(excludeOrderId) : null;
  if (order && order.service_id !== serviceId)
    throw new BookingError("Invalid service.");
  let serviceQuery = db
      .from("services")
      .select(
        "id,title,format,duration_minutes,price_cents,currency,requires_partner_details",
      )
      .eq("id", serviceId);
  if (!order) serviceQuery = serviceQuery.eq("is_active", true);
  const [serviceResult, settingsResult, windowsResult, overridesResult] = await Promise.all([
    serviceQuery.single(),
    db.from("availability_settings").select("*").eq("id", true).single(),
    db.from("availability_windows").select("*"),
    db.from("availability_overrides").select("*"),
  ]);
  const service = check(serviceResult) as CatalogService;
  if (!service || service.format !== "voice_call" || !service.duration_minutes)
    throw new BookingError("Choose a call service.");
  if (order?.duration_minutes_snapshot) service.duration_minutes = order.duration_minutes_snapshot;
  else if (order?.scheduled_at && order.scheduled_end_at)
    service.duration_minutes = (Date.parse(order.scheduled_end_at) - Date.parse(order.scheduled_at)) / 60000;
  const settings = check(settingsResult) as Settings;
  if (admin) settings.advance_window_days = 90;
  const windows = check(windowsResult) as AvailabilityWindow[];
  const overrides = check(overridesResult) as AvailabilityOverride[];
  const now = Date.now(),
    end = new Date(
      now + (settings.advance_window_days + 1) * 86400000,
    ).toISOString();
  let eventId: string | null = null;
  if (excludeOrderId) {
    const details = check(
      await db
        .from("reading_details")
        .select("google_calendar_event_id")
        .eq("order_id", excludeOrderId)
        .maybeSingle(),
    );
    eventId = details?.google_calendar_event_id;
  }
  // Disabled/empty calendars need no Google API call and never offer appointments.
  if (
    !settings.booking_enabled ||
    (!windows.length && !overrides.some((o) => o.mode === "extra_open"))
  )
    return {
      service,
      settings,
      slots: [],
      server_now: new Date(now).toISOString(),
    };
  let query = db
    .from("booking_reservations")
    .select("starts_at,blocked_until")
    .in("state", ["held", "confirmed"])
    .gt("blocked_until", new Date(now).toISOString());
  if (excludeOrderId) query = query.neq("order_id", excludeOrderId);
  const [google, reservationResult] = await Promise.all([
    // Website reservations still prevent double bookings while Google is unavailable.
    freeBusy(new Date(now).toISOString(), end, eventId).catch(() => []),
    query,
  ]);
  const reservations = check(reservationResult) || [];
  // Expired holds remain blocking until the worker proves Stripe is no longer payable.
  const busy = [
    ...google,
    ...reservations.map((r) => ({
      start: r.starts_at as string,
      end: r.blocked_until as string,
    })),
  ];
  return {
    service,
    settings,
    slots: calculateSlots(
      settings,
      windows,
      overrides,
      busy,
      service.duration_minutes,
      now,
    ),
    server_now: new Date(now).toISOString(),
  };
}
