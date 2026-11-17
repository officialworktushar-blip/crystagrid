import Link from "next/link";
import { ArrowUpRight, Monitor, Wifi, WifiOff, Clock3, MapPinOff, CalendarPlus } from "lucide-react";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { AddScreenButton } from "@/components/screens/AddScreenDialog";
import {
  exactLocation,
  normalizeStaffScreens,
  staffScreenStatus,
  type StaffScreenRow,
} from "@/lib/staff-screens";
import { formatRelativeTime } from "@/lib/screens";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Stat = {
  label: string;
  value: number;
  description: string;
  icon: typeof Monitor;
  tone: string;
};

function StatCard({ stat }: { stat: Stat }) {
  const Icon = stat.icon;

  return (
    <article className="rounded-3xl border border-white/5 bg-surface p-5 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
            {stat.label}
          </p>
          <p className="mt-3 text-3xl font-bold tracking-tight text-white">
            {stat.value}
          </p>
          <p className="mt-1 text-xs leading-5 text-muted">
            {stat.description}
          </p>
        </div>
        <span
          className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ${stat.tone}`}
        >
          <Icon aria-hidden="true" className="h-5 w-5" />
        </span>
      </div>
    </article>
  );
}

function NewestScreenRow({ row }: { row: StaffScreenRow }) {
  return (
    <div className="flex flex-col gap-3 border-b border-white/5 py-4 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="truncate font-semibold text-white">{row.name}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
          <span>{row.property_name ?? "Not placed"}</span>
          <span aria-hidden="true">·</span>
          <span>{exactLocation(row)}</span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <p className="text-xs text-muted">
          {formatRelativeTime(row.last_seen)}
        </p>
        <StatusBadge status={staffScreenStatus(row)} />
      </div>
    </div>
  );
}

export default async function DeviceOverviewPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("staff_screens_overview");

  if (error) {
    return (
      <div className="space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-sky">
              Device Manager
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">
              Overview
            </h1>
          </div>
        </header>
        <div
          role="alert"
          className="rounded-3xl border border-red-400/20 bg-red-400/10 px-6 py-5 text-sm leading-6 text-red-200"
        >
          {error.message}
        </div>
      </div>
    );
  }

  const rows = normalizeStaffScreens(data);
  const statusCount = (status: ReturnType<typeof staffScreenStatus>) =>
    rows.filter((row) => staffScreenStatus(row) === status).length;

  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  const stats: Stat[] = [
    {
      label: "Total screens",
      value: rows.length,
      description: "Screens you can manage",
      icon: Monitor,
      tone: "border-sky-400/20 bg-sky-400/10 text-sky-200",
    },
    {
      label: "Online",
      value: statusCount("online"),
      description: "Seen in the last minute",
      icon: Wifi,
      tone: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
    },
    {
      label: "Offline",
      value: statusCount("offline"),
      description: "Seen before, now silent",
      icon: WifiOff,
      tone: "border-white/10 bg-white/5 text-white/50",
    },
    {
      label: "Pending",
      value: statusCount("pending"),
      description: "Never paired yet",
      icon: Clock3,
      tone: "border-amber-400/20 bg-amber-400/10 text-amber-300",
    },
    {
      label: "Not placed",
      value: rows.filter((row) => !row.property_id).length,
      description: "No property assigned",
      icon: MapPinOff,
      tone: "border-violet-400/20 bg-violet-400/10 text-violet-200",
    },
    {
      label: "Added this week",
      value: rows.filter((row) => Date.parse(row.created_at) >= oneWeekAgo).length,
      description: "New screens in 7 days",
      icon: CalendarPlus,
      tone: "border-fuchsia-400/20 bg-fuchsia-400/10 text-fuchsia-200",
    },
  ];

  const newest = [...rows]
    .sort((left, right) => Date.parse(right.created_at) - Date.parse(left.created_at))
    .slice(0, 8);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-sky">
            Device Manager
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">
            Overview
          </h1>
          <p className="mt-1 text-sm leading-6 text-body">
            Fleet health and the newest screens in one view.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <AddScreenButton />
          <Link
            href="/device/screens"
            className="inline-flex h-11 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-6 text-sm font-semibold text-white transition duration-200 hover:border-white/20 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60"
          >
            View all screens
            <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map((stat) => (
          <StatCard key={stat.label} stat={stat} />
        ))}
      </div>

      <section className="rounded-3xl border border-white/5 bg-surface p-5 shadow-card sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-white">
              Newest screens
            </h2>
            <p className="mt-0.5 text-xs text-muted">Last 8 added screens</p>
          </div>
          <Link
            href="/device/screens"
            className="text-xs font-semibold text-sky-200 transition duration-200 hover:text-white"
          >
            Inventory
          </Link>
        </div>

        <div className="mt-3">
          {newest.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-12 text-center">
              <p className="text-sm font-semibold text-white">No screens yet</p>
              <p className="mt-1 text-xs leading-5 text-muted">
                Add your first screen to see it here.
              </p>
            </div>
          ) : (
            newest.map((row) => <NewestScreenRow key={row.id} row={row} />)
          )}
        </div>
      </section>
    </div>
  );
}
