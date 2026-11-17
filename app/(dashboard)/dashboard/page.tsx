import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import {
  ArrowUpRight,
  CalendarCheck,
  CalendarClock,
  Mail,
  Monitor,
  Phone,
  UserRound,
  Wallet,
  Wifi,
  type LucideIcon,
} from "lucide-react";
import Card from "@/components/ui/Card";
import { formatINR, todayIST } from "@/lib/ads";
import {
  formatBookingId,
  formatBookingStatus,
  normalizeAdBookingScreens,
  type AdBookingScreen,
} from "@/lib/ad-bookings";
import {
  cmBookingDateState,
  cmBookingScreenSummary,
  formatCmBookingDateRange,
  isCmBookingLive,
  normalizeCmBookings,
} from "@/lib/cm";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

type StatCardProps = {
  label: string;
  value: string;
  detail?: ReactNode;
  icon: LucideIcon;
  accent: string;
};

type ManagerInfo = {
  name: string | null;
  email: string | null;
  phone: string | null;
};

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  return value !== null && typeof value === "object"
    ? (value as UnknownRecord)
    : null;
}

function pickString(row: UnknownRecord, keys: string[]): string | null {
  for (const key of keys) {
    const value = row[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function normalizeManager(data: unknown): ManagerInfo | null {
  const raw = Array.isArray(data) ? data[0] : data;
  const row = asRecord(raw);

  if (!row) {
    return null;
  }

  const details =
    asRecord(row.manager) ?? asRecord(row.profile) ?? row;
  const name = pickString(details, [
    "full_name",
    "name",
    "display_name",
    "manager_name",
    "manager",
  ]);
  const email = pickString(details, ["email", "manager_email"]);
  const phone = pickString(details, [
    "phone",
    "phone_number",
    "manager_phone",
  ]);

  if (!name && !email && !phone) {
    return null;
  }

  return { name, email, phone };
}

function phoneHref(phone: string) {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

function StatCard({ label, value, detail, icon: Icon, accent }: StatCardProps) {
  return (
    <Card className="p-5">
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
      <p className="mt-4 text-2xl font-extrabold tracking-tight text-white tabular-nums sm:text-3xl">
        {value}
      </p>
      {detail ? <div className="mt-1 text-xs text-muted">{detail}</div> : null}
    </Card>
  );
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const today = todayIST();
  const [bookingsResult, managerResult] = await Promise.all([
    supabase
      .from("ad_bookings")
      .select("*, profiles(full_name, company_name), ad_booking_items(*)")
      .eq("customer_id", user.id)
      .order("created_at", { ascending: false }),
    supabase.rpc("my_manager"),
  ]);

  const bookings = normalizeCmBookings(bookingsResult.data);
  const manager = normalizeManager(managerResult.data);
  const activeBookings = bookings.filter((booking) =>
    isCmBookingLive(booking, today),
  );
  const screensByBooking = new Map<string, AdBookingScreen[]>();
  const uniqueScreens = new Map<string, boolean>();

  const screenErrors = await Promise.all(
    activeBookings.map(async (booking) => {
      const result = await supabase.rpc("booking_screens", {
        p_booking: booking.id,
      });
      const screens = normalizeAdBookingScreens(result.data);

      screensByBooking.set(booking.id, screens);

      for (const screen of screens) {
        uniqueScreens.set(
          screen.screen_id,
          Boolean(uniqueScreens.get(screen.screen_id) || screen.online),
        );
      }

      return result.error?.message ?? null;
    }),
  );

  const onlineScreens = [...uniqueScreens.values()].filter(Boolean).length;
  const upcomingBookings = bookings.filter((booking) => {
    const status = booking.status.toLowerCase();

    return (
      status !== "draft" &&
      ["pending", "confirmed", "running"].includes(status) &&
      booking.startDate !== null &&
      booking.startDate > today
    );
  });
  const totalSpent = bookings.reduce((total, booking) => {
    const status = booking.status.toLowerCase();

    return status === "confirmed" ||
      status === "running" ||
      status === "completed"
      ? total + booking.total
      : total;
  }, 0);

  const hasError = [
    bookingsResult.error?.message ?? null,
    managerResult.error?.message ?? null,
    ...screenErrors,
  ].some((message) => Boolean(message?.trim()));

  const cards: StatCardProps[] = [
    {
      label: "Active campaigns",
      value: String(activeBookings.length),
      detail: "Confirmed or running today",
      icon: CalendarCheck,
      accent: "text-emerald-300",
    },
    {
      label: "Screens showing my ads",
      value: String(uniqueScreens.size),
      detail: (
        <span className="inline-flex items-center gap-1.5">
          <Wifi aria-hidden="true" className="h-3.5 w-3.5 text-emerald-300" />
          {onlineScreens} online
        </span>
      ),
      icon: Monitor,
      accent: "text-brand-sky",
    },
    {
      label: "Upcoming bookings",
      value: String(upcomingBookings.length),
      detail: "Start dates after today",
      icon: CalendarClock,
      accent: "text-sky-300",
    },
    {
      label: "Total spent on confirmed bookings",
      value: formatINR(totalSpent),
      detail: "INR across confirmed, running and completed bookings",
      icon: Wallet,
      accent: "text-blue-300",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-sky">
          Overview
        </p>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
          Dashboard
        </h1>
        <p className="mt-2 text-sm text-body">
          A quick look at your campaigns, screens, and bookings.
        </p>
      </div>

      {hasError ? (
        <p
          role="alert"
          className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200"
        >
          Some dashboard details could not be loaded. Refresh to try again.
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <StatCard
            key={card.label}
            label={card.label}
            value={card.value}
            detail={card.detail}
            icon={card.icon}
            accent={card.accent}
          />
        ))}
      </div>

      <Card className="p-5 hover:border-white/10 hover:shadow-none sm:p-6">
        <div className="flex items-start gap-4">
          <span className="brand-gradient flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white shadow-brand">
            <UserRound aria-hidden="true" className="h-5 w-5" />
          </span>

          <div className="min-w-0">
            <h2 className="text-lg font-semibold tracking-tight text-white">
              Your account manager
            </h2>

            {manager ? (
              <>
                <p className="mt-1 truncate text-sm text-body">
                  {manager.name || "Your account manager"}
                </p>

                {manager.email || manager.phone ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {manager.email ? (
                      <a
                        href={`mailto:${manager.email}`}
                        className="inline-flex max-w-full items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/70 transition duration-200 hover:border-sky-400/30 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60"
                      >
                        <Mail aria-hidden="true" className="h-3.5 w-3.5" />
                        <span className="truncate">{manager.email}</span>
                      </a>
                    ) : null}

                    {manager.phone ? (
                      <a
                        href={phoneHref(manager.phone)}
                        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/70 transition duration-200 hover:border-sky-400/30 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60"
                      >
                        <Phone aria-hidden="true" className="h-3.5 w-3.5" />
                        {manager.phone}
                      </a>
                    ) : null}
                  </div>
                ) : null}
              </>
            ) : (
              <p className="mt-1 text-sm leading-6 text-body">
                An account manager will be assigned to you soon.
              </p>
            )}
          </div>
        </div>
      </Card>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-white">
            Live now
          </h2>
          <p className="mt-1 text-sm text-body">
            Campaigns confirmed or running today.
          </p>
        </div>

        {activeBookings.length === 0 ? (
          <Card className="p-8 text-center hover:border-white/10 hover:shadow-none">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-brand-sky">
              <Monitor aria-hidden="true" className="h-6 w-6" />
            </span>
            <p className="mt-4 text-sm font-medium text-white">
              No campaigns are live right now.
            </p>
          </Card>
        ) : (
          <Card className="overflow-hidden p-0 hover:border-white/10 hover:shadow-none">
            <ul className="divide-y divide-white/5">
              {activeBookings.map((booking) => {
                const dateState = cmBookingDateState(booking, today);
                const screens = screensByBooking.get(booking.id) ?? [];

                return (
                  <li key={booking.id}>
                    <Link
                      href={`/dashboard/plans/${booking.id}`}
                      className="flex flex-col gap-3 px-5 py-4 transition duration-200 hover:bg-white/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-400/60 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/35">
                          Booking {formatBookingId(booking.id)}
                        </p>
                        <p className="mt-1 truncate text-sm font-semibold text-white">
                          {formatCmBookingDateRange(booking)}
                        </p>
                        <p className="mt-1 text-xs text-body">
                          {formatBookingStatus(booking.status)} ·{" "}
                          {dateState.label}
                        </p>
                      </div>

                      <div className="flex items-center justify-between gap-3 sm:justify-end">
                        <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                          {cmBookingScreenSummary(screens)}
                        </span>
                        <ArrowUpRight
                          aria-hidden="true"
                          className="h-4 w-4 text-white/35"
                        />
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Card>
        )}
      </section>
    </div>
  );
}
