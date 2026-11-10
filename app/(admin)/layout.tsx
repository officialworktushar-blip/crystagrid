import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import type { Profile } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";

export default async function AdminLayout({
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

  if (!profile || profile.role !== "admin") {
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
  const name = profile.full_name ?? metadataName ?? "Admin";
  const company = profile.company_name ?? metadataCompany;

  return (
    <AdminShell user={{ name, company, email: user.email ?? "" }}>
      {children}
    </AdminShell>
  );
}
