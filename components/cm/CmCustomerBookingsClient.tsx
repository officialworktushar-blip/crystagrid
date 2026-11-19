"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  Check,
  Film,
  Image as ImageIcon,
  Loader2,
  Monitor,
  Scissors,
} from "lucide-react";
import Card from "@/components/ui/Card";
import PanelSelect from "@/components/ui/PanelSelect";
import { formatINR } from "@/lib/ads";
import {
  formatBookingId,
  formatBookingStatus,
  normalizeAdBookingScreens,
  type AdBooking,
  type AdBookingScreen,
} from "@/lib/ad-bookings";
import {
  cmBookingDateState,
  cmBookingNeedsContent,
  cmBookingScreenLocation,
  cmBookingScreenSummary,
  formatCmBookingDateRange,
  groupCmBookingScreens,
  type CmBooking,
  type CmPlaylistPreview,
  type CmPlaylistSlot,
  type CmBookingScreenGroup,
} from "@/lib/cm";
import { getMediaUrl } from "@/lib/media";
import { createClient } from "@/lib/supabase/client";
import type { Media, Playlist, PlaylistItem } from "@/lib/types";
import { cn } from "@/lib/utils";

export type PackageProperty = {
  package_id: string;
  property_id: string;
  property_name: string;
};

type ScreensState = {
  loading: boolean;
  error: string | null;
  screens: AdBookingScreen[];
};

type PlaylistSaveState = {
  status: "idle" | "saving" | "saved" | "error";
  message: string | null;
};

const CLIP_LENGTH = 10;

const statusStyles: Record<string, { badge: string; dot: string }> = {
  draft: {
    badge: "border-white/10 bg-white/5 text-white/50",
    dot: "bg-white/40",
  },
  pending: {
    badge: "border-amber-400/20 bg-amber-400/10 text-amber-300",
    dot: "bg-amber-400",
  },
  confirmed: {
    badge: "border-sky-400/20 bg-sky-400/10 text-sky-300",
    dot: "bg-sky-400",
  },
  running: {
    badge: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
    dot: "bg-emerald-400",
  },
  completed: {
    badge: "border-blue-400/20 bg-blue-400/10 text-blue-300",
    dot: "bg-blue-400",
  },
  cancelled: {
    badge: "border-red-400/20 bg-red-400/10 text-red-300",
    dot: "bg-red-400",
  },
};

function StatusChip({ status }: { status: string }) {
  const normalized = status.trim().toLowerCase();
  const style = statusStyles[normalized] ?? statusStyles.draft;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        style.badge,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", style.dot)} />
      {formatBookingStatus(status)}
    </span>
  );
}

function DateStateChip({ booking }: { booking: CmBooking }) {
  const state = cmBookingDateState(booking);
  const tone =
    state.tone === "live"
      ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
      : state.tone === "upcoming"
        ? "border-sky-400/20 bg-sky-400/10 text-sky-300"
        : state.tone === "ended"
          ? "border-white/10 bg-white/5 text-white/50"
          : "border-blue-400/20 bg-blue-400/10 text-blue-300";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
        tone,
      )}
    >
      {state.label}
    </span>
  );
}

function formatLoopTime(seconds: number) {
  const total = Math.max(0, Math.round(seconds));

  if (total <= 59) {
    return `${total}s`;
  }

  const minutes = Math.floor(total / 60);
  const remaining = total % 60;

  return `${minutes}:${remaining.toString().padStart(2, "0")}`;
}

function resolveSlotDuration(item: PlaylistItem, mediaItem: Media | undefined) {
  if (
    typeof item.duration === "number" &&
    Number.isFinite(item.duration) &&
    item.duration > 0
  ) {
    return Math.max(1, Math.min(CLIP_LENGTH, Math.round(item.duration)));
  }

  if (mediaItem?.type === "video") {
    const length = mediaItem.duration;

    if (typeof length === "number" && Number.isFinite(length) && length > 0) {
      return Math.max(1, Math.min(CLIP_LENGTH, Math.round(length)));
    }
  }

  return CLIP_LENGTH;
}

