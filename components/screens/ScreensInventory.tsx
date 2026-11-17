"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Loader2, MapPin, Pencil, Settings, Trash2 } from "lucide-react";
import StatusBadge from "@/components/dashboard/StatusBadge";
import Button from "@/components/ui/Button";
import FilterBar from "@/components/ui/FilterBar";
import EditScreenDialog from "@/components/screens/EditScreenDialog";
import type { Role } from "@/lib/roles";
import {
  exactLocation,
  staffScreenStatus,
  type StaffScreenRow,
} from "@/lib/staff-screens";
import { formatRelativeTime } from "@/lib/screens";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { useFilters } from "@/lib/useFilters";

type InventoryFilters = {
  search: string;
  city: string;
  place: string;
  property: string;
  type: string;
  status: string;
  client: string;
  addedBy: string;
  unplaced: boolean;
  activeCampaign: boolean;
};

const initialFilters: InventoryFilters = {
  search: "",
  city: "",
  place: "",
  property: "",
  type: "",
  status: "",
  client: "",
  addedBy: "",
  unplaced: false,
  activeCampaign: false,
};

const sortOptions = [
  { value: "created", label: "Newest first" },
  { value: "name", label: "Name A-Z" },
  { value: "lastSeen", label: "Last seen" },
];

function uniqueOptions(values: (string | null | undefined)[]) {
  return Array.from(
    new Set(
      values
        .map((value) => value?.trim() ?? "")
        .filter((value) => value.length > 0),
    ),
  ).sort((left, right) => left.localeCompare(right));
}

function addedByLabel(row: StaffScreenRow) {
  return row.added_by_name?.trim() || row.added_by?.trim() || "Unknown";
}

function hasActiveCampaign(row: StaffScreenRow) {
  return (row.active_bookings ?? 0) > 0 || (row.active_clients?.length ?? 0) > 0;
}

