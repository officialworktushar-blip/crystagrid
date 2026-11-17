import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Settings2 } from "lucide-react";
import AdminCustomerDetailHeaderActions from "@/components/admin/AdminCustomerDetailHeaderActions";
import AdminManagerSelect from "@/components/admin/AdminManagerSelect";
import DeleteScreenButton from "@/components/admin/DeleteScreenButton";
import StatusBadge from "@/components/dashboard/StatusBadge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import {
  customerDisplayName,
  customerInitials,
  formatAdminDate,
  formatFileSize,
  formatStorage,
  managerDisplayName,
  normalizeAdminCustomerStats,
  normalizeAdminTeam,
} from "@/lib/admin";
import { getMediaUrl } from "@/lib/media";
import {
  formatRelativeTime,
  getScreenStatus,
} from "@/lib/screens";
import { createClient } from "@/lib/supabase/server";
import type { Media, Playlist, Screen } from "@/lib/types";

type AssignmentRow = {
  screen_id: string;
  playlist_id: string;
  is_active?: boolean;
};

export default async function AdminCustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [statsResult, teamResult] = await Promise.all([
    supabase.rpc("admin_customer_stats"),
    supabase.rpc("admin_list_team"),
  ]);
  const customer = normalizeAdminCustomerStats(statsResult.data).find(
    (item) => item.customer_id === id,
  );

  if (statsResult.error) {
    return (
      <div className="space-y-6">
        <Link
          href="/admin/customers"
          className="inline-flex items-center gap-2 text-sm text-white/55 transition duration-200 hover:text-white"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Customers
        </Link>
        <p
          role="alert"
          className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200"
        >
          Customer details could not be loaded. {statsResult.error.message}
        </p>
      </div>
    );
  }

  if (!customer) {
    notFound();
  }

  const managers = normalizeAdminTeam(teamResult.data);
  const managersError = teamResult.error?.message ?? null;
  const assignedManager = managers.find(
    (manager) => manager.id === customer.manager_id,
  );
  const currentManagerName =
    customer.manager_name ||
    (assignedManager ? managerDisplayName(assignedManager) : null) ||
    "Unassigned";
  const { data: authUserData } = await supabase.auth.getUser();
  const currentAdminId = authUserData.user?.id ?? null;

  const [screensResult, playlistsResult, mediaResult] = await Promise.all([
    supabase
      .from("screens")
      .select("id, customer_id, name, status, last_seen, created_at")
      .eq("customer_id", id)
      .order("last_seen", { ascending: false, nullsFirst: false }),
    supabase
      .from("playlists")
      .select("id, customer_id, name, created_at")
      .eq("customer_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("media")
      .select(
        "id, customer_id, name, type, file_path, file_size, duration, created_at",
      )
      .eq("customer_id", id)
      .order("created_at", { ascending: false }),
  ]);

  const screens = (screensResult.data ?? []) as Screen[];
  const playlists = (playlistsResult.data ?? []) as Playlist[];
  const media = (mediaResult.data ?? []) as Media[];
  const screenIds = screens.map((screen) => screen.id);
  const playlistIds = playlists.map((playlist) => playlist.id);

  let assignments: AssignmentRow[] = [];
  let assignmentError: string | null = null;

  if (screenIds.length > 0) {
    const assignmentResult = await supabase
      .from("screen_playlists")
      .select("screen_id, playlist_id, is_active")
      .in("screen_id", screenIds);

    if (assignmentResult.error) {
      const fallbackResult = await supabase
        .from("screen_playlists")
        .select("screen_id, playlist_id")
        .in("screen_id", screenIds);

      assignments = (fallbackResult.data ?? []) as unknown as AssignmentRow[];
      assignmentError = fallbackResult.error?.message ?? null;
    } else {
      assignments = (assignmentResult.data ??
        []) as unknown as AssignmentRow[];
    }
  }

  const playlistItemCounts = new Map<string, number>();
  let playlistItemsError: string | null = null;

  if (playlistIds.length > 0) {
    const { data: itemData, error: itemError } = await supabase
      .from("playlist_items")
      .select("playlist_id")
      .in("playlist_id", playlistIds);

    if (itemError) {
      playlistItemsError = itemError.message;
    } else {
      for (const item of (itemData ?? []) as { playlist_id: string }[]) {
        playlistItemCounts.set(
          item.playlist_id,
          (playlistItemCounts.get(item.playlist_id) ?? 0) + 1,
        );
      }
    }
  }

  const playlistNameById = new Map(
    playlists.map((playlist) => [playlist.id, playlist.name]),
  );
  const playlistNameByScreen = new Map<string, string>();

  for (const assignment of assignments) {
    if (assignment.is_active === false) {
      continue;
    }

    if (playlistNameByScreen.has(assignment.screen_id)) {
      continue;
    }

    const playlistName = playlistNameById.get(assignment.playlist_id);

    if (playlistName) {
      playlistNameByScreen.set(assignment.screen_id, playlistName);
    }
  }

  const now = Date.now();
  const screenError = screensResult.error?.message ?? assignmentError;
  const mediaError = mediaResult.error?.message ?? null;

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/admin/customers"
          className="inline-flex items-center gap-2 text-sm text-white/55 transition duration-200 hover:text-white"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Customers
        </Link>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <div className="brand-gradient flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-lg font-bold text-white shadow-brand">
              {customerInitials(customer)}
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                {customerDisplayName(customer)}
              </h1>
              <p className="mt-1 truncate text-sm text-body">
                {customer.company_name || "Customer account"}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
                Account manager
              </p>
              <p className="mt-1 truncate text-sm font-medium text-white">
                {currentManagerName}
              </p>

              {managersError ? (
                <p className="mt-2 max-w-56 text-xs text-red-300">
                  Managers could not be loaded. {managersError}
                </p>
              ) : (
                <>
                  <AdminManagerSelect
                    customerId={customer.customer_id}
                    managerId={customer.manager_id}
                    managers={managers}
                    className="mt-2 w-full sm:w-56"
                  />
                  <AdminCustomerDetailHeaderActions
                    customerId={customer.customer_id}
                    managerId={customer.manager_id}
                    currentAdminId={currentAdminId}
                  />
                </>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/cm/customers/${customer.customer_id}`}
                className="brand-gradient inline-flex shrink-0 items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-white shadow-brand transition duration-200 hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60"
              >
                <Settings2 aria-hidden="true" className="h-4 w-4" />
                Manage this customer
              </Link>
              <Button
                asChild
                variant="secondary"
                size="sm"
                className="h-10 px-4"
              >
                <Link href={`/cm/customers/${customer.customer_id}`}>
                  Screens
                </Link>
              </Button>
              <Button
                asChild
                variant="secondary"
                size="sm"
                className="h-10 px-4"
              >
                <Link href={`/cm/customers/${customer.customer_id}/media`}>
                  Media
                </Link>
              </Button>
              <Button
                asChild
                variant="secondary"
                size="sm"
                className="h-10 px-4"
              >
                <Link href={`/cm/customers/${customer.customer_id}/playlists`}>
                  Playlists
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Card className="p-5 hover:border-white/10 hover:shadow-none">
        <dl className="grid gap-5 sm:grid-cols-2 xl:grid-cols-5">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
              Email
            </dt>
            <dd className="mt-1 break-all text-sm text-white/80">
              {customer.email || "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
              Phone
            </dt>
            <dd className="mt-1 text-sm text-white/80">
              {customer.phone || "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
              Screens
            </dt>
            <dd className="mt-1 text-sm text-white/80 tabular-nums">
              <span className="font-semibold text-emerald-300">
                {customer.online_screens}
              </span>
              <span className="px-1 text-white/30">/</span>
              {customer.total_screens} online
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
              Storage
            </dt>
            <dd className="mt-1 text-sm text-white/80 tabular-nums">
              {formatStorage(customer.storage_bytes)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
              Joined
            </dt>
            <dd className="mt-1 text-sm text-white/80">
              {formatAdminDate(customer.joined_at)}
            </dd>
          </div>
        </dl>
      </Card>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-white">
            Screens
          </h2>
          <p className="mt-1 text-sm text-body">
            {screens.length} {screens.length === 1 ? "screen" : "screens"} on
            this account.
          </p>
        </div>

        {screenError ? (
          <p
            role="alert"
            className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200"
          >
            Screen details could not be fully loaded. {screenError}
          </p>
        ) : null}

        <Card className="overflow-hidden p-0 hover:border-white/10 hover:shadow-none">
          {screens.length === 0 ? (
            <p className="px-5 py-8 text-sm text-body">
              This customer has no paired screens.
            </p>
          ) : (
            <ul className="divide-y divide-white/5">
              {screens.map((screen) => {
                const displayStatus = getScreenStatus(
                  screen.status,
                  screen.last_seen,
                  now,
                );
                const playlistName = playlistNameByScreen.get(screen.id);

                return (
                  <li
                    key={screen.id}
                    className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <StatusBadge status={displayStatus} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">
                          {screen.name}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-body">
                          Playlist:{" "}
                          <span className="text-white/65">
                            {playlistName || "No playlist"}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-4 sm:justify-end">
                      <span className="text-xs text-muted">
                        {formatRelativeTime(screen.last_seen, now)}
                      </span>
                      <DeleteScreenButton
                        screenId={screen.id}
                        screenName={screen.name}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </section>

      <div className="grid gap-6 xl:grid-cols-3">
        <section className="space-y-3 xl:col-span-1">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-white">
              Playlists
            </h2>
            <p className="mt-1 text-sm text-body">
              {playlists.length}{" "}
              {playlists.length === 1 ? "playlist" : "playlists"}.
            </p>
          </div>

          {playlistsResult.error || playlistItemsError ? (
            <p
              role="alert"
              className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200"
            >
              Playlist details could not be fully loaded.{" "}
              {playlistsResult.error?.message ?? playlistItemsError}
            </p>
          ) : null}

          <Card className="overflow-hidden p-0 hover:border-white/10 hover:shadow-none">
            {playlists.length === 0 ? (
              <p className="px-5 py-8 text-sm text-body">
                This customer has no playlists.
              </p>
            ) : (
              <ul className="divide-y divide-white/5">
                {playlists.map((playlist) => (
                  <li
                    key={playlist.id}
                    className="flex items-center justify-between gap-3 px-4 py-3.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">
                        {playlist.name}
                      </p>
                      <p className="mt-0.5 text-xs text-muted">
                        {formatAdminDate(playlist.created_at)}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/60 tabular-nums">
                      {playlistItemCounts.get(playlist.id) ?? 0}{" "}
                      {(playlistItemCounts.get(playlist.id) ?? 0) === 1
                        ? "item"
                        : "items"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </section>

        <section className="space-y-3 xl:col-span-2">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-white">
              Media
            </h2>
            <p className="mt-1 text-sm text-body">
              {media.length} {media.length === 1 ? "file" : "files"} in this
              library.
            </p>
          </div>

          {mediaError ? (
            <p
              role="alert"
              className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200"
            >
              Media could not be loaded. {mediaError}
            </p>
          ) : null}

          {media.length === 0 ? (
            <Card className="p-8 text-center hover:border-white/10 hover:shadow-none">
              <p className="text-sm text-body">
                This customer has no media files.
              </p>
            </Card>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {media.map((item) => (
                <li
                  key={item.id}
                  className="overflow-hidden rounded-2xl border border-white/10 bg-surface"
                >
                  <div className="aspect-video overflow-hidden bg-black/40">
                    {item.type === "video" ? (
                      <video
                        src={getMediaUrl(item.file_path)}
                        muted
                        playsInline
                        preload="metadata"
                        aria-label={item.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <img
                        src={getMediaUrl(item.file_path)}
                        alt={item.name}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>
                  <div className="p-3">
                    <p
                      className="truncate text-sm font-medium text-white"
                      title={item.name}
                    >
                      {item.name}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      {formatFileSize(item.file_size)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
