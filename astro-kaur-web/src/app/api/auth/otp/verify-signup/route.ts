import { NextRequest, NextResponse } from "next/server";
import { database } from "@/lib/booking/server";
import { verifyOtp } from "@/lib/email/otp";

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

    const { email, otp, password, displayName, avatarSeed, birthDetails } = body || {};
    const typedBirthDetails = birthDetails as
      | {
          dateOfBirth?: string;
          timeOfBirth?: string;
          placeOfBirth?: string;
          timeUncertain?: boolean;
        }
      | undefined;

    if (!email || typeof email !== "string" || !EMAIL_REGEX.test(email.trim())) {
      return NextResponse.json({ error: "A valid email address is required." }, { status: 400 });
    }

    if (!otp || typeof otp !== "string" || !/^\d{6}$/.test(otp.trim())) {
      return NextResponse.json({ error: "Please enter the 6-digit verification code." }, { status: 400 });
    }

    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters long." }, { status: 400 });
    }

    if (!displayName || typeof displayName !== "string" || !displayName.trim()) {
      return NextResponse.json({ error: "Please provide your full name." }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 1. Verify OTP first
    const verification = await verifyOtp(normalizedEmail, otp, "signup");
    if (!verification.valid) {
      return NextResponse.json(
        { error: verification.error || "Invalid verification code." },
        { status: 400 }
      );
    }

    // 2. Create user with email_confirm: true (email verified!)
    const db = database();
    const { data: authData, error: authError } = await db.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: {
        display_name: displayName.trim(),
        avatar_seed: avatarSeed || null,
      },
    });

    if (authError || !authData.user) {
      console.error("Supabase admin createUser error:", authError);
      return NextResponse.json(
        { error: authError?.message || "Failed to create account." },
        { status: 400 }
      );
    }

    const userId = authData.user.id;

    // 3. Populate customer_profiles
    const profilePayload = {
      auth_user_id: userId,
      email: normalizedEmail,
      display_name: displayName.trim(),
      role: "customer" as const,
      account_status: "active" as const,
      avatar_seed: (typeof avatarSeed === "string" ? avatarSeed : null),
      date_of_birth: typedBirthDetails?.dateOfBirth || null,
      time_of_birth: typedBirthDetails?.timeUncertain ? null : typedBirthDetails?.timeOfBirth || null,
      place_of_birth: typedBirthDetails?.placeOfBirth ? typedBirthDetails.placeOfBirth.trim() : null,
      time_uncertain: !!typedBirthDetails?.timeUncertain,
    };

    const { error: profileError } = await db
      .from("customer_profiles")
      .upsert(profilePayload, { onConflict: "auth_user_id" });

    if (profileError) {
      console.warn("Profile upsert warning after user creation:", profileError.message);
    }

    return NextResponse.json({
      success: true,
      message: "Account verified and created successfully.",
    });
  } catch (error: unknown) {
    console.error("Error in /api/auth/otp/verify-signup:", error);
    const message = error instanceof Error ? error.message : "Internal server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
