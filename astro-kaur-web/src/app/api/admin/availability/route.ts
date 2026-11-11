import { NextRequest, NextResponse } from "next/server";
import {
  apiError,
  BookingError,
  check,
  database,
  requireAdmin,
  uuid,
} from "@/lib/booking/server";
import { freeBusy, googleConnection } from "@/lib/google/calendar";
import { calculateSlots } from "@/lib/booking/slots";
import type {
  AvailabilityOverride,
  AvailabilityWindow,
  Interval,
  Settings,
} from "@/lib/booking/types";

type CallOrder = {
  id: string;
  client_name: string | null;
  scheduled_at: string | null;
  scheduled_end_at: string | null;
  status: string;
  payment_status: string;
};

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const db = database();
    const wantSlots = req.nextUrl.searchParams.get("slots") === "1";
    const wantBusy = req.nextUrl.searchParams.get("busy") === "1" || wantSlots;
    const now = Date.now();

    const [
      settingsResult,
      windowsResult,
      overridesResult,
      connection,
      jobsResult,
      requestsResult,
      servicesResult,
      reservationsResult,
      callsResult,
    ] = await Promise.all([
      db.from("availability_settings").select("*").eq("id", true).single(),
      db.from("availability_windows").select("*").order("weekday"),
      db.from("availability_overrides").select("*").order("local_date"),
      googleConnection(),
      db
        .from("booking_jobs")
        .select("id,order_id,kind,status,attempts,last_error,run_at")
        .in("status", ["failed", "pending", "processing"])
        .order("run_at")
        .limit(40),
      db
        .from("booking_requests")
        .select("*")
        .eq("status", "pending")
        .order("created_at"),
      db
        .from("services")
        .select("id,title,format,duration_minutes")
        .eq("is_active", true),
      wantSlots
        ? db
            .from("booking_reservations")
            .select("starts_at,blocked_until")
            .in("state", ["held", "confirmed"])
            .gt("blocked_until", new Date(now).toISOString())
        : Promise.resolve({ data: [] as { starts_at: string; blocked_until: string }[], error: null }),
      wantSlots
        ? db
            .from("orders")
            .select("id,client_name,scheduled_at,scheduled_end_at,status,payment_status")
            .eq("format", "voice_call")
        : Promise.resolve({ data: [] as CallOrder[], error: null }),
    ]);

    const settings = check(settingsResult) as Settings;
    const windows = check(windowsResult) as AvailabilityWindow[];
    const overrides = check(overridesResult) as AvailabilityOverride[];
    const services = check(servicesResult) as Array<{
      id: string;
      title: string;
      format: string;
      duration_minutes: number | null;
    }>;

    let busy: Interval[] = [];
    let busyError: string | null = connection
      ? null
      : "Google Calendar is not connected. External conflicts cannot be checked; contact customers personally with call details.";

    if (wantBusy && connection) {
      const windowEnd = wantSlots
        ? new Date(
            now + ((settings.advance_window_days || 60) + 1) * 86400000,
          ).toISOString()
        : new Date(Date.now() + 4 * 86400000).toISOString();
      try {
        busy = await freeBusy(new Date(now).toISOString(), windowEnd);
      } catch {
        busyError =
          "External conflicts cannot be checked. Website bookings remain available; check your calendar manually and reconnect Google.";
      }
    }

    let slots: Array<{ start: string; end: string; durations?: number[] }> | undefined;
    let calls: CallOrder[] | undefined;

    if (wantSlots) {
      const reservations = check(reservationsResult) || [];
      const allBusy: Interval[] = [
        ...busy,
        ...reservations.map((r: { starts_at: string; blocked_until: string }) => ({
          start: r.starts_at,
          end: r.blocked_until,
        })),
      ];

      const voiceServices = services.filter(
        (service) =>
          service.format === "voice_call" &&
          [30, 45].includes(service.duration_minutes || 0),
      );
      const uniqueDurations = [
        ...new Set(voiceServices.map((s) => s.duration_minutes!)),
      ];

      const combined = new Map<
        string,
        { start: string; end: string; durations: number[] }
      >();
      for (const duration of uniqueDurations) {
        const calculated = calculateSlots(
          settings,
          windows,
          overrides,
          allBusy,
          duration,
          now,
        );
        for (const slot of calculated) {
          const entry = combined.get(slot.start);
          if (entry) entry.durations.push(duration);
          else combined.set(slot.start, { ...slot, durations: [duration] });
        }
      }
      slots = [...combined.values()];
      calls = (check(callsResult) || []) as CallOrder[];
    }

    return NextResponse.json(
      {
        settings,
        windows,
        overrides,
        jobs: check(jobsResult),
        requests: check(requestsResult),
        services,
        busy,
        busy_error: busyError,
        slots,
        calls,
        connection: connection
          ? {
              organizer_email: connection.organizer_email,
              calendar_id: connection.calendar_id,
              busy_calendar_ids: connection.busy_calendar_ids,
              status: connection.status,
              last_success_at: connection.last_success_at,
              last_error: connection.last_error,
            }
          : null,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json(),
      db = database();
    const job = check(
      await db
        .from("booking_jobs")
        .select("kind,status,email_started_at")
        .eq("id", uuid(body.job_id))
        .single(),
    );
    if (!job || job.status !== "failed")
      throw new BookingError("Only failed jobs can be retried.");
    if (
      job.kind !== "calendar" &&
      job.email_started_at
    )
      throw new BookingError(
        "SMTP delivery is uncertain. Review the sender's Sent folder before recovering this job to avoid duplicate emails.",
      );
    check(
      await db
        .from("booking_jobs")
        .update({
          status: "pending",
          attempts: 0,
          lease_until: null,
          run_at: new Date().toISOString(),
        })
        .eq("id", body.job_id)
        .eq("status", "failed"),
    );
    return NextResponse.json({ saved: true });
  } catch (error) {
    return apiError(error);
  }
}
export async function PUT(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();
    if (
      !body.settings ||
      !Array.isArray(body.windows) ||
      !Array.isArray(body.overrides) ||
      body.windows.length > 50 ||
      body.overrides.length > 200
    )
      throw new BookingError("Please check the availability settings.");
    check(
      await database().rpc("booking_save_availability", {
        p_settings: body.settings,
        p_windows: body.windows,
        p_overrides: body.overrides,
      }),
    );
    return NextResponse.json({ saved: true });
  } catch (error) {
    return apiError(error);
  }
}
