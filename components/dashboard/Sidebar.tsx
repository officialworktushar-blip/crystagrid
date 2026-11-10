"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import {
  ArrowLeft,
  Images,
  LayoutDashboard,
  ListVideo,
  Monitor,
  ShieldCheck,
  X,
  type LucideIcon,
} from "lucide-react";
import type { UserRole } from "@/lib/types";
import { cn } from "@/lib/utils";

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

const navItems: NavItem[] = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "Screens", href: "/dashboard/screens", icon: Monitor },
  { label: "Media", href: "/dashboard/media", icon: Images },
  { label: "Playlists", href: "/dashboard/playlists", icon: ListVideo },
];

const adminNavItem: NavItem = {
  label: "Admin Panel",
  href: "/admin",
  icon: ShieldCheck,
};

export default function Sidebar({
  open,
  onClose,
  role,
}: {
  open: boolean;
  onClose: () => void;
  role: UserRole;
}) {
  const pathname = usePathname();
  const items = role === "admin" ? [...navItems, adminNavItem] : navItems;

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

  return (
    <>
      <button
        type="button"
        aria-label="Close sidebar"
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
            href="/dashboard"
            onClick={onClose}
            className="flex items-center gap-2.5 text-base font-bold tracking-tight text-white"
          >
            <span className="brand-gradient flex h-8 w-8 items-center justify-center rounded-lg shadow-brand">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-4 w-4 text-white"
              >
                <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" />
              </svg>
            </span>
            Crystagrid
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

        <nav className="flex-1 space-y-1 px-3 py-5" aria-label="Dashboard">
          {items.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
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

        <div className="border-t border-white/5 px-3 py-4">
          <Link
            href="/"
            className="flex items-center gap-3 rounded-full px-4 py-2.5 text-sm text-white/40 transition duration-200 hover:bg-white/[0.05] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to site
          </Link>
        </div>
      </aside>
    </>
  );
}
