import AdminCustomersClient from "@/components/admin/AdminCustomersClient";
import {
  normalizeAdminCustomerStats,
  normalizeAdminTeam,
} from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ manager?: string | string[] }>;
}) {
  const params = await searchParams;
  const initialManagerId = Array.isArray(params.manager)
    ? (params.manager[0] ?? null)
    : (params.manager ?? null);
  const supabase = await createClient();

  const [statsResult, teamResult] = await Promise.all([
    supabase.rpc("admin_customer_stats"),
    supabase.rpc("admin_list_team"),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-sky">
          Admin
        </p>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
          Customers
        </h1>
        <p className="mt-2 text-sm text-body">
          Review customer accounts, managers, screens, media, and storage
          usage.
        </p>
      </div>

      <AdminCustomersClient
        key={initialManagerId ?? "all"}
        customers={normalizeAdminCustomerStats(statsResult.data)}
        managers={normalizeAdminTeam(teamResult.data)}
        initialManagerId={initialManagerId}
        loadError={statsResult.error?.message ?? null}
        managersError={teamResult.error?.message ?? null}
      />
    </div>
  );
}
