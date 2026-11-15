"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Building2,
  CalendarCheck,
  Inbox,
  LayoutDashboard,
  LogOut,
  MapPin,
  Monitor,
  Package,
  Tag,
  Users,
  UsersRound,
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

type NavGroup = {
  label?: string;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    items: [
      { label: "Overview", href: "/admin", icon: LayoutDashboard },
      { label: "Customers", href: "/admin/customers", icon: Users },
      { label: "Team", href: "/admin/team", icon: UsersRound },
      { label: "Leads", href: "/admin/leads", icon: Inbox },
      { label: "Screens", href: "/admin/screens", icon: Monitor },
    ],
  },
  {
    label: "Ad Inventory",
    items: [
      { label: "Places", href: "/admin/ads/places", icon: MapPin },
      {
        label: "Properties",
        href: "/admin/ads/properties",
        icon: Building2,
      },
      { label: "Packages", href: "/admin/ads/packages", icon: Package },
      { label: "Pricing", href: "/admin/ads/pricing", icon: Tag },
    ],
  },
  {
    items: [
      { label: "Bookings", href: "/admin/bookings", icon: CalendarCheck },
    ],
  },
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
            <Image
              src="/logo.webp"
              alt=""
              width={128}
              height={47}
              loading="eager"
              className="h-12 w-auto max-w-36 shrink-0 object-contain"
            />
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

        <nav
          className="flex-1 space-y-5 overflow-y-auto px-3 py-5"
          aria-label="Admin"
        >
          {navGroups.map((group, index) => (
            <div
              key={group.label ?? `group-${index}`}
              className="space-y-1"
            >
              {group.label ? (
                <p className="px-4 pb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/30">
                  {group.label}
                </p>
              ) : null}

              {group.items.map((item) => {
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
            </div>
          ))}
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
