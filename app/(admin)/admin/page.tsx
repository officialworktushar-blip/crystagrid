import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  CalendarCheck,
  CalendarClock,
  CreditCard,
  HardDrive,
  Images,
  Inbox,
  IndianRupee,
  Monitor,
  MonitorOff,
  MonitorPlay,
  Users,
  UsersRound,
  UserX,
  Wifi,
  type LucideIcon,
} from "lucide-react";
import Card from "@/components/ui/Card";
import {
  customerDisplayName,
  formatAdminDate,
  formatStorage,
  joinedTimestamp,
  normalizeAdminCustomerStats,
  normalizeAdminTeam,
} from "@/lib/admin";
import { formatINR } from "@/lib/ads";
import {
  formatRelativeTime,
  isOnline,
} from "@/lib/screens";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

type RecentScreenRow = {
  id: string;
  customer_id: string | null;
  name: string;
  last_seen: string | null;
};

type AdminStatCardProps = {
  label: string;
  value: string;
  icon: LucideIcon;
  accent: string;
  href?: string;
};

type HousePlayingCounts = {
  none: number;
  house: number;
};

function countHousePlaying(value: unknown): HousePlayingCounts {
  const counts: HousePlayingCounts = { none: 0, house: 0 };

  if (!Array.isArray(value)) {
    return counts;
  }

  for (const entry of value) {
    if (entry === null || typeof entry !== "object" || Array.isArray(entry)) {
      continue;
    }

    const row = entry as Record<string, unknown>;
    const playing = typeof row.playing === "string" ? row.playing : null;

    if (playing === "none") {
      counts.none += 1;
    }

    if (playing === "house") {
      counts.house += 1;
    }
  }

  return counts;
}

