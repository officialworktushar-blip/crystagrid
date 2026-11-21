"use client";

import Link from "next/link";
import { useMemo } from "react";
import { AlertCircle } from "lucide-react";
import Card from "@/components/ui/Card";
import FilterBar from "@/components/ui/FilterBar";
import { formatBookingId } from "@/lib/ad-bookings";
import { formatINR } from "@/lib/ads";
import { formatAdminDate } from "@/lib/admin";
import { cn } from "@/lib/utils";
import { useFilters } from "@/lib/useFilters";

export type PaymentRow = {
  id: string;
  bookingId: string | null;
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
  amountPaise: number;
  status: string;
  method: string | null;
  errorDescription: string | null;
  createdAt: string | null;
  clientName: string;
};

type PaymentFilters = {
  search: string;
  status: string;
  method: string;
  dateFrom: string;
  dateTo: string;
  unmatchedOnly: boolean;
};

const emptyFilters: PaymentFilters = {
  search: "",
  status: "",
  method: "",
  dateFrom: "",
  dateTo: "",
  unmatchedOnly: false,
};

function StatusChip({ status }: { status: string }) {
  const normalized = status.trim().toLowerCase();
  const styles: Record<string, string> = {
    captured: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
    failed: "border-red-400/20 bg-red-400/10 text-red-300",
    refunded: "border-amber-400/20 bg-amber-400/10 text-amber-300",
    unmatched: "border-amber-400/20 bg-amber-400/10 text-amber-300",
  };
  const label = normalized
    ? normalized.charAt(0).toUpperCase() + normalized.slice(1)
    : "Unknown";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
        styles[normalized] ?? "border-white/10 bg-white/5 text-white/60",
      )}
    >
      {label}
    </span>
  );
}

