import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import DashboardShell from "@/components/dashboard/DashboardShell";
import type { Profile } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profileData } = await supabase
    .from("profiles")
    .select("id, full_name, role, company_name, phone")
    .eq("id", user.id)
    .maybeSingle();

  const profile = (profileData ?? null) as Profile | null;
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
      user={{ name, company, email: user.email ?? "" }}
    >
      {children}
    </DashboardShell>
  );
}
