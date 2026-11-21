import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import {
  ArrowRight,
  CalendarDays,
  Check,
  Home,
  ReceiptText,
} from "lucide-react";
import DoneStatus from "@/components/booking/DoneStatus";
import PrintReceiptButton from "@/components/booking/PrintReceiptButton";
import {
  formatBookingId,
  normalizeAdBooking,
} from "@/lib/ad-bookings";
import { formatBookingDate, formatINR } from "@/lib/ads";
import { GST_STATES } from "@/lib/gst";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Payment receipt - Crystagrid",
};

export const dynamic = "force-dynamic";

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function maskGstin(value: string): string {
  const v = value.trim().toUpperCase();
  if (v.length < 5) return v;
  return `${v.slice(0, 2)}${"*".repeat(Math.max(0, v.length - 5))}${v.slice(-3)}`;
}

function maskPan(value: string): string {
  const v = value.trim().toUpperCase();
  if (v.length < 3) return v;
  return `${v.slice(0, 2)}${"*".repeat(Math.max(0, v.length - 3))}${v.slice(-1)}`;
}

function getStateName(code: string): string | null {
  const found = GST_STATES.find((s) => s.code === code);
  return found ? found.name : null;
}

function formatDateTime(value: string | null): string {
  if (!value) return "Date pending";
  const ts = Date.parse(value);
  if (!Number.isFinite(ts)) return value;
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  }).format(new Date(ts));
}

