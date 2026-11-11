import { NextRequest, NextResponse } from "next/server";
import {
  apiError,
  BookingError,
  check,
  database,
  requireUser,
  uuid,
} from "@/lib/booking/server";
import { validateIntake } from "@/lib/booking/intake";
import { POLICY_VERSION } from "@/lib/booking/types";
import { stripe } from "@/lib/payments/stripe";
export async function POST(req: NextRequest) {
  try {
    const { user } = await requireUser();
    stripe();
    const body = await req.json(),
      serviceId = uuid(body.service_id),
      key = uuid(body.idempotency_key);
    if (body.policy_version !== POLICY_VERSION || body.acknowledged !== true)
      throw new BookingError(
        "Please review and acknowledge the booking terms.",
      );
    const db = database();
    const worker = check(
      await db
        .from("availability_settings")
        .select("worker_last_seen_at")
        .eq("id", true)
        .single(),
    );
    if (
      !worker?.worker_last_seen_at ||
      Date.now() - Date.parse(worker.worker_last_seen_at) > 120000
    )
      throw new BookingError(
        "Checkout is temporarily unavailable while booking services reconnect. Please try again shortly.",
        503,
      );
    const existing = check(
      await db
        .from("orders")
        .select("id,auth_user_id,service_id,hold_expires_at,status")
        .eq("checkout_key", key)
        .maybeSingle(),
    );
    if (existing) {
      if (
        existing.auth_user_id !== user.id ||
        existing.service_id !== serviceId
      )
        throw new BookingError("Invalid checkout request.");
      return NextResponse.json({
        order_id: existing.id,
        hold_expires_at: existing.hold_expires_at,
        status: existing.status,
        server_now: new Date().toISOString(),
      });
    }
    const service = check(
      await db
        .from("services")
        .select("*")
        .eq("id", serviceId)
        .eq("is_active", true)
        .single(),
    );
    if (!service) throw new BookingError("Service unavailable.");
    const intake = validateIntake(
      body.intake,
      service.requires_partner_details,
    );
    const order = check(
      await db.rpc("booking_create_payment_first", {
        p_user: user.id,
        p_service: serviceId,
        p_intake: intake,
        p_start: null,
        p_timezone: body.timezone,
        p_key: key,
        p_policy: POLICY_VERSION,
      }),
    );
    return NextResponse.json({
      order_id: order.id,
      hold_expires_at: order.hold_expires_at,
      server_now: new Date().toISOString(),
    });
  } catch (error) {
    return apiError(error);
  }
}
