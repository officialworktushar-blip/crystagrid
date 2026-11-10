"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import DeleteScreenButton from "@/components/admin/DeleteScreenButton";
import StatusBadge from "@/components/dashboard/StatusBadge";
import Card from "@/components/ui/Card";
import {
  formatAdminDate,
  type AdminScreenRow,
} from "@/lib/admin";
import { cn } from "@/lib/utils";

type ScreenFilter = "all" | "online" | "offline" | "pending";

const filters: { value: ScreenFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "online", label: "Online" },
  { value: "offline", label: "Offline" },
  { value: "pending", label: "Pending" },
];

export default function AdminScreensClient({
  screens,
  loadError,
}: {
  screens: AdminScreenRow[];
  loadError: string | null;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ScreenFilter>("all");

  const counts = useMemo(() => {
    return {
      all: screens.length,
      online: screens.filter(
        (screen) => screen.display_status === "online",
      ).length,
      offline: screens.filter(
        (screen) => screen.display_status === "offline",
      ).length,
      pending: screens.filter(
        (screen) => screen.display_status === "pending",
      ).length,
    };
  }, [screens]);

  const visibleScreens = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return screens.filter((screen) => {
      if (filter !== "all" && screen.display_status !== filter) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return [screen.name, screen.owner_name, screen.owner_company].some(
        (value) => value?.toLowerCase().includes(normalizedQuery),
      );
    });
  }, [filter, query, screens]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="relative w-full xl:max-w-sm">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search screens or owners"
            aria-label="Search screens"
            className="h-10 w-full rounded-full border border-white/10 bg-white/5 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-muted focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/40"
          />
        </div>

        <div className="flex flex-wrap gap-2" aria-label="Filter screens">
          {filters.map((item) => {
            const active = filter === item.value;

            return (
              <button
                key={item.value}
                type="button"
                onClick={() => setFilter(item.value)}
                aria-pressed={active}
                className={cn(
                  "inline-flex h-9 items-center gap-1.5 rounded-full border px-4 text-xs font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60",
                  active
                    ? "brand-gradient border-transparent text-white shadow-brand"
                    : "border-white/10 bg-white/5 text-white/60 hover:border-white/20 hover:bg-white/10 hover:text-white",
                )}
              >
                {item.label}
                <span
                  className={cn(
                    "tabular-nums",
                    active ? "text-white/70" : "text-white/35",
                  )}
                >
                  {counts[item.value]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {loadError ? (
        <p
          role="alert"
          className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200"
        >
          Screens could not be loaded. {loadError}
        </p>
      ) : null}

      {visibleScreens.length === 0 ? (
        <Card className="p-8 text-center hover:border-white/10 hover:shadow-none">
          <p className="text-sm font-medium text-white">
            {screens.length === 0
              ? "No screens found."
              : "No screens match your filters."}
          </p>
          <p className="mt-1 text-sm text-body">
            {screens.length === 0
              ? "Paired screens will appear here."
              : "Try another status filter or search term."}
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0 hover:border-white/10 hover:shadow-none">
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[64rem] text-left text-sm">
              <thead className="border-b border-white/5 bg-white/[0.02] text-xs uppercase tracking-[0.12em] text-muted">
                <tr>
                  <th scope="col" className="px-5 py-3 font-semibold">
                    Name
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Owner
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Last seen
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Created
                  </th>
                  <th scope="col" className="px-5 py-3 text-right font-semibold">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {visibleScreens.map((screen) => (
                  <tr
                    key={screen.id}
                    className="transition duration-200 hover:bg-white/[0.03]"
                  >
                    <td className="max-w-[16rem] px-5 py-3.5">
                      <p className="truncate font-semibold text-white">
                        {screen.name}
                      </p>
                    </td>
                    <td className="max-w-[16rem] px-4 py-3.5">
                      <p className="truncate text-white/75">
                        {screen.owner_name}
                      </p>
                      {screen.owner_company ? (
                        <p className="mt-0.5 truncate text-xs text-muted">
                          {screen.owner_company}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={screen.display_status} />
                    </td>
                    <td className="px-4 py-3.5 text-white/60">
                      {screen.last_seen_label}
                    </td>
                    <td className="px-4 py-3.5 text-white/60">
                      {formatAdminDate(screen.created_at)}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <DeleteScreenButton
                        screenId={screen.id}
                        screenName={screen.name}
                        className="items-end"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-white/5 lg:hidden">
            {visibleScreens.map((screen) => (
              <div key={screen.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">
                      {screen.name}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-body">
                      {screen.owner_name}
                      {screen.owner_company
                        ? ` · ${screen.owner_company}`
                        : ""}
                    </p>
                  </div>
                  <StatusBadge status={screen.display_status} />
                </div>

                <div className="mt-4 flex items-end justify-between gap-3">
                  <dl className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <dt className="text-muted">Last seen</dt>
                      <dd className="mt-0.5 text-white/70">
                        {screen.last_seen_label}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted">Created</dt>
                      <dd className="mt-0.5 text-white/70">
                        {formatAdminDate(screen.created_at)}
                      </dd>
                    </div>
                  </dl>
                  <DeleteScreenButton
                    screenId={screen.id}
                    screenName={screen.name}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <p
        className={cn(
          "text-xs text-muted",
          visibleScreens.length === 0 && "sr-only",
        )}
      >
        Showing {visibleScreens.length} of {screens.length} screens.
      </p>
    </div>
  );
}