export default function ScreensInventory({
  rows,
  canEdit,
  role,
  onChanged,
}: {
  rows: StaffScreenRow[];
  canEdit: boolean;
  role: Role;
  onChanged?: () => void;
}) {
  const router = useRouter();
  const { filters, set, clear, activeCount } = useFilters(initialFilters);
  const [sort, setSort] = useState("created");
  const [editingRow, setEditingRow] = useState<StaffScreenRow | null>(null);
  const [deletingRow, setDeletingRow] = useState<StaffScreenRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const cityOptions = useMemo(
    () =>
      uniqueOptions(
        rows
          .filter((row) => !filters.place || row.place_name === filters.place)
          .map((row) => row.city_name),
      ),
    [filters.place, rows],
  );

  const placeOptions = useMemo(
    () =>
      uniqueOptions(
        rows
          .filter((row) => !filters.city || row.city_name === filters.city)
          .map((row) => row.place_name),
      ),
    [filters.city, rows],
  );

  const propertyOptions = useMemo(() => {
    const map = new Map<string, string>();

    for (const row of rows) {
      if (!row.property_id || !row.property_name) {
        continue;
      }

      if (filters.city && row.city_name !== filters.city) {
        continue;
      }

      if (filters.place && row.place_name !== filters.place) {
        continue;
      }

      map.set(row.property_id, row.property_name);
    }

    return Array.from(map.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((left, right) => left.label.localeCompare(right.label));
  }, [filters.city, filters.place, rows]);

  const typeOptions = useMemo(
    () => uniqueOptions(rows.map((row) => row.type_name)),
    [rows],
  );

  const clientOptions = useMemo(
    () => uniqueOptions(rows.flatMap((row) => row.active_clients ?? [])),
    [rows],
  );

  const addedByOptions = useMemo(
    () => uniqueOptions(rows.map(addedByLabel)),
    [rows],
  );

  const filteredRows = useMemo(() => {
    const needle = filters.search.trim().toLowerCase();

    const result = rows.filter((row) => {
      const status = staffScreenStatus(row);

      if (
        needle &&
        ![
          row.name,
          row.property_name,
          row.city_name,
          row.place_name,
          row.type_name,
          row.block,
          row.spot,
          row.shop_name,
          row.legacy_location,
          row.owner_name,
          addedByLabel(row),
          ...(row.active_clients ?? []),
        ]
          .filter((value): value is string => typeof value === "string")
          .some((value) => value.toLowerCase().includes(needle))
      ) {
        return false;
      }

      if (filters.city && row.city_name !== filters.city) {
        return false;
      }

      if (filters.place && row.place_name !== filters.place) {
        return false;
      }

      if (filters.property && row.property_id !== filters.property) {
        return false;
      }

      if (filters.type && row.type_name !== filters.type) {
        return false;
      }

      if (filters.status && status !== filters.status) {
        return false;
      }

      if (
        filters.client &&
        !(row.active_clients ?? []).includes(filters.client)
      ) {
        return false;
      }

      if (filters.addedBy && addedByLabel(row) !== filters.addedBy) {
        return false;
      }

      if (filters.unplaced && row.property_id) {
        return false;
      }

      if (filters.activeCampaign && !hasActiveCampaign(row)) {
        return false;
      }

      return true;
    });

    return result.sort((left, right) => {
      if (sort === "name") {
        return left.name.localeCompare(right.name);
      }

      if (sort === "lastSeen") {
        const leftTime = Date.parse(left.last_seen ?? "") || 0;
        const rightTime = Date.parse(right.last_seen ?? "") || 0;
        return rightTime - leftTime;
      }

      return Date.parse(right.created_at) - Date.parse(left.created_at);
    });
  }, [filters, rows, sort]);

  const editingSiblingsCount = editingRow?.property_id
    ? rows.filter((row) => row.property_id === editingRow.property_id).length
    : 1;

  function handleChanged() {
    onChanged?.();
    router.refresh();
  }

  async function confirmDelete() {
    if (!deletingRow) {
      return;
    }

    setDeleting(true);
    setDeleteError(null);

    const supabase = createClient();
    const { error } = await supabase
      .from("screens")
      .delete()
      .eq("id", deletingRow.id);

    setDeleting(false);

    if (error) {
      setDeleteError(error.message);
      return;
    }

    setDeletingRow(null);
    handleChanged();
  }

  const selects = [
    {
      key: "city",
      label: "City",
      value: filters.city,
      onChange: (value: string) => {
        set("city", value);
        set("place", "");
        set("property", "");
      },
      options: cityOptions.map((value) => ({ value, label: value })),
    },
    {
      key: "place",
      label: "Place",
      value: filters.place,
      onChange: (value: string) => {
        set("place", value);
        set("property", "");
      },
      options: placeOptions.map((value) => ({ value, label: value })),
    },
    {
      key: "property",
      label: "Property",
      value: filters.property,
      onChange: (value: string) => set("property", value),
      options: propertyOptions,
    },
    {
      key: "type",
      label: "Type",
      value: filters.type,
      onChange: (value: string) => set("type", value),
      options: typeOptions.map((value) => ({ value, label: value })),
    },
    {
      key: "status",
      label: "Status",
      value: filters.status,
      onChange: (value: string) => set("status", value),
      options: [
        { value: "online", label: "Online" },
        { value: "offline", label: "Offline" },
        { value: "pending", label: "Pending" },
      ],
    },
    {
      key: "client",
      label: "Client",
      value: filters.client,
      onChange: (value: string) => set("client", value),
      options: clientOptions.map((value) => ({ value, label: value })),
    },
    {
      key: "addedBy",
      label: "Added by",
      value: filters.addedBy,
      onChange: (value: string) => set("addedBy", value),
      options: addedByOptions.map((value) => ({ value, label: value })),
    },
  ];

  return (
    <section
      data-role={role}
      aria-label={`Screen inventory (${role})`}
      className="space-y-4"
    >
      <FilterBar
        search={{
          value: filters.search,
          onChange: (value) => set("search", value),
          placeholder: "Search screens, locations, clients",
        }}
        selects={selects}
        toggles={[
          {
            key: "unplaced",
            label: "Not placed only",
            checked: filters.unplaced,
            onChange: (value) => set("unplaced", value),
          },
          {
            key: "activeCampaign",
            label: "With active campaign",
            checked: filters.activeCampaign,
            onChange: (value) => set("activeCampaign", value),
          },
        ]}
        resultCount={filteredRows.length}
        total={rows.length}
        onClear={clear}
      />

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted">
          {activeCount > 0 ? "Filters applied" : "All screens"}
        </p>
        <label className="inline-flex h-10 items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 text-sm text-white/70">
          <span className="text-xs text-muted">Sort</span>
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value)}
            aria-label="Sort screens"
            className="cursor-pointer bg-transparent text-sm text-white outline-none [&>option]:bg-surface-2"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-16 text-center">
          <p className="text-base font-semibold text-white">No screens yet</p>
          <p className="mt-1 text-sm leading-6 text-muted">
            Add a screen to start tracking it.
          </p>
        </div>
      ) : filteredRows.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-16 text-center">
          <p className="text-base font-semibold text-white">
            No screens match these filters
          </p>
          <p className="mt-1 text-sm leading-6 text-muted">
            Try clearing the filters or searching for something else.
          </p>
        </div>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-3xl border border-white/5 bg-surface shadow-card lg:block">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02] text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                  <th className="px-5 py-3.5">Screen</th>
                  <th className="px-5 py-3.5">Location</th>
                  <th className="px-5 py-3.5">Client</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Last seen</th>
                  <th className="px-5 py-3.5">Campaign</th>
                  <th className="px-5 py-3.5">Added by</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-white/5 text-sm text-body transition duration-200 last:border-0 hover:bg-white/[0.02]"
                  >
                    <td className="px-5 py-4">
                      <p className="font-semibold text-white">{row.name}</p>
                      <p className="mt-0.5 text-xs text-muted">
                        {row.property_name ?? "Not placed"}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm text-white/80">
                        {exactLocation(row)}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {row.type_name ? (
                          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-white/50">
                            {row.type_name}
                          </span>
                        ) : null}
                        {!row.property_id && row.legacy_location ? (
                          <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-2 py-0.5 text-[10px] text-amber-300">
                            Legacy
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm text-white/80">
                        {row.owner_name ?? "—"}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={staffScreenStatus(row)} />
                    </td>
                    <td className="px-5 py-4 text-xs text-muted">
                      {formatRelativeTime(row.last_seen)}
                    </td>
                    <td className="px-5 py-4">
                      {hasActiveCampaign(row) ? (
                        <div className="space-y-0.5">
                          <p className="text-xs font-semibold text-emerald-300">
                            {(row.active_bookings ?? 0) > 0
                              ? `${row.active_bookings} active`
                              : "Active"}
                          </p>
                          {(row.active_clients ?? []).length > 0 ? (
                            <p className="text-xs text-muted">
                              {row.active_clients?.slice(0, 2).join(", ")}
                              {(row.active_clients?.length ?? 0) > 2
                                ? " +more"
                                : ""}
                            </p>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-xs text-muted">None</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-xs text-white/70">
                      {addedByLabel(row)}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        {canEdit ? (
                          <button
                            type="button"
                            onClick={() => setEditingRow(row)}
                            aria-label={`Edit ${row.name}`}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/60 transition duration-200 hover:border-sky-400/40 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60"
                          >
                            <Pencil aria-hidden="true" className="h-4 w-4" />
                          </button>
                        ) : null}
                        {canEdit ? (
                          <button
                            type="button"
                            onClick={() => setEditingRow(row)}
                            aria-label={`Display settings for ${row.name}`}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/60 transition duration-200 hover:border-sky-400/40 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60"
                          >
                            <Settings aria-hidden="true" className="h-4 w-4" />
                          </button>
                        ) : null}
                        {canEdit ? (
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteError(null);
                              setDeletingRow(row);
                            }}
                            aria-label={`Delete ${row.name}`}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-red-400/20 bg-red-400/5 text-red-300/70 transition duration-200 hover:border-red-400/50 hover:text-red-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/60"
                          >
                            <Trash2 aria-hidden="true" className="h-4 w-4" />
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 lg:hidden">
            {filteredRows.map((row) => (
              <article
                key={row.id}
                className="rounded-3xl border border-white/5 bg-surface p-4 shadow-card"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-white">
                      {row.name}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted">
                      {row.property_name ?? "Not placed"}
                    </p>
                  </div>
                  <StatusBadge status={staffScreenStatus(row)} />
                </div>

                <div className="mt-3 flex items-start gap-2 text-sm text-body">
                  <MapPin aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-white/35" />
                  <div>
                    <p>{exactLocation(row)}</p>
                    {!row.property_id && row.legacy_location ? (
                      <span className="mt-1 inline-block rounded-full border border-amber-400/20 bg-amber-400/10 px-2 py-0.5 text-[10px] text-amber-300">
                        Legacy
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-muted">Client</p>
                    <p className="mt-0.5 truncate text-white/80">
                      {row.owner_name ?? "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted">Last seen</p>
                    <p className="mt-0.5 text-white/80">
                      {formatRelativeTime(row.last_seen)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted">Campaign</p>
                    <p
                      className={cn(
                        "mt-0.5",
                        hasActiveCampaign(row) ? "text-emerald-300" : "text-white/50",
                      )}
                    >
                      {hasActiveCampaign(row)
                        ? `${row.active_bookings ?? 0} active`
                        : "None"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted">Added by</p>
                    <p className="mt-0.5 truncate text-white/80">
                      {addedByLabel(row)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {canEdit ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setEditingRow(row)}
                      className="gap-2"
                    >
                      <Pencil aria-hidden="true" className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                  ) : null}
                  {canEdit ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setEditingRow(row)}
                      className="gap-2"
                    >
                      <Settings aria-hidden="true" className="h-3.5 w-3.5" />
                      Display
                    </Button>
                  ) : null}
                  {canEdit ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setDeleteError(null);
                        setDeletingRow(row);
                      }}
                      className="gap-2 text-red-300 hover:text-red-200"
                    >
                      <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                      Delete
                    </Button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </>
      )}

      {editingRow ? (
        <EditScreenDialog
          screen={editingRow}
          siblingsCount={editingSiblingsCount}
          onClose={() => setEditingRow(null)}
          onChanged={() => {
            setEditingRow(null);
            handleChanged();
          }}
        />
      ) : null}

      {deletingRow ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <button
            type="button"
            aria-label="Cancel delete"
            onClick={() => setDeletingRow(null)}
            className="absolute inset-0"
          />
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-screen-title"
            className="relative w-full max-w-md rounded-3xl border border-white/10 bg-surface p-6 shadow-card"
          >
            <h2
              id="delete-screen-title"
              className="text-lg font-semibold tracking-tight text-white"
            >
              Delete {deletingRow.name}?
            </h2>
            <p className="mt-2 text-sm leading-6 text-body">
              This unpairs the device. It will show a new pairing code.
            </p>
            {deleteError ? (
              <p
                role="alert"
                className="mt-3 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200"
              >
                {deleteError}
              </p>
            ) : null}
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button
                variant="secondary"
                onClick={() => setDeletingRow(null)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => void confirmDelete()}
                disabled={deleting}
                className="gap-2 border border-red-300/30 bg-red-400/90 text-white hover:bg-red-400"
              >
                {deleting ? (
                  <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                ) : null}
                {deleting ? "Deleting..." : "Delete screen"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
