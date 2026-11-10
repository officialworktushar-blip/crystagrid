"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  LayoutDashboard,
  LogOut,
  Monitor,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

const navItems: NavItem[] = [
  { label: "Overview", href: "/admin", icon: LayoutDashboard },
  { label: "Customers", href: "/admin/customers", icon: Users },
  { label: "Screens", href: "/admin/screens", icon: Monitor },
];

export default function AdminSidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [open]);

  async function handleLogout() {
    setSigningOut(true);

    const supabase = createClient();
    await supabase.auth.signOut().catch(() => undefined);
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        aria-label="Close admin sidebar"
        tabIndex={open ? 0 : -1}
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-white/5 bg-[#050b1f] transition-transform duration-300 ease-out lg:w-64 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-white/5 px-5">
          <Link
            href="/admin"
            onClick={onClose}
            className="flex min-w-0 items-center gap-2 text-base font-bold tracking-tight text-white"
          >
            <span className="brand-gradient flex h-8 w-8 shrink-0 items-center justify-center rounded-lg shadow-brand">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-4 w-4 text-white"
              >
                <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" />
              </svg>
            </span>
            <span className="truncate">Crystagrid</span>
            <span className="shrink-0 rounded-full border border-sky-400/25 bg-sky-400/10 px-1.5 py-0.5 text-[9px] font-bold tracking-[0.16em] text-sky-200">
              ADMIN
            </span>
          </Link>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close sidebar"
            className="rounded-full p-1.5 text-white/50 transition duration-200 hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-5" aria-label="Admin">
          {navItems.map((item) => {
            const isActive =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "group flex items-center gap-3 rounded-full px-4 py-2.5 text-sm font-medium transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60",
                  isActive
                    ? "brand-gradient text-white shadow-brand"
                    : "text-white/55 hover:bg-white/[0.05] hover:text-white",
                )}
              >
                <Icon
                  aria-hidden="true"
                  className={cn(
                    "h-5 w-5 transition duration-200",
                    isActive
                      ? "text-white"
                      : "text-white/40 group-hover:text-white/80",
                  )}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="space-y-1 border-t border-white/5 px-3 py-4">
          <Link
            href="/dashboard"
            onClick={onClose}
            className="flex items-center gap-3 rounded-full px-4 py-2.5 text-sm text-white/40 transition duration-200 hover:bg-white/[0.05] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to dashboard
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            disabled={signingOut}
            className="flex w-full items-center gap-3 rounded-full px-4 py-2.5 text-sm text-white/40 transition duration-200 hover:bg-white/[0.05] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 disabled:pointer-events-none disabled:opacity-50"
          >
            <LogOut className="h-5 w-5" />
            {signingOut ? "Signing out..." : "Logout"}
          </button>
        </div>
      </aside>
    </>
  );
}
