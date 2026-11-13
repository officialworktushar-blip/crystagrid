import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Images,
  ListVideo,
  Monitor,
  Wifi,
  type LucideIcon,
} from "lucide-react";
import Card from "@/components/ui/Card";
import { isOnline } from "@/lib/screens";
import { createClient } from "@/lib/supabase/server";
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

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [screensResult, onlineResult, mediaResult, playlistsResult] =
    await Promise.all([
      supabase
        .from("screens")
        .select("id", { count: "exact", head: true })
        .eq("customer_id", user.id),
      supabase
        .from("screens")
        .select("last_seen")
        .eq("customer_id", user.id),
      supabase
        .from("media")
        .select("id", { count: "exact", head: true })
        .eq("customer_id", user.id),
      supabase
        .from("playlists")
        .select("id", { count: "exact", head: true })
        .eq("customer_id", user.id),
    ]);

  const screensCount = screensResult.count ?? 0;
  const onlineScreens = (
    (onlineResult.data ?? []) as { last_seen: string | null }[]
  ).filter((screen) => isOnline(screen.last_seen)).length;
  const hasError = [
    screensResult.error,
    onlineResult.error,
    mediaResult.error,
    playlistsResult.error,
  ].some(Boolean);

  const cards = [
    {
      label: "Screens",
      value: screensCount,
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
          Dashboard
        </h1>
        <p className="mt-2 text-sm text-body">
          A quick look at your screens and content.
        </p>
      </div>

      {hasError ? (
        <p
          role="alert"
          className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200"
        >
          Some dashboard totals could not be loaded. Refresh to try again.
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <StatCard
            key={card.label}
            label={card.label}
            value={card.value}
            icon={card.icon}
            accent={card.accent}
          />
        ))}
      </div>

      {screensCount === 0 ? (
        <Link
          href="/dashboard/screens"
          className="group flex flex-col gap-5 rounded-3xl border border-white/10 bg-surface p-6 transition duration-200 hover:border-sky-500/40 hover:shadow-card sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-4">
            <span className="brand-gradient flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-brand">
              <Monitor aria-hidden="true" className="h-6 w-6" />
            </span>
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-white">
                Add your first screen
              </h2>
              <p className="mt-1 max-w-xl text-sm leading-6 text-body">
                Pair a display with a 6-digit code and start publishing content
                from your dashboard.
              </p>
            </div>
          </div>

          <span className="inline-flex items-center gap-2 text-sm font-semibold text-brand-sky transition duration-200 group-hover:text-white">
            Go to screens
            <ArrowRight
              aria-hidden="true"
              className="h-4 w-4 transition duration-200 group-hover:translate-x-0.5"
            />
          </span>
        </Link>
      ) : null}
    </div>
  );
}
