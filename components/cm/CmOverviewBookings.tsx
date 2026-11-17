import Link from "next/link";
import { ArrowUpRight, CheckCircle2, FileWarning } from "lucide-react";
import { customerDisplayName, type AdminCustomerStats } from "@/lib/admin";
import { formatBookingStatus } from "@/lib/ad-bookings";
import {
  cmBookingDateState,
  formatCmBookingDateRange,
  type CmBooking,
} from "@/lib/cm";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { cn } from "@/lib/utils";

const toneStyles = {
  live: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
  upcoming: "border-sky-400/30 bg-sky-400/10 text-sky-200",
  ended: "border-white/10 bg-white/5 text-white/50",
  scheduled: "border-white/10 bg-white/5 text-white/70",
};

export default function CmOverviewBookings({
  bookings,
  customers,
}: {
  bookings: CmBooking[];
  customers: AdminCustomerStats[];
}) {
  const names = new Map(
    customers.map((customer) => [
      customer.customer_id,
      customerDisplayName(customer),
    ]),
  );
  const companies = new Map(
    customers.map((customer) => [
      customer.customer_id,
      customer.company_name ?? null,
    ]),
  );

  return (
    <Card className="overflow-hidden p-0 hover:border-white/10 hover:shadow-none">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-amber-400/20 bg-amber-400/10 text-amber-300">
            <FileWarning aria-hidden="true" className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-base font-semibold tracking-tight text-white">
              Bookings needing content
            </h2>
            <p className="mt-0.5 text-xs text-muted">
              Confirmed or running campaigns without a playlist.
            </p>
          </div>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-semibold text-white/70 tabular-nums">
          {bookings.length}
        </span>
      </div>

      {bookings.length === 0 ? (
        <div className="px-5 py-12 text-center">
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full border border-emerald-400/20 bg-emerald-400/10 text-emerald-300">
            <CheckCircle2 aria-hidden="true" className="h-5 w-5" />
          </span>
          <p className="mt-4 text-sm font-semibold text-white">
            Everything has content
          </p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-body">
            No confirmed or running bookings are missing a playlist right now.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-white/5">
          {bookings.map((booking) => {
            const state = cmBookingDateState(booking);
            const customerName =
              names.get(booking.customerId) ?? booking.customerName ?? "Customer";
            const company =
              companies.get(booking.customerId) ?? booking.companyName;

            return (
              <li
                key={booking.id}
                className="flex flex-col gap-3 px-5 py-4 transition duration-200 hover:bg-white/[0.03] sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">
                    {customerName}
                    {company ? (
                      <span className="font-normal text-white/50"> · {company}</span>
                    ) : null}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted">
                    <span>{formatCmBookingDateRange(booking)}</span>
                    <span aria-hidden="true">·</span>
                    <span>{formatBookingStatus(booking.status)}</span>
                    <span
                      className={cn(
                        "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                        toneStyles[state.tone],
                      )}
                    >
                      {state.label}
                    </span>
                  </div>
                </div>
                <Button asChild size="sm" variant="secondary" className="shrink-0">
                  <Link href={`/cm/customers/${booking.customerId}`}>
                    Open customer
                    <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
