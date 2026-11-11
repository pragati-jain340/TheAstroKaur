import { NextRequest, NextResponse } from "next/server";
import { database, requireUser } from "@/lib/booking/server";
import { verifyOtp, type OtpPurpose } from "@/lib/email/otp";

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

    const { otp, newPassword, purpose, email } = body || {};

    if (typeof purpose !== "string" || !["change_password", "reset_password"].includes(purpose)) {
      return NextResponse.json({ error: "Invalid password update request." }, { status: 400 });
    }

    if (!otp || typeof otp !== "string" || !/^\d{6}$/.test(otp.trim())) {
      return NextResponse.json({ error: "Please enter the 6-digit verification code." }, { status: 400 });
    }

    if (!newPassword || typeof newPassword !== "string" || newPassword.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters long." }, { status: 400 });
    }

    const db = database();
    let targetUserId: string;
    let targetEmail: string;

    if (purpose === "change_password") {
      const auth = await requireUser();
      if (!auth.user.email) {
        return NextResponse.json({ error: "No email associated with this account." }, { status: 400 });
      }
      targetUserId = auth.user.id;
      targetEmail = auth.user.email;
    } else {
      // reset_password
      if (!email || typeof email !== "string" || !EMAIL_REGEX.test(email.trim())) {
        return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
      }
      targetEmail = email.trim().toLowerCase();

      const { data: profile } = await db
        .from("customer_profiles")
        .select("auth_user_id")
        .ilike("email", targetEmail)
        .maybeSingle();

      let resolvedUserId = profile?.auth_user_id;

      if (!resolvedUserId) {
        try {
          const { data: authList } = await db.auth.admin.listUsers();
          const authUser = authList?.users?.find(
            (u) => u.email?.toLowerCase() === targetEmail
          );
          if (authUser) resolvedUserId = authUser.id;
        } catch (err) {
          console.warn("Failed checking auth.admin.listUsers:", err);
        }
      }

      if (!resolvedUserId) {
        return NextResponse.json({ error: "Account not found." }, { status: 404 });
      }
      targetUserId = resolvedUserId;
    }

    // 1. Verify OTP
    const verification = await verifyOtp(targetEmail, otp, purpose as OtpPurpose);
    if (!verification.valid) {
      return NextResponse.json(
        { error: verification.error || "Invalid verification code." },
        { status: 400 }
      );
    }

    // 2. Update user's password in Supabase Auth
    const { error: updateError } = await db.auth.admin.updateUserById(targetUserId, {
      password: newPassword,
    });

    if (updateError) {
      console.error("Supabase admin updateUserById password error:", updateError);
      return NextResponse.json(
        { error: updateError.message || "Unable to update password." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: purpose === "change_password"
        ? "Your password has been updated successfully."
        : "Your password has been reset successfully. You can now sign in.",
    });
  } catch (error: unknown) {
    console.error("Error in /api/auth/otp/verify-password:", error);
    const message = error instanceof Error ? error.message : "Internal server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
