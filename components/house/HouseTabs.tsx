"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { label: "Where it plays", suffix: "" },
  { label: "Media", suffix: "/media" },
  { label: "Playlists", suffix: "/playlists" },
];

export default function HouseTabs({ basePath }: { basePath: string }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Company content"
      className="flex flex-wrap items-center gap-2 border-b border-white/5 pb-4"
    >
      {TABS.map((tab) => {
        const href = `${basePath}${tab.suffix}`;
        const isActive =
          tab.suffix === ""
            ? pathname === href
            : pathname === href || pathname.startsWith(`${href}/`);

        return (
          <Link
            key={href}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "inline-flex items-center rounded-full border px-4 py-2 text-sm font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60",
              isActive
                ? "border-sky-400/40 bg-sky-400/10 text-white shadow-brand"
                : "border-white/10 bg-white/[0.03] text-white/60 hover:border-white/20 hover:bg-white/[0.06] hover:text-white",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
