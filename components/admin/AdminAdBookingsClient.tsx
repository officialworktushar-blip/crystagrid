"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ArrowRight,
  CalendarDays,
  ClipboardList,
  Loader2,
  Monitor,
  ReceiptText,
  X,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import FilterBar from "@/components/ui/FilterBar";
import PanelSelect from "@/components/ui/PanelSelect";
import type {
  AdBooking,
  AdBookingItem,
  AdBookingScreen,
} from "@/lib/ad-bookings";
import {
  ADMIN_BOOKING_STATUSES,
  BOOKING_FILTER_STATUSES,
  bookingTimestamp,
  formatBookingId,
  formatBookingStatus,
  normalizeAdBookingScreens,
} from "@/lib/ad-bookings";
import { formatAdminDate } from "@/lib/admin";
import type { AdCity } from "@/lib/ads";
import { formatINR, todayIST } from "@/lib/ads";
import { formatRelativeTime } from "@/lib/screens";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { useFilters } from "@/lib/useFilters";

type Notice = {
  type: "success" | "error";
  message: string;
};

type BookingScreensState = {
  bookingId: string;
  loading: boolean;
  error: string | null;
  screens: AdBookingScreen[];
};

type BookingFilters = {
  search: string;
  status: string;
  city: string;
  tier: string;
  item: string;
  dateFrom: string;
  dateTo: string;
  needsContent: boolean;
  liveNow: boolean;
  showDrafts: boolean;
};

const emptyFilters: BookingFilters = {
  search: "",
  status: "",
  city: "",
  tier: "",
  item: "",
  dateFrom: "",
  dateTo: "",
  needsContent: false,
  liveNow: false,
  showDrafts: false,
};

const inputClass =
  "h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white outline-none transition placeholder:text-muted focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/40 disabled:opacity-50";

const statusStyles: Record<
  string,
  { badge: string; dot: string }
> = {
  draft: {
    badge: "border-white/10 bg-white/5 text-white/50",
    dot: "bg-white/40",
  },
  pending: {
    badge: "border-amber-400/20 bg-amber-400/10 text-amber-300",
    dot: "bg-amber-400",
  },
  confirmed: {
    badge: "border-sky-400/20 bg-sky-400/10 text-sky-300",
    dot: "bg-sky-400",
  },
  running: {
    badge:
      "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
    dot: "bg-emerald-400",
  },
  completed: {
    badge:
      "border-blue-400/20 bg-blue-400/10 text-blue-300",
    dot: "bg-blue-400",
  },
  cancelled: {
    badge: "border-red-400/20 bg-red-400/10 text-red-300",
    dot: "bg-red-400",
  },
};

function BookingStatusBadge({ status }: { status: string }) {
  const normalized = status.trim().toLowerCase();
  const style = statusStyles[normalized] ?? statusStyles.draft;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        style.badge,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", style.dot)} />
      {formatBookingStatus(status)}
    </span>
  );
}

function itemFilterValue(item: AdBookingItem): string | null {
  const type =
    item.type ??
    (item.packageId && !item.propertyId
      ? "package"
      : item.propertyId
        ? "property"
        : null);
  const id = type === "package" ? item.packageId : item.propertyId;

  return type && id ? `${type}:${id}` : null;
}

function ContentChip({ hasContent }: { hasContent: boolean }) {
  return (
    <span
      title={hasContent ? undefined : "Needs content"}
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
        hasContent
          ? "border-sky-400/20 bg-sky-400/10 text-sky-300"
          : "border-amber-400/20 bg-amber-400/10 text-amber-300",
      )}
    >
      {hasContent ? "Assigned" : "No content"}
    </span>
  );
}

function screensLabel(screens: AdBookingScreen[]): string {
  const online = screens.filter((screen) => screen.online).length;

  return `${screens.length} screens (${online} online)`;
}

function bookingScreenLocation(screen: AdBookingScreen): string {
  return (
    [
      screen.block,
      screen.spot,
      screen.shop_name ? `Shop: ${screen.shop_name}` : null,
    ]
      .filter(
        (value): value is string =>
          typeof value === "string" && value.trim().length > 0,
      )
      .join(" · ") || "Not set"
  );
}

function formatBookingDateRange(booking: AdBooking): string {
  if (!booking.startDate && !booking.endDate) {
    return "—";
  }

  return `${formatAdminDate(booking.startDate)} – ${formatAdminDate(
    booking.endDate,
  )}`;
}

