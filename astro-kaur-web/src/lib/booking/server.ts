import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { BookingOrder } from "./types";

export class BookingError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export function database() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key)
    throw new BookingError("Database configuration is missing.", 503);
  return createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
export async function requireUser() {
  const client = await createClient();
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error || !user)
    throw new BookingError("Please sign in to continue.", 401);
  const { data: profile, error: profileError } = await database()
    .from("customer_profiles")
    .select("role,account_status")
    .eq("auth_user_id", user.id)
    .single();
  if (profileError || profile?.account_status !== "active")
    throw new BookingError("An active account is required.", 403);
  return { user, isAdmin: profile.role === "admin" };
}
export async function requireAdmin() {
  const auth = await requireUser();
  if (!auth.isAdmin)
    throw new BookingError("Administrator access required.", 403);
  return auth;
}
export async function adminGuard() {
  try {
    await requireAdmin();
    return null;
  } catch (error) {
    return apiError(error);
  }
}
export function apiError(error: unknown) {
  if (error instanceof BookingError)
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  console.error(
    "Booking operation failed",
    error instanceof Error ? error.message : "Unknown failure",
  );
  return NextResponse.json(
    { error: "The request could not be completed. Please try again." },
    { status: 500 },
  );
}
export function check<T>(result: {
  data: T;
  error: { message: string; code?: string } | null;
}): T {
  if (result.error) {
    if (result.error.code === "23P01")
      throw new BookingError(
        "This time has just been reserved. Please select another slot.",
        409,
      );
    throw new BookingError(
      result.error.code === "P0001"
        ? result.error.message
        : "Unable to save this change. Please try again.",
      409,
    );
  }
  return result.data;
}
export function siteUrl() {
  const value = process.env.NEXT_PUBLIC_SITE_URL;
  if (!value) throw new BookingError("The site URL is not configured.", 503);
  const url = new URL(value);
  if (url.protocol !== "https:" && url.hostname !== "localhost")
    throw new BookingError("A secure site URL is required.", 503);
  return url.origin;
}
export function uuid(value: unknown): string {
  if (
    typeof value !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    )
  )
    throw new BookingError(
      "Invalid reference. Please reload the service list.",
    );
  return value;
}
export async function loadOrder(id: string): Promise<BookingOrder> {
  const data = check(
    await database().from("orders").select("*").eq("id", uuid(id)).single(),
  );
  if (!data) throw new BookingError("Order not found.", 404);
  return data as BookingOrder;
}
