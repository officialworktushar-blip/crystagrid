"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Search } from "lucide-react";
import AdminManagerSelect from "@/components/admin/AdminManagerSelect";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import {
  customerDisplayName,
  formatAdminDate,
  formatStorage,
  joinedTimestamp,
  managerDisplayName,
  type AdminCustomerStats,
  type AdminTeamMember,
} from "@/lib/admin";
import { createClient } from "@/lib/supabase/client";
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
  managers,
  initialManagerId,
  currentAdminId,
  loadError,
  managersError,
}: {
  customers: AdminCustomerStats[];
  managers: AdminTeamMember[];
  initialManagerId: string | null;
  currentAdminId: string | null;
  loadError: string | null;
  managersError: string | null;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("joined-desc");
  const [managerFilter, setManagerFilter] = useState(initialManagerId ?? "all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

  const visibleCustomers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = normalizedQuery
      ? customers.filter((customer) =>
          [customer.full_name, customer.company_name, customer.email].some((value) =>
            value?.toLowerCase().includes(normalizedQuery),
          ),
        )
      : customers;

    const managerFiltered =
      managerFilter === "all"
        ? filtered
        : managerFilter === "unassigned"
          ? filtered.filter((customer) => !customer.manager_id)
          : filtered.filter((customer) => customer.manager_id === managerFilter);

    return [...managerFiltered].sort((a, b) => {
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
  }, [customers, managerFilter, query, sort]);

  const selectedManagerName =
    managerFilter !== "all" && managerFilter !== "unassigned"
      ? managers.find((manager) => manager.id === managerFilter)
      : null;

  async function assignToMe(customerId: string) {
    if (!currentAdminId) return;
    setRowError(null);
    setBusyId(customerId);
    const supabase = createClient();
    const { error } = await supabase.rpc("admin_assign_manager", {
      p_customer: customerId,
      p_manager: currentAdminId,
    });
    setBusyId(null);
    if (error) {
      setRowError(error.message);
      return;
    }
    router.refresh();
  }

  async function unassign(customerId: string) {
    setRowError(null);
    setBusyId(customerId);
    const supabase = createClient();
    const { error } = await supabase.rpc("admin_assign_manager", {
      p_customer: customerId,
      p_manager: null,
    });
    setBusyId(null);
    if (error) {
      setRowError(error.message);
      return;
    }
    router.refresh();
  }

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

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label htmlFor="customer-manager-filter" className="text-xs text-muted">
              Manager
            </label>
            <select
              id="customer-manager-filter"
              value={managerFilter}
              onChange={(event) => setManagerFilter(event.target.value)}
              className={selectClass}
            >
              <option value="all">All customers</option>
              <option value="unassigned">Unassigned only</option>
              {managers.map((manager) => (
                <option key={manager.id} value={manager.id}>
                  {managerDisplayName(manager)}
                  {manager.role === "admin" ? " (Admin)" : ""}
                </option>
              ))}
            </select>
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
      </div>

      {loadError ? (
        <p role="alert" className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">
          Customer stats could not be loaded. {loadError}
        </p>
      ) : null}
      {managersError ? (
        <p role="alert" className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">
          Account managers could not be loaded. {managersError}
        </p>
      ) : null}
      {rowError ? (
        <p role="alert" className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">
          {rowError}
        </p>
      ) : null}

      {visibleCustomers.length === 0 ? (
        <Card className="p-8 text-center hover:border-white/10 hover:shadow-none">
          <p className="text-sm font-medium text-white">
            {customers.length === 0
              ? "No customers found."
              : selectedManagerName
                ? `No customers assigned to ${managerDisplayName(selectedManagerName)}.`
                : "No customers match your filters."}
          </p>
          <p className="mt-1 text-sm text-body">
            {customers.length === 0
              ? "Customer stats will appear here once accounts are created."
              : "Try a different search or manager filter."}
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0 hover:border-white/10 hover:shadow-none">
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[88rem] text-left text-sm">
              <thead className="border-b border-white/5 bg-white/[0.02] text-xs uppercase tracking-[0.12em] text-muted">
                <tr>
                  <th scope="col" className="px-5 py-3 font-semibold">Name</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Company</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Email</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Phone</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Manager</th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Screens <span className="text-[10px] font-medium normal-case tracking-normal text-muted">online / total</span>
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">Media</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Storage</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Joined</th>
                  <th scope="col" className="px-5 py-3 text-right font-semibold">Manage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {visibleCustomers.map((customer) => {
                  const isMine = currentAdminId && customer.manager_id === currentAdminId;
                  return (
                    <tr key={customer.customer_id} className="relative transition duration-200 hover:bg-white/[0.03]">
                      <td className="max-w-[14rem] px-5 py-3.5">
                        <Link
                          href={`/admin/customers/${customer.customer_id}`}
                          className="block truncate rounded-sm font-semibold text-white after:absolute after:inset-0 after:content-[''] focus-visible:text-brand-sky focus-visible:outline-none"
                        >
                          {customerDisplayName(customer)}
                        </Link>
                      </td>
                      <td className="max-w-[12rem] px-4 py-3.5 text-white/70"><span className="block truncate">{customer.company_name || "—"}</span></td>
                      <td className="max-w-[15rem] px-4 py-3.5 text-white/70"><span className="block truncate">{customer.email || "—"}</span></td>
                      <td className="px-4 py-3.5 text-white/70">{customer.phone || "—"}</td>
                      <td className="relative z-10 min-w-[13rem] px-4 py-3.5">
                        <div className="space-y-2">
                          <AdminManagerSelect
                            customerId={customer.customer_id}
                            managerId={customer.manager_id}
                            managers={managers}
                            className="w-52"
                          />
                          <div className="flex flex-wrap gap-1.5">
                            {isMine ? (
                              <span className="inline-flex rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-200">
                                Assigned to you
                              </span>
                            ) : currentAdminId ? (
                              <button
                                type="button"
                                disabled={busyId === customer.customer_id}
                                onClick={() => void assignToMe(customer.customer_id)}
                                className="rounded-full border border-sky-400/30 bg-sky-400/10 px-2.5 py-0.5 text-[10px] font-semibold text-sky-200 transition hover:bg-sky-400/20 disabled:opacity-60"
                              >
                                Assign to me
                              </button>
                            ) : null}
                            {customer.manager_id ? (
                              <button
                                type="button"
                                disabled={busyId === customer.customer_id}
                                onClick={() => void unassign(customer.customer_id)}
                                className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10px] font-semibold text-white/70 transition hover:bg-white/10 disabled:opacity-60"
                              >
                                Unassign
                              </button>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5"><ScreensCount online={customer.online_screens} total={customer.total_screens} /></td>
                      <td className="px-4 py-3.5 text-white/70 tabular-nums">{customer.media_count}</td>
                      <td className="px-4 py-3.5 text-white/70 tabular-nums">{formatStorage(customer.storage_bytes)}</td>
                      <td className="px-5 py-3.5 text-white/60">{formatAdminDate(customer.joined_at)}</td>
                      <td className="px-5 py-3.5">
                        <div className="relative z-10 flex flex-col items-end gap-1.5">
                          <Button asChild size="sm" className="h-8 px-3 text-xs">
                            <Link href={`/manage/${customer.customer_id}`}>Manage</Link>
                          </Button>
                          <div className="flex items-center gap-2 text-xs">
                            <Link href={`/manage/${customer.customer_id}/screens`} className="rounded-sm text-white/50 transition duration-200 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60">Screens</Link>
                            <Link href={`/manage/${customer.customer_id}/media`} className="rounded-sm text-white/50 transition duration-200 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60">Media</Link>
                            <Link href={`/manage/${customer.customer_id}/playlists`} className="rounded-sm text-white/50 transition duration-200 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60">Playlists</Link>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="divide-y divide-white/5 lg:hidden">
            {visibleCustomers.map((customer) => {
              const isMine = currentAdminId && customer.manager_id === currentAdminId;
              return (
                <div key={customer.customer_id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <Link href={`/admin/customers/${customer.customer_id}`} className="min-w-0 flex-1 rounded-sm transition duration-200 hover:text-brand-sky focus-visible:text-brand-sky focus-visible:outline-none">
                      <p className="truncate text-sm font-semibold text-white">{customerDisplayName(customer)}</p>
                      <p className="mt-0.5 truncate text-xs text-body">{customer.company_name || "No company"}</p>
                      <p className="mt-0.5 truncate text-xs text-muted">{customer.email || "No email"}</p>
                    </Link>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {isMine ? (
                      <span className="inline-flex rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-200">Assigned to you</span>
                    ) : currentAdminId ? (
                      <button type="button" disabled={busyId === customer.customer_id} onClick={() => void assignToMe(customer.customer_id)} className="rounded-full border border-sky-400/30 bg-sky-400/10 px-2.5 py-0.5 text-[10px] font-semibold text-sky-200 disabled:opacity-60">Assign to me</button>
                    ) : null}
                    {customer.manager_id ? (
                      <button type="button" disabled={busyId === customer.customer_id} onClick={() => void unassign(customer.customer_id)} className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10px] font-semibold text-white/70 disabled:opacity-60">Unassign</button>
                    ) : null}
                  </div>
                  <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                    <div><dt className="text-muted">Phone</dt><dd className="mt-0.5 text-white/70">{customer.phone || "—"}</dd></div>
                    <div><dt className="text-muted">Screens</dt><dd className="mt-0.5"><ScreensCount online={customer.online_screens} total={customer.total_screens} /></dd></div>
                  </dl>
                  <div className="mt-4">
                    <AdminManagerSelect customerId={customer.customer_id} managerId={customer.manager_id} managers={managers} className="w-full sm:max-w-xs" />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <p className={cn("text-xs text-muted", visibleCustomers.length === 0 && "sr-only")}>
        Showing {visibleCustomers.length} of {customers.length} customers.
      </p>
    </div>
  );
}