export default async function BookingDonePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ paid?: string | string[] }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const paidQueryRaw = sp.paid;
  const paidQuery = Array.isArray(paidQueryRaw) ? paidQueryRaw[0] === "1" : paidQueryRaw === "1";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/book/done/${id}`)}`);
  }

  const [bookingResult, itemsResult] = await Promise.all([
    supabase.from("ad_bookings").select("*").eq("id", id).maybeSingle(),
    supabase.from("ad_booking_items").select("*").eq("booking_id", id),
  ]);

  if (bookingResult.error || !bookingResult.data) {
    notFound();
  }

  const bookingRow = bookingResult.data as Record<string, unknown>;
  const booking = normalizeAdBooking({
    ...bookingRow,
    ad_booking_items: itemsResult.data ?? [],
  });

  if (!booking) {
    notFound();
  }

  const paymentStatus = asString(bookingRow.payment_status).toLowerCase() || "unpaid";
  const status = asString(bookingRow.status).toLowerCase() || booking.status;
  const gstPct =
    typeof bookingRow.gst_pct === "number" && Number.isFinite(bookingRow.gst_pct)
      ? bookingRow.gst_pct
      : 0;

  const { data: billingRow } = await supabase
    .from("ad_booking_billing")
    .select("state_code, gstin, pan, gst_type, cgst, sgst, igst")
    .eq("booking_id", id)
    .maybeSingle();

  const { data: paymentRow } = await supabase
    .from("ad_payments")
    .select("razorpay_payment_id, amount_paise, captured_at, created_at, status")
    .eq("booking_id", id)
    .eq("status", "captured")
    .order("captured_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const stateCode = asString(billingRow?.state_code);
  const stateName = getStateName(stateCode);
  const gstType = asString(billingRow?.gst_type);
  const cgst = typeof billingRow?.cgst === "number" ? billingRow.cgst : Number(billingRow?.cgst ?? 0);
  const sgst = typeof billingRow?.sgst === "number" ? billingRow.sgst : Number(billingRow?.sgst ?? 0);
  const igst = typeof billingRow?.igst === "number" ? billingRow.igst : Number(billingRow?.igst ?? 0);
  const gstin = maskGstin(asString(billingRow?.gstin));
  const pan = maskPan(asString(billingRow?.pan));
  const paymentId = asString(paymentRow?.razorpay_payment_id);
  const paidAt = asString(paymentRow?.captured_at) || asString(paymentRow?.created_at);
  const amountPaise =
    typeof paymentRow?.amount_paise === "number"
      ? paymentRow.amount_paise
      : Number(paymentRow?.amount_paise ?? 0);

  const isPaid = paymentStatus === "paid";
  const isDraftUnpaid = status === "draft" && paymentStatus !== "paid";

  return (
    <div className="mx-auto w-full max-w-3xl py-4 sm:py-8">
      <style>{`@media print { body { background: white !important; } .no-print { display: none !important; } .print-card { border: 1px solid #e5e7eb !important; box-shadow: none !important; } }`}</style>
      <div className="print-card overflow-hidden rounded-3xl border border-[#e5e7eb] bg-white shadow-[0_35px_90px_-55px_rgba(15,23,42,0.4)]">
        <div className="border-b border-[#e5e7eb] bg-[#f8fafc] px-6 py-8 text-center sm:px-10">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#dcfce7] text-[#16a34a] ring-8 ring-[#f0fdf4]">
            {isPaid ? <Check className="h-7 w-7" aria-hidden="true" /> : <ReceiptText className="h-7 w-7" aria-hidden="true" />}
          </span>
          <h1 className="mt-5 text-2xl font-extrabold tracking-tight text-[#0f172a] sm:text-3xl">
            {isPaid ? "Payment received" : isDraftUnpaid ? "Payment not completed" : "Booking status"}
          </h1>
          <p className="mt-2 text-sm font-semibold text-[#64748b]">
            {isPaid ? "Your booking is confirmed" : `Reference #${formatBookingId(booking.id)}`}
          </p>
          {isPaid ? (
            <p className="mt-1 text-xs font-medium text-[#94a3b8]">Payment receipt (not a GST tax invoice)</p>
          ) : null}
        </div>

        <div className="px-6 py-6 sm:px-10 sm:py-8">
          <DoneStatus bookingId={booking.id} paidQuery={paidQuery} paymentStatus={paymentStatus} />

          {isPaid ? (
            <>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-[#f8fafc] p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#94a3b8]">Booking reference</p>
                  <p className="mt-1 text-sm font-bold text-[#0f172a]">#{formatBookingId(booking.id)}</p>
                </div>
                <div className="rounded-2xl bg-[#f8fafc] p-4">
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#94a3b8]">
                    <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                    Campaign dates
                  </div>
                  <p className="mt-1 text-sm font-bold text-[#0f172a]">
                    {formatBookingDate(booking.startDate)} - {formatBookingDate(booking.endDate)} ({booking.days} {booking.days === 1 ? "day" : "days"})
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-[#e5e7eb] p-4">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#94a3b8]">Items</p>
                <ul className="mt-2 space-y-2">
                  {booking.items.map((item) => (
                    <li key={item.id} className="flex items-center justify-between gap-3 text-sm">
                      <span className="truncate text-[#334155]">{item.name}</span>
                      <span className="shrink-0 font-semibold text-[#0f172a]">{item.amount !== null ? formatINR(item.amount) : "-"}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-5 rounded-2xl bg-[#f8fafc] p-4">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between gap-3"><span className="text-[#64748b]">Standard Rate Total</span><span className="font-semibold text-[#0f172a]">{formatINR(booking.standardTotal)}</span></div>
                  <div className="flex items-center justify-between gap-3"><span className="text-[#64748b]">Discount</span><span className="font-semibold text-[#16a34a]">- {formatINR(booking.discountAmount)}</span></div>
                  {booking.promoCode ? <div className="flex items-center justify-between gap-3"><span className="text-[#64748b]">Promo ({booking.promoCode})</span><span className="font-semibold text-[#16a34a]">- {formatINR(booking.promoDiscount)}</span></div> : null}
                  <div className="flex items-center justify-between gap-3"><span className="text-[#64748b]">GST ({gstPct}%)</span><span className="font-semibold text-[#0f172a]">{formatINR(booking.gstAmount)}</span></div>
                  {gstType === "cgst_sgst" ? <p className="text-xs text-[#64748b]">CGST {formatINR(cgst)} + SGST {formatINR(sgst)}</p> : null}
                  {gstType === "igst" ? <p className="text-xs text-[#64748b]">IGST {formatINR(igst)}</p> : null}
                  <div className="flex items-center justify-between gap-3"><span className="text-[#64748b]">Rounding</span><span className="font-semibold text-[#0f172a]">{formatINR(booking.roundingAmount)}</span></div>
                  <div className="flex items-center justify-between gap-3 border-t border-[#e2e8f0] pt-3"><span className="text-base font-extrabold text-[#0f172a]">Total paid</span><span className="text-xl font-extrabold text-[#0f172a]">{formatINR(Number.isFinite(amountPaise) && amountPaise > 0 ? amountPaise / 100 : booking.total)}</span></div>
                </div>
              </div>

              <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                <div className="rounded-2xl border border-[#e5e7eb] p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#94a3b8]">Payment</p>
                  <p className="mt-1 font-semibold text-[#0f172a]">{paymentId || "Payment id pending"}</p>
                  <p className="mt-1 text-xs text-[#64748b]">{formatDateTime(paidAt)}</p>
                </div>
                <div className="rounded-2xl border border-[#e5e7eb] p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#94a3b8]">Billing</p>
                  <p className="mt-1 text-xs text-[#64748b]">{stateName ? `${stateName} (${stateCode})` : stateCode || "State not available"}</p>
                  <p className="mt-1 text-xs text-[#64748b]">GSTIN: {gstin || "-"}</p>
                  <p className="mt-1 text-xs text-[#64748b]">PAN: {pan || "-"}</p>
                </div>
              </div>

              <p className="mt-5 rounded-2xl border border-[#bfdbfe] bg-[#eff6ff] px-4 py-3 text-sm font-medium leading-6 text-[#1e40af]">
                Your account manager will now prepare your content. Your ads go live from your start date.
              </p>

              <div className="no-print mt-6 flex flex-col gap-2 sm:flex-row">
                <Link href="/dashboard/plans" className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-[#1d6fff] px-5 text-sm font-bold text-white transition hover:bg-[#155ee7]">
                  View My Plans <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link href="/" className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full border border-[#dbe3ef] bg-white px-5 text-sm font-bold text-[#0f172a] transition hover:border-[#b8c6da] hover:bg-[#f8fafc]">
                  <Home className="h-4 w-4" aria-hidden="true" /> Back to home
                </Link>
                <PrintReceiptButton />
              </div>
            </>
          ) : isDraftUnpaid ? (
            <>
              {!paidQuery ? (
                <p className="mt-4 rounded-2xl border border-[#fde68a] bg-[#fffbeb] px-4 py-3 text-sm font-medium text-[#92400e]">
                  Payment not completed. You can complete payment to confirm this booking.
                </p>
              ) : (
                <p className="mt-4 rounded-2xl border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-sm font-medium text-[#b91c1c]">
                  We could not confirm your payment yet. If money was deducted it will be matched automatically. Please contact us with your payment id.
                </p>
              )}
              <div className="no-print mt-6 flex flex-col gap-2 sm:flex-row">
                <Link href={`/book/checkout?booking=${booking.id}`} className="inline-flex h-11 flex-1 items-center justify-center rounded-full bg-[#1d6fff] px-5 text-sm font-bold text-white transition hover:bg-[#155ee7]">
                  Complete payment
                </Link>
                <Link href="/contact" className="inline-flex h-11 flex-1 items-center justify-center rounded-full border border-[#dbe3ef] bg-white px-5 text-sm font-bold text-[#0f172a] transition hover:border-[#b8c6da] hover:bg-[#f8fafc]">
                  Contact us
                </Link>
              </div>
            </>
          ) : (
            <p className="mt-4 text-sm text-[#64748b]">This booking is being processed.</p>
          )}
        </div>
      </div>
    </div>
  );
}
