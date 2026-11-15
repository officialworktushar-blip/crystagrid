import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowRight,
  CalendarDays,
  Check,
  Crown,
  Home,
  MapPin,
  Package,
} from "lucide-react";
import {
  formatBookingId,
  formatBookingStatus,
  normalizeAdBooking,
} from "@/lib/ad-bookings";
import { formatBookingDate, formatINR } from "@/lib/ads";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export default async function BookingDonePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/book/done/${id}`)}`);
  }

  const [bookingResult, itemsResult] = await Promise.all([
    supabase.from("ad_bookings").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("ad_booking_items")
      .select("*")
      .eq("booking_id", id),
  ]);

  if (bookingResult.error || !bookingResult.data) {
    notFound();
  }

  const booking = normalizeAdBooking({
    ...bookingResult.data,
    ad_booking_items: itemsResult.data ?? [],
  });

  if (!booking) {
    notFound();
  }

  const statusLabel = booking.status
    ? formatBookingStatus(booking.status)
    : "Pending";
  const isPending = statusLabel.toLowerCase().startsWith("pending");

  return (
    <div className="mx-auto w-full max-w-3xl py-4 sm:py-8">
      <div className="overflow-hidden rounded-3xl border border-[#e5e7eb] bg-white shadow-[0_35px_90px_-55px_rgba(15,23,42,0.4)]">
        <div className="border-b border-[#e5e7eb] bg-[#f8fafc] px-6 py-10 text-center sm:px-10">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#dcfce7] text-[#16a34a] ring-8 ring-[#f0fdf4]">
            <Check aria-hidden="true" className="h-8 w-8" />
          </span>
          <h1 className="mt-5 text-2xl font-extrabold tracking-tight text-[#0f172a] sm:text-3xl">
            Booking request received
          </h1>
          <p className="mt-2 text-sm font-semibold text-[#64748b]">
            Reference #{formatBookingId(booking.id)}
          </p>
        </div>

        <div className="px-6 py-6 sm:px-10 sm:py-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#eff6ff] px-3 py-1.5 text-sm font-bold text-[#1d6fff]">
              <MapPin aria-hidden="true" className="h-4 w-4" />
              {booking.city || "Selected city"}
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold",
                isPending
                  ? "bg-[#fef3c7] text-[#b45309]"
                  : "bg-[#dcfce7] text-[#15803d]",
              )}
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  isPending ? "bg-[#d97706]" : "bg-[#16a34a]",
                )}
              />
              {statusLabel}
            </span>
            {booking.tier ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f5f3ff] px-3 py-1.5 text-xs font-bold capitalize text-[#7c3aed]">
                <Crown aria-hidden="true" className="h-3.5 w-3.5" />
                {booking.tier}
              </span>
            ) : null}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-[#f8fafc] p-4">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#94a3b8]">
                <CalendarDays aria-hidden="true" className="h-3.5 w-3.5" />
                Campaign dates
              </div>
              <p className="mt-2 text-sm font-bold text-[#0f172a]">
                {formatBookingDate(booking.startDate)}
                {booking.endDate
                  ? ` – ${formatBookingDate(booking.endDate)}`
                  : ""}
              </p>
              <p className="mt-1 text-xs font-semibold text-[#64748b]">
                {booking.days} {booking.days === 1 ? "day" : "days"}
              </p>
            </div>
            <div className="rounded-2xl bg-[#f8fafc] p-4">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#94a3b8]">
                <Package aria-hidden="true" className="h-3.5 w-3.5" />
                Inventory
              </div>
              <p className="mt-2 text-sm font-bold text-[#0f172a]">
                {booking.itemCount}{" "}
                {booking.itemCount === 1 ? "item" : "items"}
              </p>
              <p className="mt-1 text-xs font-semibold text-[#64748b]">
                {booking.items.length} line{" "}
                {booking.items.length === 1 ? "item" : "items"} recorded
              </p>
            </div>
          </div>

          <div className="mt-6">
            <h2 className="text-sm font-extrabold text-[#0f172a]">
              Campaign items
            </h2>
            <div className="mt-3 space-y-2">
              {booking.items.length > 0 ? (
                booking.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between gap-4 rounded-2xl border border-[#e5e7eb] px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-[#0f172a]">
                        {item.name}
                      </p>
                      {item.detail ? (
                        <p className="mt-0.5 truncate text-xs text-[#64748b]">
                          {item.detail}
                        </p>
                      ) : null}
                    </div>
                    <p className="shrink-0 text-sm font-extrabold text-[#0f172a]">
                      {item.amount !== null ? formatINR(item.amount) : "—"}
                    </p>
                  </div>
                ))
              ) : (
                <p className="rounded-2xl bg-[#f8fafc] px-4 py-3 text-sm text-[#64748b]">
                  Your selected inventory is attached to this booking.
                </p>
              )}
            </div>
          </div>

          <div className="mt-6 rounded-2xl bg-[#f8fafc] p-4">
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[#64748b]">Standard Rate Total</span>
                <span className="font-semibold text-[#0f172a]">
                  {formatINR(booking.standardTotal)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[#64748b]">Discount</span>
                <span className="font-semibold text-[#16a34a]">
                  − {formatINR(booking.discountAmount)}
                </span>
              </div>
              {booking.promoCode ? (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[#64748b]">
                    Promo ({booking.promoCode})
                  </span>
                  <span className="font-semibold text-[#16a34a]">
                    − {formatINR(booking.promoDiscount)}
                  </span>
                </div>
              ) : null}
              <div className="flex items-center justify-between gap-3">
                <span className="text-[#64748b]">GST</span>
                <span className="font-semibold text-[#0f172a]">
                  {formatINR(booking.gstAmount)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[#64748b]">Rounding</span>
                <span className="font-semibold text-[#0f172a]">
                  {formatINR(booking.roundingAmount)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-[#e2e8f0] pt-3">
                <span className="text-base font-extrabold text-[#0f172a]">
                  Total
                </span>
                <span className="text-xl font-extrabold text-[#0f172a]">
                  {formatINR(booking.total)}
                </span>
              </div>
            </div>
          </div>

          <p className="mt-5 rounded-2xl border border-[#bfdbfe] bg-[#eff6ff] px-4 py-3 text-sm font-medium leading-6 text-[#1e40af]">
            Our team will contact you to confirm the booking and arrange
            payment. Your ads go live after confirmation.
          </p>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <Link
              href="/dashboard/plans"
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-[#1d6fff] px-5 text-sm font-bold text-white transition hover:bg-[#155ee7]"
            >
              View My Plans
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
            <Link
              href="/"
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full border border-[#dbe3ef] bg-white px-5 text-sm font-bold text-[#0f172a] transition hover:border-[#b8c6da] hover:bg-[#f8fafc]"
            >
              <Home aria-hidden="true" className="h-4 w-4" />
              Back to home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
