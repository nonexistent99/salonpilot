import { createClient } from "@/lib/supabase/server";

/**
 * Validates the current user is an admin.
 * Returns the db client + user on success, or an error object.
 */
export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized", status: 401 as const, supabase: null, user: null };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return { error: "Forbidden", status: 403 as const, supabase: null, user: null };
  }

  return { error: null, status: 200 as const, supabase, user };
}
