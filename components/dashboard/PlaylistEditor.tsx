"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ArrowDown,
  ArrowUp,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { notifyScreens } from "@/lib/realtime";
import { createClient } from "@/lib/supabase/client";
import type {
  Media,
  Playlist,
  PlaylistItem,
  Screen,
  ScreenPlaylist,
} from "@/lib/types";

const NOTIFY_DEBOUNCE_MS = 1500;

export default function PlaylistEditor({
  playlist,
  initialItems,
  media,
  screens,
  initialAssignments,
  initialScreenPlaylists,
}: {
  playlist: Playlist;
  initialItems: PlaylistItem[];
  media: Media[];
  screens: Screen[];
  initialAssignments?: ScreenPlaylist[];
  initialScreenPlaylists?: ScreenPlaylist[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const [items, setItems] = useState<PlaylistItem[]>(initialItems);
  const [screenPlaylists, setScreenPlaylists] = useState<ScreenPlaylist[]>(
    initialAssignments ?? initialScreenPlaylists ?? [],
  );
  const [pendingMediaId, setPendingMediaId] = useState("");
  const [busyItemId, setBusyItemId] = useState<string | null>(null);
  const [busyScreenId, setBusyScreenId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const notifyTimerRef = useRef<number | null>(null);
  const screenPlaylistsRef = useRef(screenPlaylists);

  useEffect(() => {
    screenPlaylistsRef.current = screenPlaylists;
  }, [screenPlaylists]);

  useEffect(() => {
    return () => {
      if (notifyTimerRef.current) {
        window.clearTimeout(notifyTimerRef.current);
      }
    };
  }, []);

  const schedulePlaylistNotify = useCallback(() => {
    if (notifyTimerRef.current) {
      window.clearTimeout(notifyTimerRef.current);
    }

    notifyTimerRef.current = window.setTimeout(() => {
      const screenIds = Array.from(
        new Set(
          screenPlaylistsRef.current
            .filter((assignment) => assignment.playlist_id === playlist.id)
            .map((assignment) => assignment.screen_id),
        ),
      );

      if (screenIds.length > 0) {
        void notifyScreens(screenIds, "refresh");
      }

      notifyTimerRef.current = null;
    }, NOTIFY_DEBOUNCE_MS);
  }, [playlist.id]);

  const mediaById = useMemo(
    () =>
      new Map<string, Media>(
        media.map((item) => [item.id, item] as const),
      ),
    [media],
  );

  const assignedScreenIds = useMemo(
    () => new Set(screenPlaylists.map((assignment) => assignment.screen_id)),
    [screenPlaylists],
  );

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => a.position - b.position),
    [items],
  );

  async function handleAddItem() {
    if (!pendingMediaId) {
      return;
    }

    setError(null);

    const position =
      sortedItems.length > 0
        ? Math.max(...sortedItems.map((item) => item.position)) + 1
        : 0;

    const { data, error: insertError } = await supabase
      .from("playlist_items")
      .insert({
        playlist_id: playlist.id,
        media_id: pendingMediaId,
        position,
      })
      .select(
        "id, playlist_id, media_id, position, duration_seconds, created_at",
      )
      .single();

    if (insertError || !data) {
      setError(insertError?.message ?? "Could not add this media item.");
      return;
    }

    setItems((current) => [...current, data as PlaylistItem]);
    setPendingMediaId("");
    schedulePlaylistNotify();
  }

  async function handleRemoveItem(itemId: string) {
    setBusyItemId(itemId);
    setError(null);

    const { error: deleteError } = await supabase
      .from("playlist_items")
      .delete()
      .eq("id", itemId);

    if (deleteError) {
      setError(deleteError.message);
      setBusyItemId(null);
      return;
    }

    setItems((current) => current.filter((item) => item.id !== itemId));
    schedulePlaylistNotify();
    setBusyItemId(null);
  }

  async function handleMoveItem(itemId: string, direction: -1 | 1) {
    const index = sortedItems.findIndex((item) => item.id === itemId);
    const targetIndex = index + direction;

    if (index < 0 || targetIndex < 0 || targetIndex >= sortedItems.length) {
      return;
    }

    const item = sortedItems[index];
    const target = sortedItems[targetIndex];

    setBusyItemId(itemId);
    setError(null);

    const [itemResult, targetResult] = await Promise.all([
      supabase
        .from("playlist_items")
        .update({ position: target.position })
        .eq("id", item.id),
      supabase
        .from("playlist_items")
        .update({ position: item.position })
        .eq("id", target.id),
    ]);

    if (itemResult.error || targetResult.error) {
      setError(
        itemResult.error?.message ??
          targetResult.error?.message ??
          "Could not reorder this item.",
      );
      setBusyItemId(null);
      return;
    }

    setItems((current) =>
      current.map((entry) => {
        if (entry.id === item.id) {
          return { ...entry, position: target.position };
        }

        if (entry.id === target.id) {
          return { ...entry, position: item.position };
        }

        return entry;
      }),
    );

    schedulePlaylistNotify();
    setBusyItemId(null);
  }

  async function handleDurationChange(itemId: string, value: string) {
    const trimmed = value.trim();
    const duration =
      trimmed === "" ? null : Number.isFinite(Number(trimmed))
        ? Number(trimmed)
        : null;

    setItems((current) =>
      current.map((item) =>
        item.id === itemId ? { ...item, duration_seconds: duration } : item,
      ),
    );

    schedulePlaylistNotify();

    const { error: updateError } = await supabase
      .from("playlist_items")
      .update({ duration_seconds: duration })
      .eq("id", itemId);

    if (updateError) {
      setError(updateError.message);
    }
  }

  async function handleToggleAssignment(screenId: string) {
    setBusyScreenId(screenId);
    setError(null);

    const existing = screenPlaylists.find(
      (assignment) => assignment.screen_id === screenId,
    );

    if (existing) {
      const { error: deleteError } = await supabase
        .from("screen_playlists")
        .delete()
        .eq("id", existing.id);

      if (deleteError) {
        setError(deleteError.message);
        setBusyScreenId(null);
        return;
      }

      setScreenPlaylists((current) =>
        current.filter((assignment) => assignment.id !== existing.id),
      );
    } else {
      const { data, error: insertError } = await supabase
        .from("screen_playlists")
        .insert({
          screen_id: screenId,
          playlist_id: playlist.id,
          is_active: true,
        })
        .select("id, screen_id, playlist_id, created_at")
        .single();

      if (insertError || !data) {
        setError(
          insertError?.message ?? "Could not assign this playlist to the screen.",
        );
        setBusyScreenId(null);
        return;
      }

      setScreenPlaylists((current) => [
        ...current,
        data as ScreenPlaylist,
      ]);
    }

    await notifyScreens([screenId], "refresh");
    setBusyScreenId(null);
  }

  return (
    <div className="space-y-6">
      {error ? (
        <p
          role="alert"
          className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200"
        >
          {error}
        </p>
      ) : null}

      <Card className="overflow-hidden p-0">
        <div className="flex flex-col gap-3 border-b border-white/5 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-white">
              {playlist.name}
            </h2>
            <p className="mt-1 text-xs text-muted">
              {sortedItems.length}{" "}
              {sortedItems.length === 1 ? "item" : "items"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={pendingMediaId}
              onChange={(event) => setPendingMediaId(event.target.value)}
              aria-label="Select media"
              className="h-9 min-w-0 rounded-full border border-white/10 bg-white/5 px-4 text-sm text-white outline-none transition focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/40"
            >
              <option value="">Select media</option>
              {media.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <Button
              size="sm"
              onClick={() => void handleAddItem()}
              disabled={!pendingMediaId}
              className="gap-2"
            >
              <Plus aria-hidden="true" className="h-4 w-4" />
              Add
            </Button>
          </div>
        </div>

        {sortedItems.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-body">
            This playlist has no items yet.
          </p>
        ) : (
          <ul className="divide-y divide-white/5">
            {sortedItems.map((item, index) => {
              const mediaItem = mediaById.get(item.media_id);
              const isBusy = busyItemId === item.id;

              return (
                <li
                  key={item.id}
                  className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">
                      {mediaItem?.name ?? "Media item"}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      {mediaItem?.type === "video" ? "Video" : "Image"}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <label className="flex items-center gap-2 text-xs text-muted">
                      Duration
                      <input
                        type="number"
                        min={0}
                        value={item.duration_seconds ?? ""}
                        onChange={(event) =>
                          void handleDurationChange(item.id, event.target.value)
                        }
                        className="h-9 w-24 rounded-full border border-white/10 bg-white/5 px-3 text-sm text-white outline-none transition focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/40"
                      />
                    </label>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void handleMoveItem(item.id, -1)}
                      disabled={isBusy || index === 0}
                      aria-label="Move item up"
                      className="h-8 w-8 px-0"
                    >
                      <ArrowUp aria-hidden="true" className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void handleMoveItem(item.id, 1)}
                      disabled={isBusy || index === sortedItems.length - 1}
                      aria-label="Move item down"
                      className="h-8 w-8 px-0"
                    >
                      <ArrowDown aria-hidden="true" className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void handleRemoveItem(item.id)}
                      disabled={isBusy}
                      aria-label="Remove item"
                      className="h-8 w-8 px-0 text-red-300 hover:bg-red-400/10 hover:text-red-200"
                    >
                      {isBusy ? (
                        <Loader2
                          aria-hidden="true"
                          className="h-4 w-4 animate-spin"
                        />
                      ) : (
                        <Trash2 aria-hidden="true" className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="border-b border-white/5 px-5 py-4">
          <h2 className="text-base font-semibold text-white">Screens</h2>
          <p className="mt-1 text-xs text-muted">
            Assign this playlist to the screens that should show it.
          </p>
        </div>

        {screens.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-body">
            Pair a screen before assigning a playlist.
          </p>
        ) : (
          <ul className="divide-y divide-white/5">
            {screens.map((screen) => {
              const assigned = assignedScreenIds.has(screen.id);
              const isBusy = busyScreenId === screen.id;

              return (
                <li
                  key={screen.id}
                  className="flex items-center justify-between gap-3 px-5 py-4"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">
                      {screen.name}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      {screen.location ?? "No location"}
                    </p>
                  </div>

                  <Button
                    variant={assigned ? "secondary" : "primary"}
                    size="sm"
                    onClick={() => void handleToggleAssignment(screen.id)}
                    disabled={isBusy}
                    className="shrink-0"
                  >
                    {isBusy ? (
                      <Loader2
                        aria-hidden="true"
                        className="h-4 w-4 animate-spin"
                      />
                    ) : null}
                    {assigned ? "Unassign" : "Assign"}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
