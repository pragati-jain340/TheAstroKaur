import { NextRequest, NextResponse } from "next/server";
import { stripe, settleSession } from "@/lib/payments/stripe";
import { apiError, BookingError } from "@/lib/booking/server";
import { handleRefundWebhook } from "@/lib/payments/refunds";
import type Stripe from "stripe";
export const runtime = "nodejs";
export async function POST(req: NextRequest) {
  try {
    const secret = process.env.STRIPE_WEBHOOK_SECRET,
      signature = req.headers.get("stripe-signature");
    if (!secret || !signature)
      throw new BookingError(
        "Webhook configuration or signature missing.",
        400,
      );
    let event: Stripe.Event;
    try {
      event = stripe().webhooks.constructEvent(
        await req.text(),
        signature,
        secret,
      );
    } catch {
      throw new BookingError("Invalid webhook signature.", 400);
    }
    if (event.livemode)
      throw new BookingError("Live payments are disabled.", 400);
    if (["charge.refunded", "refund.created", "refund.updated", "refund.failed"].includes(event.type)) {
      await handleRefundWebhook(event);
    }
    if (
      [
        "checkout.session.completed",
        "checkout.session.async_payment_succeeded",
        "checkout.session.async_payment_failed",
        "checkout.session.expired",
      ].includes(event.type)
    ) {
      // Retrieve authoritative state; duplicate/out-of-order event payloads cannot regress payment.
      const snapshot = event.data.object as Stripe.Checkout.Session;
      const session = await stripe().checkout.sessions.retrieve(snapshot.id);
      await settleSession(session, event.id);
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    return apiError(error);
  }
}