function buildPreview(
  playlistId: string | null,
  playlists: Playlist[],
  playlistItems: PlaylistItem[],
  media: Media[],
): CmPlaylistPreview | null {
  if (!playlistId) {
    return null;
  }

  const playlist = playlists.find((entry) => entry.id === playlistId);

  if (!playlist) {
    return null;
  }

  const mediaById = new Map(media.map((item) => [item.id, item] as const));
  const slots: CmPlaylistSlot[] = playlistItems
    .filter((item) => item.playlist_id === playlist.id)
    .sort((left, right) => left.position - right.position)
    .slice(0, 10)
    .map((item) => {
      const mediaItem = mediaById.get(item.media_id);

      return {
        id: item.id,
        mediaId: item.media_id,
        position: item.position,
        duration: resolveSlotDuration(item, mediaItem),
        clipStart: Math.max(0, item.clip_start ?? 0),
        name: mediaItem?.name ?? "Media unavailable",
        type: mediaItem?.type ?? "image",
        filePath: mediaItem?.file_path ?? "",
      };
    });
  const loopSeconds = slots.reduce(
    (sum, slot) => sum + Math.max(1, slot.duration - slot.clipStart),
    0,
  );

  return {
    id: playlist.id,
    name: playlist.name,
    slotCount: slots.length,
    loopSeconds,
    slots,
  };
}

function isPackageItem(item: AdBooking["items"][number]): boolean {
  return (
    item.type === "package" || (!item.propertyId && Boolean(item.packageId))
  );
}

function collectBookingProperties(
  booking: CmBooking,
  packageProperties: PackageProperty[],
  screenGroups: CmBookingScreenGroup[],
): Array<{ id: string; name: string }> {
  const byPackage = new Map<string, PackageProperty[]>();

  for (const entry of packageProperties) {
    const current = byPackage.get(entry.package_id) ?? [];
    current.push(entry);
    byPackage.set(entry.package_id, current);
  }

  const properties = new Map<string, string>();

  for (const item of booking.items) {
    if (isPackageItem(item)) {
      for (const entry of byPackage.get(item.packageId ?? "") ?? []) {
        const key =
          entry.property_id || `name:${entry.property_name.trim().toLowerCase()}`;

        if (key && !properties.has(key)) {
          properties.set(key, entry.property_name);
        }
      }
    } else if (item.propertyId) {
      if (!properties.has(item.propertyId)) {
        properties.set(item.propertyId, item.name || item.propertyId);
      }
    }
  }

  for (const group of screenGroups) {
    const key = group.propertyId ?? `name:${group.propertyName.toLowerCase()}`;

    if (!properties.has(key)) {
      properties.set(key, group.propertyName);
    }
  }

  return [...properties.entries()].map(([id, name]) => ({ id, name }));
}

function ScreenRow({ screen }: { screen: AdBookingScreen }) {
  return (
    <li className="rounded-2xl border border-white/10 bg-white/[0.02] px-3.5 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-white">
            {screen.screen_name || screen.screen_id}
          </p>
          <p className="mt-1 text-xs text-white/70">
            {cmBookingScreenLocation(screen) || "Location not set"}
          </p>
        </div>
        <span
          className={cn(
            "mt-0.5 inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
            screen.online
              ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-200"
              : "border-white/10 bg-white/5 text-white/50",
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              screen.online
                ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]"
                : "bg-white/30",
            )}
          />
          {screen.online ? "Online" : "Offline"}
        </span>
      </div>
    </li>
  );
}

