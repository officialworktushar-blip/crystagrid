"use client";

import { Menu, ShieldCheck } from "lucide-react";

type AdminTopbarUser = {
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

  return parts.map((part) => part[0]?.toUpperCase()).join("") || "A";
}

export default function AdminTopbar({
  user,
  onOpenSidebar,
}: {
  user: AdminTopbarUser;
  onOpenSidebar: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-white/5 bg-[#050b1f]/80 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onOpenSidebar}
          aria-label="Open admin sidebar"
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
        <span className="hidden items-center gap-1.5 rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1 text-xs font-semibold text-sky-200 sm:inline-flex">
          <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5" />
          Admin
        </span>

        <div className="brand-gradient flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white shadow-brand">
          {initials(user.name)}
        </div>
      </div>
    </header>
  );
}
