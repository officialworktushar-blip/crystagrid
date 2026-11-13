import type { SupabaseClient } from "@supabase/supabase-js";
import { isOnline } from "@/lib/screens";
import type { DashboardStats, Profile, Screen } from "@/lib/types";

export async function getProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, role, company_name, phone")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as Profile;
}

export async function getScreens(
  supabase: SupabaseClient,
  customerId: string,
): Promise<Screen[]> {
  const { data, error } = await supabase
    .from("screens")
    .select("id, customer_id, name, status, location, last_seen, created_at")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data as Screen[];
}

export async function getDashboardStats(
  supabase: SupabaseClient,
  customerId: string,
): Promise<DashboardStats> {
  const [screens, onlineScreens, media, playlists] = await Promise.all([
    supabase
      .from("screens")
      .select("id", { count: "exact", head: true })
      .eq("customer_id", customerId),
    supabase
      .from("screens")
      .select("last_seen")
      .eq("customer_id", customerId),
    supabase
      .from("media")
      .select("id", { count: "exact", head: true })
      .eq("customer_id", customerId),
    supabase
      .from("playlists")
      .select("id", { count: "exact", head: true })
      .eq("customer_id", customerId),
  ]);

  return {
    totalScreens: screens.count ?? 0,
    onlineScreens: (
      (onlineScreens.data ?? []) as { last_seen: string | null }[]
    ).filter((screen) => isOnline(screen.last_seen)).length,
    mediaFiles: media.count ?? 0,
    playlists: playlists.count ?? 0,
  };
}
