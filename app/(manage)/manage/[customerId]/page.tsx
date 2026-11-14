import Link from "next/link";
import {
  ArrowRight,
  Images,
  ListVideo,
  MapPin,
  Monitor,
  Wifi,
  type LucideIcon,
} from "lucide-react";
import StatusBadge from "@/components/dashboard/StatusBadge";
import Card from "@/components/ui/Card";
import {
  formatRelativeTime,
  getScreenStatus,
  isOnline,
} from "@/lib/screens";
import { createClient } from "@/lib/supabase/server";
import type { Screen } from "@/lib/types";
import { cn } from "@/lib/utils";

type StatCardProps = {
  label: string;
  value: number;
  icon: LucideIcon;
  accent: string;
};

function StatCard({ label, value, icon: Icon, accent }: StatCardProps) {
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
      <p className="mt-4 text-3xl font-extrabold tracking-tight text-white tabular-nums">
        {value}
      </p>
    </Card>
  );
}

export default async function ManageCustomerOverviewPage({
  params,
}: {
  params: Promise<{ customerId: string }>;
}) {
  const { customerId } = await params;
  const supabase = await createClient();
  const now = Date.now();

  const [screensResult, mediaResult, playlistsResult] = await Promise.all([
    supabase
      .from("screens")
      .select(
        "id, customer_id, name, status, location, last_seen, created_at",
      )
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false }),
    supabase
      .from("media")
      .select("id", { count: "exact", head: true })
      .eq("customer_id", customerId),
    supabase
      .from("playlists")
      .select("id", { count: "exact", head: true })
      .eq("customer_id", customerId),
  ]);

  const screens = (screensResult.data ?? []) as Screen[];
  const onlineScreens = screens.filter((screen) =>
    isOnline(screen.last_seen, now),
  ).length;
  const recentScreens = screens.slice(0, 5);
  const hasError = [
    screensResult.error,
    mediaResult.error,
    playlistsResult.error,
  ].some(Boolean);

  const cards: StatCardProps[] = [
    {
      label: "Screens",
      value: screens.length,
      accent: "text-brand-sky",
      icon: Monitor,
    },
    {
      label: "Online",
      value: onlineScreens,
      accent: "text-emerald-300",
      icon: Wifi,
    },
    {
      label: "Media files",
      value: mediaResult.count ?? 0,
      accent: "text-blue-300",
      icon: Images,
    },
    {
      label: "Playlists",
      value: playlistsResult.count ?? 0,
      accent: "text-violet-300",
      icon: ListVideo,
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-sky">
          Overview
        </p>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
          Customer overview
        </h1>
        <p className="mt-2 text-sm text-body">
          A quick look at this customer&apos;s screens and content.
        </p>
      </div>

      {hasError ? (
        <p
          role="alert"
          className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200"
        >
          Some customer totals could not be loaded. Refresh to try again.
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-white">
              Screens
            </h2>
            <p className="mt-1 text-sm text-body">
              {screens.length} {screens.length === 1 ? "screen" : "screens"} on
              this account.
            </p>
          </div>

          <Link
            href={`/manage/${customerId}/screens`}
            className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-brand-sky transition duration-200 hover:text-white"
          >
            View all
            <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
          </Link>
        </div>

        <Card className="overflow-hidden p-0 hover:border-white/10 hover:shadow-none">
          {recentScreens.length === 0 ? (
            <p className="px-5 py-8 text-sm text-body">
              This customer has no paired screens.
            </p>
          ) : (
            <ul className="divide-y divide-white/5">
              {recentScreens.map((screen) => {
                const displayStatus = getScreenStatus(
                  screen.status,
                  screen.last_seen,
                  now,
                );

                return (
                  <li
                    key={screen.id}
                    className="flex items-center justify-between gap-4 px-5 py-3.5"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <StatusBadge status={displayStatus} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">
                          {screen.name}
                        </p>
                        <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-body">
                          <MapPin
                            aria-hidden="true"
                            className="h-3.5 w-3.5 shrink-0"
                          />
                          {screen.location || "No location"}
                        </p>
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
      </section>
    </div>
  );
}
