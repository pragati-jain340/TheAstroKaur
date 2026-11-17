import { NextRequest, NextResponse } from "next/server";
import {
  apiError,
  BookingError,
  check,
  database,
  loadOrder,
  requireAdmin,
} from "@/lib/booking/server";
import { availability } from "@/lib/booking/availability";
import { issueExceptionalRefund, reconcileRefunds, refundTracking } from "@/lib/payments/refunds";
type Context = { params: Promise<{ id: string }> };
export async function GET(req: NextRequest, context: Context) {
  try {
    await requireAdmin();
    const { id } = await context.params,
      db = database();
    let order = await loadOrder(id);
    if (req.nextUrl.searchParams.get("reconcile_refunds") === "1") { await reconcileRefunds(order); order = await loadOrder(id); }
    const detail = check(
        await db
          .from("reading_details")
          .select("*")
          .eq("order_id", id)
          .maybeSingle(),
      );
    const notes = check(
      await db
        .from("reading_private_notes")
        .select("admin_notes")
        .eq("order_id", id)
        .maybeSingle(),
    );
    const history = check(
      await db
        .from("booking_change_log")
        .select("*")
        .eq("order_id", id)
        .order("created_at", { ascending: false }),
    );
    return NextResponse.json({
      order,
      detail: detail
        ? { ...detail, admin_notes: notes?.admin_notes || "" }
        : null,
      history,
      ...await refundTracking(id),
      payment_mode: "test",
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return apiError(error);
  }
}
export async function PATCH(req: NextRequest, context: Context) {
  try {
    const { user } = await requireAdmin(),
      { id } = await context.params,
      body = await req.json(),
      order = await loadOrder(id),
      db = database();
    if (body.action === "notes") {
      check(
        await db.from("reading_private_notes").upsert({
          order_id: id,
          admin_notes: String(body.notes || "").slice(0, 20000),
          updated_at: new Date().toISOString(),
        }),
      );
    } else if (body.action === "refund_payment") {
      if (body.confirmed !== true) throw new BookingError("Please confirm this refund.");
      if (!(await refundTracking(id)).refund_tracking_ready) throw new BookingError("Refund tracking must be installed before issuing refunds. Apply the exceptional refunds database migration.", 503);
      const refund = await issueExceptionalRefund(order, user.id, body.reason, body.amount_cents);
      return NextResponse.json({ saved: true, refund: { id: refund.id, status: refund.status, amount: refund.amount, currency: refund.currency } });
    } else if (body.action === "resolve_request") {
      check(
        await db
          .from("booking_requests")
          .update({ status: "resolved" })
          .eq("order_id", id),
      );
      check(await db.from("orders").update({ refund_status: "reviewed" }).eq("id", id).eq("refund_status", "requested"));
    } else {
      if (!["schedule", "reschedule", "cancel", "delivered", "pending", "birth_details_received", "in_progress"].includes(body.action)) throw new BookingError("Invalid booking action.");
      if (body.action === "cancel" && body.confirmed !== true) throw new BookingError("Please confirm cancellation. No refund will be issued.");
      if (body.action === "reschedule" || body.action === "schedule") {
        const list = await availability(order.service_id!, order.id, body.action === "schedule");
        if (!list.slots.some((s) => s.start === body.starts_at))
          throw new BookingError("This replacement time is unavailable.", 409);
      }
      if (body.action === "schedule") {
        check(await db.rpc("booking_schedule_paid", {
          p_order: id,
          p_actor: user.id,
          p_start: body.starts_at,
          p_admin: true,
          p_timezone: null,
        }));
        return NextResponse.json({ saved: true });
      }
      check(
        await db.rpc("booking_change", {
          p_order: id,
          p_actor: user.id,
          p_action: body.action,
          p_start: body.starts_at || null,
          p_reason:
            typeof body.reason === "string" ? body.reason.slice(0, 1000) : null,
          p_admin: true,
        }),
      );
    }
    return NextResponse.json({ saved: true });
  } catch (error) {
    return apiError(error);
  }
}
