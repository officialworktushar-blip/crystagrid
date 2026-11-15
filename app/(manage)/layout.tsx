import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";
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
  const isAdmin = profile.role === "admin";

  return (
    <ManageShell
      user={{ name, company, email: user.email ?? "" }}
      role={isAdmin ? "admin" : "manager"}
    >
      {isAdmin ? (
        <div className="border-b border-sky-400/15 bg-sky-400/[0.04]">
          <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-end gap-3 px-4 py-2 sm:px-6 lg:px-8">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1 text-xs font-semibold text-sky-200">
              <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5" />
              Admin mode
            </span>
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-semibold text-white/60 transition duration-200 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60"
            >
              <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" />
              Back to admin
            </Link>
          </div>
        </div>
      ) : null}
      {children}
    </ManageShell>
  );
}
