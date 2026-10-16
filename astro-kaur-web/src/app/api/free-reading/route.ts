import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ASCENDANT_READINGS } from "@/lib/astrology/ascendantData";

export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY =
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Helper to authenticate user and check admin role
async function getAuthUser(request: Request) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();

  if (!token) {
    return { user: null, isAdmin: false, error: "Missing authorization token" };
  }

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    return { user: null, isAdmin: false, error: error?.message || "Invalid or expired token" };
  }

  // Check if user has admin role in customer_profiles or metadata
  const { data: profile } = await supabaseAdmin
    .from("customer_profiles")
    .select("role")
    .or(`auth_user_id.eq.${user.id},email.eq.${user.email?.toLowerCase()}`)
    .maybeSingle();

  const isAdmin =
    profile?.role === "admin" ||
    (user.app_metadata as any)?.role === "admin" ||
    (user.user_metadata as any)?.role === "admin";

  return { user, isAdmin, error: null };
}

// ── GET: Check Eligibility & Previous Saved Reading ─────────────────────────
export async function GET(request: Request) {
  try {
    const { user, isAdmin, error: authError } = await getAuthUser(request);
    if (authError || !user || !user.email) {
      return NextResponse.json(
        { eligible: false, message: "Authentication required to check free reading eligibility." },
        { status: 401 }
      );
    }

    const normalizedEmail = user.email.trim().toLowerCase();

    // Query for existing completed reading
    const { data: existingClaim, error: dbError } = await supabaseAdmin
      .from("free_readings")
      .select("*")
      .or(`email.eq.${normalizedEmail},user_id.eq.${user.id}`)
      .eq("status", "completed")
      .maybeSingle();

    if (dbError) {
      console.error("Error checking free reading eligibility:", dbError);
    }

    let parsedContent = null;
    if (existingClaim) {
      try {
        parsedContent = JSON.parse(existingClaim.reading_content);
      } catch {
        parsedContent = existingClaim.reading_content;
      }
    }

    // Admins have UNLIMITED free reading calculations for testing and verification
    if (isAdmin) {
      return NextResponse.json({
        eligible: true,
        alreadyClaimed: false,
        isAdmin: true,
        message: "Admin mode: unlimited Vedic reading testing enabled.",
        lastReading: existingClaim
          ? {
              id: existingClaim.id,
              ascendant: existingClaim.ascendant,
              readingContent: parsedContent,
              dateOfBirth: existingClaim.date_of_birth,
              timeOfBirth: existingClaim.time_of_birth,
              placeOfBirth: existingClaim.place_of_birth,
              createdAt: existingClaim.created_at,
            }
          : null,
      });
    }

    // For clients: check if already claimed
    if (existingClaim) {
      return NextResponse.json({
        eligible: false,
        alreadyClaimed: true,
        isAdmin: false,
        message: "You have already used your free reading. You can revisit your previous reading below.",
        reading: {
          id: existingClaim.id,
          ascendant: existingClaim.ascendant,
          readingContent: parsedContent,
          dateOfBirth: existingClaim.date_of_birth,
          timeOfBirth: existingClaim.time_of_birth,
          placeOfBirth: existingClaim.place_of_birth,
          createdAt: existingClaim.created_at,
        },
      });
    }

    return NextResponse.json({
      eligible: true,
      alreadyClaimed: false,
      isAdmin: false,
      message: "You are eligible for one complimentary Vedic Rising Sign reading.",
    });
  } catch (err: any) {
    console.error("GET /api/free-reading error:", err);
    return NextResponse.json({ error: "Failed to check eligibility" }, { status: 500 });
  }
}

