import AdminTeamClient from "@/components/admin/AdminTeamClient";
import { normalizeAdminTeam } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

export default async function AdminTeamPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_list_team");

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-sky">
          Admin
        </p>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
          Team
        </h1>
        <p className="mt-2 text-sm text-body">
          Manage account managers and the customers they look after.
        </p>
      </div>

      <AdminTeamClient
        managers={normalizeAdminTeam(data)}
        loadError={error?.message ?? null}
      />
    </div>
  );
}
