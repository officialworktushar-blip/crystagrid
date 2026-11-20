import type { Metadata } from "next";
import type { ReactNode } from "react";
import PanelShell from "@/components/panels/PanelShell";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Sales Manager - Crystagrid",
};

export default async function SalesLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { user, profile } = await requireRole(["sales_manager", "admin"]);

  return (
    <PanelShell
      title="Sales Manager"
      role={profile?.role ?? "sales_manager"}
      userName={profile?.full_name ?? user.email ?? "Staff"}
      nav={[
        { href: "/sales", label: "Overview", icon: "overview" },
        { href: "/sales/places", label: "Places", icon: "places" },
        { href: "/sales/properties", label: "Properties", icon: "properties" },
        { href: "/sales/packages", label: "Packages", icon: "packages" },
        { href: "/sales/pricing", label: "Pricing & Promo", icon: "pricing" },
        { href: "/sales/bookings", label: "Bookings", icon: "bookings" },
        { href: "/sales/leads", label: "Leads", icon: "leads" },
        { href: "/sales/screens", label: "Screens", icon: "screens" },
        { href: "/sales/house", label: "Company content", icon: "house" },
      ]}
    >
      {children}
    </PanelShell>
  );
}
