"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export default function CmCustomerTabs({ customerId }: { customerId: string }) {
  const pathname = usePathname();
  const basePath = `/cm/customers/${customerId}`;
  const tabs = [
    { label: "Bookings", href: basePath },
    { label: "Media", href: `${basePath}/media` },
    { label: "Playlists", href: `${basePath}/playlists` },
  ];

  return (
    <nav
      aria-label="Customer details"
      className="flex flex-wrap items-center gap-2 border-b border-white/5 pb-4"
    >
      {tabs.map((tab) => {
        const isActive =
          tab.href === basePath
            ? pathname === basePath
            : pathname === tab.href || pathname.startsWith(`${tab.href}/`);

        return (
          <Link
            key={tab.href}
            href={tab.href}
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
