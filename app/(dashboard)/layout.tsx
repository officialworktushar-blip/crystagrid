import type { ReactNode } from "react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { requireRole } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { user, profile } = await requireRole(["customer"]);

  const metadataName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : null;
  const metadataCompany =
    typeof user.user_metadata?.company_name === "string"
      ? user.user_metadata.company_name
      : null;
  const name = profile?.full_name ?? metadataName ?? "Your account";
  const company = profile?.company_name ?? metadataCompany;

  return (
    <DashboardShell
      user={{
        name,
        company,
        email: user.email ?? "",
        role: profile?.role ?? "customer",
      }}
    >
      {children}
    </DashboardShell>
  );
}
