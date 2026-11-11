import { NextRequest, NextResponse } from "next/server";
import {
  apiError,
  BookingError,
  check,
  database,
  loadOrder,
  requireUser,
} from "@/lib/booking/server";
import { availability } from "@/lib/booking/availability";
import { canReschedule, rescheduleDeadline } from "@/lib/booking/types";
import { reconcileCheckout } from "@/lib/payments/stripe";
type Context = { params: Promise<{ id: string }> };
export async function GET(req: NextRequest, context: Context) {
  try {
    const { user, isAdmin } = await requireUser(),
      { id } = await context.params;
    let order = await loadOrder(id);
    if (order.auth_user_id !== user.id && !isAdmin)
      throw new BookingError("Order not found.", 404);
    if (
      req.nextUrl.searchParams.get("reconcile") === "1" &&
      order.status === "pending_payment"
    ) {
      await reconcileCheckout(order);
      order = await loadOrder(id);
    }
    const db = database();
    const detail = check(
      await db
        .from("reading_details")
        .select(
          "status,meet_url,calendar_sync_status,calendar_invitation_status,delivered_at",
        )
        .eq("order_id", id)
        .maybeSingle(),
    );
    return NextResponse.json(
      {
        order,
        detail,
        can_reschedule: canReschedule(order),
        reschedule_deadline: rescheduleDeadline(order),
        server_now: new Date().toISOString(),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}
export async function POST(req: NextRequest, context: Context) {
  try {
    const { user } = await requireUser(),
      { id } = await context.params,
      body = await req.json(),
      order = await loadOrder(id);
    if (order.auth_user_id !== user.id)
      throw new BookingError("Order not found.", 404);
    if (!["schedule", "reschedule", "cancel", "withdrawal", "refund"].includes(body.action))
      throw new BookingError("Invalid action.");
    if (body.confirmed !== true)
      throw new BookingError("Please confirm this change.");
    if (body.action === "schedule" || body.action === "reschedule") {
      if (body.action === "reschedule" && !canReschedule(order))
        throw new BookingError(
          "Self-service rescheduling has closed. Please contact support.",
          409,
        );
      const available = await availability(order.service_id!, order.id);
      if (!available.slots.some((s) => s.start === body.starts_at))
        throw new BookingError("Replacement time is unavailable.", 409);
    }
    if (body.action === "schedule") {
      const result = check(await database().rpc("booking_schedule_paid", {
        p_order: id,
        p_actor: user.id,
        p_start: body.starts_at,
        p_admin: false,
        p_timezone: typeof body.timezone === "string" ? body.timezone : null,
      }));
      return NextResponse.json({ order: result });
    }
    const result = check(
      await database().rpc("booking_change", {
        p_order: id,
        p_actor: user.id,
        p_action: body.action,
        p_start: body.action === "reschedule" ? body.starts_at : null,
        p_reason:
          typeof body.reason === "string" ? body.reason.slice(0, 1000) : null,
        p_admin: false,
      }),
    );
    return NextResponse.json({ order: result });
  } catch (error) {
    return apiError(error);
  }
}