function itemRateLabel(item: AdBookingItem): string {
  if (item.rate === null) {
    return "Rate unavailable";
  }

  return `${formatINR(item.rate)} / ${item.rateUnit || "unit"}`;
}

export default function AdminAdBookingsClient({
  bookings: initialBookings,
  cities,
  loadError,
}: {
  bookings: AdBooking[];
  cities: AdCity[];
  loadError: string | null;
}) {
  const supabase = useMemo(() => createClient(), []);
  const { filters, set, clear } = useFilters(emptyFilters);
  const [bookings, setBookings] =
    useState<AdBooking[]>(initialBookings);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draftStatus, setDraftStatus] = useState("");
  const [draftNotes, setDraftNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [drawerError, setDrawerError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [screensState, setScreensState] =
    useState<BookingScreensState | null>(null);

  const cityOptions = useMemo(() => {
    const names = new Set<string>();

    for (const city of cities) {
      const name = city.name.trim();

      if (name) {
        names.add(name);
      }
    }

    for (const booking of bookings) {
      const name = booking.city?.trim();

      if (name) {
        names.add(name);
      }
    }

    return [...names]
      .sort((a, b) => a.localeCompare(b))
      .map((name) => ({ value: name, label: name }));
  }, [bookings, cities]);

  const tierOptions = useMemo(() => {
    const tiers = new Set<string>();

    for (const booking of bookings) {
      const tier = booking.tier?.trim();

      if (tier) {
        tiers.add(tier);
      }
    }

    return [...tiers]
      .sort((a, b) => a.localeCompare(b))
      .map((tier) => ({ value: tier, label: tier }));
  }, [bookings]);

  const itemOptions = useMemo(() => {
    const options = new Map<string, string>();

    for (const booking of bookings) {
      for (const item of booking.items) {
        const value = itemFilterValue(item);
        const label = item.name.trim();

        if (value && label && !options.has(value)) {
          options.set(value, label);
        }
      }
    }

    return [...options.entries()]
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([value, label]) => ({ value, label }));
  }, [bookings]);

  const draftCount = bookings.filter(
    (booking) => booking.status === "draft",
  ).length;

  const visibleBookings = useMemo(() => {
    const normalizedQuery = filters.search.trim().toLowerCase();
    const today = todayIST();

    return bookings
      .filter((booking) => {
        if (booking.status === "draft" && !filters.showDrafts) {
          return false;
        }

        if (filters.status && booking.status !== filters.status) {
          return false;
        }

        if (
          filters.city &&
          booking.city?.trim().toLowerCase() !==
            filters.city.trim().toLowerCase()
        ) {
          return false;
        }

        if (
          filters.tier &&
          booking.tier?.trim().toLowerCase() !==
            filters.tier.trim().toLowerCase()
        ) {
          return false;
        }

        if (
          filters.item &&
          !booking.items.some(
            (item) => itemFilterValue(item) === filters.item,
          )
        ) {
          return false;
        }

        const startDate = booking.startDate?.slice(0, 10) ?? "";

        if (filters.dateFrom && (!startDate || startDate < filters.dateFrom)) {
          return false;
        }

        if (filters.dateTo && (!startDate || startDate > filters.dateTo)) {
          return false;
        }

        if (filters.needsContent && booking.hasContent) {
          return false;
        }

        if (filters.liveNow) {
          const status = booking.status.trim().toLowerCase();
          const endDate = booking.endDate?.slice(0, 10) ?? "";
          const isLive =
            status === "running" ||
            (status === "confirmed" &&
              Boolean(startDate) &&
              Boolean(endDate) &&
              startDate <= today &&
              today <= endDate);

          if (!isLive) {
            return false;
          }
        }

        if (!normalizedQuery) {
          return true;
        }

        const values = [
          booking.id,
          formatBookingId(booking.id),
          booking.customerName,
          booking.companyName,
          ...booking.items.flatMap((item) => [item.name, item.detail]),
        ];

        return values.some((value) =>
          value?.toLowerCase().includes(normalizedQuery),
        );
      })
      .sort((a, b) => bookingTimestamp(b) - bookingTimestamp(a));
  }, [bookings, filters]);

  const selected = useMemo(
    () => bookings.find((booking) => booking.id === selectedId) ?? null,
    [bookings, selectedId],
  );

  const statusOptions = useMemo(() => {
    const options: string[] = [...ADMIN_BOOKING_STATUSES];

    if (
      selected?.status &&
      !options.includes(selected.status)
    ) {
      options.unshift(selected.status);
    }

    return options;
  }, [selected]);

  const hiddenOnlyDrafts =
    visibleBookings.length === 0 &&
    !filters.showDrafts &&
    !filters.status &&
    draftCount > 0;

  const closeDrawer = useCallback(() => {
    setSelectedId(null);
    setDrawerError(null);
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setScreensState(null);
      return;
    }

    let cancelled = false;

    setScreensState({
      bookingId: selectedId,
      loading: true,
      error: null,
      screens: [],
    });

    void supabase
      .rpc("booking_screens", { p_booking: selectedId })
      .then(({ data, error }) => {
        if (cancelled) {
          return;
        }

        if (error) {
          setScreensState({
            bookingId: selectedId,
            loading: false,
            error: error.message,
            screens: [],
          });
          return;
        }

        setScreensState({
          bookingId: selectedId,
          loading: false,
          error: null,
          screens: normalizeAdBookingScreens(data),
        });
      });

    return () => {
      cancelled = true;
    };
  }, [selectedId, supabase]);

  useEffect(() => {
    if (!selected) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !saving) {
        closeDrawer();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeDrawer, saving, selected]);

  function handleStatusFilterChange(value: string) {
    set("status", value);

    if (value === "draft") {
      set("showDrafts", true);
    }
  }

  function openDrawer(booking: AdBooking) {
    setSelectedId(booking.id);
    setDraftStatus(booking.status);
    setDraftNotes(booking.adminNotes);
    setDrawerError(null);
    setNotice(null);
  }

  async function handleSaveBooking() {
    if (!selected || saving) {
      return;
    }

    const nextStatus =
      draftStatus.trim().toLowerCase() || selected.status;
    const notes = draftNotes.trim();

    setSaving(true);
    setDrawerError(null);
    setNotice(null);

    const { error } = await supabase.rpc(
      "admin_set_booking_status",
      {
        p_id: selected.id,
        p_status: nextStatus,
        p_notes: notes,
      },
    );

    if (error) {
      setDrawerError(error.message);
      setSaving(false);
      return;
    }

    setBookings((current) =>
      current.map((booking) =>
        booking.id === selected.id
          ? { ...booking, status: nextStatus, adminNotes: notes }
          : booking,
      ),
    );
    setNotice({
      type: "success",
      message: `Booking ${formatBookingId(selected.id)} updated.`,
    });
    setSaving(false);
    closeDrawer();
  }

  return (
    <div className="space-y-6">
      {notice ? (
        <p
          role={notice.type === "error" ? "alert" : "status"}
          className={cn(
            "rounded-2xl border px-4 py-3 text-sm",
            notice.type === "error"
              ? "border-red-400/20 bg-red-400/10 text-red-200"
              : "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
          )}
        >
          {notice.message}
        </p>
      ) : null}

      {loadError ? (
        <p
          role="alert"
          className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200"
        >
          Bookings could not be loaded. {loadError}
        </p>
      ) : null}

      <div>
        <h2 className="text-lg font-semibold tracking-tight text-white">
          All bookings
        </h2>
        <p className="mt-1 text-sm text-body">
          Showing {visibleBookings.length} of {bookings.length}{" "}
          {bookings.length === 1 ? "booking" : "bookings"}.
          {!filters.showDrafts && draftCount > 0
            ? ` ${draftCount} ${
                draftCount === 1 ? "draft is" : "drafts are"
              } hidden.`
            : ""}
        </p>
      </div>

      <FilterBar
        search={{
          value: filters.search,
          onChange: (value) => set("search", value),
          placeholder: "Search bookings",
        }}
        selects={[
          {
            key: "status",
            label: "Status",
            value: filters.status,
            onChange: handleStatusFilterChange,
            options: BOOKING_FILTER_STATUSES.map((status) => ({
              value: status,
              label: formatBookingStatus(status),
            })),
          },
          {
            key: "city",
            label: "City",
            value: filters.city,
            onChange: (value) => set("city", value),
            options: cityOptions,
          },
          {
            key: "tier",
            label: "Tier",
            value: filters.tier,
            onChange: (value) => set("tier", value),
            options: tierOptions,
          },
          {
            key: "item",
            label: "Property / package",
            value: filters.item,
            onChange: (value) => set("item", value),
            options: itemOptions,
          },
        ]}
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
          {
            key: "showDrafts",
            label: "Show drafts",
            checked: filters.showDrafts,
            onChange: (value) => set("showDrafts", value),
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
        resultCount={visibleBookings.length}
        total={bookings.length}
        onClear={clear}
      />

      {visibleBookings.length === 0 ? (
        <Card className="flex flex-col items-center justify-center px-6 py-14 text-center hover:border-white/10 hover:shadow-none">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-brand-sky">
            <CalendarDays aria-hidden="true" className="h-6 w-6" />
          </span>
          <h2 className="mt-4 text-base font-semibold text-white">
            {bookings.length === 0
              ? "No bookings yet"
              : hiddenOnlyDrafts
                ? "Only drafts are available"
                : "No bookings match your filters"}
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-body">
            {bookings.length === 0
              ? "New ad booking requests will appear here."
              : hiddenOnlyDrafts
                ? "Turn on Show drafts to review bookings that have not been submitted yet."
                : "Try another status or search term."}
          </p>
          {hiddenOnlyDrafts ? (
            <Button
              variant="secondary"
              onClick={() => set("showDrafts", true)}
              className="mt-5"
            >
              Show drafts
            </Button>
          ) : null}
        </Card>
      ) : (
        <Card className="overflow-hidden p-0 hover:border-white/10 hover:shadow-none">
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[88rem] text-left text-sm">
              <thead className="border-b border-white/5 bg-white/[0.02] text-xs uppercase tracking-[0.12em] text-muted">
                <tr>
                  <th scope="col" className="px-5 py-3 font-semibold">
                    Booking
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Customer
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    City
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Dates
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Days
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Tier
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Items
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Total
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Content
                  </th>
                  <th
                    scope="col"
                    className="px-5 py-3 text-right font-semibold"
                  >
                    View
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {visibleBookings.map((booking) => (
                  <tr
                    key={booking.id}
                    tabIndex={0}
                    onClick={() => openDrawer(booking)}
                    onKeyDown={(event) => {
                      if (
                        event.key === "Enter" ||
                        event.key === " "
                      ) {
                        event.preventDefault();
                        openDrawer(booking);
                      }
                    }}
                    className="cursor-pointer transition duration-200 hover:bg-white/[0.03] focus-visible:bg-white/[0.03] focus-visible:outline-none"
                  >
                    <td className="px-5 py-3.5">
                      <p className="font-mono text-xs font-semibold tracking-wide text-white">
                        {formatBookingId(booking.id)}
                      </p>
                      <p className="mt-0.5 text-xs text-muted">
                        {formatAdminDate(booking.createdAt)}
                      </p>
                    </td>
                    <td className="max-w-[15rem] px-4 py-3.5">
                      <p className="truncate font-medium text-white">
                        {booking.customerName}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted">
                        {booking.companyName || "No company"}
                      </p>
                    </td>
                    <td className="px-4 py-3.5 text-white/70">
                      {booking.city || "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-white/70">
                      {formatBookingDateRange(booking)}
                    </td>
                    <td className="px-4 py-3.5 text-white/70 tabular-nums">
                      {booking.days}
                    </td>
                    <td className="px-4 py-3.5 text-white/70">
                      {booking.tier || "—"}
                    </td>
                    <td className="px-4 py-3.5 text-white/70 tabular-nums">
                      {booking.itemCount}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 font-medium text-white/80">
                      {formatINR(booking.total)}
                    </td>
                    <td className="px-4 py-3.5">
                      <BookingStatusBadge status={booking.status} />
                    </td>
                    <td className="px-4 py-3.5">
                      <ContentChip hasContent={booking.hasContent} />
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <ArrowRight
                        aria-hidden="true"
                        className="ml-auto h-4 w-4 text-white/30"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-white/5 lg:hidden">
            {visibleBookings.map((booking) => (
              <button
                key={booking.id}
                type="button"
                onClick={() => openDrawer(booking)}
                className="block w-full p-4 text-left transition duration-200 hover:bg-white/[0.03] focus-visible:bg-white/[0.03] focus-visible:outline-none"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-mono text-xs font-semibold tracking-wide text-white">
                      {formatBookingId(booking.id)}
                    </p>
                    <p className="mt-1 truncate text-sm font-semibold text-white">
                      {booking.customerName}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted">
                      {booking.companyName || "No company"}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <BookingStatusBadge status={booking.status} />
                    <ContentChip hasContent={booking.hasContent} />
                  </div>
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <dt className="text-muted">City</dt>
                    <dd className="mt-0.5 text-white/70">
                      {booking.city || "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted">Dates</dt>
                    <dd className="mt-0.5 text-white/70">
                      {formatBookingDateRange(booking)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted">Days / items</dt>
                    <dd className="mt-0.5 text-white/70 tabular-nums">
                      {booking.days} / {booking.itemCount}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted">Total</dt>
                    <dd className="mt-0.5 font-medium text-white/80">
                      {formatINR(booking.total)}
                    </dd>
                  </div>
                </dl>

                <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted">
                  <span>{booking.tier || "No tier"}</span>
                  <span className="inline-flex items-center gap-1 text-brand-sky">
                    View details
                    <ArrowRight
                      aria-hidden="true"
                      className="h-3.5 w-3.5"
                    />
                  </span>
                </div>
              </button>
            ))}
          </div>
        </Card>
      )}

      {selected ? (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Close booking details"
            tabIndex={-1}
            onClick={() => {
              if (!saving) {
                closeDrawer();
              }
            }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />

          <aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="booking-drawer-title"
            aria-busy={saving}
            className="absolute inset-y-0 right-0 z-10 flex w-full max-w-xl flex-col border-l border-white/10 bg-surface shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-white/5 p-5 sm:p-6">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-sky">
                  Booking {formatBookingId(selected.id)}
                </p>
                <h2
                  id="booking-drawer-title"
                  className="mt-1 truncate text-xl font-bold tracking-tight text-white"
                >
                  {selected.customerName}
                </h2>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <BookingStatusBadge status={selected.status} />
                  <ContentChip hasContent={selected.hasContent} />
                  <span className="text-xs text-muted">
                    {selected.companyName || "No company"} ·{" "}
                    {formatAdminDate(selected.createdAt)}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={closeDrawer}
                disabled={saving}
                aria-label="Close booking details"
                className="rounded-full p-1.5 text-white/50 transition duration-200 hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 disabled:pointer-events-none disabled:opacity-50"
              >
                <X aria-hidden="true" className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto p-5 sm:p-6">
              <div className="grid grid-cols-2 gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-sm">
                <div>
                  <p className="text-xs text-muted">City</p>
                  <p className="mt-0.5 text-white/80">
                    {selected.city || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted">Tier</p>
                  <p className="mt-0.5 text-white/80">
                    {selected.tier || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted">Dates</p>
                  <p className="mt-0.5 text-white/80">
                    {formatBookingDateRange(selected)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted">Days</p>
                  <p className="mt-0.5 text-white/80 tabular-nums">
                    {selected.days}
                  </p>
                </div>
              </div>

              <section>
                <div className="flex items-center gap-2">
                  <ClipboardList
                    aria-hidden="true"
                    className="h-4 w-4 text-brand-sky"
                  />
                  <h3 className="text-sm font-semibold text-white">
                    Items
                  </h3>
                </div>

                {selected.items.length === 0 ? (
                  <p className="mt-3 rounded-2xl border border-dashed border-white/10 px-4 py-5 text-sm text-body">
                    No item details are attached to this booking.
                  </p>
                ) : (
                  <ul className="mt-3 divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/10">
                    {selected.items.map((item) => (
                      <li
                        key={item.id}
                        className="flex items-start justify-between gap-4 px-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white">
                            {item.name}
                          </p>
                          <p className="mt-0.5 text-xs text-muted">
                            Qty {item.quantity} · {itemRateLabel(item)}
                          </p>
                          {item.detail ? (
                            <p className="mt-1 text-xs text-body">
                              {item.detail}
                            </p>
                          ) : null}
                        </div>
                        <p className="shrink-0 text-sm font-medium text-white/80">
                          {item.amount === null
                            ? "—"
                            : formatINR(item.amount)}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section>
                <div className="flex items-center gap-2">
                  <Monitor
                    aria-hidden="true"
                    className="h-4 w-4 text-brand-sky"
                  />
                  <h3 className="text-sm font-semibold text-white">
                    Where it runs
                  </h3>
                </div>

                {!screensState ||
                screensState.bookingId !== selected.id ||
                screensState.loading ? (
                  <p className="mt-3 text-xs text-muted">
                    Loading screens...
                  </p>
                ) : screensState.error ? (
                  <p role="alert" className="mt-3 text-xs text-red-300">
                    Screens could not be loaded. {screensState.error}
                  </p>
                ) : screensState.screens.length === 0 ? (
                  <p className="mt-3 rounded-2xl border border-dashed border-white/10 px-4 py-5 text-sm text-body">
                    No screens are assigned to this booking.
                  </p>
                ) : (
                  <div className="mt-3 space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                      {screensLabel(screensState.screens)}
                    </p>
                    <ul className="space-y-2">
                      {screensState.screens.map((screen) => (
                        <li
                          key={screen.screen_id}
                          className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-white">
                                {screen.screen_name || screen.screen_id}
                              </p>
                              {screen.screen_name &&
                              screen.screen_name !== screen.screen_id ? (
                                <p className="mt-0.5 font-mono text-xs text-muted">
                                  {screen.screen_id}
                                </p>
                              ) : null}
                              <p className="mt-1 text-xs text-white/70">
                                {[screen.property_name, screen.place_name]
                                  .filter(
                                    (value): value is string =>
                                      typeof value === "string" &&
                                      value.trim().length > 0,
                                  )
                                  .join(" · ") || "Property not set"}
                              </p>
                              <p className="mt-0.5 text-xs text-muted">
                                {bookingScreenLocation(screen)}
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-1.5">
                              <span
                                className={cn(
                                  "rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                                  screen.online
                                    ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-200"
                                    : "border-white/10 bg-white/5 text-white/50",
                                )}
                              >
                                {screen.online ? "Online" : "Offline"}
                              </span>
                              <span className="text-xs text-muted">
                                Last seen:{" "}
                                {formatRelativeTime(screen.last_seen)}
                              </span>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>

              <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                <div className="flex items-center gap-2">
                  <ReceiptText
                    aria-hidden="true"
                    className="h-4 w-4 text-brand-sky"
                  />
                  <h3 className="text-sm font-semibold text-white">
                    Payment breakdown
                  </h3>
                </div>

                <dl className="mt-4 space-y-2.5 text-sm">
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-body">Standard total</dt>
                    <dd className="text-white/80 tabular-nums">
                      {formatINR(selected.standardTotal)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-body">Discount</dt>
                    <dd className="text-white/80 tabular-nums">
                      {formatINR(selected.discountAmount)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-body">
                      {selected.promoCode
                        ? `Promo (${selected.promoCode})`
                        : "Promo discount"}
                    </dt>
                    <dd className="text-white/80 tabular-nums">
                      {formatINR(selected.promoDiscount)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-body">GST</dt>
                    <dd className="text-white/80 tabular-nums">
                      {formatINR(selected.gstAmount)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-body">Rounding</dt>
                    <dd className="text-white/80 tabular-nums">
                      {formatINR(selected.roundingAmount)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4 border-t border-white/10 pt-3">
                    <dt className="font-semibold text-white">Total</dt>
                    <dd className="text-base font-bold text-white tabular-nums">
                      {formatINR(selected.total)}
                    </dd>
                  </div>
                </dl>
              </section>

              <section className="space-y-4">
                <div>
                  <label
                    htmlFor="booking-status"
                    className="mb-1 block text-xs text-muted"
                  >
                    Status
                  </label>
                  <PanelSelect
                    id="booking-status"
                    value={draftStatus}
                    onChange={setDraftStatus}
                    disabled={saving}
                    label="Status"
                    className="w-full"
                    options={statusOptions.map((status) => ({
                      value: status,
                      label: formatBookingStatus(status),
                    }))}
                  />
                </div>

                <div>
                  <label
                    htmlFor="booking-notes"
                    className="mb-1 block text-xs text-muted"
                  >
                    Admin notes
                  </label>
                  <textarea
                    id="booking-notes"
                    rows={4}
                    value={draftNotes}
                    onChange={(event) =>
                      setDraftNotes(event.target.value)
                    }
                    disabled={saving}
                    placeholder="Add context for the team or the customer."
                    className={cn(inputClass, "h-auto py-2.5")}
                  />
                </div>

                {drawerError ? (
                  <p
                    role="alert"
                    className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200"
                  >
                    {drawerError}
                  </p>
                ) : null}
              </section>
            </div>

            <div className="border-t border-white/5 p-5 sm:p-6">
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  variant="ghost"
                  onClick={closeDrawer}
                  disabled={saving}
                >
                  Close
                </Button>
                <Button onClick={() => void handleSaveBooking()} disabled={saving}>
                  {saving ? (
                    <Loader2
                      aria-hidden="true"
                      className="h-4 w-4 animate-spin"
                    />
                  ) : null}
                  {saving ? "Saving..." : "Save booking"}
                </Button>
              </div>
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
