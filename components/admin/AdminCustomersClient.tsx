"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowUpRight, Search } from "lucide-react";
import Card from "@/components/ui/Card";
import {
  customerDisplayName,
  formatAdminDate,
  formatStorage,
  joinedTimestamp,
  type AdminCustomerStats,
} from "@/lib/admin";
import { cn } from "@/lib/utils";

type SortKey = "joined-desc" | "joined-asc" | "storage-desc" | "storage-asc";

const sortOptions: { value: SortKey; label: string }[] = [
  { value: "joined-desc", label: "Newest first" },
  { value: "joined-asc", label: "Oldest first" },
  { value: "storage-desc", label: "Most storage" },
  { value: "storage-asc", label: "Least storage" },
];

const selectClass =
  "h-10 rounded-full border border-white/10 bg-[#050b1f] px-4 text-sm text-white outline-none transition focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/40";

function ScreensCount({
  online,
  total,
}: {
  online: number;
  total: number;
}) {
  return (
    <span className="tabular-nums">
      <span className="font-semibold text-emerald-300">{online}</span>
      <span className="px-1 text-white/30">/</span>
      <span className="text-white/70">{total}</span>
    </span>
  );
}

export default function AdminCustomersClient({
  customers,
  loadError,
}: {
  customers: AdminCustomerStats[];
  loadError: string | null;
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("joined-desc");

  const visibleCustomers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = normalizedQuery
      ? customers.filter((customer) =>
          [customer.full_name, customer.company_name, customer.email].some(
            (value) => value?.toLowerCase().includes(normalizedQuery),
          ),
        )
      : customers;

    return [...filtered].sort((a, b) => {
      switch (sort) {
        case "joined-asc":
          return joinedTimestamp(a) - joinedTimestamp(b);
        case "storage-desc":
          return b.storage_bytes - a.storage_bytes;
        case "storage-asc":
          return a.storage_bytes - b.storage_bytes;
        case "joined-desc":
        default:
          return joinedTimestamp(b) - joinedTimestamp(a);
      }
    });
  }, [customers, query, sort]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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

        <div className="flex items-center gap-2">
          <label htmlFor="customer-sort" className="text-xs text-muted">
            Sort
          </label>
          <select
            id="customer-sort"
            value={sort}
            onChange={(event) => setSort(event.target.value as SortKey)}
            className={selectClass}
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loadError ? (
        <p
          role="alert"
          className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200"
        >
          Customer stats could not be loaded. {loadError}
        </p>
      ) : null}

      {visibleCustomers.length === 0 ? (
        <Card className="p-8 text-center hover:border-white/10 hover:shadow-none">
          <p className="text-sm font-medium text-white">
            {customers.length === 0
              ? "No customers found."
              : "No customers match your search."}
          </p>
          <p className="mt-1 text-sm text-body">
            {customers.length === 0
              ? "Customer stats will appear here once accounts are created."
              : "Try a different name, company, or email."}
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0 hover:border-white/10 hover:shadow-none">
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[72rem] text-left text-sm">
              <thead className="border-b border-white/5 bg-white/[0.02] text-xs uppercase tracking-[0.12em] text-muted">
                <tr>
                  <th scope="col" className="px-5 py-3 font-semibold">
                    Name
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Company
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Email
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Phone
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Screens{" "}
                    <span className="text-[10px] font-medium normal-case tracking-normal text-muted">
                      online / total
                    </span>
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Media
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Storage
                  </th>
                  <th scope="col" className="px-5 py-3 font-semibold">
                    Joined
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {visibleCustomers.map((customer) => (
                  <tr
                    key={customer.customer_id}
                    className="relative transition duration-200 hover:bg-white/[0.03]"
                  >
                    <td className="max-w-[14rem] px-5 py-3.5">
                      <Link
                        href={`/admin/customers/${customer.customer_id}`}
                        className="block truncate rounded-sm font-semibold text-white after:absolute after:inset-0 after:content-[''] focus-visible:text-brand-sky focus-visible:outline-none"
                      >
                        {customerDisplayName(customer)}
                      </Link>
                    </td>
                    <td className="max-w-[12rem] px-4 py-3.5 text-white/70">
                      <span className="block truncate">
                        {customer.company_name || "—"}
                      </span>
                    </td>
                    <td className="max-w-[15rem] px-4 py-3.5 text-white/70">
                      <span className="block truncate">
                        {customer.email || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-white/70">
                      {customer.phone || "—"}
                    </td>
                    <td className="px-4 py-3.5">
                      <ScreensCount
                        online={customer.online_screens}
                        total={customer.total_screens}
                      />
                    </td>
                    <td className="px-4 py-3.5 text-white/70 tabular-nums">
                      {customer.media_count}
                    </td>
                    <td className="px-4 py-3.5 text-white/70 tabular-nums">
                      {formatStorage(customer.storage_bytes)}
                    </td>
                    <td className="px-5 py-3.5 text-white/60">
                      {formatAdminDate(customer.joined_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-white/5 lg:hidden">
            {visibleCustomers.map((customer) => (
              <Link
                key={customer.customer_id}
                href={`/admin/customers/${customer.customer_id}`}
                className="block p-4 transition duration-200 hover:bg-white/[0.03] focus-visible:bg-white/[0.03] focus-visible:outline-none"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">
                      {customerDisplayName(customer)}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-body">
                      {customer.company_name || "No company"}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted">
                      {customer.email || "No email"}
                    </p>
                  </div>
                  <ArrowUpRight
                    aria-hidden="true"
                    className="h-4 w-4 shrink-0 text-white/30"
                  />
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <dt className="text-muted">Phone</dt>
                    <dd className="mt-0.5 text-white/70">
                      {customer.phone || "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted">Screens</dt>
                    <dd className="mt-0.5">
                      <ScreensCount
                        online={customer.online_screens}
                        total={customer.total_screens}
                      />
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted">Media / Storage</dt>
                    <dd className="mt-0.5 text-white/70 tabular-nums">
                      {customer.media_count} /{" "}
                      {formatStorage(customer.storage_bytes)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted">Joined</dt>
                    <dd className="mt-0.5 text-white/70">
                      {formatAdminDate(customer.joined_at)}
                    </dd>
                  </div>
                </dl>
              </Link>
            ))}
          </div>
        </Card>
      )}

      <p
        className={cn(
          "text-xs text-muted",
          visibleCustomers.length === 0 && "sr-only",
        )}
      >
        Showing {visibleCustomers.length} of {customers.length} customers.
      </p>
    </div>
  );
}