function AdminStatCard({
  label,
  value,
  icon: Icon,
  accent,
  href,
}: AdminStatCardProps) {
  const content = (
    <Card
      className={cn(
        "p-5",
        href ? "transition duration-200 hover:border-sky-400/30 hover:shadow-brand" : "",
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

export default async function AdminOverviewPage() {
  const supabase = await createClient();
  const now = Date.now();

  const [
    statsResult,
    teamResult,
    screensResult,
    leadsResult,
    pendingBookingsResult,
    activeBookingsResult,
    houseResult,
    paidBookingsResult,
    revenueResult,
    unmatchedPaymentsResult,
  ] = await Promise.all([
    supabase.rpc("admin_customer_stats"),
    supabase.rpc("admin_list_team"),
    supabase
      .from("screens")
      .select("id, customer_id, name, last_seen")
      .not("last_seen", "is", null)
      .order("last_seen", { ascending: false })
      .limit(8),
    supabase.from("leads").select("id", { count: "exact", head: true }),
    supabase
      .from("ad_bookings")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("ad_bookings")
      .select("id", { count: "exact", head: true })
      .in("status", ["confirmed", "running"]),
    supabase.rpc("house_screens_overview"),
    supabase
      .from("ad_bookings")
      .select("id", { count: "exact", head: true })
      .eq("payment_status", "paid"),
    supabase.from("ad_bookings").select("total").eq("payment_status", "paid"),
    supabase
      .from("ad_payments")
      .select("id", { count: "exact", head: true })
      .eq("status", "unmatched"),
  ]);

  const customers = normalizeAdminCustomerStats(statsResult.data);
  const managers = normalizeAdminTeam(teamResult.data);
  const customerById = new Map(
    customers.map((customer) => [customer.customer_id, customer]),
  );
  const recentScreens = (
    (screensResult.data ?? []) as unknown as RecentScreenRow[]
  ).filter((screen) => Boolean(screen.last_seen));

  const newestCustomers = [...customers]
    .sort((a, b) => joinedTimestamp(b) - joinedTimestamp(a))
    .slice(0, 5);

  const totalScreens = customers.reduce(
    (total, customer) => total + customer.total_screens,
    0,
  );
  const onlineScreens = customers.reduce(
    (total, customer) => total + customer.online_screens,
    0,
  );
  const totalMedia = customers.reduce(
    (total, customer) => total + customer.media_count,
    0,
  );
  const totalStorage = customers.reduce(
    (total, customer) => total + customer.storage_bytes,
    0,
  );
  const customersWithoutManager = customers.filter(
    (customer) => !customer.manager_id,
  ).length;
  const houseCounts = countHousePlaying(houseResult.data);
  const revenueCollected = (revenueResult.data ?? []).reduce((sum, row) => {
    const total = (row as { total?: unknown }).total;
    return sum + (typeof total === "number" && Number.isFinite(total) ? total : 0);
  }, 0);

  const statCards: AdminStatCardProps[] = [
    {
      label: "Customers",
      value: String(customers.length),
      icon: Users,
      accent: "text-brand-sky",
    },
    {
      label: "Account managers",
      value: String(managers.length),
      icon: UsersRound,
      accent: "text-blue-300",
    },
    {
      label: "Customers without a manager",
      value: String(customersWithoutManager),
      icon: UserX,
      accent: "text-red-300",
    },
    {
      label: "Leads",
      value: String(leadsResult.count ?? 0),
      icon: Inbox,
      accent: "text-brand-blue",
    },
    {
      label: "Pending bookings",
      value: String(pendingBookingsResult.count ?? 0),
      icon: CalendarClock,
      accent: "text-amber-300",
    },
    {
      label: "Confirmed or running campaigns",
      value: String(activeBookingsResult.count ?? 0),
      icon: CalendarCheck,
      accent: "text-emerald-300",
    },
    {
      label: "Paid bookings",
      value: String(paidBookingsResult.count ?? 0),
      icon: CreditCard,
      accent: "text-emerald-300",
      href: "/admin/payments",
    },
    {
      label: "Revenue collected",
      value: formatINR(revenueCollected),
      icon: IndianRupee,
      accent: "text-emerald-300",
      href: "/admin/payments",
    },
    {
      label: "Payments to check",
      value: String(unmatchedPaymentsResult.count ?? 0),
      icon: AlertCircle,
      accent: "text-amber-300",
      href: "/admin/payments",
    },
    {
      label: "Total screens",
      value: String(totalScreens),
      icon: Monitor,
      accent: "text-brand-sky",
    },
    {
      label: "Online now",
      value: String(onlineScreens),
      icon: Wifi,
      accent: "text-emerald-300",
    },
    {
      label: "Screens with nothing playing",
      value: String(houseCounts.none),
      icon: MonitorOff,
      accent: "text-amber-300",
      href: "/admin/house?playing=none",
    },
    {
      label: "Showing company content",
      value: String(houseCounts.house),
      icon: MonitorPlay,
      accent: "text-sky-300",
      href: "/admin/house",
    },
    {
      label: "Media files",
      value: String(totalMedia),
      icon: Images,
      accent: "text-blue-300",
    },
    {
      label: "Storage used",
      value: formatStorage(totalStorage),
      icon: HardDrive,
      accent: "text-amber-300",
    },
  ];

  const loadErrorMessage =
    statsResult.error?.message ??
    teamResult.error?.message ??
    screensResult.error?.message ??
    leadsResult.error?.message ??
    pendingBookingsResult.error?.message ??
    activeBookingsResult.error?.message ??
    houseResult.error?.message ??
    paidBookingsResult.error?.message ??
    revenueResult.error?.message ??
    unmatchedPaymentsResult.error?.message ??
    null;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-sky">
          Admin
        </p>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
          Overview
        </h1>
        <p className="mt-2 text-sm text-body">
          Monitor customers, managers, screens, and storage across Crystagrid.
        </p>
      </div>

      {loadErrorMessage ? (
        <p
          role="alert"
          className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200"
        >
          Some admin totals could not be loaded. {loadErrorMessage}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {statCards.map((card) => (
          <AdminStatCard key={card.label} {...card} />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="overflow-hidden p-0">
          <div className="flex items-center justify-between gap-4 border-b border-white/5 px-5 py-4">
            <h2 className="text-base font-semibold tracking-tight text-white">
              Newest customers
            </h2>
            <Link
              href="/admin/customers"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-sky transition duration-200 hover:text-white"
            >
              View all
              <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
            </Link>
          </div>

          {newestCustomers.length === 0 ? (
            <p className="px-5 py-8 text-sm text-body">
              No customers have been loaded yet.
            </p>
          ) : (
            <ul className="divide-y divide-white/5">
                {newestCustomers.map((row) => {
                  const customer = row;

                  return (
                  <li key={row.id}>
                    <Link
                      href={`/admin/customers/${row.id}`}
                    className="flex items-center justify-between gap-4 px-5 py-3.5 transition duration-200 hover:bg-white/[0.03]"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">
                        {customerDisplayName(customer)}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-body">
                        {customer.company_name || "No company"}
                      </p>
                      <p className="truncate text-xs text-muted">
                        {customer.email || "No email"}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-muted">
                      {formatAdminDate(customer.joined_at)}
                    </span>
                  </Link>
                  </li>
                  );
                })}
            </ul>
          )}
        </Card>

        <Card className="overflow-hidden p-0">
          <div className="flex items-center justify-between gap-4 border-b border-white/5 px-5 py-4">
            <h2 className="text-base font-semibold tracking-tight text-white">
              Screens seen recently
            </h2>
            <Link
              href="/admin/screens"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-sky transition duration-200 hover:text-white"
            >
              View all
              <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
            </Link>
          </div>

          {screensResult.error ? (
            <p className="px-5 py-8 text-sm text-red-200">
              Recent screens could not be loaded.
            </p>
          ) : recentScreens.length === 0 ? (
            <p className="px-5 py-8 text-sm text-body">
              No screens have checked in yet.
            </p>
          ) : (
            <ul className="divide-y divide-white/5">
              {recentScreens.map((screen) => {
                const row = screen.customer_id
                  ? customerById.get(screen.customer_id)
                  : undefined;
                const online = isOnline(screen.last_seen, now);

                return (
                  <li
                    key={screen.id}
                    className="flex items-center justify-between gap-4 px-5 py-3.5"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className={cn(
                          "h-2 w-2 shrink-0 rounded-full",
                          online
                            ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]"
                            : "bg-white/30",
                        )}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">
                          {screen.name}
                        </p>
                        {row ? (
                          <Link
                            href={`/admin/customers/${row.id}`}
                            className="mt-0.5 block truncate text-xs text-body transition duration-200 hover:text-brand-sky"
                          >
                            {customerDisplayName(row)}
                          </Link>
                        ) : (
                          <p className="mt-0.5 text-xs text-body">
                            Unknown customer
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="shrink-0 text-xs text-muted">
                      {formatRelativeTime(screen.last_seen, now)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
