import { NextRequest, NextResponse } from "next/server";
import { database, requireUser } from "@/lib/booking/server";
import { createAndSendOtp, type OtpPurpose } from "@/lib/email/otp";

export const runtime = "nodejs";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  try {
    if (req.headers.get("content-type")?.split(";")[0].trim() !== "application/json") {
      return NextResponse.json({ error: "Invalid content type." }, { status: 415 });
    }

    const origin = req.headers.get("origin");
    if (origin && origin !== req.nextUrl.origin) {
      return NextResponse.json({ error: "Cross-site requests are not allowed." }, { status: 403 });
    }

    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const { email, purpose } = body || {};

    if (typeof purpose !== "string" || !["signup", "reset_password", "change_password"].includes(purpose)) {
      return NextResponse.json({ error: "Valid purpose is required." }, { status: 400 });
    }

    let targetEmail: string;

    if (purpose === "change_password") {
      // Must be authenticated to change password from account
      const auth = await requireUser();
      if (!auth.user.email) {
        return NextResponse.json({ error: "No email associated with this account." }, { status: 400 });
      }
      targetEmail = auth.user.email;
    } else {
      if (!email || typeof email !== "string" || !EMAIL_REGEX.test(email.trim())) {
        return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
      }
      targetEmail = email.trim().toLowerCase();

      const db = database();

      // Check customer_profiles first
      const { data: existingProfile } = await db
        .from("customer_profiles")
        .select("id, auth_user_id")
        .ilike("email", targetEmail)
        .maybeSingle();

      let accountExists = !!existingProfile;

      // Fallback check in auth.users if not found in profiles
      if (!accountExists) {
        try {
          const { data: authList } = await db.auth.admin.listUsers();
          const authUser = authList?.users?.find(
            (u) => u.email?.toLowerCase() === targetEmail
          );
          if (authUser) accountExists = true;
        } catch (adminErr) {
          console.warn("Failed to query auth.admin.listUsers:", adminErr);
        }
      }

      if (purpose === "signup" && accountExists) {
        return NextResponse.json(
          { error: "An account with this email address already exists. Please sign in instead." },
          { status: 409 }
        );
      }

      if (purpose === "reset_password" && !accountExists) {
        return NextResponse.json(
          { error: "No account found with this email address. Please check the spelling or sign up." },
          { status: 404 }
        );
      }
    }

    console.log(`[OTP Send] Dispatching ${purpose} code to: ${targetEmail}`);
    const result = await createAndSendOtp(targetEmail, purpose as OtpPurpose);

    if (!result.success) {
      console.error(`[OTP Send] Failed sending to ${targetEmail}:`, result.error);
      return NextResponse.json(
        { error: result.error || "Unable to send verification code." },
        { status: 400 }
      );
    }

    console.log(`[OTP Send] Successfully sent ${purpose} code to: ${targetEmail}`);
    return NextResponse.json({
      success: true,
      message: "A 6-digit verification code has been sent to your email.",
    });
  } catch (error: unknown) {
    console.error("Error in /api/auth/otp/send:", error);
    const message = error instanceof Error ? error.message : "Internal server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
