"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import {
  ArrowLeft,
  CalendarCheck,
  Images,
  LayoutDashboard,
  ListVideo,
  Megaphone,
  Monitor,
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

const primaryNavItems: NavItem[] = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "My Plans", href: "/dashboard/plans", icon: CalendarCheck },
  { label: "Where my ads run", href: "/dashboard/screens", icon: Monitor },
  { label: "Book Ads", href: "/book", icon: Megaphone },
];

const contentNavItems: NavItem[] = [
  { label: "Media", href: "/dashboard/media", icon: Images },
  { label: "Playlists", href: "/dashboard/playlists", icon: ListVideo },
];

function isActivePath(pathname: string, href: string): boolean {
  if (href === "/dashboard") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

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

  const renderNavItem = (item: NavItem) => {
    const isActive = isActivePath(pathname, item.href);
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
  };

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
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-white/5 bg-surface transition-transform duration-300 ease-out lg:w-64 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-24 items-center justify-between border-b border-white/5 px-5">
          <div className="flex min-w-0 flex-col items-start gap-1">
            <Link
              href="/dashboard"
              onClick={onClose}
              className="flex items-center gap-2.5 text-base font-bold tracking-tight text-white"
            >
              <Image
                src="/logo.webp"
                alt=""
                width={256}
                height={256}
                className="h-20 w-auto max-w-72 shrink-0 object-contain"
              />
            </Link>

            <span className="ml-10 inline-flex rounded-full border border-sky-400/20 bg-sky-400/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-200">
              View only
            </span>
          </div>

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
          {primaryNavItems.map(renderNavItem)}

          <p className="px-4 pb-1 pt-5 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/30">
            Content
          </p>

          {contentNavItems.map(renderNavItem)}
        </nav>

        <div className="border-t border-white/5 px-3 py-4">
          <Link
            href="/"
            onClick={onClose}
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
