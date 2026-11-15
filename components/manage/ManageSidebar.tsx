"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import {
  ArrowLeft,
  Building2,
  Images,
  LayoutDashboard,
  ListVideo,
  Monitor,
  X,
  type LucideIcon,
} from "lucide-react";
import { useManageShell } from "@/components/manage/ManageShell";
import { cn } from "@/lib/utils";

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export default function ManageSidebar({
  customerId,
  customer,
}: {
  customerId: string;
  customer: {
    name: string;
    company: string | null;
  };
}) {
  const pathname = usePathname();
  const { sidebarOpen: open, closeSidebar: onClose } = useManageShell();
  const basePath = `/manage/${customerId}`;

  const navItems: NavItem[] = [
    { label: "Overview", href: basePath, icon: LayoutDashboard },
    { label: "Screens", href: `${basePath}/screens`, icon: Monitor },
    { label: "Media", href: `${basePath}/media`, icon: Images },
    { label: "Playlists", href: `${basePath}/playlists`, icon: ListVideo },
  ];

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
        aria-label="Close customer sidebar"
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
            href="/manage"
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

        <div className="border-b border-white/5 px-3 py-4">
          <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
            Managing customer
          </p>
          <div className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.03] px-3 py-3">
            <span className="brand-gradient flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white shadow-brand">
              <Building2 aria-hidden="true" className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p
                className="truncate text-sm font-semibold text-white"
                title={customer.name}
              >
                {customer.name}
              </p>
              <p
                className="truncate text-xs text-body"
                title={customer.company ?? undefined}
              >
                {customer.company || "Customer account"}
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-5" aria-label="Customer manage">
          {navItems.map((item) => {
            const isActive =
              item.href === basePath
                ? pathname === basePath
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
            href="/manage"
            onClick={onClose}
            className="flex items-center gap-3 rounded-full px-4 py-2.5 text-sm text-white/40 transition duration-200 hover:bg-white/[0.05] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60"
          >
            <ArrowLeft className="h-5 w-5" />
            All customers
          </Link>
        </div>
      </aside>
    </>
  );
}