function methodLabel(method: string | null): string {
  if (!method) return "-";
  return method.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function PaymentsClient({
  payments,
  bookingsHref,
  loadError,
}: {
  payments: PaymentRow[];
  bookingsHref: string;
  loadError: string | null;
}) {
  const { filters, set, clear } = useFilters(emptyFilters);

  const methodOptions = useMemo(() => {
    const values = new Set<string>();
    for (const payment of payments) {
      const method = payment.method?.trim();
      if (method) values.add(method);
    }
    return [...values]
      .sort((a, b) => a.localeCompare(b))
      .map((value) => ({ value, label: methodLabel(value) }));
  }, [payments]);

  const visible = useMemo(() => {
    const query = filters.search.trim().toLowerCase();
    return payments.filter((payment) => {
      const status = payment.status.trim().toLowerCase();
      const method = payment.method?.trim().toLowerCase() ?? "";
      if (filters.status && status !== filters.status) return false;
      if (filters.method && method !== filters.method.toLowerCase()) return false;
      if (filters.unmatchedOnly && status !== "unmatched") return false;
      const createdDate = payment.createdAt?.slice(0, 10) ?? "";
      if (filters.dateFrom && (!createdDate || createdDate < filters.dateFrom)) return false;
      if (filters.dateTo && (!createdDate || createdDate > filters.dateTo)) return false;
      if (query) {
        const haystack = [
          payment.razorpayPaymentId,
          payment.razorpayOrderId,
          payment.clientName,
          payment.bookingId,
          payment.bookingId ? formatBookingId(payment.bookingId) : null,
        ]
          .filter((value): value is string => Boolean(value))
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }, [filters, payments]);

  return (
    <div className="space-y-6">
      {loadError ? (
        <p role="alert" className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">
          Payments could not be loaded. {loadError}
        </p>
      ) : null}

      <FilterBar
        search={{
          value: filters.search,
          onChange: (value) => set("search", value),
          placeholder: "Search payment, order, client, booking",
        }}
        selects={[
          {
            key: "status",
            label: "Status",
            value: filters.status,
            onChange: (value) => set("status", value),
            options: [
              { value: "captured", label: "Captured" },
              { value: "failed", label: "Failed" },
              { value: "refunded", label: "Refunded" },
              { value: "unmatched", label: "Unmatched" },
            ],
          },
          {
            key: "method",
            label: "Method",
            value: filters.method,
            onChange: (value) => set("method", value),
            options: methodOptions,
          },
        ]}
        toggles={[
          {
            key: "unmatchedOnly",
            label: "Unmatched only",
            checked: filters.unmatchedOnly,
            onChange: (value) => set("unmatchedOnly", value),
          },
        ]}
        dateRange={{
          label: "Date",
          from: filters.dateFrom,
          to: filters.dateTo,
          onChange: (range) => {
            set("dateFrom", range.from);
            set("dateTo", range.to);
          },
        }}
        resultCount={visible.length}
        total={payments.length}
        onClear={clear}
      />

      {filters.unmatchedOnly ? (
        <div className="flex items-start gap-2 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
          <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          <p>Unmatched payments have no confirmed booking link and should be reviewed manually.</p>
        </div>
      ) : null}

      {visible.length === 0 ? (
        <Card className="p-8 text-center hover:border-white/10 hover:shadow-none">
          <p className="text-sm font-medium text-white">No payments found.</p>
          <p className="mt-1 text-sm text-body">Try adjusting your filters.</p>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0 hover:border-white/10 hover:shadow-none">
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[72rem] text-left text-sm">
              <thead className="border-b border-white/5 bg-white/[0.02] text-xs uppercase tracking-[0.12em] text-muted">
                <tr>
                  <th className="px-5 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Booking</th>
                  <th className="px-4 py-3 font-semibold">Client</th>
                  <th className="px-4 py-3 font-semibold">Amount</th>
                  <th className="px-4 py-3 font-semibold">Method</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Payment ID</th>
                  <th className="px-5 py-3 font-semibold">Order ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {visible.map((payment) => (
                  <tr key={payment.id} className="transition duration-200 hover:bg-white/[0.03]">
                    <td className="whitespace-nowrap px-5 py-3.5 text-white/70">{formatAdminDate(payment.createdAt)}</td>
                    <td className="px-4 py-3.5">
                      {payment.bookingId ? (
                        <Link href={bookingsHref} className="font-mono text-xs font-semibold text-brand-sky transition hover:text-white">
                          {formatBookingId(payment.bookingId)}
                        </Link>
                      ) : (
                        <span className="text-white/40">-</span>
                      )}
                    </td>
                    <td className="max-w-[14rem] truncate px-4 py-3.5 text-white/80">{payment.clientName || "-"}</td>
                    <td className="px-4 py-3.5 font-medium text-white/80 tabular-nums">{formatINR(payment.amountPaise / 100)}</td>
                    <td className="px-4 py-3.5 text-white/70">{methodLabel(payment.method)}</td>
                    <td className="px-4 py-3.5"><StatusChip status={payment.status} /></td>
                    <td className="max-w-[12rem] truncate px-4 py-3.5 font-mono text-xs text-white/70" title={payment.razorpayPaymentId ?? undefined}>{payment.razorpayPaymentId || "-"}</td>
                    <td className="max-w-[12rem] truncate px-5 py-3.5 font-mono text-xs text-white/70" title={payment.razorpayOrderId ?? undefined}>{payment.razorpayOrderId || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-white/5 lg:hidden">
            {visible.map((payment) => (
              <div key={payment.id} className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-muted">{formatAdminDate(payment.createdAt)}</p>
                    <p className="mt-1 text-sm font-medium text-white">{payment.clientName || "Unknown client"}</p>
                  </div>
                  <StatusChip status={payment.status} />
                </div>
                <dl className="grid grid-cols-2 gap-3 text-xs">
                  <div><dt className="text-muted">Booking</dt><dd className="mt-0.5 text-white/80">{payment.bookingId ? formatBookingId(payment.bookingId) : "-"}</dd></div>
                  <div><dt className="text-muted">Amount</dt><dd className="mt-0.5 text-white/80">{formatINR(payment.amountPaise / 100)}</dd></div>
                  <div><dt className="text-muted">Method</dt><dd className="mt-0.5 text-white/80">{methodLabel(payment.method)}</dd></div>
                  <div><dt className="text-muted">Payment ID</dt><dd className="mt-0.5 font-mono text-[11px] text-white/70 break-all">{payment.razorpayPaymentId || "-"}</dd></div>
                </dl>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
