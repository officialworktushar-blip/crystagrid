import type { Metadata } from "next";
import type { ReactNode } from "react";
import { LayoutDashboard, Monitor } from "lucide-react";
import PanelShell from "@/components/panels/PanelShell";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Device Manager · Crystagrid",
};

export default async function DeviceLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { user, profile } = await requireRole(["device_manager", "admin"]);

  return (
    <PanelShell
      title="Device Manager"
      role={profile?.role ?? "device_manager"}
      userName={profile?.full_name ?? user.email ?? "Staff"}
      nav={[
        { href: "/device", label: "Overview", icon: LayoutDashboard },
        { href: "/device/screens", label: "Screens", icon: Monitor },
      ]}
    >
      {children}
    </PanelShell>
  );
}
