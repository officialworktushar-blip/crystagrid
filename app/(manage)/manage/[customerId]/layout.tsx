import type { ReactNode } from "react";
import { notFound, redirect } from "next/navigation";
import ManageSidebar from "@/components/manage/ManageSidebar";
import {
  customerDisplayName,
  normalizeAdminCustomerStats,
} from "@/lib/admin";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function ManageCustomerLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ customerId: string }>;
}) {
  const { customerId } = await params;
  const session = await getSessionProfile();

  if (!session) {
    redirect("/login");
  }

  if (!session.profile || session.profile.role === "customer") {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const { data: canManage, error: canManageError } = await supabase.rpc(
    "can_manage_customer",
    { cid: customerId },
  );

  if (canManageError || !canManage) {
    notFound();
  }

  const { data: statsData, error: statsError } = await supabase.rpc(
    "admin_customer_stats",
  );

  if (statsError) {
    notFound();
  }

  const customer = normalizeAdminCustomerStats(statsData).find(
    (item) => item.customer_id === customerId,
  );

  if (!customer) {
    notFound();
  }

  return (
    <>
      <ManageSidebar
        customerId={customerId}
        customer={{
          name: customerDisplayName(customer),
          company: customer.company_name,
        }}
      />

      <div className="lg:pl-64">
        <main className="relative min-h-[calc(100vh-4rem)] px-4 py-8 sm:px-6 lg:px-8">
          <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.06),transparent_45%)]" />
          <div className="relative mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </>
  );
}
