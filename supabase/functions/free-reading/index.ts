import { withSupabase } from "npm:@supabase/server";

interface BirthDetailsPayload {
  date_of_birth: string; // YYYY-MM-DD
  time_of_birth: string; // HH:MM or HH:MM:SS
  place_of_birth: string;
  latitude: number;
  longitude: number;
  timezone: number; // e.g. 5.5, 1.0, -5.0
  update_profile?: boolean;
}

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    // Only allow POST
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 1. Verify authenticated user identity and verified email
    const userId = ctx.userClaims?.sub;
    const rawEmail = ctx.userClaims?.email;

    if (!userId || !rawEmail) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Missing verified user session" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const normalizedEmail = rawEmail.trim().toLowerCase();

    // Check if user is an admin
    const { data: userProfile } = await ctx.supabaseAdmin
      .from("customer_profiles")
      .select("role")
      .eq("auth_user_id", userId)
      .maybeSingle();

    const isAdmin = userProfile?.role === "admin";

    // 2. Check server-side eligibility (Clients only; Admins bypass for unlimited testing)
    if (!isAdmin) {
      const { data: existingClaim, error: claimLookupError } = await ctx.supabaseAdmin
        .from("free_readings")
        .select("*")
        .or(`email.eq.${normalizedEmail},user_id.eq.${userId}`)
        .eq("status", "completed")
        .maybeSingle();

      if (claimLookupError) {
        console.error("Database claim lookup error:", claimLookupError.message);
      }

      if (existingClaim) {
        // Revisit previous reading without invoking API or creating duplicate
        return new Response(
          JSON.stringify({
            alreadyClaimed: true,
            isAdmin: false,
            message: "You have already claimed your free reading. Your saved reading is shown below.",
            reading: {
              id: existingClaim.id,
              ascendant: existingClaim.ascendant,
              readingContent: existingClaim.reading_content,
              readingSourceId: existingClaim.reading_source_id,
              dateOfBirth: existingClaim.date_of_birth,
              timeOfBirth: existingClaim.time_of_birth,
              placeOfBirth: existingClaim.place_of_birth,
              createdAt: existingClaim.created_at,
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    // 3. Parse and validate input payload
    let body: BirthDetailsPayload;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON payload" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

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
      return new Response(
        JSON.stringify({ error: "Date of birth, time of birth, and birthplace are required." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Validate date of birth (must not be in the future)
    const birthDate = new Date(date_of_birth);
    if (isNaN(birthDate.getTime()) || birthDate > new Date()) {
      return new Response(
        JSON.stringify({ error: "Please provide a valid past date of birth." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Validate coordinates and timezone
    if (
      typeof latitude !== "number" ||
      typeof longitude !== "number" ||
      typeof timezone !== "number" ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180 ||
      timezone < -14 ||
      timezone > 14
    ) {
      return new Response(
        JSON.stringify({ error: "Invalid geographic coordinates or birth-location timezone." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Parse time components
    const timeParts = time_of_birth.split(":");
    const hours = parseInt(timeParts[0], 10);
    const minutes = parseInt(timeParts[1] || "0", 10);

    if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      return new Response(
        JSON.stringify({ error: "Please provide a valid birth time (HH:MM)." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Read server-side NAVAMSHA_API_KEY
    // @ts-ignore Deno env access
    const navamshaKey = Deno.env.get("NAVAMSHA_API_KEY");
    if (!navamshaKey) {
      console.error("Missing NAVAMSHA_API_KEY environment variable");
      return new Response(
        JSON.stringify({ error: "Astrology calculation service is temporarily unconfigured. Please contact support." }),
        { status: 503, headers: { "Content-Type": "application/json" } }
      );
    }

    // 5. Call Navamsha Kundali Basic API
    const [year, month, day] = date_of_birth.split("-").map((v) => parseInt(v, 10));

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
        console.error(`Navamsha API failed (${navamshaRes.status}):`, errorText);
        return new Response(
          JSON.stringify({ error: "Unable to calculate birth chart at this time. Please check your birth details and try again." }),
          { status: 502, headers: { "Content-Type": "application/json" } }
        );
      }

      const navamshaData = await navamshaRes.json();
      calculatedAscendant = navamshaData?.output?.ascendant?.zodiac_sign_name;

      if (!calculatedAscendant) {
        console.error("Unexpected Navamsha response format without ascendant sign");
        return new Response(
          JSON.stringify({ error: "Astrology calculation did not return a valid Ascendant sign. Please retry." }),
          { status: 502, headers: { "Content-Type": "application/json" } }
        );
      }
    } catch (err: any) {
      console.error("Error communicating with Navamsha API:", err?.message || err);
      return new Response(
        JSON.stringify({ error: "Astrology calculation request timed out or failed. Your free reading has not been consumed." }),
        { status: 504, headers: { "Content-Type": "application/json" } }
      );
    }

    // 6. Map Ascendant Sign to the correct Reading Content
    // Normalize sign name (capitalize first letter, lowercase rest)
    const normalizedSign =
      calculatedAscendant.trim().charAt(0).toUpperCase() +
      calculatedAscendant.trim().slice(1).toLowerCase();

    const { data: readingDoc, error: readingDocErr } = await ctx.supabaseAdmin
      .from("ascendant_readings")
      .select("*")
      .eq("sign", normalizedSign)
      .maybeSingle();

    if (readingDocErr || !readingDoc) {
      console.error(`Missing reading document for sign "${normalizedSign}":`, readingDocErr?.message);
      return new Response(
        JSON.stringify({
          error: `Reading content for ${normalizedSign} Ascendant is temporarily unavailable. Your free reading has not been consumed.`,
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // 7. Save Claim and Enforce One-Time Unique Claim Atomically
    const readingSnapshot = JSON.stringify({
      sign: readingDoc.sign,
      ruler: readingDoc.ruler,
      element: readingDoc.element,
      quality: readingDoc.quality,
      overview: readingDoc.overview,
      personalityTraits: readingDoc.personality_traits,
      lifePathGuidance: readingDoc.life_path_guidance,
      strengths: readingDoc.strengths,
      growthAreas: readingDoc.growth_areas,
    });

    const newClaimRecord = {
      user_id: userId,
      email: normalizedEmail,
      date_of_birth,
      time_of_birth,
      place_of_birth: place_of_birth.trim(),
      latitude,
      longitude,
      timezone,
      ascendant: normalizedSign,
      reading_content: readingSnapshot,
      reading_source_id: readingDoc.id,
      status: "completed",
    };

    let insertedClaim = null;
    let insertError = null;

    if (isAdmin) {
      const res = await ctx.supabaseAdmin
        .from("free_readings")
        .upsert(newClaimRecord, { onConflict: "user_id" })
        .select()
        .single();
      insertedClaim = res.data;
      insertError = res.error;
    } else {
      const res = await ctx.supabaseAdmin
        .from("free_readings")
        .insert(newClaimRecord)
        .select()
        .single();
      insertedClaim = res.data;
      insertError = res.error;
    }

    if (insertError) {
      // Check for uniqueness constraint violation (concurrent or duplicate request)
      if (insertError.code === "23505" || insertError.message.includes("unique")) {
        const { data: duplicateResult } = await ctx.supabaseAdmin
          .from("free_readings")
          .select("*")
          .or(`email.eq.${normalizedEmail},user_id.eq.${userId}`)
          .maybeSingle();

        if (duplicateResult) {
          return new Response(
            JSON.stringify({
              alreadyClaimed: true,
              message: "You have already claimed your free reading. Your saved reading is shown below.",
              reading: {
                id: duplicateResult.id,
                ascendant: duplicateResult.ascendant,
                readingContent: duplicateResult.reading_content,
                readingSourceId: duplicateResult.reading_source_id,
                dateOfBirth: duplicateResult.date_of_birth,
                timeOfBirth: duplicateResult.time_of_birth,
                placeOfBirth: duplicateResult.place_of_birth,
                createdAt: duplicateResult.created_at,
              },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }
      }

      console.error("Failed to insert free reading record:", insertError.message);
      return new Response(
        JSON.stringify({ error: "Failed to securely save your reading. Please try again." }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // 8. Update customer profile birth details if requested
    if (update_profile) {
      try {
        await ctx.supabaseAdmin
          .from("customer_profiles")
          .update({
            date_of_birth,
            time_of_birth,
            place_of_birth: place_of_birth.trim(),
            time_uncertain: false,
            updated_at: new Date().toISOString(),
          })
          .eq("auth_user_id", userId);
      } catch (profileUpdateErr) {
        console.warn("Non-fatal: could not update customer profile birth details:", profileUpdateErr);
      }
    }

    // 9. Return the complete reading result
    return new Response(
      JSON.stringify({
        success: true,
        alreadyClaimed: false,
        reading: {
          id: insertedClaim.id,
          ascendant: insertedClaim.ascendant,
          readingContent: insertedClaim.reading_content,
          readingSourceId: insertedClaim.reading_source_id,
          dateOfBirth: insertedClaim.date_of_birth,
          timeOfBirth: insertedClaim.time_of_birth,
          placeOfBirth: insertedClaim.place_of_birth,
          createdAt: insertedClaim.created_at,
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }),
};
