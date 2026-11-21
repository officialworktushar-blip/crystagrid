"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  Building2,
  CalendarCheck,
  CreditCard,
  Inbox,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  MapPin,
  Megaphone,
  Menu,
  Monitor,
  Package,
  Tags,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { homeForRole, ROLE_LABELS, type Role } from "@/lib/roles";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type NavIcon =
  | "overview"
  | "customers"
  | "house"
  | "places"
  | "properties"
  | "packages"
  | "pricing"
  | "bookings"
  | "payments"
  | "leads"
  | "screens";

type NavItem = {
  href: string;
  label: string;
  icon: NavIcon;
};

const NAV_ICONS = {
  overview: LayoutDashboard,
  customers: Users,
  house: Megaphone,
  places: MapPin,
  properties: Building2,
  packages: Package,
  pricing: Tags,
  bookings: CalendarCheck,
  payments: CreditCard,
  leads: Inbox,
  screens: Monitor,
} satisfies Record<NavIcon, LucideIcon>;

const SWITCH_PANELS: { href: string; label: string }[] = [
  { href: "/admin", label: "Admin" },
  { href: "/device", label: "Device" },
  { href: "/cm", label: "Customer Manager" },
  { href: "/sales", label: "Sales" },
];

export default function PanelShell({
  title,
  nav,
  role,
  userName,
  children,
}: {
  title: string;
  nav: NavItem[];
  role: Role;
  userName: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

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

    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      // Return to login even if the network sign-out fails.
    } finally {
      router.push("/login");
      router.refresh();
    }
  }

  return (
    <div className="panel-theme min-h-screen bg-background text-white">
      <button
        type="button"
        aria-label="Close navigation"
        tabIndex={open ? 0 : -1}
        onClick={() => setOpen(false)}
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
        <div className="flex h-16 items-center justify-between border-b border-white/5 px-5">
          <Link
            href={homeForRole(role)}
            onClick={() => setOpen(false)}
            className="flex min-w-0 items-center gap-2"
          >
            <span className="text-base font-extrabold tracking-tight text-brand-gradient">
              Crystagrid
            </span>
            <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] font-bold tracking-[0.16em] text-white/60">
              PANEL
            </span>
          </Link>

          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
            className="rounded-full p-1.5 text-white/50 transition duration-200 hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="border-b border-white/5 px-5 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-sky">
            Workspace
          </p>
          <p className="mt-1 truncate text-sm font-semibold text-white">
            {title}
          </p>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-5" aria-label={title}>
          <div className="space-y-1">
            {nav.map((item) => {
              const isActive =
                pathname === item.href ||
                pathname.startsWith(`${item.href}/`);
              const Icon = NAV_ICONS[item.icon];

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
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
        </nav>

        <div className="border-t border-white/5 px-5 py-4">
          <p className="truncate text-sm font-medium text-white">{userName}</p>
          <p className="mt-0.5 text-xs text-muted">{ROLE_LABELS[role]}</p>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-white/5 bg-background/80 px-4 backdrop-blur sm:px-6">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open navigation"
            className="rounded-xl border border-white/10 bg-white/5 p-2 text-white/70 transition duration-200 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          <h1 className="min-w-0 flex-1 truncate text-base font-bold tracking-tight text-white sm:text-lg">
            {title}
          </h1>

          {role === "admin" ? (
            <details className="relative">
              <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/70 transition duration-200 hover:border-white/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 [&::-webkit-details-marker]:hidden">
                <LayoutGrid aria-hidden="true" className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Switch panel</span>
              </summary>
              <div className="absolute right-0 top-full z-50 mt-2 w-52 rounded-2xl border border-white/10 bg-surface-2 p-2 shadow-card">
                {SWITCH_PANELS.map((panel) => (
                  <Link
                    key={panel.href}
                    href={panel.href}
                    className="block rounded-xl px-3 py-2 text-sm text-white/70 transition duration-200 hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60"
                  >
                    {panel.label}
                  </Link>
                ))}
              </div>
            </details>
          ) : null}

          <span className="hidden rounded-full border border-sky-400/25 bg-sky-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-sky-200 md:inline-flex">
            {ROLE_LABELS[role]}
          </span>

          <span className="hidden max-w-[12rem] truncate text-sm text-body xl:inline">
            {userName}
          </span>

          <button
            type="button"
            onClick={() => void handleLogout()}
            disabled={signingOut}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/70 transition duration-200 hover:border-white/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 disabled:pointer-events-none disabled:opacity-50"
          >
            <LogOut aria-hidden="true" className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">
              {signingOut ? "Signing out..." : "Logout"}
            </span>
          </button>
        </header>

        <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
