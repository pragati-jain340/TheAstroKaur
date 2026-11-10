import { NextRequest, NextResponse } from "next/server";
import { database, requireAdmin, BookingError } from "@/lib/booking/server";

export const runtime = "nodejs";

function reply(body: { error: string } | { success: true }, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    // JSON-only requests prevent cross-site HTML forms from submitting this action.
    if (req.headers.get("content-type")?.split(";")[0].trim() !== "application/json") {
      return reply({ error: "Send a JSON request." }, 415);
    }
    const origin = req.headers.get("origin");
    if (origin && origin !== req.nextUrl.origin) {
      return reply({ error: "Cross-site requests are not allowed." }, 403);
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return reply({ error: "Invalid request body." }, 400);
    }
    if (!body || typeof body !== "object" || !("id" in body) || !("password" in body)) {
      return reply({ error: "A user ID and new password are required." }, 400);
    }
    const { id, password } = body;
    if (typeof id !== "string" || !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id)) {
      return reply({ error: "Invalid user ID." }, 400);
    }
    if (typeof password !== "string" || password.length < 8 || password.length > 128) {
      return reply({ error: "Use a password between 8 and 128 characters." }, 400);
    }

    const db = database();
    // Resolve the Auth ID on the server; never accept a separate client-supplied Auth ID.
    const { data: profile, error: profileError } = await db
      .from("customer_profiles").select("auth_user_id").eq("id", id).maybeSingle();
    if (profileError) return reply({ error: "Unable to load this user. Please retry." }, 503);
    if (!profile?.auth_user_id) return reply({ error: "User account not found." }, 404);

    const { error } = await db.auth.admin.updateUserById(profile.auth_user_id, { password });
    if (error) {
      if (error.code === "weak_password") {
        return reply({ error: "Choose a stronger password that meets the project's password policy." }, 400);
      }
      if (error.code === "same_password") {
        return reply({ error: "Choose a different password from the current password." }, 400);
      }
      if (error.code === "user_not_found") return reply({ error: "User account not found." }, 404);
      return reply({ error: "Unable to change the password. Please retry." }, 502);
    }
    // Never return or log the submitted password or Auth user record.
    return reply({ success: true });
  } catch (error) {
    if (error instanceof BookingError) return reply({ error: error.message }, error.status);
    return reply({ error: "Unable to change the password. Please retry." }, 500);
  }
}
