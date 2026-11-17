"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut, Menu, ShieldCheck, UserRound } from "lucide-react";
import Button from "@/components/ui/Button";
import type {
  ManageRole,
  ManageUser,
} from "@/components/manage/ManageShell";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

function initials(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  return parts.map((part) => part[0]?.toUpperCase()).join("") || "M";
}

export default function ManageTopbar({
  user,
  role,
  onOpenSidebar,
}: {
  user: ManageUser;
  role: ManageRole;
  onOpenSidebar: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const isCustomerRoute = /^\/cm\/customers\/[^/]+/.test(pathname);
  const isAdmin = role === "admin";

  async function handleLogout() {
    setSigningOut(true);

    const supabase = createClient();
    await supabase.auth.signOut().catch(() => undefined);
    router.push("/login");
    router.refresh();
  }

  return (
    <header
      className={cn(
        "sticky top-0 z-30 border-b border-white/5 bg-[#050b1f]/80 backdrop-blur-xl",
        isCustomerRoute && "lg:pl-64",
      )}
    >
      <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          {isCustomerRoute ? (
            <button
              type="button"
              onClick={onOpenSidebar}
              aria-label="Open customer sidebar"
              className="rounded-full p-2 text-white/60 transition duration-200 hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
          ) : null}

          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">
              {user.name}
            </p>
            <p className="truncate text-xs text-body">
              {user.company || user.email}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {isAdmin ? (
            <Link
              href="/admin"
              className="hidden items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/70 transition duration-200 hover:border-sky-400/30 hover:text-white sm:inline-flex"
            >
              Back to Admin
            </Link>
          ) : null}

          <span className="hidden items-center gap-1.5 rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1 text-xs font-semibold text-sky-200 md:inline-flex">
            {isAdmin ? (
              <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5" />
            ) : (
              <UserRound aria-hidden="true" className="h-3.5 w-3.5" />
            )}
            {isAdmin ? "Admin" : "Account Manager"}
          </span>

          <div className="brand-gradient hidden h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white shadow-brand sm:flex">
            {initials(user.name)}
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleLogout}
            disabled={signingOut}
            className="gap-2"
          >
            <LogOut aria-hidden="true" className="h-4 w-4" />
            <span className="hidden sm:inline">
              {signingOut ? "Signing out..." : "Logout"}
            </span>
          </Button>
        </div>
      </div>
    </header>
  );
}
