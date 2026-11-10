import "server-only";
import { BookingError, check, database } from "./server";
import { calculateSlots } from "./slots";
import { freeBusy } from "@/lib/google/calendar";
import type {
  AvailabilityOverride,
  AvailabilityWindow,
  CatalogService,
  Settings,
} from "./types";

export async function availability(serviceId: string, excludeOrderId?: string) {
  const db = database();
  const service = check(
    await db
      .from("services")
      .select(
        "id,title,format,duration_minutes,price_cents,currency,requires_partner_details",
      )
      .eq("id", serviceId)
      .eq("is_active", true)
      .single(),
  ) as CatalogService;
  if (!service || service.format !== "voice_call" || !service.duration_minutes)
    throw new BookingError("Choose a call service.");
  const settings = check(
    await db.from("availability_settings").select("*").eq("id", true).single(),
  ) as Settings;
  const windows = check(
    await db.from("availability_windows").select("*"),
  ) as AvailabilityWindow[];
  const overrides = check(
    await db.from("availability_overrides").select("*"),
  ) as AvailabilityOverride[];
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
  const google = await freeBusy(new Date(now).toISOString(), end, eventId);
  let query = db
    .from("booking_reservations")
    .select("starts_at,blocked_until")
    .in("state", ["held", "confirmed"])
    .gt("blocked_until", new Date(now).toISOString());
  if (excludeOrderId) query = query.neq("order_id", excludeOrderId);
  const reservations = check(await query) || [];
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
