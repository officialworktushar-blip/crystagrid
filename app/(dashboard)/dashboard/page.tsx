import { redirect } from "next/navigation";
import {
  Images,
  ListVideo,
  Mail,
  MapPin,
  Monitor,
  Phone,
  UserRound,
  Wifi,
  type LucideIcon,
} from "lucide-react";
import Card from "@/components/ui/Card";
import { isOnline } from "@/lib/screens";
import { createClient } from "@/lib/supabase/server";
import type { Screen } from "@/lib/types";
import { cn } from "@/lib/utils";

type StatCardProps = {
  label: string;
  value: number;
  icon: LucideIcon;
  accent: string;
};

type AssignmentRow = {
  screen_id: string;
  playlist_id: string;
  is_active: boolean | null;
  playlists:
    | { id: string; name: string }
    | { id: string; name: string }[]
    | null;
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

  const [screensResult, mediaResult, playlistsResult, managerResult] =
    await Promise.all([
      supabase
        .from("screens")
        .select("id, customer_id, name, status, location, last_seen, created_at")
        .eq("customer_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("media")
        .select("id", { count: "exact", head: true })
        .eq("customer_id", user.id),
      supabase
        .from("playlists")
        .select("id", { count: "exact", head: true })
        .eq("customer_id", user.id),
      supabase.rpc("my_manager"),
    ]);

  const screens = (screensResult.data ?? []) as Screen[];
  const manager = normalizeManager(managerResult.data);
  const onlineScreens = screens.filter((screen) =>
    isOnline(screen.last_seen),
  ).length;

  let assignments: AssignmentRow[] = [];
  let assignmentError: string | null = null;

  if (screens.length > 0) {
    const { data, error } = await supabase
      .from("screen_playlists")
      .select("screen_id, playlist_id, is_active, playlists (id, name)")
      .in(
        "screen_id",
        screens.map((screen) => screen.id),
      );

    assignments = (data ?? []) as unknown as AssignmentRow[];
    assignmentError = error?.message ?? null;
  }

  const playlistNameByScreen = new Map<string, string>();

  for (const assignment of assignments) {
    if (assignment.is_active === false) {
      continue;
    }

    if (playlistNameByScreen.has(assignment.screen_id)) {
      continue;
    }

    const playlist = Array.isArray(assignment.playlists)
      ? assignment.playlists[0]
      : assignment.playlists;

    if (playlist?.name) {
      playlistNameByScreen.set(assignment.screen_id, playlist.name);
    }
  }

  const hasError = Boolean(
    screensResult.error ||
      mediaResult.error ||
      playlistsResult.error ||
      assignmentError,
  );

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
          Some dashboard details could not be loaded. Refresh to try again.
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
            Your screens at a glance
          </h2>
          <p className="mt-1 text-sm text-body">
            {screens.length} {screens.length === 1 ? "screen" : "screens"} on
            your account.
          </p>
        </div>

        {screens.length === 0 ? (
          <Card className="p-8 text-center hover:border-white/10 hover:shadow-none">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-brand-sky">
              <Monitor aria-hidden="true" className="h-6 w-6" />
            </span>
            <p className="mt-4 text-sm font-medium text-white">
              Your account manager will set up your screens soon.
            </p>
          </Card>
        ) : (
          <Card className="overflow-hidden p-0 hover:border-white/10 hover:shadow-none">
            <ul className="divide-y divide-white/5">
              {screens.map((screen) => {
                const online = isOnline(screen.last_seen);
                const playlistName = playlistNameByScreen.get(screen.id);

                return (
                  <li
                    key={screen.id}
                    className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        aria-hidden="true"
                        className={cn(
                          "h-2.5 w-2.5 shrink-0 rounded-full",
                          online
                            ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]"
                            : "bg-white/30",
                        )}
                      />
                      <span className="sr-only">
                        {online ? "Online" : "Offline"}
                      </span>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">
                          {screen.name}
                        </p>
                        <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-body">
                          <MapPin
                            aria-hidden="true"
                            className="h-3.5 w-3.5 shrink-0"
                          />
                          {screen.location || "Location not set"}
                        </p>
                      </div>
                    </div>

                    <div className="flex min-w-0 items-center gap-2 sm:ml-4 sm:shrink-0">
                      <ListVideo
                        aria-hidden="true"
                        className="h-4 w-4 shrink-0 text-brand-sky"
                      />
                      <span className="truncate text-sm text-body">
                        {playlistName || "No playlist assigned"}
                      </span>
                    </div>
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
