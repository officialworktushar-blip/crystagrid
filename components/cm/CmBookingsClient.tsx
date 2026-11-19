"use client";

import Link from "next/link";
import { useMemo } from "react";
import { AlertTriangle, ArrowUpRight } from "lucide-react";
import FilterBar from "@/components/ui/FilterBar";
import {
  ADMIN_BOOKING_STATUSES,
  formatBookingId,
  formatBookingStatus,
} from "@/lib/ad-bookings";
import { formatINR } from "@/lib/ads";
import {
  cmBookingNeedsContent,
  formatCmBookingDateRange,
  isCmBookingLive,
  type CmBooking,
} from "@/lib/cm";
import { cn } from "@/lib/utils";
import { useFilters } from "@/lib/useFilters";

type CmBookingFilters = {
  search: string;
  status: string;
  city: string;
  tier: string;
  item: string;
  dateFrom: string;
  dateTo: string;
  needsContent: boolean;
  liveNow: boolean;
};

const statusStyles: Record<string, string> = {
  pending: "border-amber-400/20 bg-amber-400/10 text-amber-300",
  confirmed: "border-sky-400/20 bg-sky-400/10 text-sky-300",
  running: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
  completed: "border-blue-400/20 bg-blue-400/10 text-blue-300",
  cancelled: "border-red-400/20 bg-red-400/10 text-red-300",
};

function bookingCityLabel(
  booking: CmBooking,
  cityNames: Record<string, string>,
) {
  const value = booking.city?.trim();

  if (!value) {
    return "—";
  }

  return cityNames[value] ?? value;
}

function itemNames(booking: CmBooking) {
  return booking.items
    .map((item) => item.name?.trim())
    .filter((value): value is string => Boolean(value));
}

function StatusChip({ status }: { status: string }) {
  const normalized = status.trim().toLowerCase();

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
        statusStyles[normalized] ??
          "border-white/10 bg-white/5 text-white/50",
      )}
    >
      {formatBookingStatus(status)}
    </span>
  );
}

function ContentFlags({ booking }: { booking: CmBooking }) {
  const needsContent = cmBookingNeedsContent(booking);
  const live = isCmBookingLive(booking);

  if (!needsContent && !live) {
    return <span className="text-xs text-muted">—</span>;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {needsContent ? (
        <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/20 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
          <AlertTriangle aria-hidden="true" className="h-3 w-3" />
          Needs content
        </span>
      ) : null}
      {live ? (
        <span className="inline-flex items-center rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
          Live now
        </span>
      ) : null}
    </div>
  );
}

