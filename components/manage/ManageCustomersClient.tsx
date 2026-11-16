"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  Images,
  Monitor,
  Search,
  UserRound,
} from "lucide-react";
import Card from "@/components/ui/Card";
import {
  customerDisplayName,
  type AdminCustomerStats,
} from "@/lib/admin";
import { cn } from "@/lib/utils";

type FilterKey = "all" | "assigned" | "unassigned";

function ScreensCount({ online, total }: { online: number; total: number }) {
  return (
    <span className="tabular-nums">
      <span className="font-semibold text-emerald-300">{online}</span>
      <span className="px-1 text-white/30">/</span>
      <span className="text-white/70">{total}</span>
    </span>
  );
}

export default function ManageCustomersClient({
  customers,
  isAdmin,
  currentUserId,
  loadError,
}: {
  customers: AdminCustomerStats[];
  isAdmin: boolean;
  currentUserId: string;
  loadError: string | null;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");

  const myAccount = useMemo(
    () => customers.find((c) => c.customer_id === currentUserId) ?? null,
    [customers, currentUserId],
  );

  const baseCustomers = useMemo(() => {
    if (!isAdmin) return customers;
    if (filter === "assigned") {
      return customers.filter((c) => c.manager_id === currentUserId);
    }
    if (filter === "unassigned") {
      return customers.filter((c) => !c.manager_id);
    }
    return customers;
  }, [customers, filter, isAdmin, currentUserId]);

  const visibleCustomers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return baseCustomers;
    return baseCustomers.filter((customer) =>
      [
        customer.full_name,
        customer.company_name,
        customer.email,
        customer.manager_name,
      ].some((value) => value?.toLowerCase().includes(normalizedQuery)),
    );
  }, [baseCustomers, query]);

  const allCount = customers.length;
  const assignedCount = customers.filter((c) => c.manager_id === currentUserId).length;
  const unassignedCount = customers.filter((c) => !c.manager_id).length;

  return (
    <div className="space-y-5">
      {isAdmin ? (
        <Link
          href={`/manage/${currentUserId}`}
          className="block rounded-2xl border border-sky-400/20 bg-sky-400/5 p-4 transition hover:border-sky-400/40 hover:bg-sky-400/10"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-200">
            My own screens
          </p>
          <p className="mt-1 text-sm text-white/80">
            Open your account workspace ({myAccount ? customerDisplayName(myAccount) : "your account"})
          </p>
        </Link>
      ) : null}

      {isAdmin ? (
        <div className="flex flex-wrap gap-2" aria-label="Customer filters">
          {([
            { key: "all", label: `All customers (${allCount})` },
            { key: "assigned", label: `Assigned to me (${assignedCount})` },
            { key: "unassigned", label: `Unassigned (${unassignedCount})` },
          ] as const).map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setFilter(t.key)}
              aria-pressed={filter === t.key}
              className={cn(
                "rounded-full border px-4 py-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60",
                filter === t.key
                  ? "border-sky-400/40 bg-sky-400/15 text-sky-100"
                  : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      ) : null}

      <div className="relative w-full sm:max-w-sm">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
        />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search name, company, or email"
          aria-label="Search customers"
          className="h-10 w-full rounded-full border border-white/10 bg-white/5 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-muted focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/40"
        />
      </div>

      {loadError ? (
        <p
          role="alert"
          className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200"
        >
          Customers could not be loaded. {loadError}
        </p>
      ) : null}

      {visibleCustomers.length === 0 ? (
        <Card className="p-8 text-center hover:border-white/10 hover:shadow-none">
          <p className="text-sm font-medium text-white">
            {baseCustomers.length === 0
              ? "No customers assigned to you yet."
              : "No customers match your search."}
          </p>
          <p className="mt-1 text-sm text-body">
            {baseCustomers.length === 0
              ? "Assigned customer accounts will appear here."
              : "Try a different name, company, or email."}
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visibleCustomers.map((customer) => (
            <Card key={customer.customer_id} className="p-0">
              <Link
                href={`/manage/${customer.customer_id}`}
                className="group block p-5 transition duration-200 hover:bg-white/[0.02] focus-visible:bg-white/[0.02] focus-visible:outline-none"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold tracking-tight text-white">
                      {customer.company_name || customerDisplayName(customer)}
                    </p>
                    {customer.company_name ? (
                      <p className="mt-0.5 truncate text-xs text-body">
                        {customerDisplayName(customer)}
                      </p>
                    ) : null}
                    <p className="mt-2 truncate text-xs text-muted">
                      {customer.email || "No email"}
                    </p>
                  </div>

                  <ArrowUpRight
                    aria-hidden="true"
                    className="h-4 w-4 shrink-0 text-white/30 transition duration-200 group-hover:text-brand-sky"
                  />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/5 pt-4 text-xs">
                  <div className="flex items-center gap-2 text-body">
                    <Monitor
                      aria-hidden="true"
                      className="h-4 w-4 shrink-0 text-brand-sky"
                    />
                    <span>
                      <ScreensCount
                        online={customer.online_screens}
                        total={customer.total_screens}
                      />{" "}
                      screens
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-body">
                    <Images
                      aria-hidden="true"
                      className="h-4 w-4 shrink-0 text-blue-300"
                    />
                    <span className="tabular-nums">
                      {customer.media_count} media
                    </span>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2 border-t border-white/5 pt-3 text-xs text-muted">
                  <UserRound
                    aria-hidden="true"
                    className="h-4 w-4 shrink-0 text-white/35"
                  />
                  <span className="truncate">
                    Manager: {customer.manager_name || "Unassigned"}
                  </span>
                </div>
              </Link>
            </Card>
          ))}
        </div>
      )}

      <p
        className={cn(
          "text-xs text-muted",
          visibleCustomers.length === 0 && "sr-only",
        )}
      >
        Showing {visibleCustomers.length} of {baseCustomers.length} customers.
      </p>
    </div>
  );
}
