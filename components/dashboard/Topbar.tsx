"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut, Menu } from "lucide-react";
import Button from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";

type TopbarUser = {
  name: string;
  company: string | null;
  email: string;
};

function initials(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  return parts.map((part) => part[0]?.toUpperCase()).join("") || "C";
}

export default function Topbar({
  user,
  onOpenSidebar,
}: {
  user: TopbarUser;
  onOpenSidebar: () => void;
}) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function handleLogout() {
    setSigningOut(true);

    const supabase = createClient();
    await supabase.auth.signOut().catch(() => undefined);
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-white/5 bg-[#050b1f]/80 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onOpenSidebar}
          aria-label="Open sidebar"
          className="rounded-full p-2 text-white/60 transition duration-200 hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

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
    </header>
  );
}
