import type { ReactNode } from "react";
import { notFound, redirect } from "next/navigation";
import ManageSidebar from "@/components/manage/ManageSidebar";
import { customerDisplayName } from "@/lib/admin";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

  if (!UUID_RE.test(customerId)) notFound();

  const supabase = await createClient();
  const { data: canManage, error: canManageError } = await supabase.rpc(
    "can_manage_customer",
    { cid: customerId },
  );

  if (canManageError) {
    return (
      <>
        <div className="lg:pl-64">
          <main className="relative min-h-[calc(100vh-4rem)] px-4 py-8 sm:px-6 lg:px-8">
            <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.06),transparent_45%)]" />
            <div className="relative mx-auto w-full max-w-7xl">
              <div className="rounded-2xl border border-red-400/20 bg-red-400/10 px-5 py-4 text-sm text-red-200">
                {canManageError.message}
              </div>
            </div>
          </main>
        </div>
      </>
    );
  }

  if (!canManage) {
    return (
      <>
        <div className="lg:pl-64">
          <main className="relative min-h-[calc(100vh-4rem)] px-4 py-8 sm:px-6 lg:px-8">
            <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.06),transparent_45%)]" />
            <div className="relative mx-auto w-full max-w-7xl space-y-4">
              <p className="text-sm text-body">You do not have access to this customer</p>
              <a
                href="/manage"
                className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:border-sky-400/30 hover:bg-white/10"
              >
                Back to Manage
              </a>
            </div>
          </main>
        </div>
      </>
    );
  }

  const { data: profileRow, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, company_name, role")
    .eq("id", customerId)
    .maybeSingle();

  if (profileError || !profileRow) notFound();

  const profile = profileRow as {
    id: string;
    full_name: string | null;
    company_name: string | null;
    role: string | null;
  };

  return (
    <>
      <ManageSidebar
        customerId={customerId}
        customer={{
          name: customerDisplayName({
            full_name: profile.full_name,
            company_name: profile.company_name,
            email: null,
            phone: null,
            customer_id: profile.id,
            manager_id: null,
            manager_name: null,
            total_screens: 0,
            online_screens: 0,
            media_count: 0,
            storage_bytes: 0,
            joined_at: null,
          }),
          company: profile.company_name,
        }}
      />

      <div className="lg:pl-64">
        <main className="relative min-h-[calc(100vh-4rem)] px-4 py-8 sm:px-6 lg:px-8">
          <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.06),transparent_45%)]" />
          <div className="relative mx-auto w-full max-w-7xl">
            {profile.role === "admin" ? (
              <div className="mb-4 inline-flex rounded-full border border-sky-400/30 bg-sky-400/10 px-3 py-1 text-xs font-semibold text-sky-200">
                Admin account (internal screens)
              </div>
            ) : null}
            {profile.role === "manager" ? (
              <div className="mb-4 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
                This is a manager account. New screens cannot be paired to it.
              </div>
            ) : null}
            {children}
          </div>
        </main>
      </div>
    </>
  );
}
