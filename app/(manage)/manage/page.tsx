import { redirect } from "next/navigation";
import ManageCustomersClient from "@/components/manage/ManageCustomersClient";
import { normalizeAdminCustomerStats } from "@/lib/admin";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function ManageCustomersPage() {
  const session = await getSessionProfile();

  if (!session) {
    redirect("/login");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_customer_stats");
  const customers = normalizeAdminCustomerStats(data);
  const isAdmin = session.profile?.role === "admin";

  return (
    <div className="relative min-h-[calc(100vh-4rem)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.06),transparent_45%)]" />
      <div className="relative mx-auto w-full max-w-7xl space-y-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-sky">
            Manage
          </p>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            Customers
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-body">
            Select a customer to manage their screens, media, and playlists.
          </p>
        </div>

        <ManageCustomersClient
          customers={customers}
          isAdmin={isAdmin}
          currentUserId={session.user.id}
          loadError={error?.message ?? null}
        />
      </div>
    </div>
  );
}