export default function CmBookingsClient({
  bookings,
  cityNames,
  initialNeedsContent = false,
  loadError,
}: {
  bookings: CmBooking[];
  cityNames: Record<string, string>;
  initialNeedsContent?: boolean;
  loadError?: string | null;
}) {
  const initialFilters = useMemo<CmBookingFilters>(
    () => ({
      search: "",
      status: "",
      city: "",
      tier: "",
      item: "",
      dateFrom: "",
      dateTo: "",
      needsContent: initialNeedsContent,
      liveNow: false,
    }),
    [initialNeedsContent],
  );

  const { filters, set, clear, activeCount } = useFilters(initialFilters);

  const statusOptions = useMemo(
    () =>
      ADMIN_BOOKING_STATUSES.map((status) => ({
        value: status,
        label: formatBookingStatus(status),
      })),
    [],
  );

  const cityOptions = useMemo(() => {
    const labels = new Set<string>(Object.values(cityNames));

    for (const booking of bookings) {
      const label = bookingCityLabel(booking, cityNames);

      if (label !== "—") {
        labels.add(label);
      }
    }

    return Array.from(labels)
      .sort((left, right) => left.localeCompare(right))
      .map((label) => ({ value: label, label }));
  }, [bookings, cityNames]);

  const tierOptions = useMemo(
    () =>
      Array.from(
        new Set(
          bookings
            .map((booking) => booking.tier?.trim() ?? "")
            .filter((value) => value.length > 0),
        ),
      )
        .sort((left, right) => left.localeCompare(right))
        .map((value) => ({ value, label: value })),
    [bookings],
  );

  const itemOptions = useMemo(
    () =>
      Array.from(new Set(bookings.flatMap(itemNames)))
        .sort((left, right) => left.localeCompare(right))
        .map((value) => ({ value, label: value })),
    [bookings],
  );

  const filteredBookings = useMemo(() => {
    const needle = filters.search.trim().toLowerCase();

    return bookings.filter((booking) => {
      const names = itemNames(booking);

      if (
        needle &&
        ![
          booking.customerName,
          booking.companyName ?? "",
          booking.id,
          booking.tier ?? "",
          ...names,
        ].some((value) => value.toLowerCase().includes(needle))
      ) {
        return false;
      }

      if (filters.status && booking.status.toLowerCase() !== filters.status) {
        return false;
      }

      if (
        filters.city &&
        bookingCityLabel(booking, cityNames) !== filters.city
      ) {
        return false;
      }

      if (filters.tier && booking.tier !== filters.tier) {
        return false;
      }

      if (filters.item && !names.includes(filters.item)) {
        return false;
      }

      const startDate = booking.startDate?.slice(0, 10) ?? "";

      if (filters.dateFrom && (!startDate || startDate < filters.dateFrom)) {
        return false;
      }

      if (filters.dateTo && (!startDate || startDate > filters.dateTo)) {
        return false;
      }

      if (filters.needsContent && !cmBookingNeedsContent(booking)) {
        return false;
      }

      if (filters.liveNow && !isCmBookingLive(booking)) {
        return false;
      }

      return true;
    });
  }, [bookings, cityNames, filters]);

  const selects = [
    {
      key: "status",
      label: "Status",
      value: filters.status,
      onChange: (value: string) => set("status", value),
      options: statusOptions,
    },
    {
      key: "city",
      label: "City",
      value: filters.city,
      onChange: (value: string) => set("city", value),
      options: cityOptions,
    },
    {
      key: "tier",
      label: "Tier",
      value: filters.tier,
      onChange: (value: string) => set("tier", value),
      options: tierOptions,
    },
    {
      key: "item",
      label: "Property / package",
      value: filters.item,
      onChange: (value: string) => set("item", value),
      options: itemOptions,
    },
  ];

  return (
    <section className="space-y-4" aria-label="Customer manager bookings">
      {loadError ? (
        <p
          role="alert"
          className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200"
        >
          {loadError}
        </p>
      ) : null}

      <FilterBar
        search={{
          value: filters.search,
          onChange: (value) => set("search", value),
          placeholder: "Search customer, id, tier, or item",
        }}
        selects={selects}
        toggles={[
          {
            key: "needsContent",
            label: "Needs content",
            checked: filters.needsContent,
            onChange: (value) => set("needsContent", value),
          },
          {
            key: "liveNow",
            label: "Live now",
            checked: filters.liveNow,
            onChange: (value) => set("liveNow", value),
          },
        ]}
        dateRange={{
          label: "Start date",
          from: filters.dateFrom,
          to: filters.dateTo,
          onChange: (range) => {
            set("dateFrom", range.from);
            set("dateTo", range.to);
          },
        }}
        resultCount={filteredBookings.length}
        total={bookings.length}
        onClear={clear}
      />

      <p className="text-xs text-muted">
        {activeCount > 0 ? "Filtered bookings" : "All bookings"}
      </p>

      {bookings.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-16 text-center">
          <p className="text-base font-semibold text-white">No bookings yet</p>
          <p className="mt-1 text-sm leading-6 text-muted">
            Customer campaigns will appear here once they are submitted.
          </p>
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-16 text-center">
          <p className="text-base font-semibold text-white">
            No bookings match these filters
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
                  <th className="px-5 py-3.5">Customer</th>
                  <th className="px-5 py-3.5">Booking</th>
                  <th className="px-5 py-3.5">Package / items</th>
                  <th className="px-5 py-3.5">City</th>
                  <th className="px-5 py-3.5">Dates</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Flags</th>
                  <th className="px-5 py-3.5 text-right">Total</th>
                  <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map((booking) => (
                  <tr
                    key={booking.id}
                    className="border-b border-white/5 text-sm text-body transition duration-200 last:border-0 hover:bg-white/[0.02]"
                  >
                    <td className="px-5 py-4">
                      <p className="font-semibold text-white">
                        {booking.customerName}
                      </p>
                      {booking.companyName ? (
                        <p className="mt-0.5 text-xs text-muted">
                          {booking.companyName}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-mono text-xs font-semibold uppercase text-white/80">
                        {formatBookingId(booking.id)}
                      </span>
                    </td>
                    <td className="max-w-[16rem] px-5 py-4">
                      <p className="truncate text-sm text-white/80">
                        {itemNames(booking).join(", ") || "No items"}
                      </p>
                      {booking.tier ? (
                        <p className="mt-0.5 text-xs text-muted">
                          {booking.tier}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-5 py-4 text-sm text-white/80">
                      {bookingCityLabel(booking, cityNames)}
                    </td>
                    <td className="px-5 py-4 text-xs text-white/70">
                      {formatCmBookingDateRange(booking)}
                    </td>
                    <td className="px-5 py-4">
                      <StatusChip status={booking.status} />
                    </td>
                    <td className="px-5 py-4">
                      <ContentFlags booking={booking} />
                    </td>
                    <td className="px-5 py-4 text-right font-semibold tabular-nums text-white">
                      {formatINR(booking.total)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/cm/customers/${booking.customerId}`}
                        aria-label={`Open customer for booking ${formatBookingId(booking.id)}`}
                        className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 text-xs font-semibold text-white/70 transition duration-200 hover:border-sky-400/40 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60"
                      >
                        Open
                        <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 lg:hidden">
            {filteredBookings.map((booking) => (
              <article
                key={booking.id}
                className="rounded-3xl border border-white/5 bg-surface p-4 shadow-card"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-white">
                      {booking.customerName}
                    </p>
                    <p className="mt-0.5 font-mono text-xs font-semibold uppercase text-muted">
                      {formatBookingId(booking.id)}
                    </p>
                  </div>
                  <StatusChip status={booking.status} />
                </div>

                <p className="mt-3 text-sm text-white/80">
                  {itemNames(booking).join(", ") || "No items"}
                </p>

                <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-muted">City</p>
                    <p className="mt-0.5 text-white/80">
                      {bookingCityLabel(booking, cityNames)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted">Total</p>
                    <p className="mt-0.5 font-semibold tabular-nums text-white">
                      {formatINR(booking.total)}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-muted">Dates</p>
                    <p className="mt-0.5 text-white/80">
                      {formatCmBookingDateRange(booking)}
                    </p>
                  </div>
                </div>

                <div className="mt-3">
                  <ContentFlags booking={booking} />
                </div>

                <Link
                  href={`/cm/customers/${booking.customerId}`}
                  className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 text-xs font-semibold text-white/70 transition duration-200 hover:border-sky-400/40 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60"
                >
                  Open customer
                  <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
                </Link>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
