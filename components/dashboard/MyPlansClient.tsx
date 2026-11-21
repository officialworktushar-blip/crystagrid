"use client";

import Link from "next/link";
import {
  AlertCircle,
  ArrowUpRight,
  MapPin,
  Megaphone,
  Package,
} from "lucide-react";
import Card from "@/components/ui/Card";
import {
  formatBookingId,
  formatBookingStatus,
  type AdBooking,
} from "@/lib/ad-bookings";
import { formatBookingDate, formatINR } from "@/lib/ads";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  draft: "border-white/10 bg-white/5 text-white/60",
  pending: "border-amber-400/20 bg-amber-400/10 text-amber-200",
  confirmed: "border-sky-400/20 bg-sky-400/10 text-sky-200",
  running: "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
  completed: "border-white/10 bg-white/5 text-[#94a3b8]",
  cancelled: "border-red-400/20 bg-red-400/10 text-red-200",
};

function dateRange(booking: AdBooking): string {
  const start = booking.startDate
    ? formatBookingDate(booking.startDate)
    : null;
  const end = booking.endDate ? formatBookingDate(booking.endDate) : null;

  if (start && end) {
    return `${start} to ${end}`;
  }

  return start ?? end ?? "Dates pending";
}

function dayLabel(days: number): string {
  if (!Number.isFinite(days) || days <= 0) {
    return "Duration pending";
  }

  return `${days} ${days === 1 ? "day" : "days"}`;
}

function BookingStat({
  label,
  value,
  hint,
  highlight = false,
}: {
  label: string;
  value: string;
  hint?: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.025] px-3.5 py-3">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
        {label}
      </dt>
      <dd
        className={cn(
          "mt-1 text-sm font-semibold",
          highlight ? "text-white" : "text-white/80",
        )}
      >
        {value}
      </dd>
      {hint ? (
        <p className="mt-0.5 text-[11px] text-white/35">{hint}</p>
      ) : null}
    </div>
  );
}

export default function MyPlansClient({
  bookings,
  loadError,
}: {
  bookings: AdBooking[];
  loadError: string | null;
}) {
  if (loadError) {
    return (
      <Card
        className="flex items-start gap-3 border-red-400/20 bg-red-400/10 p-5 hover:border-red-400/20 hover:shadow-none"
        role="alert"
      >
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-300" />
        <div>
          <p className="text-sm font-semibold text-red-100">
            We couldn&apos;t load your plans.
          </p>
          <p className="mt-1 text-sm text-red-200/70">{loadError}</p>
        </div>
      </Card>
    );
  }

  if (bookings.length === 0) {
    return (
      <Card className="p-10 text-center hover:border-white/10 hover:shadow-none">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-sky-400/20 bg-sky-400/10 text-sky-300">
          <Megaphone className="h-6 w-6" />
        </span>
        <h2 className="mt-5 text-xl font-bold text-white">No ad plans yet</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-body">
          Build a campaign for your city, choose the inventory you want, and
          submit it for confirmation.
        </p>
        <Link
          href="/book"
          className="brand-gradient mt-6 inline-flex h-11 items-center justify-center rounded-full px-6 text-sm font-semibold text-white shadow-brand transition duration-200 hover:brightness-110"
        >
          Book Ads
        </Link>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {bookings.map((booking) => {
        const status = booking.status.toLowerCase();
        const createdLabel = booking.createdAt
          ? `Created ${formatBookingDate(booking.createdAt)}`
          : "Created date pending";
        const isDraft = status === "draft";
        const isPaid = (booking.paymentStatus ?? "").toLowerCase() === "paid";

        return (
          <div key={booking.id} className="rounded-3xl">
            <Card className="h-full overflow-hidden p-0 hover:border-sky-500/40 hover:shadow-card">
              <div className="border-b border-white/5 px-5 py-5 sm:px-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/35">
                      Booking {formatBookingId(booking.id)}
                    </p>
                    <h2 className="mt-1 inline-flex items-center gap-2 text-lg font-bold text-white">
                      <MapPin className="h-4 w-4 text-sky-300" />
                      {booking.city || "City pending"}
                    </h2>
                    <p className="mt-1 text-xs text-white/35">{createdLabel}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isPaid ? (
                      <span className="inline-flex rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                        Paid
                      </span>
                    ) : null}
                    <span
                      className={cn(
                        "inline-flex rounded-full border px-3 py-1 text-xs font-semibold capitalize",
                        STATUS_STYLES[status] ??
                          "border-white/10 bg-white/5 text-white/60",
                      )}
                    >
                      {formatBookingStatus(booking.status)}
                    </span>
                  </div>
                </div>

                <dl className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <BookingStat
                    label="Campaign dates"
                    value={dateRange(booking)}
                    hint={dayLabel(booking.days)}
                  />
                  <BookingStat
                    label="Tier"
                    value={
                      booking.tier
                        ? formatBookingStatus(booking.tier)
                        : "Gold"
                    }
                  />
                  <BookingStat
                    label="Items"
                    value={`${booking.itemCount} ${
                      booking.itemCount === 1 ? "item" : "items"
                    }`}
                    hint={`${booking.items.length} line ${
                      booking.items.length === 1 ? "item" : "items"
                    }`}
                  />
                  <BookingStat
                    label="Total"
                    value={formatINR(booking.total)}
                    highlight
                  />
                </dl>
              </div>

              <div className="space-y-4 px-5 py-5 sm:px-6">
                <div className="rounded-2xl border border-white/5 bg-white/[0.02]">
                  <p className="flex items-center gap-2 px-4 py-3 text-sm font-semibold text-white/70">
                    <Package className="h-4 w-4 text-white/40" />
                    Campaign items ({booking.items.length})
                  </p>

                  {booking.items.length > 0 ? (
                    <ul className="divide-y divide-white/5 border-t border-white/5">
                      {booking.items.map((item) => (
                        <li
                          key={item.id}
                          className="flex items-start justify-between gap-4 px-4 py-3"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-white/80">
                              {item.name}
                            </p>
                            {item.detail ? (
                              <p className="mt-0.5 truncate text-xs text-white/35">
                                {item.detail}
                              </p>
                            ) : null}
                            <p className="mt-1 text-[11px] text-white/35">
                              Quantity {item.quantity}
                            </p>
                          </div>
                          <span className="shrink-0 text-sm font-semibold text-white/75">
                            {item.amount !== null
                              ? formatINR(item.amount)
                              : "—"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="border-t border-white/5 px-4 py-3 text-sm text-white/40">
                      No inventory lines recorded for this booking.
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2">
                  {isDraft && !isPaid ? (
                    <Link
                      href={`/book/checkout?booking=${booking.id}`}
                      className="inline-flex h-9 items-center justify-center rounded-full bg-[#1d6fff] px-4 text-xs font-bold text-white transition hover:bg-[#155ee7]"
                    >
                      Complete payment
                    </Link>
                  ) : null}
                  {isDraft ? (
                    <Link
                      href={`/book/plan?draft=${booking.id}`}
                      className="inline-flex h-9 items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 text-xs font-bold text-white/80 transition hover:bg-white/10"
                    >
                      Continue
                    </Link>
                  ) : null}
                  <Link
                    href={`/dashboard/plans/${booking.id}`}
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-4 text-xs font-bold text-sky-300 transition hover:bg-white/10"
                  >
                    View booking details
                    <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </Card>
          </div>
        );
      })}
    </div>
  );
}
