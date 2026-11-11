import { NextRequest, NextResponse } from "next/server";
import {
  apiError,
  BookingError,
  loadOrder,
  requireUser,
} from "@/lib/booking/server";
import { createCheckout, reconcileCheckout } from "@/lib/payments/stripe";
export async function POST(req: NextRequest) {
  try {
    const { user } = await requireUser(),
      body = await req.json(),
      order = await loadOrder(body.order_id);
    if (order.auth_user_id !== user.id)
      throw new BookingError("Order not found.", 404);
    if (
      Date.parse(order.hold_expires_at || "") <= Date.now() ||
      order.status !== "pending_payment"
    ) {
      if (order.status === "pending_payment") await reconcileCheckout(order);
      throw new BookingError(
        "This checkout is no longer available. Please start a new order.",
        409,
      );
    }
    const session = await createCheckout(order);
    if (session.status !== "open" || !session.url)
      throw new BookingError("This checkout is no longer open.", 409);
    return NextResponse.json({ url: session.url });
  } catch (error) {
    return apiError(error);
  }
}
