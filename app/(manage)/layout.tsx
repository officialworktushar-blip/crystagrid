import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import ManageShell from "@/components/manage/ManageShell";
import { getSessionProfile } from "@/lib/auth";

export default async function ManageLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getSessionProfile();

  if (!session) {
    redirect("/login");
  }

  const { user, profile } = session;

  if (!profile || profile.role === "customer") {
    redirect("/dashboard");
  }

  const metadataName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : null;
  const metadataCompany =
    typeof user.user_metadata?.company_name === "string"
      ? user.user_metadata.company_name
      : null;
  const name = profile.full_name ?? metadataName ?? "Your account";
  const company = profile.company_name ?? metadataCompany;

  return (
    <ManageShell
      user={{ name, company, email: user.email ?? "" }}
      role={profile.role === "admin" ? "admin" : "manager"}
    >
      {children}
    </ManageShell>
  );
}
