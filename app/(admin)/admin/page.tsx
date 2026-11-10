import Link from "next/link";
import {
  ArrowRight,
  HardDrive,
  Images,
  Monitor,
  Users,
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
} from "@/lib/admin";
import {
  formatRelativeTime,
  isOnline,
} from "@/lib/screens";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

type RecentScreenRow = {
  id: string;
  customer_id: string;
  name: string;
  last_seen: string | null;
};

type AdminStatCardProps = {
  label: string;
  value: string;
  icon: LucideIcon;
  accent: string;
};

function AdminStatCard({
  label,
  value,
  icon: Icon,
  accent,
}: AdminStatCardProps) {
  return (
    <Card className="p-5">
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
      <p className="mt-4 text-2xl font-extrabold tracking-tight text-white tabular-nums">
        {value}
      </p>
    </Card>
  );
}

export default async function AdminOverviewPage() {
  const supabase = await createClient();
  const now = Date.now();

  const [statsResult, screensResult] = await Promise.all([
    supabase.rpc("admin_customer_stats"),
    supabase
      .from("screens")
      .select("id, customer_id, name, last_seen")
      .not("last_seen", "is", null)
      .order("last_seen", { ascending: false })
      .limit(8),
  ]);

  const customers = normalizeAdminCustomerStats(statsResult.data);
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

  const statCards: AdminStatCardProps[] = [
    {
      label: "Customers",
      value: String(customers.length),
      icon: Users,
      accent: "text-violet-300",
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

  const hasError = Boolean(statsResult.error || screensResult.error);

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
          Monitor customers, screens, and storage across Crystagrid.
        </p>
      </div>

      {hasError ? (
        <p
          role="alert"
          className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200"
        >
          Some admin totals could not be loaded. Refresh to try again.
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
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
              {newestCustomers.map((customer) => (
                <li key={customer.customer_id}>
                  <Link
                    href={`/admin/customers/${customer.customer_id}`}
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
              ))}
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
                const customer = customerById.get(screen.customer_id);
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
                        {customer ? (
                          <Link
                            href={`/admin/customers/${customer.customer_id}`}
                            className="mt-0.5 block truncate text-xs text-body transition duration-200 hover:text-brand-sky"
                          >
                            {customerDisplayName(customer)}
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
