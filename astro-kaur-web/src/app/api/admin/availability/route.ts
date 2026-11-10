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
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const db = database();
    const [settings, windows, overrides, connection, jobs, requests, services] =
      await Promise.all([
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
      ]);
    let busy: unknown[] = [];
    let busyError: string | null = null;
    if (req.nextUrl.searchParams.get("busy") === "1" && connection) {
      try {
        busy = await freeBusy(
          new Date().toISOString(),
          new Date(Date.now() + 4 * 86400000).toISOString(),
        );
      } catch {
        busyError =
          "External availability could not be checked. Call booking stays unavailable until this recovers.";
      }
    }
    return NextResponse.json(
      {
        settings: check(settings),
        windows: check(windows),
        overrides: check(overrides),
        jobs: check(jobs),
        requests: check(requests),
        services: check(services),
        busy,
        busy_error: busyError,
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
      job.email_started_at &&
      Date.now() - Date.parse(job.email_started_at) > 23 * 3600000
    )
      throw new BookingError(
        "The safe email retry window has closed. Contact the customer manually to avoid duplicate emails.",
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
