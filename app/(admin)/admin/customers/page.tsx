import AdminCustomersClient from "@/components/admin/AdminCustomersClient";
import { normalizeAdminCustomerStats } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

export default async function AdminCustomersPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_customer_stats");
  const customers = normalizeAdminCustomerStats(data);

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
          Review customer accounts, screens, media, and storage usage.
        </p>
      </div>

      <AdminCustomersClient
        customers={customers}
        loadError={error?.message ?? null}
      />
    </div>
  );
}
