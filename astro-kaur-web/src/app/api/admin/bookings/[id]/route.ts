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
import { stripe } from "@/lib/payments/stripe";
type Context = { params: Promise<{ id: string }> };
export async function GET(_req: NextRequest, context: Context) {
  try {
    await requireAdmin();
    const { id } = await context.params,
      db = database();
    const order = await loadOrder(id),
      detail = check(
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
    });
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
      if (
        body.confirmed !== true ||
        !order.payment_verified_at ||
        !order.stripe_payment_intent_id ||
        order.payment_status !== "paid"
      )
        throw new BookingError(
          "A verified paid order and explicit confirmation are required.",
        );
      const refund = await stripe().refunds.create(
        {
          payment_intent: order.stripe_payment_intent_id,
          metadata: { order_id: id },
        },
        { idempotencyKey: `full-refund-${id}` },
      );
      if (refund.status !== "succeeded")
        throw new BookingError(
          "The refund is pending at Stripe. Check the Stripe dashboard before retrying.",
          409,
        );
      check(
        await db.rpc("booking_record_refund", {
          p_intent: order.stripe_payment_intent_id,
          p_refund: refund.id,
          p_amount: refund.amount,
          p_actor: user.id,
        }),
      );
    } else if (body.action === "resolve_request") {
      check(
        await db
          .from("booking_requests")
          .update({ status: "resolved" })
          .eq("order_id", id),
      );
    } else {
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
