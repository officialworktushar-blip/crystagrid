import type { Metadata } from "next";
import type { ReactNode } from "react";
import PanelShell from "@/components/panels/PanelShell";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Customer Manager · Crystagrid",
};

export default async function CustomerManagerLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { user, profile } = await requireRole(["manager", "admin"]);

  return (
    <PanelShell
      title="Customer Manager"
      role={profile?.role ?? "manager"}
      userName={profile?.full_name ?? user.email ?? "Staff"}
      nav={[
        { href: "/cm", label: "Overview", icon: "overview" },
        { href: "/cm/customers", label: "Customers", icon: "customers" },
        { href: "/cm/bookings", label: "Bookings", icon: "bookings" },
        { href: "/cm/screens", label: "Screens", icon: "screens" },
      ]}
    >
      {children}
    </PanelShell>
  );
}
