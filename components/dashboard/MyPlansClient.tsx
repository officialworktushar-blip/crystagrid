"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  AlertCircle,
  ChevronDown,
  Loader2,
  MapPin,
  Megaphone,
  Package,
  Trash2,
  XCircle,
} from "lucide-react";
import Card from "@/components/ui/Card";
import {
  formatBookingId,
  formatBookingStatus,
  type AdBooking,
} from "@/lib/ad-bookings";
import { formatBookingDate, formatINR } from "@/lib/ads";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  draft: "border-white/10 bg-white/5 text-white/60",
  pending: "border-amber-400/20 bg-amber-400/10 text-amber-200",
  confirmed: "border-sky-400/20 bg-sky-400/10 text-sky-200",
  running: "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
  completed: "border-slate-400/20 bg-slate-400/10 text-slate-300",
  cancelled: "border-red-400/20 bg-red-400/10 text-red-200",
};

type BookingAction = "delete" | "cancel";

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
  const router = useRouter();
  const [pendingAction, setPendingAction] = useState<{
    id: string;
    action: BookingAction;
  } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const runAction = async (booking: AdBooking, action: BookingAction) => {
    const confirmed = window.confirm(
      action === "delete"
        ? "Delete this draft? This cannot be undone."
        : "Cancel this booking request? This cannot be undone.",
    );

    if (!confirmed) {
      return;
    }

    setPendingAction({ id: booking.id, action });
    setActionError(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("cancel_booking", {
        p_id: booking.id,
      });

      if (error) {
        setActionError(
          error.message || "We couldn't update this booking. Try again.",
        );
        return;
      }

      router.refresh();
    } catch {
      setActionError("We couldn't update this booking. Try again.");
    } finally {
      setPendingAction(null);
    }
  };

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
      {actionError ? (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-300" />
          <p className="text-sm text-red-200">{actionError}</p>
        </div>
      ) : null}

      {bookings.map((booking) => {
        const status = booking.status.toLowerCase();
        const isDraft = status === "draft";
        const isPending = status === "pending";
        const isViewOnly = !isDraft && !isPending;
        const busy = pendingAction !== null;
        const deleting =
          pendingAction?.id === booking.id &&
          pendingAction.action === "delete";
        const cancelling =
          pendingAction?.id === booking.id &&
          pendingAction.action === "cancel";
        const createdLabel = booking.createdAt
          ? `Created ${formatBookingDate(booking.createdAt)}`
          : "Created date pending";

        return (
          <Card
            key={booking.id}
            className="overflow-hidden p-0 hover:border-white/15 hover:shadow-none"
          >
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
              <details className="group rounded-2xl border border-white/5 bg-white/[0.02]">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-white/70 transition hover:text-white [&::-webkit-details-marker]:hidden">
                  <span className="inline-flex items-center gap-2">
                    <Package className="h-4 w-4 text-white/40" />
                    Campaign items ({booking.items.length})
                  </span>
                  <ChevronDown className="h-4 w-4 text-white/35 transition group-open:rotate-180" />
                </summary>

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
              </details>

              <div className="flex flex-wrap items-center justify-end gap-3">
                {isViewOnly ? (
                  <p className="mr-auto max-w-md text-xs leading-5 text-white/40">
                    Contact your account manager to change this booking.
                  </p>
                ) : null}

                {isDraft ? (
                  <>
                    <button
                      type="button"
                      onClick={() => void runAction(booking, "delete")}
                      disabled={busy}
                      className="inline-flex h-9 items-center justify-center gap-2 rounded-full border border-red-400/20 bg-red-400/10 px-4 text-sm font-semibold text-red-200 transition hover:bg-red-400/15 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {deleting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                      Delete
                    </button>
                    <Link
                      href={`/book/plan?draft=${booking.id}`}
                      onClick={(event) => {
                        if (busy) {
                          event.preventDefault();
                        }
                      }}
                      aria-disabled={busy}
                      className={cn(
                        "brand-gradient inline-flex h-9 items-center justify-center rounded-full px-4 text-sm font-semibold text-white shadow-brand transition hover:brightness-110",
                        busy && "pointer-events-none opacity-50",
                      )}
                    >
                      Continue
                    </Link>
                  </>
                ) : null}

                {isPending ? (
                  <button
                    type="button"
                    onClick={() => void runAction(booking, "cancel")}
                    disabled={busy}
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-4 text-sm font-semibold text-amber-100 transition hover:bg-amber-400/15 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {cancelling ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                    Cancel request
                  </button>
                ) : null}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
