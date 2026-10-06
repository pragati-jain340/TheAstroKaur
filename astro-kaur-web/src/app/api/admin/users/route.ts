import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase Admin client with Service Role Key for privileged server-side management
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://qdnwmfriilknnwqrepuy.supabase.co",
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

/**
 * Helper to count remaining active administrators
 */
async function countActiveAdmins(): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from("customer_profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin")
    .eq("account_status", "active");

  if (error) {
    console.error("Error counting active admins:", error);
    return 1; // conservative fallback
  }
  return count || 0;
}

/**
 * GET /api/admin/users
 * Lists all user profiles along with reading counts
 */
export async function GET(req: NextRequest) {
  try {
    const { data: profiles, error: profileErr } = await supabaseAdmin
      .from("customer_profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (profileErr) {
      return NextResponse.json({ error: profileErr.message }, { status: 500 });
    }

    // Fetch order counts grouped by auth_user_id
    const { data: orders } = await supabaseAdmin
      .from("orders")
      .select("auth_user_id, price_eur, payment_status");

    const readingCountMap: Record<string, number> = {};
    const totalSpentMap: Record<string, number> = {};

    (orders || []).forEach((o) => {
      if (o.auth_user_id) {
        readingCountMap[o.auth_user_id] = (readingCountMap[o.auth_user_id] || 0) + 1;
        if (o.payment_status === "paid") {
          totalSpentMap[o.auth_user_id] = (totalSpentMap[o.auth_user_id] || 0) + Number(o.price_eur || 0);
        }
      }
    });

    const enriched = (profiles || []).map((p) => ({
      ...p,
      readings_count: readingCountMap[p.auth_user_id] || 0,
      total_spent: totalSpentMap[p.auth_user_id] || 0,
    }));

    return NextResponse.json({ users: enriched });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch users." }, { status: 500 });
  }
}

