import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { runWorker } from "@/lib/booking/worker";
import { apiError } from "@/lib/booking/server";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function GET(req: NextRequest) {
  const actual = req.headers.get("authorization")?.replace(/^Bearer /, "") || "";
  const secrets = [process.env.BOOKING_WORKER_SECRET, process.env.CRON_SECRET].filter(
    (s): s is string => typeof s === "string" && s.length >= 16,
  );
  const authenticated = secrets.some(
    (s) =>
      actual.length === s.length &&
      timingSafeEqual(Buffer.from(actual), Buffer.from(s)),
  );
  if (!secrets.length || !authenticated)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await runWorker());
  } catch (error) {
    return apiError(error);
  }
}
export const POST = GET;
