import AdminScreensClient from "@/components/admin/AdminScreensClient";
import type { AdminScreenRow } from "@/lib/admin";
import {
  formatRelativeTime,
  getScreenStatus,
} from "@/lib/screens";
import { createClient } from "@/lib/supabase/server";
import type { Screen } from "@/lib/types";

type ProfileRelation = {
  full_name: string | null;
  company_name: string | null;
};

type RawAdminScreen = Screen & {
  profiles?: ProfileRelation | ProfileRelation[] | null;
};

export default async function AdminScreensPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("screens")
    .select("*, profiles(full_name, company_name)")
    .order("last_seen", { ascending: false, nullsFirst: false });

  const now = Date.now();
  const screens: AdminScreenRow[] = (
    (data ?? []) as unknown as RawAdminScreen[]
  ).map((screen) => {
    const profile = Array.isArray(screen.profiles)
      ? screen.profiles[0]
      : screen.profiles;
    const fullName = profile?.full_name?.trim() || null;
    const companyName = profile?.company_name?.trim() || null;

    return {
      id: screen.id,
      name: screen.name,
      owner_name: fullName ?? companyName ?? "Unknown customer",
      owner_company: fullName ? companyName : null,
      last_seen: screen.last_seen,
      last_seen_label: formatRelativeTime(screen.last_seen, now),
      created_at: screen.created_at,
      display_status: getScreenStatus(screen.status, screen.last_seen, now),
    };
  });

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-sky">
          Admin
        </p>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
          Screens
        </h1>
        <p className="mt-2 text-sm text-body">
          Review every screen across customer accounts.
        </p>
      </div>

      <AdminScreensClient
        screens={screens}
        loadError={error?.message ?? null}
      />
    </div>
  );
}
