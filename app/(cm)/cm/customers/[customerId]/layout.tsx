import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import PanelPageHeader from "@/components/admin/PanelPageHeader";
import CmCustomerTabs from "@/components/cm/CmCustomerTabs";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/server";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function CmCustomerMessage({ title, message }: { title: string; message: string }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-lg p-8 text-center hover:border-white/10 hover:shadow-none">
        <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full border border-amber-400/20 bg-amber-400/10 text-amber-300">
          <ShieldAlert aria-hidden="true" className="h-5 w-5" />
        </span>
        <p className="mt-4 text-base font-semibold text-white">{title}</p>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-body">
          {message}
        </p>
        <Button asChild variant="secondary" size="sm" className="mt-6">
          <Link href="/cm/customers">
            <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" />
            Back to customers
          </Link>
        </Button>
      </Card>
    </div>
  );
}

export default async function CmCustomerLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ customerId: string }>;
}) {
  const { customerId } = await params;

  if (!UUID_RE.test(customerId)) {
    notFound();
  }

  const supabase = await createClient();
  const { data: canManage, error: canManageError } = await supabase.rpc(
    "can_manage_customer",
    { cid: customerId },
  );

  if (canManageError) {
    return (
      <CmCustomerMessage
        title="We couldn't check access"
        message={canManageError.message}
      />
    );
  }

  if (!canManage) {
    return (
      <CmCustomerMessage
        title="Customer unavailable"
        message="You do not have access to this customer."
      />
    );
  }

  const { data: profileRow, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, company_name, role")
    .eq("id", customerId)
    .maybeSingle();

  if (profileError) {
    return (
      <CmCustomerMessage
        title="We couldn't load this customer"
        message={profileError.message}
      />
    );
  }

  if (!profileRow) {
    notFound();
  }

  const roleLabel = profileRow.role
    ? profileRow.role.replace(/_/g, " ")
    : "Customer account";
  const title =
    profileRow.full_name || profileRow.company_name || "Customer";
  const description = profileRow.company_name ?? `Account role: ${roleLabel}`;

  return (
    <div className="space-y-6">
      <PanelPageHeader
        eyebrow="Customer"
        title={title}
        description={description}
        actions={
          <Link
            href="/cm/customers"
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-semibold text-white/70 transition duration-200 hover:border-white/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60"
          >
            <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" />
            All customers
          </Link>
        }
      />

      <CmCustomerTabs customerId={customerId} />

      <div>{children}</div>
    </div>
  );
}
