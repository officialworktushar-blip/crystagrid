import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export async function getSessionProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profileData } = await supabase
    .from("profiles")
    .select("id, full_name, role, company_name, phone")
    .eq("id", user.id)
    .maybeSingle();

  return {
    user,
    profile: (profileData ?? null) as Profile | null,
  };
}
