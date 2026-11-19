import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CalendarCheck,
  CalendarClock,
  Inbox,
  Monitor,
  Package,
  Wifi,
  type LucideIcon,
} from "lucide-react";
import PanelPageHeader from "@/components/admin/PanelPageHeader";
import Card from "@/components/ui/Card";
import { formatAdminDate } from "@/lib/admin";
import { formatINR, normalizeAdPropertyStats } from "@/lib/ads";
import {
  formatBookingId,
  formatBookingStatus,
  normalizeAdBookings,
} from "@/lib/ad-bookings";
import { normalizeStaffScreens } from "@/lib/staff-screens";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

type SalesStatCardProps = {
  label: string;
  value: string;
  icon: LucideIcon;
  accent: string;
  href?: string;
};

function SalesStatCard({
  label,
  value,
  icon: Icon,
  accent,
  href,
}: SalesStatCardProps) {
  const content = (
    <Card
      className={cn(
        "p-5",
        href
          ? "transition duration-200 hover:border-sky-400/30 hover:shadow-brand"
          : "",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-body">{label}</p>
        <span
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03]",
            accent,
          )}
        >
          <Icon aria-hidden="true" className="h-4 w-4" />
        </span>
      </div>
      <div className="mt-4 flex items-end justify-between gap-3">
        <p className="text-2xl font-extrabold tracking-tight text-white tabular-nums">
          {value}
        </p>
        {href ? (
          <ArrowRight
            aria-hidden="true"
            className="h-4 w-4 text-white/30 transition duration-200 group-hover:text-white"
          />
        ) : null}
      </div>
    </Card>
  );

  return href ? (
    <Link href={href} className="group block">
      {content}
    </Link>
  ) : (
    content
  );
}

export default async function SalesOverview() {
  const supabase = await createClient();
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();

  const [
    pendingResult,
    activeResult,
    leadsResult,
    propertiesResult,
    packagesResult,
    screensResult,
    propertyStatsResult,
    newestPendingResult,
  ] = await Promise.all([
    supabase
      .from("ad_bookings")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("ad_bookings")
      .select("id", { count: "exact", head: true })
      .in("status", ["confirmed", "running"]),
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .gte("created_at", weekAgo),
    supabase
      .from("ad_properties")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
    supabase
      .from("ad_packages")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
    supabase.rpc("staff_screens_overview"),
    supabase
      .from("ad_property_stats")
      .select("property_id, screens_count, online_count"),
    supabase
      .from("ad_bookings")
      .select("*, profiles(full_name, company_name), ad_booking_items(*)")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const screens = normalizeStaffScreens(screensResult.data);
  const propertyStats = normalizeAdPropertyStats(propertyStatsResult.data);
  const propertiesWithoutScreens = propertyStats.filter(
    (row) => row.screens_count === 0,
  ).length;
  const pendingBookings = normalizeAdBookings(newestPendingResult.data);
  const loadErrorMessage =
    pendingResult.error?.message ??
    activeResult.error?.message ??
    leadsResult.error?.message ??
    propertiesResult.error?.message ??
    packagesResult.error?.message ??
    screensResult.error?.message ??
    propertyStatsResult.error?.message ??
    newestPendingResult.error?.message ??
    null;

  const statCards: SalesStatCardProps[] = [
    {
      label: "Pending bookings",
      value: String(pendingResult.count ?? 0),
      icon: CalendarClock,
      accent: "text-amber-300",
      href: "/sales/bookings",
    },
    {
      label: "Confirmed or running",
      value: String(activeResult.count ?? 0),
      icon: CalendarCheck,
      accent: "text-emerald-300",
      href: "/sales/bookings",
    },
    {
      label: "New leads · 7 days",
      value: String(leadsResult.count ?? 0),
      icon: Inbox,
      accent: "text-brand-blue",
      href: "/sales/leads",
    },
    {
      label: "Active properties",
      value: String(propertiesResult.count ?? 0),
      icon: Building2,
      accent: "text-blue-300",
      href: "/sales/properties",
    },
    {
      label: "Active packages",
      value: String(packagesResult.count ?? 0),
      icon: Package,
      accent: "text-brand-sky",
      href: "/sales/packages",
    },
    {
      label: "Total screens",
      value: String(screens.length),
      icon: Monitor,
      accent: "text-brand-sky",
      href: "/sales/screens",
    },
    {
      label: "Online screens",
      value: String(screens.filter((screen) => screen.online).length),
      icon: Wifi,
      accent: "text-emerald-300",
      href: "/sales/screens",
    },
    {
      label: "Properties without screens",
      value: String(propertiesWithoutScreens),
      icon: Building2,
      accent: "text-amber-300",
      href: "/sales/properties?withoutScreens=true",
    },
  ];

  return (
    <div className="space-y-8">
      <PanelPageHeader
        eyebrow="Sales"
        title="Overview"
        description="Track campaigns, leads, ad inventory, and screen coverage."
      />

      {loadErrorMessage ? (
        <p
          role="alert"
          className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200"
        >
          Some sales totals could not be loaded. {loadErrorMessage}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {statCards.map((card) => (
          <SalesStatCard key={card.label} {...card} />
        ))}
      </div>

      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between gap-4 border-b border-white/5 px-5 py-4">
          <h2 className="text-base font-semibold tracking-tight text-white">
            Newest pending bookings
          </h2>
          <Link
            href="/sales/bookings"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-sky transition duration-200 hover:text-white"
          >
            View all
            <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
          </Link>
        </div>

        {pendingBookings.length === 0 ? (
          <p className="px-5 py-8 text-sm text-body">
            No pending bookings right now.
          </p>
        ) : (
          <ul className="divide-y divide-white/5">
            {pendingBookings.map((booking) => (
              <li key={booking.id}>
                <Link
                  href="/sales/bookings"
                  className="flex flex-col gap-2 px-5 py-4 transition duration-200 hover:bg-white/[0.03] sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">
                      {booking.customerName}
                      {booking.companyName
                        ? ` · ${booking.companyName}`
                        : ""}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-body">
                      {formatBookingId(booking.id)} ·{" "}
                      {booking.city || "City not set"} ·{" "}
                      {formatBookingStatus(booking.status)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-4 text-xs text-muted">
                    <span className="font-semibold text-white">
                      {formatINR(booking.total)}
                    </span>
                    <span>{formatAdminDate(booking.createdAt)}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