function PlaylistPreview({ preview }: { preview: CmPlaylistPreview | null }) {
  if (!preview) {
    return (
      <p className="rounded-2xl border border-dashed border-white/10 px-4 py-4 text-sm text-body">
        No playlist assigned
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
        <span>
          Slots:{" "}
          <span className="font-semibold tabular-nums text-white">
            {preview.slotCount}/10 slots
          </span>
        </span>
        <span>
          Loop time:{" "}
          <span className="font-semibold tabular-nums text-white">
            {formatLoopTime(preview.loopSeconds)}
          </span>
        </span>
      </div>

      {preview.slots.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-white/10 px-4 py-4 text-sm text-body">
          This playlist has no slots yet.
        </p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {preview.slots.map((slot, index) => (
            <li
              key={slot.id}
              className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-2"
            >
              <div className="relative h-12 w-20 shrink-0 overflow-hidden rounded-xl bg-black/40">
                {slot.filePath ? (
                  <img
                    src={getMediaUrl(slot.filePath)}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-muted">
                    {slot.type === "video" ? (
                      <Film aria-hidden="true" className="h-4 w-4" />
                    ) : (
                      <ImageIcon aria-hidden="true" className="h-4 w-4" />
                    )}
                  </span>
                )}
                <span className="absolute left-1 top-1 rounded-full bg-black/70 px-1.5 text-[9px] font-semibold tabular-nums text-white/80">
                  {index + 1}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-white">
                  {slot.name}
                </p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-muted">
                  <span className="tabular-nums">{slot.duration}s</span>
                  {slot.clipStart > 0 ? (
                    <span className="inline-flex items-center gap-1 tabular-nums text-sky-200/80">
                      <Scissors aria-hidden="true" className="h-3 w-3" />
                      Clip {slot.clipStart}s
                    </span>
                  ) : null}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function CmCustomerBookingsClient({
  bookings: initialBookings,
  playlists,
  playlistItems,
  media,
  packageProperties,
  loadError,
}: {
  bookings: CmBooking[];
  playlists: Playlist[];
  playlistItems: PlaylistItem[];
  media: Media[];
  packageProperties: PackageProperty[];
  loadError: string | null;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [playlistOverrides, setPlaylistOverrides] = useState<
    Record<string, string | null>
  >({});
  const [playlistSaves, setPlaylistSaves] = useState<
    Record<string, PlaylistSaveState>
  >({});
  const [screensByBooking, setScreensByBooking] = useState<
    Record<string, ScreensState>
  >({});

  const visibleBookings = useMemo(
    () =>
      [...initialBookings]
        .filter(
          (booking) => booking.status.trim().toLowerCase() !== "draft",
        )
        .sort((left, right) => {
          const byStart = (right.startDate ?? "").localeCompare(
            left.startDate ?? "",
          );

          if (byStart !== 0) {
            return byStart;
          }

          return (right.createdAt ?? "").localeCompare(left.createdAt ?? "");
        }),
    [initialBookings],
  );

  const bookings = useMemo(
    () =>
      visibleBookings.map((booking) => {
        const hasOverride = Object.prototype.hasOwnProperty.call(
          playlistOverrides,
          booking.id,
        );
        const playlistId = hasOverride
          ? playlistOverrides[booking.id]
          : booking.playlistId;
        const itemHasPlaylist = booking.items.some((item) =>
          Boolean(item.playlistId),
        );

        return {
          ...booking,
          playlistId,
          hasContent: hasOverride
            ? Boolean(playlistId) || itemHasPlaylist
            : booking.hasContent || itemHasPlaylist,
        };
      }),
    [visibleBookings, playlistOverrides],
  );

  useEffect(() => {
    let cancelled = false;

    setScreensByBooking((current) => {
      const next: Record<string, ScreensState> = {};

      for (const booking of visibleBookings) {
        next[booking.id] =
          current[booking.id] ?? { loading: true, error: null, screens: [] };
      }

      return next;
    });

    for (const booking of visibleBookings) {
      void supabase
        .rpc("booking_screens", { p_booking: booking.id })
        .then(({ data, error }) => {
          if (cancelled) {
            return;
          }

          setScreensByBooking((current) => ({
            ...current,
            [booking.id]: {
              loading: false,
              error: error?.message ?? null,
              screens: error ? [] : normalizeAdBookingScreens(data),
            },
          }));
        });
    }

    return () => {
      cancelled = true;
    };
  }, [visibleBookings, supabase]);

  async function handlePlaylistChange(booking: CmBooking, value: string) {
    setPlaylistSaves((current) => ({
      ...current,
      [booking.id]: { status: "saving", message: null },
    }));

    const { error } = await supabase.rpc("set_booking_playlist", {
      p_booking: booking.id,
      p_playlist: value || null,
    });

    if (error) {
      setPlaylistSaves((current) => ({
        ...current,
        [booking.id]: { status: "error", message: error.message },
      }));
      return;
    }

    setPlaylistOverrides((current) => {
      const next = { ...current };

      next[booking.id] = value || null;

      return next;
    });
    setPlaylistSaves((current) => ({
      ...current,
      [booking.id]: { status: "saved", message: null },
    }));
  }

  return (
    <div className="space-y-6">
      {loadError ? (
        <p
          role="alert"
          className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200"
        >
          {loadError}
        </p>
      ) : null}

      {bookings.length === 0 ? (
        <Card className="flex flex-col items-center justify-center px-6 py-16 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-brand-sky">
            <CalendarDays aria-hidden="true" className="h-6 w-6" />
          </span>
          <h2 className="mt-4 text-base font-semibold text-white">
            No bookings yet
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-body">
            Submitted campaigns for this customer will appear here.
          </p>
        </Card>
      ) : (
        bookings.map((booking) => {
          const screensState = screensByBooking[booking.id] ?? {
            loading: true,
            error: null,
            screens: [],
          };
          const screenGroups = groupCmBookingScreens(screensState.screens);
          const properties = collectBookingProperties(
            booking,
            packageProperties,
            screenGroups,
          );
          const preview = buildPreview(
            booking.playlistId,
            playlists,
            playlistItems,
            media,
          );
          const saveState = playlistSaves[booking.id] ?? {
            status: "idle",
            message: null,
          };
          const pending = booking.status.trim().toLowerCase() === "pending";
          const needsContent = cmBookingNeedsContent(booking);

          return (
            <Card key={booking.id} className="space-y-5 p-5 sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="font-mono text-xs font-semibold uppercase tracking-wide text-brand-sky">
                    Booking {formatBookingId(booking.id)}
                  </p>
                  <p className="mt-1 flex items-center gap-2 text-sm text-white/80">
                    <CalendarDays
                      aria-hidden="true"
                      className="h-4 w-4 text-muted"
                    />
                    {formatCmBookingDateRange(booking)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusChip status={booking.status} />
                  <DateStateChip booking={booking} />
                  {needsContent ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/20 bg-amber-400/10 px-2.5 py-1 text-xs font-medium text-amber-300">
                      <AlertTriangle aria-hidden="true" className="h-3.5 w-3.5" />
                      No content assigned
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm sm:grid-cols-3">
                <div>
                  <p className="text-xs text-muted">Tier</p>
                  <p className="mt-0.5 font-medium text-white/80">
                    {booking.tier || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted">Total</p>
                  <p className="mt-0.5 font-medium tabular-nums text-white/80">
                    {formatINR(booking.total)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted">Items</p>
                  <p className="mt-0.5 font-medium tabular-nums text-white/80">
                    {booking.itemCount}
                  </p>
                </div>
              </div>

              <section className="space-y-2">
                <div className="flex items-center gap-2">
                  <Film aria-hidden="true" className="h-4 w-4 text-brand-sky" />
                  <h3 className="text-sm font-semibold text-white">
                    Booked items
                  </h3>
                </div>

                {booking.items.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-white/10 px-4 py-4 text-sm text-body">
                    No item details are attached to this booking.
                  </p>
                ) : (
                  <ul className="divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/10">
                    {booking.items.map((item) => {
                      const packageItem = isPackageItem(item);
                      const included = packageItem
                        ? (packageProperties
                            .filter(
                              (entry) => entry.package_id === item.packageId,
                            )
                            .map((entry) => entry.property_name))
                        : [];

                      return (
                        <li key={item.id} className="px-4 py-3">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-white">
                                {item.name}
                              </p>
                              <p className="mt-0.5 text-xs text-muted">
                                Qty {item.quantity} ·{" "}
                                {packageItem ? "Package" : "Property"}
                              </p>
                              {included.length > 0 ? (
                                <p className="mt-1.5 text-xs leading-5 text-sky-100/80">
                                  Includes {included.join(", ")}
                                </p>
                              ) : null}
                            </div>
                            <p className="shrink-0 text-sm font-medium text-white/80 tabular-nums">
                              {item.amount === null
                                ? "—"
                                : formatINR(item.amount)}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>

              <section className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
                    <Film aria-hidden="true" className="h-4 w-4 text-brand-sky" />
                    Campaign content
                  </h3>
                  <Link
                    href={`/cm/customers/${booking.customerId}/playlists`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-brand-sky transition duration-200 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60"
                  >
                    Create playlist
                  </Link>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <label
                    htmlFor={`booking-playlist-${booking.id}`}
                    className="text-xs text-muted"
                  >
                    Playlist
                  </label>
                  <PanelSelect
                    id={`booking-playlist-${booking.id}`}
                    value={booking.playlistId ?? ""}
                    onChange={(value) =>
                      void handlePlaylistChange(booking, value)
                    }
                    label="Playlist"
                    className="w-full sm:max-w-sm"
                    options={[
                      { value: "", label: "No content" },
                      ...playlists.map((playlist) => ({
                        value: playlist.id,
                        label: playlist.name,
                      })),
                    ]}
                  />
                  <span aria-live="polite" className="text-xs">
                    {saveState.status === "saving" ? (
                      <span className="inline-flex items-center gap-1.5 text-body">
                        <Loader2
                          aria-hidden="true"
                          className="h-3.5 w-3.5 animate-spin"
                        />
                        Saving...
                      </span>
                    ) : saveState.status === "saved" ? (
                      <span className="inline-flex items-center gap-1.5 text-emerald-300">
                        <Check aria-hidden="true" className="h-3.5 w-3.5" />
                        Saved
                      </span>
                    ) : saveState.status === "error" ? (
                      <span role="alert" className="text-red-300">
                        {saveState.message}
                      </span>
                    ) : null}
                  </span>
                </div>

                {pending ? (
                  <p className="text-xs text-muted">
                    Starts after the booking is confirmed
                  </p>
                ) : null}

                <PlaylistPreview preview={preview} />
              </section>

              <section className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
                    <Monitor
                      aria-hidden="true"
                      className="h-4 w-4 text-brand-sky"
                    />
                    Where it runs
                  </h3>
                  {screensState.screens.length > 0 ? (
                    <span className="text-xs font-semibold tabular-nums text-body">
                      {cmBookingScreenSummary(screensState.screens)}
                    </span>
                  ) : null}
                </div>

                {screensState.loading ? (
                  <p className="flex items-center gap-2 text-xs text-muted">
                    <Loader2
                      aria-hidden="true"
                      className="h-3.5 w-3.5 animate-spin"
                    />
                    Loading screens...
                  </p>
                ) : screensState.error ? (
                  <p role="alert" className="text-xs text-red-300">
                    Screens could not be loaded. {screensState.error}
                  </p>
                ) : screensState.screens.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-white/10 px-4 py-4 text-sm text-body">
                    No screens assigned yet
                  </p>
                ) : (
                  <div className="space-y-4">
                    {properties.map((property) => {
                      const group = screenGroups.find(
                        (entry) =>
                          entry.propertyId === property.id ||
                          `name:${entry.propertyName.toLowerCase()}` ===
                            property.id,
                      );
                      const groupScreens = group?.screens ?? [];

                      return (
                        <div key={property.id} className="space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <h4 className="text-sm font-semibold text-white">
                              {property.name}
                            </h4>
                            <span className="text-xs text-muted tabular-nums">
                              {cmBookingScreenSummary(groupScreens)}
                            </span>
                          </div>
                          {groupScreens.length === 0 ? (
                            <p className="rounded-2xl border border-dashed border-white/10 px-4 py-3 text-sm text-body">
                              No screens assigned yet
                            </p>
                          ) : (
                            <ul className="grid gap-2 sm:grid-cols-2">
                              {groupScreens.map((screen) => (
                                <ScreenRow
                                  key={screen.screen_id}
                                  screen={screen}
                                />
                              ))}
                            </ul>
                          )}
                        </div>
                      );
                    })}
                    <p className="text-xs text-muted tabular-nums">
                      Total: {cmBookingScreenSummary(screensState.screens)}
                    </p>
                  </div>
                )}
              </section>
            </Card>
          );
        })
      )}
    </div>
  );
}
