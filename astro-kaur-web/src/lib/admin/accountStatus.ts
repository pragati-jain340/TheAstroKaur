import type { SupabaseClient } from "@supabase/supabase-js";

export type AccountStatus = "active" | "suspended" | "deactivated";
type Target = { id: string; auth_user_id: string; role: string; account_status: AccountStatus };

export class AccountStatusError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export async function changeAccountStatus(db: SupabaseClient, target: Target, status: unknown, actorId: string) {
  if (status !== "active" && status !== "suspended" && status !== "deactivated") {
    throw new AccountStatusError("Choose a valid account status.");
  }
  if (actorId === target.auth_user_id && status !== "active") {
    throw new AccountStatusError("You cannot deactivate your own administrator account.", 403);
  }
  if (target.role === "admin" && target.account_status === "active" && status !== "active") {
    const { count, error } = await db.from("customer_profiles").select("id", { count: "exact", head: true })
      .eq("role", "admin").eq("account_status", "active");
    if (error) throw new AccountStatusError("Could not verify active administrators. Please retry.", 503);
    if ((count ?? 0) <= 1) throw new AccountStatusError("The last active administrator cannot be deactivated.", 403);
  }

  const ban = (value: AccountStatus) => value === "active" ? "none" : "876000h";
  const { error: authError } = await db.auth.admin.updateUserById(target.auth_user_id, { ban_duration: ban(status) });
  if (authError) throw new AccountStatusError("Could not change sign-in access. No profile changes were saved. Please retry.", 503);

  try {
    const { data, error } = await db.from("customer_profiles")
      .update({ account_status: status, updated_at: new Date().toISOString() })
      .eq("id", target.id).select().single();
    if (error || !data) throw new Error("Profile update failed");
    return data;
  } catch {
    const { error: rollbackError } = await db.auth.admin.updateUserById(target.auth_user_id, { ban_duration: ban(target.account_status) });
    if (rollbackError) {
      console.error("Account status rollback failed", { authUserId: target.auth_user_id });
      throw new AccountStatusError("Sign-in access changed, but the profile could not be saved. Refresh the user and retry this action.", 503);
    }
    throw new AccountStatusError("Could not save the account status. The previous sign-in access was restored. Please retry.", 503);
  }
}
