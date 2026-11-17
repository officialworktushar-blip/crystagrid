"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowUpRight } from "lucide-react";
import {
  customerDisplayName,
  customerInitials,
  formatAdminDate,
  formatStorage as formatBytes,
  joinedTimestamp,
} from "@/lib/admin";
import type { CmCustomerWithCounts } from "@/lib/cm";
import { useFilters } from "@/lib/useFilters";
import { cn } from "@/lib/utils";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import FilterBar from "@/components/ui/FilterBar";

type CmCustomerFilters = {
  search: string;
  needsContent: boolean;
  activeCampaign: boolean;
  manager: string;
};

const initialFilters: CmCustomerFilters = {
  search: "",
  needsContent: false,
  activeCampaign: false,
  manager: "",
};

export default function CmCustomersClient({
  customers,
  isAdmin,
  loadError = null,
}: {
  customers: CmCustomerWithCounts[];
  isAdmin: boolean;
  loadError?: string | null;
}) {
  const { filters, set, clear } = useFilters(initialFilters);

  const managerOptions = useMemo(() => {
    const managers = new Map<string, string>();

    for (const customer of customers) {
      if (!customer.manager_id) {
        continue;
      }

      managers.set(
        customer.manager_id,
        customer.manager_name ?? `Manager ${customer.manager_id.slice(0, 8)}`,
      );
    }

    return [...managers.entries()]
      .map(([value, label]) => ({ value, label }))
      .sort((left, right) => left.label.localeCompare(right.label));
  }, [customers]);

  const visibleCustomers = useMemo(() => {
    const query = filters.search.trim().toLowerCase();

    return customers
      .filter((customer) => {
        if (
          query &&
          ![customer.full_name, customer.company_name, customer.email].some(
            (value) => value?.toLowerCase().includes(query),
          )
        ) {
          return false;
        }

        if (filters.needsContent && customer.needsContent <= 0) {
          return false;
        }

        if (filters.activeCampaign && customer.activeCampaigns <= 0) {
          return false;
        }

        if (filters.manager && customer.manager_id !== filters.manager) {
          return false;
        }

        return true;
      })
      .sort((left, right) => joinedTimestamp(right) - joinedTimestamp(left));
  }, [customers, filters]);

  return (
    <div className="space-y-4">
      <FilterBar
        search={{
          value: filters.search,
          onChange: (value) => set("search", value),
          placeholder: "Search customers, companies, emails",
        }}
        selects={
          isAdmin
            ? [
                {
                  key: "manager",
                  label: "Manager",
                  value: filters.manager,
                  allLabel: "All managers",
                  options: managerOptions,
                  onChange: (value) => set("manager", value),
                },
              ]
            : []
        }
        toggles={[
          {
            key: "needsContent",
            label: "Needs content",
            checked: filters.needsContent,
            onChange: (value) => set("needsContent", value),
          },
          {
            key: "activeCampaign",
            label: "Has active campaign",
            checked: filters.activeCampaign,
            onChange: (value) => set("activeCampaign", value),
          },
        ]}
        resultCount={visibleCustomers.length}
        total={customers.length}
        onClear={clear}
      />

      {loadError ? (
        <p
          role="alert"
          className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200"
        >
          Customer data could not be loaded. {loadError}
        </p>
      ) : null}

      {visibleCustomers.length === 0 ? (
        <Card className="p-8 text-center hover:border-white/10 hover:shadow-none">
          <p className="text-sm font-semibold text-white">
            {customers.length === 0
              ? "No customers assigned yet."
              : "No customers match your filters."}
          </p>
          <p className="mt-1 text-sm text-body">
            {customers.length === 0
              ? "Customer accounts will appear here once they are assigned to you."
              : "Try a different search, manager, or status filter."}
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0 hover:border-white/10 hover:shadow-none">
          <div className="hidden overflow-x-auto md:block">
            <table
              className={cn(
                "w-full min-w-[76rem] text-left text-sm",
                isAdmin && "min-w-[86rem]",
              )}
            >
              <thead className="border-b border-white/5 bg-white/[0.02] text-xs uppercase tracking-[0.12em] text-muted">
                <tr>
                  <th scope="col" className="px-5 py-3 font-semibold">
                    Customer
                  </th>
                  {isAdmin ? (
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Manager
                    </th>
                  ) : null}
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Screens
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Online
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Media
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Active campaigns
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Needs content
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Joined
                  </th>
                  <th scope="col" className="px-5 py-3 text-right font-semibold">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {visibleCustomers.map((customer) => {
                  const href = `/cm/customers/${customer.customer_id}`;

                  return (
                    <tr
                      key={customer.customer_id}
                      className="relative transition duration-200 hover:bg-white/[0.03]"
                    >
                      <td className="max-w-[18rem] px-5 py-3.5">
                        <Link
                          href={href}
                          className="group flex min-w-0 items-center gap-3 rounded-sm after:absolute after:inset-0 after:content-[''] focus-visible:text-brand-sky focus-visible:outline-none"
                        >
                          <span className="brand-gradient flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[11px] font-bold text-white shadow-brand">
                            {customerInitials(customer)}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate font-semibold text-white transition duration-200 group-hover:text-brand-sky">
                              {customerDisplayName(customer)}
                            </span>
                            <span className="mt-0.5 block truncate text-xs text-muted">
                              {customer.company_name || customer.email || "No company"}
                            </span>
                          </span>
                        </Link>
                      </td>
                      {isAdmin ? (
                        <td className="max-w-[12rem] px-4 py-3.5 text-white/70">
                          <span className="block truncate">
                            {customer.manager_name ?? "Unassigned"}
                          </span>
                        </td>
                      ) : null}
                      <td className="px-4 py-3.5 text-white/70 tabular-nums">
                        {customer.total_screens}
                      </td>
                      <td className="px-4 py-3.5 text-emerald-300 tabular-nums">
                        {customer.online_screens}
                      </td>
                      <td className="px-4 py-3.5 text-white/70">
                        <span className="tabular-nums">{customer.media_count}</span>
                        <span className="mt-0.5 block text-xs text-muted">
                          {formatBytes(customer.storage_bytes)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        {customer.activeCampaigns > 0 ? (
                          <span className="inline-flex rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-200 tabular-nums">
                            {customer.activeCampaigns} live
                          </span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        {customer.needsContent > 0 ? (
                          <span className="inline-flex rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold text-amber-200 tabular-nums">
                            {customer.needsContent} needed
                          </span>
                        ) : (
                          <span className="text-muted">Clear</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-white/60">
                        {formatAdminDate(customer.joined_at)}
                      </td>
                      <td className="relative z-10 px-5 py-3.5">
                        <Button asChild size="sm" variant="secondary" className="h-8 px-3 text-xs">
                          <Link href={href}>
                            Open
                            <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-white/5 md:hidden">
            {visibleCustomers.map((customer) => {
              const href = `/cm/customers/${customer.customer_id}`;

              return (
                <div key={customer.customer_id} className="space-y-4 p-4">
                  <div className="flex items-start gap-3">
                    <span className="brand-gradient flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[11px] font-bold text-white shadow-brand">
                      {customerInitials(customer)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={href}
                        className="block truncate text-sm font-semibold text-white transition duration-200 hover:text-brand-sky focus-visible:text-brand-sky focus-visible:outline-none"
                      >
                        {customerDisplayName(customer)}
                      </Link>
                      <p className="mt-0.5 truncate text-xs text-body">
                        {customer.company_name || customer.email || "No company"}
                      </p>
                      {isAdmin ? (
                        <p className="mt-0.5 truncate text-xs text-muted">
                          Manager: {customer.manager_name ?? "Unassigned"}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <dl className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <dt className="text-muted">Screens</dt>
                      <dd className="mt-0.5 text-white/80 tabular-nums">
                        {customer.total_screens}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted">Online</dt>
                      <dd className="mt-0.5 text-emerald-300 tabular-nums">
                        {customer.online_screens}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted">Media</dt>
                      <dd className="mt-0.5 text-white/80 tabular-nums">
                        {customer.media_count} · {formatBytes(customer.storage_bytes)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted">Joined</dt>
                      <dd className="mt-0.5 text-white/80">
                        {formatAdminDate(customer.joined_at)}
                      </dd>
                    </div>
                  </dl>

                  <div className="flex flex-wrap items-center gap-2">
                    {customer.activeCampaigns > 0 ? (
                      <span className="inline-flex rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-200">
                        {customer.activeCampaigns} live campaigns
                      </span>
                    ) : null}
                    {customer.needsContent > 0 ? (
                      <span className="inline-flex rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold text-amber-200">
                        {customer.needsContent} need content
                      </span>
                    ) : null}
                    <Button asChild size="sm" variant="secondary" className="ml-auto h-8 px-3 text-xs">
                      <Link href={href}>
                        Open
                        <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