/**
 * POST /api/admin/users
 * Securely creates a new user in auth.users and customer_profiles
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      email,
      password,
      displayName,
      role = "customer",
      accountStatus = "active",
      dateOfBirth,
      timeOfBirth,
      placeOfBirth,
      timeUncertain = false,
      partnerName,
      partnerDateOfBirth,
      partnerTimeOfBirth,
      partnerTimeUncertain,
      partnerPlaceOfBirth,
      avatarSeed,
    } = body;

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "A valid email address is required." }, { status: 400 });
    }

    const assignedPassword = password && password.length >= 6
      ? password
      : Math.random().toString(36).slice(-8) + "Aa1!";

    // 1. Create auth user with auto-confirmed email
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password: assignedPassword,
      email_confirm: true,
      user_metadata: {
        display_name: displayName || email.split("@")[0],
      },
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    const userId = authUser.user.id;

    // 2. Insert or update customer_profiles
    const profilePayload = {
      auth_user_id: userId,
      email: email.trim().toLowerCase(),
      display_name: displayName ? displayName.trim() : email.split("@")[0],
      role: role === "admin" ? "admin" : "customer",
      account_status: ["active", "suspended", "deactivated"].includes(accountStatus)
        ? accountStatus
        : "active",
      date_of_birth: dateOfBirth || null,
      time_of_birth: timeUncertain ? null : timeOfBirth || null,
      place_of_birth: placeOfBirth ? placeOfBirth.trim() : null,
      time_uncertain: !!timeUncertain,
      partner_name: partnerName ? partnerName.trim() : null,
      partner_date_of_birth: partnerDateOfBirth || null,
      partner_time_of_birth: partnerTimeUncertain ? null : partnerTimeOfBirth || null,
      partner_time_uncertain: !!partnerTimeUncertain,
      partner_place_of_birth: partnerPlaceOfBirth ? partnerPlaceOfBirth.trim() : null,
      avatar_seed: avatarSeed || "star",
    };

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("customer_profiles")
      .upsert(profilePayload, { onConflict: "auth_user_id" })
      .select()
      .single();

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    return NextResponse.json(
      {
        user: profile,
        temporaryPassword: password ? undefined : assignedPassword,
      },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create user." }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/users
 * Updates user profile, role, and account status with Last Admin Protection
 */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      id,
      auth_user_id,
      email,
      displayName,
      role,
      accountStatus,
      dateOfBirth,
      timeOfBirth,
      placeOfBirth,
      timeUncertain,
      partnerName,
      partnerDateOfBirth,
      partnerTimeOfBirth,
      partnerTimeUncertain,
      partnerPlaceOfBirth,
      avatarSeed,
    } = body;

    if (!id && !auth_user_id) {
      return NextResponse.json({ error: "User ID is required." }, { status: 400 });
    }

    // 1. Fetch current profile to check existing role/status
    let queryCurrent = supabaseAdmin.from("customer_profiles").select("*");
    if (id) queryCurrent = queryCurrent.eq("id", id);
    else queryCurrent = queryCurrent.eq("auth_user_id", auth_user_id);

    const { data: existingProfile, error: fetchErr } = await queryCurrent.single();
    if (fetchErr || !existingProfile) {
      return NextResponse.json({ error: "User profile not found." }, { status: 404 });
    }

    const currentAuthId = existingProfile.auth_user_id;

    // 2. LAST ADMIN PROTECTION ENFORCEMENT
    // If the target is currently an admin, and is being demoted to customer OR deactivated/suspended:
    const isDemoting = role !== undefined && role !== "admin" && existingProfile.role === "admin";
    const isDeactivating =
      accountStatus !== undefined &&
      accountStatus !== "active" &&
      existingProfile.role === "admin" &&
      existingProfile.account_status === "active";

    if (isDemoting || isDeactivating) {
      const activeAdminsCount = await countActiveAdmins();
      if (activeAdminsCount <= 1) {
        return NextResponse.json(
          {
            error:
              "Operation blocked: This is the only active administrator in the system. You cannot demote or deactivate the last remaining administrator.",
          },
          { status: 403 }
        );
      }
    }

    // 3. If email changed, synchronize Supabase auth.users
    if (email && email.trim().toLowerCase() !== existingProfile.email.toLowerCase()) {
      const newEmail = email.trim().toLowerCase();
      const { error: authEmailErr } = await supabaseAdmin.auth.admin.updateUserById(currentAuthId, {
        email: newEmail,
        email_confirm: true,
      });

      if (authEmailErr) {
        return NextResponse.json(
          { error: `Failed to update login email: ${authEmailErr.message}` },
          { status: 400 }
        );
      }
    }

    // 4. Update customer_profiles
    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (email !== undefined) updates.email = email.trim().toLowerCase();
    if (displayName !== undefined) updates.display_name = displayName ? displayName.trim() : null;
    if (role !== undefined) updates.role = role === "admin" ? "admin" : "customer";
    if (accountStatus !== undefined && ["active", "suspended", "deactivated"].includes(accountStatus)) {
      updates.account_status = accountStatus;
    }
    if (dateOfBirth !== undefined) updates.date_of_birth = dateOfBirth || null;
    if (timeOfBirth !== undefined) updates.time_of_birth = timeUncertain ? null : timeOfBirth || null;
    if (placeOfBirth !== undefined) updates.place_of_birth = placeOfBirth ? placeOfBirth.trim() : null;
    if (timeUncertain !== undefined) updates.time_uncertain = !!timeUncertain;

    if (partnerName !== undefined) updates.partner_name = partnerName ? partnerName.trim() : null;
    if (partnerDateOfBirth !== undefined) updates.partner_date_of_birth = partnerDateOfBirth || null;
    if (partnerTimeOfBirth !== undefined) updates.partner_time_of_birth = partnerTimeUncertain ? null : partnerTimeOfBirth || null;
    if (partnerTimeUncertain !== undefined) updates.partner_time_uncertain = !!partnerTimeUncertain;
    if (partnerPlaceOfBirth !== undefined) updates.partner_place_of_birth = partnerPlaceOfBirth ? partnerPlaceOfBirth.trim() : null;

    if (avatarSeed !== undefined) updates.avatar_seed = avatarSeed;

    const { data: updatedProfile, error: updateErr } = await supabaseAdmin
      .from("customer_profiles")
      .update(updates)
      .eq("id", existingProfile.id)
      .select()
      .single();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({ user: updatedProfile });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update user." }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/users
 * Removes a user with Last Admin Protection
 */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId"); // auth_user_id or profile id

    if (!userId) {
      return NextResponse.json({ error: "User ID is required." }, { status: 400 });
    }

    // Find profile
    let query = supabaseAdmin.from("customer_profiles").select("*");
    if (userId.includes("-") && userId.length === 36) {
      query = query.or(`id.eq.${userId},auth_user_id.eq.${userId}`);
    } else {
      query = query.eq("id", userId);
    }

    const { data: profile } = await query.maybeSingle();

    if (profile) {
      // Check last admin protection
      if (profile.role === "admin") {
        const activeAdmins = await countActiveAdmins();
        if (activeAdmins <= 1) {
          return NextResponse.json(
            { error: "Action blocked: Cannot delete the last active administrator." },
            { status: 403 }
          );
        }
      }

      // Delete from auth.users (if exists)
      if (profile.auth_user_id) {
        await supabaseAdmin.auth.admin.deleteUser(profile.auth_user_id);
      }

      // Remove from customer_profiles
      await supabaseAdmin.from("customer_profiles").delete().eq("id", profile.id);
    }

    return NextResponse.json({ success: true, deletedId: userId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to delete user." }, { status: 500 });
  }
}