// ── POST: Calculate Ascendant & Record Claim ─────────────────────────────────
export async function POST(request: Request) {
  try {
    const { user, isAdmin, error: authError } = await getAuthUser(request);
    if (authError || !user || !user.email) {
      return NextResponse.json(
        { error: "Authentication required. Please sign in to request your reading." },
        { status: 401 }
      );
    }

    const normalizedEmail = user.email.trim().toLowerCase();

    // 1. Re-check server-side eligibility (Enforced strictly for regular clients)
    if (!isAdmin) {
      const { data: existingClaim } = await supabaseAdmin
        .from("free_readings")
        .select("*")
        .or(`email.eq.${normalizedEmail},user_id.eq.${user.id}`)
        .eq("status", "completed")
        .maybeSingle();

      if (existingClaim) {
        let content = null;
        try {
          content = JSON.parse(existingClaim.reading_content);
        } catch {
          content = existingClaim.reading_content;
        }

        return NextResponse.json({
          alreadyClaimed: true,
          isAdmin: false,
          message: "You have already used your free reading. You can revisit your previous reading below.",
          reading: {
            id: existingClaim.id,
            ascendant: existingClaim.ascendant,
            readingContent: content,
            dateOfBirth: existingClaim.date_of_birth,
            timeOfBirth: existingClaim.time_of_birth,
            placeOfBirth: existingClaim.place_of_birth,
            createdAt: existingClaim.created_at,
          },
        });
      }
    }

    // 2. Validate request body
    const body = await request.json();
    const {
      date_of_birth,
      time_of_birth,
      place_of_birth,
      latitude,
      longitude,
      timezone,
      update_profile = true,
    } = body;

    if (!date_of_birth || !time_of_birth || !place_of_birth) {
      return NextResponse.json(
        { error: "Date of birth, time of birth, and birthplace are required." },
        { status: 400 }
      );
    }

    const birthDate = new Date(date_of_birth);
    if (isNaN(birthDate.getTime()) || birthDate > new Date()) {
      return NextResponse.json(
        { error: "Please enter a valid past date of birth." },
        { status: 400 }
      );
    }

    if (
      typeof latitude !== "number" ||
      typeof longitude !== "number" ||
      typeof timezone !== "number"
    ) {
      return NextResponse.json(
        { error: "Accurate birthplace coordinates and timezone are required for Vedic calculation." },
        { status: 400 }
      );
    }

    const timeParts = time_of_birth.split(":");
    const hours = parseInt(timeParts[0], 10);
    const minutes = parseInt(timeParts[1] || "0", 10);

    if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      return NextResponse.json(
        { error: "Please enter a valid birth time (HH:MM)." },
        { status: 400 }
      );
    }

    // 3. Read Navamsha API Key
    const navamshaKey = process.env.NAVAMSHA_API_KEY;
    if (!navamshaKey) {
      console.error("Missing NAVAMSHA_API_KEY in server environment");
      return NextResponse.json(
        { error: "Astrology calculation service is temporarily unavailable. Please try again later." },
        { status: 503 }
      );
    }

    // 4. Call Navamsha Kundali Basic API
    const [year, month, day] = date_of_birth.split("-").map((v: string) => parseInt(v, 10));

    let calculatedAscendant: string | null = null;
    try {
      const navamshaRes = await fetch("https://api.navamsha.in/api/v1/kundali/basic", {
        method: "POST",
        headers: {
          "X-API-Key": navamshaKey,
          "Content-Type": "application/json",
          "User-Agent": "TheAstroKaur-Website/1.0",
        },
        body: JSON.stringify({
          year,
          month,
          date: day,
          hours,
          minutes,
          latitude,
          longitude,
          timezone,
        }),
      });

      if (!navamshaRes.ok) {
        const errorText = await navamshaRes.text();
        console.error(`Navamsha API failed with status ${navamshaRes.status}:`, errorText);
        return NextResponse.json(
          { error: "Unable to calculate Vedic chart. Please verify your birth details and try again." },
          { status: 502 }
        );
      }

      const navamshaData = await navamshaRes.json();
      calculatedAscendant = navamshaData?.output?.ascendant?.zodiac_sign_name;

      if (!calculatedAscendant) {
        console.error("Navamsha API response missing ascendant sign:", navamshaData);
        return NextResponse.json(
          { error: "Calculation did not produce a recognized Ascendant sign. Please retry." },
          { status: 502 }
        );
      }
    } catch (apiErr: any) {
      console.error("Navamsha API request error:", apiErr);
      return NextResponse.json(
        { error: "Connection to astrology calculation service timed out. Your free reading has not been consumed." },
        { status: 504 }
      );
    }

    // 5. Map Ascendant Sign to Document
    const normalizedSign =
      calculatedAscendant.trim().charAt(0).toUpperCase() +
      calculatedAscendant.trim().slice(1).toLowerCase();

    // Check DB table ascendant_readings first
    const { data: dbReading } = await supabaseAdmin
      .from("ascendant_readings")
      .select("*")
      .eq("sign", normalizedSign)
      .maybeSingle();

    const fallbackReading = ASCENDANT_READINGS[normalizedSign];
    if (!dbReading && !fallbackReading) {
      return NextResponse.json(
        { error: `Reading content for ${normalizedSign} Ascendant is currently unavailable.` },
        { status: 500 }
      );
    }

    const richReading = (dbReading?.content as typeof fallbackReading | null) || fallbackReading || ASCENDANT_READINGS[normalizedSign];
    const readingPayload = {
      sign: dbReading ? dbReading.sign : richReading.sign,
      sanskritName: richReading?.sanskritName || "",
      ruler: dbReading ? dbReading.ruler : richReading.ruler,
      element: dbReading ? dbReading.element : richReading.element,
      quality: dbReading ? dbReading.quality : richReading.quality,
      glyph: richReading?.glyph || "✦",
      iconPath: richReading?.iconPath || `/zodiac/${normalizedSign.toLowerCase()}.svg`,
      overview: dbReading ? dbReading.overview : richReading.overview,
      personalityTraits: dbReading
        ? dbReading.personality_traits
        : richReading.personalityTraits,
      lifePathGuidance: dbReading
        ? dbReading.life_path_guidance
        : richReading.lifePathGuidance,
      strengths: dbReading ? dbReading.strengths : richReading.strengths,
      growthAreas: dbReading ? dbReading.growth_areas : richReading.growthAreas,
      coreEnergy: richReading?.coreEnergy,
      careerSuccess: richReading?.careerSuccess,
      loveRelationships: richReading?.loveRelationships,
      moneySecurity: richReading?.moneySecurity,
      emotionalWorld: richReading?.emotionalWorld,
      hiddenPotential: richReading?.hiddenPotential,
      firstLayerBullets: richReading?.firstLayerBullets,
    };

    const readingJson = JSON.stringify(readingPayload);

    // 6. Record reading into free_readings (Upsert for admin testing, insert for clients)
    const claimData = {
      user_id: user.id,
      email: normalizedEmail,
      date_of_birth,
      time_of_birth,
      place_of_birth: place_of_birth.trim(),
      latitude,
      longitude,
      timezone,
      ascendant: normalizedSign,
      reading_content: readingJson,
      reading_source_id: dbReading?.id || null,
      status: "completed",
      updated_at: new Date().toISOString(),
    };

    let newClaim = null;
    let insertErr = null;

    if (isAdmin) {
      const { data: existingAdminRow } = await supabaseAdmin
        .from("free_readings")
        .select("id")
        .or(`email.eq.${normalizedEmail},user_id.eq.${user.id}`)
        .maybeSingle();

      if (existingAdminRow) {
        const res = await supabaseAdmin
          .from("free_readings")
          .update(claimData)
          .eq("id", existingAdminRow.id)
          .select()
          .single();
        newClaim = res.data;
        insertErr = res.error;
      } else {
        const res = await supabaseAdmin
          .from("free_readings")
          .insert(claimData)
          .select()
          .single();
        newClaim = res.data;
        insertErr = res.error;
      }
    } else {
      const res = await supabaseAdmin
        .from("free_readings")
        .insert(claimData)
        .select()
        .single();
      newClaim = res.data;
      insertErr = res.error;
    }

    if (insertErr) {
      // Uniqueness conflict handler (safe against concurrent requests for clients)
      if (insertErr.code === "23505" || insertErr.message.includes("unique")) {
        const { data: existing } = await supabaseAdmin
          .from("free_readings")
          .select("*")
          .or(`email.eq.${normalizedEmail},user_id.eq.${user.id}`)
          .maybeSingle();

        if (existing) {
          let content = null;
          try {
            content = JSON.parse(existing.reading_content);
          } catch {
            content = existing.reading_content;
          }
          return NextResponse.json({
            alreadyClaimed: true,
            isAdmin: false,
            message: "You have already used your free reading. You can revisit your previous reading below.",
            reading: {
              id: existing.id,
              ascendant: existing.ascendant,
              readingContent: content,
              dateOfBirth: existing.date_of_birth,
              timeOfBirth: existing.time_of_birth,
              placeOfBirth: existing.place_of_birth,
              createdAt: existing.created_at,
            },
          });
        }
      }

      console.error("Failed to save free reading record:", insertErr);
      return NextResponse.json(
        { error: "Could not save your reading record. Please retry." },
        { status: 500 }
      );
    }

    // 7. Update user's profile birth details if requested
    if (update_profile) {
      try {
        await supabaseAdmin
          .from("customer_profiles")
          .update({
            date_of_birth,
            time_of_birth,
            place_of_birth: place_of_birth.trim(),
            time_uncertain: false,
            updated_at: new Date().toISOString(),
          })
          .eq("auth_user_id", user.id);
      } catch (profileErr) {
        console.warn("Could not sync birth details to customer_profiles:", profileErr);
      }
    }

    // 8. Return completed reading
    return NextResponse.json({
      success: true,
      alreadyClaimed: false,
      isAdmin,
      reading: {
        id: newClaim.id,
        ascendant: newClaim.ascendant,
        readingContent: readingPayload,
        dateOfBirth: newClaim.date_of_birth,
        timeOfBirth: newClaim.time_of_birth,
        placeOfBirth: newClaim.place_of_birth,
        createdAt: newClaim.created_at,
      },
    });
  } catch (err: any) {
    console.error("POST /api/free-reading error:", err);
    return NextResponse.json(
      { error: err?.message || "An unexpected error occurred while processing your reading." },
      { status: 500 }
    );
  }
}
