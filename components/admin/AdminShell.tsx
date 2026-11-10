"use client";

import { useCallback, useState, type ReactNode } from "react";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminTopbar from "@/components/admin/AdminTopbar";

type AdminUser = {
  name: string;
  company: string | null;
  email: string;
};

export default function AdminShell({
  user,
  children,
}: {
  user: AdminUser;
  children: ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const openSidebar = useCallback(() => setSidebarOpen(true), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  return (
    <div className="min-h-screen bg-background text-white">
      <AdminSidebar open={sidebarOpen} onClose={closeSidebar} />

      <div className="lg:pl-64">
        <AdminTopbar user={user} onOpenSidebar={openSidebar} />

        <main className="relative min-h-[calc(100vh-4rem)] px-4 py-8 sm:px-6 lg:px-8">
          <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.06),transparent_45%)]" />
          <div className="relative mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
