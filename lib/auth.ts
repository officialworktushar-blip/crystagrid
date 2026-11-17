import { redirect } from "next/navigation";
import { homeForRole, type Role } from "@/lib/roles";
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

export async function requireRole(allowed: Role[]) {
  const session = await getSessionProfile();

  if (!session) {
    redirect("/login");
  }

  const role: Role = session.profile?.role ?? "customer";

  if (!allowed.includes(role)) {
    redirect(homeForRole(role));
  }

  return { user: session.user, profile: session.profile };
}
