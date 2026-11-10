"use client";

import { useCallback, useState, type ReactNode } from "react";
import Sidebar from "@/components/dashboard/Sidebar";
import Topbar from "@/components/dashboard/Topbar";
import type { UserRole } from "@/lib/types";

type DashboardUser = {
  name: string;
  company: string | null;
  email: string;
  role: UserRole;
};

export default function DashboardShell({
  user,
  children,
}: {
  user: DashboardUser;
  children: ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const openSidebar = useCallback(() => setSidebarOpen(true), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  return (
    <div className="min-h-screen bg-background text-white">
      <Sidebar
        open={sidebarOpen}
        onClose={closeSidebar}
        role={user.role}
      />

      <div className="lg:pl-64">
        <Topbar user={user} onOpenSidebar={openSidebar} />

        <main className="relative min-h-[calc(100vh-4rem)] px-4 py-8 sm:px-6 lg:px-8">
          <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.06),transparent_45%)]" />
          <div className="relative mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
