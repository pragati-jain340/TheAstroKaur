import { NextRequest, NextResponse } from "next/server";
import { availability } from "@/lib/booking/availability";
import {
  apiError,
  BookingError,
  loadOrder,
  requireUser,
  uuid,
} from "@/lib/booking/server";
export async function GET(req: NextRequest) {
  try {
    const { user, isAdmin } = await requireUser();
    const serviceId = uuid(req.nextUrl.searchParams.get("service"));
    const orderId = req.nextUrl.searchParams.get("order");
    if (orderId) {
      const order = await loadOrder(orderId);
      if (!isAdmin && order.auth_user_id !== user.id)
        throw new BookingError("Order not found.", 404);
      if (order.service_id !== serviceId)
        throw new BookingError("Invalid service.");
    }
    return NextResponse.json(
      await availability(serviceId, orderId || undefined),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}
