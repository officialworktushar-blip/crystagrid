import Link from "next/link";
import type { ReactNode } from "react";
import {
  CalendarCheck,
  FileWarning,
  Monitor,
  Users,
  Wifi,
  type LucideIcon,
} from "lucide-react";
import PanelPageHeader from "@/components/admin/PanelPageHeader";
import CmOverviewBookings from "@/components/cm/CmOverviewBookings";
import Card from "@/components/ui/Card";
import { todayIST } from "@/lib/ads";
import { normalizeAdBookingScreens } from "@/lib/ad-bookings";
import { cmBookingNeedsContent, isCmBookingLive } from "@/lib/cm";
import { loadCmBookings, loadCmCustomers } from "@/lib/cm-data";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

function CmStatCard({
  label,
  value,
  detail,
  icon: Icon,
  accent,
  href,
}: {
  label: string;
  value: string;
  detail: ReactNode;
  icon: LucideIcon;
  accent: string;
  href?: string;
}) {
  const card = (
    <Card
      className={cn(
        "p-5 hover:border-white/10 hover:shadow-none",
        href && "transition duration-200 hover:border-sky-400/30 hover:bg-white/[0.03]",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-body">{label}</p>
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03]",
            accent,
          )}
        >
          <Icon aria-hidden="true" className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-4 text-2xl font-extrabold tracking-tight text-white tabular-nums">
        {value}
      </p>
      <div className="mt-1 text-xs text-muted">{detail}</div>
    </Card>
  );

  return href ? (
    <Link href={href} className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60">
      {card}
    </Link>
  ) : (
    card
  );
}

export default async function CmOverviewPage() {
  const today = todayIST();
  const { customers, error: customersError } = await loadCmCustomers();
  const { bookings, error: bookingsError } = await loadCmBookings(
    customers.map((customer) => customer.customer_id),
  );

  const activeBookings = bookings.filter((booking) =>
    isCmBookingLive(booking, today),
  );
  const needsContentBookings = bookings.filter(cmBookingNeedsContent);

  const supabase = await createClient();
  const screenResults = await Promise.all(
    activeBookings.map((booking) =>
      supabase.rpc("booking_screens", { p_booking: booking.id }),
    ),
  );

  const screens = new Map<string, boolean>();

  for (const result of screenResults) {
    for (const screen of normalizeAdBookingScreens(result.data)) {
      screens.set(
        screen.screen_id,
        Boolean(screens.get(screen.screen_id) || screen.online),
      );
    }
  }

  const onlineScreens = [...screens.values()].filter(Boolean).length;
  const loadErrors = [
    customersError,
    bookingsError,
    ...screenResults.map((result) => result.error?.message ?? null),
  ]
    .filter((message): message is string => Boolean(message?.trim()))
    .filter((message, index, values) => values.indexOf(message) === index);

  return (
    <div className="space-y-8">
      <PanelPageHeader
        eyebrow="Customer Manager"
        title="Overview"
        description="Track your customers, live campaigns, content gaps, and screen coverage."
      />

      {loadErrors.length > 0 ? (
        <div
          role="alert"
          className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200"
        >
          <p className="font-semibold">
            Some Customer Manager data could not be loaded.
          </p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4">
            {loadErrors.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <CmStatCard
          label="My customers"
          value={String(customers.length)}
          detail="Customer accounts assigned to you"
          icon={Users}
          accent="text-brand-sky"
        />
        <CmStatCard
          label="Active campaigns"
          value={String(activeBookings.length)}
          detail="Confirmed or running today"
          icon={CalendarCheck}
          accent="text-emerald-300"
        />
        <CmStatCard
          label="Bookings needing content"
          value={String(needsContentBookings.length)}
          detail="No playlist attached yet"
          icon={FileWarning}
          accent="text-amber-300"
          href="/cm/bookings?needsContent=1"
        />
        <CmStatCard
          label="Screens in my campaigns"
          value={String(screens.size)}
          detail={
            <span className="inline-flex items-center gap-1.5">
              <Wifi aria-hidden="true" className="h-3.5 w-3.5 text-emerald-300" />
              {onlineScreens} online
            </span>
          }
          icon={Monitor}
          accent="text-brand-blue"
        />
      </div>

      <CmOverviewBookings bookings={needsContentBookings} customers={customers} />
    </div>
  );
}
