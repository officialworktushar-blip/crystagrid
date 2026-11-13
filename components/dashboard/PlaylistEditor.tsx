"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  Film,
  GripVertical,
  Images,
  ListVideo,
  Loader2,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { getMediaUrl } from "@/lib/media";
import { notifyScreens } from "@/lib/realtime";
import { isOnline } from "@/lib/screens";
import { createClient } from "@/lib/supabase/client";
import type {
  Media,
  MediaType,
  Playlist,
  PlaylistItem,
  Screen,
  ScreenPlaylist,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const MEDIA_FILTERS: { label: string; value: "all" | MediaType }[] = [
  { label: "All", value: "all" },
  { label: "Images", value: "image" },
  { label: "Videos", value: "video" },
];

type SaveState = "idle" | "saving" | "saved";

function formatDuration(seconds: number) {
  const totalSeconds = Math.max(0, Math.round(Number(seconds) || 0));
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;

  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

function createTempId(prefix: string) {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function MediaPreview({
  item,
  className,
}: {
  item: Media;
  className?: string;
}) {
  const url = getMediaUrl(item.file_path);

  if (item.type === "video") {
    return (
      <video
        src={`${url}#t=0.1`}
        muted
        playsInline
        preload="metadata"
        aria-hidden="true"
        className={cn("h-full w-full object-cover", className)}
      />
    );
  }

  return (
    <img
      src={url}
      alt=""
      aria-hidden="true"
      className={cn("h-full w-full object-cover", className)}
    />
  );
}

function SortableItemRow({
  item,
  index,
  mediaItem,
  busy,
  onRemove,
  onDurationInput,
  onDurationCommit,
}: {
  item: PlaylistItem;
  index: number;
  mediaItem: Media | undefined;
  busy: boolean;
  onRemove: (itemId: string) => void;
  onDurationInput: (itemId: string, value: string) => void;
  onDurationCommit: (itemId: string, value: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isVideo = mediaItem?.type === "video";

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.02] px-3 py-3 transition sm:flex-row sm:items-center",
        isDragging && "z-10 border-sky-400/40 bg-surface-2 shadow-card",
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <button
          type="button"
          aria-label="Drag to reorder"
          className="flex h-8 w-7 shrink-0 touch-none cursor-grab items-center justify-center rounded-lg text-white/35 transition duration-200 hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical aria-hidden="true" className="h-4 w-4" />
        </button>

        <span className="w-5 shrink-0 text-center text-xs font-semibold tabular-nums text-muted">
          {index + 1}
        </span>

        <span className="relative h-11 w-16 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-black/40">
          {mediaItem ? (
            <MediaPreview item={mediaItem} />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-muted">
              <Film aria-hidden="true" className="h-4 w-4" />
            </span>
          )}
        </span>

        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-white">
            {mediaItem?.name ?? "Media unavailable"}
          </p>
          <span className="mt-1 inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
            {isVideo ? "Video" : "Image"}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 pl-9 sm:pl-0">
        {isVideo ? (
          <span className="text-xs text-muted">
            Plays full video ({formatDuration(mediaItem?.duration ?? 0)})
          </span>
        ) : (
          <label className="flex items-center gap-2 text-xs text-muted">
            Duration
            <input
              type="number"
              min={1}
              max={600}
              placeholder="10"
              value={item.duration ?? ""}
              onChange={(event) =>
                onDurationInput(item.id, event.target.value)
              }
              onBlur={(event) =>
                onDurationCommit(item.id, event.target.value)
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.currentTarget.blur();
                }
              }}
              className="h-9 w-20 rounded-full border border-white/10 bg-white/5 px-3 text-sm text-white outline-none transition placeholder:text-muted focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/40"
            />
            <span>s</span>
          </label>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={() => onRemove(item.id)}
          disabled={busy}
          aria-label="Remove item"
          className="h-8 w-8 px-0 text-red-300 hover:bg-red-400/10 hover:text-red-200"
        >
          {busy ? (
            <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 aria-hidden="true" className="h-4 w-4" />
          )}
        </Button>
      </div>
    </li>
  );
}

export default function PlaylistEditor({
  playlist,
  initialItems,
  media,
  screens,
  screenPlaylists,
  playlists,
}: {
  playlist: Playlist;
  initialItems: PlaylistItem[];
  media: Media[];
  screens: Screen[];
  screenPlaylists: ScreenPlaylist[];
  playlists: Playlist[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const [items, setItems] = useState<PlaylistItem[]>(initialItems);
  const [assignments, setAssignments] =
    useState<ScreenPlaylist[]>(screenPlaylists);
  const [name, setName] = useState(playlist.name);
  const [savedName, setSavedName] = useState(playlist.name);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | MediaType>("all");
  const [libraryOpen, setLibraryOpen] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [busyMediaId, setBusyMediaId] = useState<string | null>(null);
  const [busyItemId, setBusyItemId] = useState<string | null>(null);
  const [busyScreenId, setBusyScreenId] = useState<string | null>(null);
  const [now, setNow] = useState(0);

  const saveTimerRef = useRef<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const markSaving = useCallback(() => {
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    setSaveState("saving");
  }, []);

  const markSaved = useCallback(() => {
    setSaveState("saved");

    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = window.setTimeout(() => {
      setSaveState("idle");
      saveTimerRef.current = null;
    }, 1800);
  }, []);

  const touchPlaylist = useCallback(async () => {
    await supabase
      .from("playlists")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", playlist.id);
  }, [supabase, playlist.id]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setNow(Date.now());
    const interval = window.setInterval(() => setNow(Date.now()), 20000);

    return () => window.clearInterval(interval);
  }, []);

  const mediaById = useMemo(
    () => new Map<string, Media>(media.map((item) => [item.id, item] as const)),
    [media],
  );

  const playlistNameById = useMemo(
    () =>
      new Map<string, string>(
        playlists.map((entry) => [entry.id, entry.name] as const),
      ),
    [playlists],
  );

  const assignmentByScreen = useMemo(
    () =>
      new Map<string, ScreenPlaylist>(
        assignments.map((assignment) => [assignment.screen_id, assignment]),
      ),
    [assignments],
  );

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => a.position - b.position),
    [items],
  );

  const totalDuration = useMemo(
    () =>
      sortedItems.reduce((sum, item) => {
        const mediaItem = mediaById.get(item.media_id);

        if (mediaItem?.type === "video") {
          return sum + (mediaItem.duration ?? 0);
        }

        return sum + (item.duration ?? 10);
      }, 0),
    [sortedItems, mediaById],
  );

  const filteredMedia = useMemo(() => {
    const query = search.trim().toLowerCase();

    return media.filter((item) => {
      if (filter !== "all" && item.type !== filter) {
        return false;
      }

      return query === "" || item.name.toLowerCase().includes(query);
    });
  }, [media, filter, search]);

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = sortedItems.findIndex((item) => item.id === active.id);
    const newIndex = sortedItems.findIndex((item) => item.id === over.id);

    if (oldIndex < 0 || newIndex < 0) {
      return;
    }

    if (sortedItems.some((item) => item.id.startsWith("item-"))) {
      return;
    }

    const previousItems = items;
    const reordered = arrayMove(sortedItems, oldIndex, newIndex).map(
      (item, index) => ({ ...item, position: index }),
    );

    setError(null);
    setItems(reordered);
    markSaving();

    const rows = reordered.map((item) => ({
      id: item.id,
      playlist_id: playlist.id,
      media_id: item.media_id,
      position: item.position,
      duration: item.duration ?? null,
    }));

    const { error: upsertError } = await supabase
      .from("playlist_items")
      .upsert(rows, { onConflict: "id" });

    if (upsertError) {
      setItems(previousItems);
      setError(upsertError.message);
      setSaveState("idle");
      return;
    }

    await touchPlaylist();
    markSaved();
  }

  async function handleAddItem(mediaItem: Media) {
    if (busyMediaId) {
      return;
    }

    const position = items.length;
    const tempId = createTempId("item");
    const previousItems = items;
    const optimistic: PlaylistItem = {
      id: tempId,
      playlist_id: playlist.id,
      media_id: mediaItem.id,
      position,
      duration: null,
      created_at: new Date().toISOString(),
    };

    setError(null);
    setBusyMediaId(mediaItem.id);
    setItems([...items, optimistic]);
    markSaving();

    const { data, error: insertError } = await supabase
      .from("playlist_items")
      .insert({
        playlist_id: playlist.id,
        media_id: mediaItem.id,
        position,
      })
      .select("id, playlist_id, media_id, position, duration, created_at")
      .single();

    if (insertError || !data) {
      setItems(previousItems);
      setError(insertError?.message ?? "Could not add this media item.");
      setSaveState("idle");
      setBusyMediaId(null);
      return;
    }

    setItems((current) =>
      current.map((item) =>
        item.id === tempId ? (data as PlaylistItem) : item,
      ),
    );
    setBusyMediaId(null);
    await touchPlaylist();
    markSaved();
  }

  async function handleRemoveItem(itemId: string) {
    if (itemId.startsWith("item-")) {
      return;
    }

    const previousItems = items;
    const remaining = sortedItems
      .filter((item) => item.id !== itemId)
      .map((item, index) => ({ ...item, position: index }));

    setError(null);
    setBusyItemId(itemId);
    setItems(remaining);
    markSaving();

    const { error: deleteError } = await supabase
      .from("playlist_items")
      .delete()
      .eq("id", itemId);

    if (deleteError) {
      setItems(previousItems);
      setError(deleteError.message);
      setSaveState("idle");
      setBusyItemId(null);
      return;
    }

    if (remaining.length > 0) {
      const rows = remaining.map((item) => ({
        id: item.id,
        playlist_id: playlist.id,
        media_id: item.media_id,
        position: item.position,
        duration: item.duration ?? null,
      }));

      const { error: positionError } = await supabase
        .from("playlist_items")
        .upsert(rows, { onConflict: "id" });

      if (positionError) {
        setError(positionError.message);
        setSaveState("idle");
        setBusyItemId(null);
        return;
      }
    }

    setBusyItemId(null);
    await touchPlaylist();
    markSaved();
  }

  function handleDurationInput(itemId: string, value: string) {
    const duration =
      value.trim() === "" ? null : Number(value);

    setItems((current) =>
      current.map((item) =>
        item.id === itemId
          ? {
              ...item,
              duration:
                duration !== null && Number.isFinite(duration)
                  ? duration
                  : null,
            }
          : item,
      ),
    );
  }

  async function handleDurationCommit(itemId: string, value: string) {
    const item = items.find((entry) => entry.id === itemId);

    if (!item) {
      return;
    }

    if (item.id.startsWith("item-")) {
      return;
    }

    const mediaItem = mediaById.get(item.media_id);

    if (mediaItem?.type === "video") {
      return;
    }

    const parsed = value.trim() === "" ? null : Number(value);
    const next =
      parsed === null || !Number.isFinite(parsed)
        ? null
        : Math.min(600, Math.max(1, Math.round(parsed)));

    if ((item.duration ?? null) === next) {
      setItems((current) =>
        current.map((entry) =>
          entry.id === itemId ? { ...entry, duration: next } : entry,
        ),
      );
      return;
    }

    const previousItems = items;

    setError(null);
    setItems((current) =>
      current.map((entry) =>
        entry.id === itemId ? { ...entry, duration: next } : entry,
      ),
    );
    markSaving();

    const { error: updateError } = await supabase
      .from("playlist_items")
      .update({ duration: next })
      .eq("id", itemId);

    if (updateError) {
      setItems(previousItems);
      setError(updateError.message);
      setSaveState("idle");
      return;
    }

    await touchPlaylist();
    markSaved();
  }

  async function handleNameCommit() {
    const trimmed = name.trim();

    if (!trimmed) {
      setName(savedName);
      return;
    }

    if (trimmed === savedName) {
      setName(trimmed);
      return;
    }

    const previousName = savedName;

    setError(null);
    setName(trimmed);
    markSaving();

    const { error: updateError } = await supabase
      .from("playlists")
      .update({ name: trimmed, updated_at: new Date().toISOString() })
      .eq("id", playlist.id);

    if (updateError) {
      setName(previousName);
      setError(updateError.message);
      setSaveState("idle");
      return;
    }

    setSavedName(trimmed);
    markSaved();
  }

  async function handleToggleAssignment(screenId: string) {
    if (busyScreenId) {
      return;
    }

    const existing = assignments.find(
      (assignment) => assignment.screen_id === screenId,
    );
    const previousAssignments = assignments;

    setError(null);
    setBusyScreenId(screenId);
    markSaving();

    if (existing && existing.playlist_id === playlist.id) {
      setAssignments((current) =>
        current.filter((assignment) => assignment.screen_id !== screenId),
      );

      const { error: deleteError } = await supabase
        .from("screen_playlists")
        .delete()
        .eq("screen_id", screenId);

      if (deleteError) {
        setAssignments(previousAssignments);
        setError(deleteError.message);
        setSaveState("idle");
        setBusyScreenId(null);
        return;
      }
    } else {
      const optimistic: ScreenPlaylist = {
        id: existing?.id ?? createTempId("assignment"),
        screen_id: screenId,
        playlist_id: playlist.id,
        is_active: true,
        created_at: existing?.created_at ?? new Date().toISOString(),
      };

      setAssignments((current) => [
        ...current.filter((assignment) => assignment.screen_id !== screenId),
        optimistic,
      ]);

      const { data, error: upsertError } = await supabase
        .from("screen_playlists")
        .upsert(
          {
            screen_id: screenId,
            playlist_id: playlist.id,
            is_active: true,
          },
          { onConflict: "screen_id" },
        )
        .select("id, screen_id, playlist_id, is_active, created_at")
        .single();

      if (upsertError || !data) {
        setAssignments(previousAssignments);
        setError(
          upsertError?.message ??
            "Could not assign this playlist to the screen.",
        );
        setSaveState("idle");
        setBusyScreenId(null);
        return;
      }

      setAssignments((current) => [
        ...current.filter((assignment) => assignment.screen_id !== screenId),
        data as ScreenPlaylist,
      ]);
    }

    void notifyScreens([screenId], "refresh");
    setBusyScreenId(null);
    markSaved();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-3xl border border-white/10 bg-surface px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/dashboard/playlists"
            aria-label="Back to playlists"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/60 transition duration-200 hover:border-white/20 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          </Link>

          <div className="min-w-0 flex-1">
            <input
              type="text"
              value={name}
              maxLength={80}
              aria-label="Playlist name"
              onChange={(event) => setName(event.target.value)}
              onBlur={() => void handleNameCommit()}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.currentTarget.blur();
                }
              }}
              className="w-full max-w-xl border-b border-transparent bg-transparent text-xl font-extrabold tracking-tight text-white outline-none transition focus:border-sky-400/40 sm:text-2xl"
            />
            <p className="mt-1 text-xs text-muted">
              {sortedItems.length}{" "}
              {sortedItems.length === 1 ? "item" : "items"} ·{" "}
              {formatDuration(totalDuration)} total
            </p>
          </div>
        </div>

        <div
          aria-live="polite"
          className="flex min-h-6 items-center gap-2 pl-12 sm:pl-0"
        >
          {saveState === "saving" ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-body">
              <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />
              Saving...
            </span>
          ) : saveState === "saved" ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-300">
              <Check aria-hidden="true" className="h-3.5 w-3.5" />
              Saved
            </span>
          ) : null}
        </div>
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200"
        >
          {error}
        </p>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)_280px] xl:grid-cols-[280px_minmax(0,1fr)_300px]">
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setLibraryOpen((open) => !open)}
            aria-expanded={libraryOpen}
            className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-surface px-4 py-3 text-sm font-semibold text-white transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 lg:hidden"
          >
            <span className="flex items-center gap-2">
              <Images aria-hidden="true" className="h-4 w-4 text-brand-sky" />
              Media library
            </span>
            {libraryOpen ? (
              <ChevronUp aria-hidden="true" className="h-4 w-4" />
            ) : (
              <ChevronDown aria-hidden="true" className="h-4 w-4" />
            )}
          </button>

          <Card
            className={cn(
              "overflow-hidden p-0 lg:sticky lg:top-24",
              !libraryOpen && "hidden lg:block",
            )}
          >
            <div className="border-b border-white/5 px-4 py-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-white">
                  Media library
                </h2>
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-muted tabular-nums">
                  {media.length}
                </span>
              </div>

              <div className="relative mt-3">
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted"
                />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search media"
                  aria-label="Search media"
                  className="h-9 w-full rounded-full border border-white/10 bg-white/5 pl-9 pr-3 text-sm text-white outline-none transition placeholder:text-muted focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/40"
                />
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {MEDIA_FILTERS.map((entry) => (
                  <button
                    key={entry.value}
                    type="button"
                    onClick={() => setFilter(entry.value)}
                    aria-pressed={filter === entry.value}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60",
                      filter === entry.value
                        ? "border-sky-400/40 bg-sky-400/10 text-sky-100"
                        : "border-white/10 bg-white/5 text-muted hover:border-white/20 hover:text-white",
                    )}
                  >
                    {entry.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="max-h-[420px] overflow-y-auto p-3 lg:max-h-[calc(100vh-16rem)]">
              {media.length === 0 ? (
                <div className="px-2 py-10 text-center">
                  <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-brand-sky">
                    <Images aria-hidden="true" className="h-5 w-5" />
                  </span>
                  <p className="mt-3 text-sm font-medium text-white">
                    Upload media first
                  </p>
                  <p className="mt-1 text-xs leading-5 text-body">
                    Add images and videos to your library, then come back to
                    build this playlist.
                  </p>
                  <Link
                    href="/dashboard/media"
                    className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-sky transition duration-200 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60"
                  >
                    Upload media
                  </Link>
                </div>
              ) : filteredMedia.length === 0 ? (
                <p className="px-2 py-10 text-center text-sm text-body">
                  No media matches your search.
                </p>
              ) : (
                <ul className="grid grid-cols-2 gap-2">
                  {filteredMedia.map((mediaItem) => {
                    const isBusy = busyMediaId === mediaItem.id;

                    return (
                      <li key={mediaItem.id}>
                        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
                          <div className="relative aspect-video bg-black/40">
                            <MediaPreview item={mediaItem} />
                            <button
                              type="button"
                              onClick={() => void handleAddItem(mediaItem)}
                              disabled={Boolean(busyMediaId)}
                              aria-label={`Add ${mediaItem.name} to playlist`}
                              className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full brand-gradient text-white shadow-brand transition duration-200 hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 disabled:opacity-60"
                            >
                              {isBusy ? (
                                <Loader2
                                  aria-hidden="true"
                                  className="h-3.5 w-3.5 animate-spin"
                                />
                              ) : (
                                <Plus
                                  aria-hidden="true"
                                  className="h-3.5 w-3.5"
                                />
                              )}
                            </button>
                          </div>
                          <div className="px-2 py-1.5">
                            <p className="truncate text-xs font-medium text-white">
                              {mediaItem.name}
                            </p>
                            <p className="text-[10px] uppercase tracking-[0.12em] text-muted">
                              {mediaItem.type === "video" ? "Video" : "Image"}
                            </p>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </Card>
        </div>

        <Card className="flex flex-col overflow-hidden p-0">
          <div className="border-b border-white/5 px-4 py-4 sm:px-5">
            <h2 className="text-sm font-semibold text-white">
              Playlist timeline
            </h2>
            <p className="mt-1 text-xs text-muted">
              Drag to reorder. Duration changes save when you leave the field.
            </p>
          </div>

          {sortedItems.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-brand-sky">
                <ListVideo aria-hidden="true" className="h-6 w-6" />
              </span>
              <h3 className="mt-4 text-base font-semibold text-white">
                This playlist is empty
              </h3>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-body">
                Add images and videos from your library to start building the
                loop.
              </p>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={(event) => void handleDragEnd(event)}
            >
              <SortableContext
                items={sortedItems.map((item) => item.id)}
                strategy={verticalListSortingStrategy}
              >
                <ul className="space-y-2 p-3 sm:p-4">
                  {sortedItems.map((item, index) => {
                    const mediaItem = mediaById.get(item.media_id);

                    return (
                      <SortableItemRow
                        key={item.id}
                        item={item}
                        index={index}
                        mediaItem={mediaItem}
                        busy={busyItemId === item.id}
                        onRemove={(itemId) => void handleRemoveItem(itemId)}
                        onDurationInput={handleDurationInput}
                        onDurationCommit={(itemId, value) =>
                          void handleDurationCommit(itemId, value)
                        }
                      />
                    );
                  })}
                </ul>
              </SortableContext>
            </DndContext>
          )}
        </Card>

        <Card className="flex flex-col overflow-hidden p-0">
          <div className="border-b border-white/5 px-4 py-4">
            <h2 className="text-sm font-semibold text-white">
              Assign to screens
            </h2>
            <p className="mt-1 text-xs text-muted">
              A screen can only play one playlist at a time.
            </p>
          </div>

          {screens.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <p className="text-sm text-body">
                Pair a screen before assigning a playlist.
              </p>
              <Link
                href="/dashboard/screens"
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-sky transition duration-200 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60"
              >
                Go to screens
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-white/5">
              {screens.map((screen) => {
                const assignment = assignmentByScreen.get(screen.id);
                const assigned = assignment?.playlist_id === playlist.id;
                const otherPlaylistName =
                  assignment && !assigned
                    ? (playlistNameById.get(assignment.playlist_id) ??
                      "another playlist")
                    : null;
                const online = isOnline(screen.last_seen, now);
                const isBusy = busyScreenId === screen.id;

                return (
                  <li key={screen.id} className="px-4 py-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            aria-hidden="true"
                            className={cn(
                              "h-2 w-2 shrink-0 rounded-full",
                              online
                                ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]"
                                : "bg-white/30",
                            )}
                          />
                          <p className="truncate text-sm font-medium text-white">
                            {screen.name}
                          </p>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-muted">
                          {online ? "Online" : "Offline"}
                          {screen.location ? ` · ${screen.location}` : ""}
                        </p>
                        {otherPlaylistName ? (
                          <p className="mt-1.5 text-xs leading-5 text-amber-300/90">
                            Currently plays {otherPlaylistName}, will be
                            replaced
                          </p>
                        ) : null}
                      </div>

                      <button
                        type="button"
                        role="switch"
                        aria-checked={assigned}
                        aria-label={`${assigned ? "Unassign" : "Assign"} playlist for ${screen.name}`}
                        onClick={() => void handleToggleAssignment(screen.id)}
                        disabled={isBusy}
                        className={cn(
                          "relative mt-0.5 h-6 w-11 shrink-0 rounded-full border transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 disabled:opacity-60",
                          assigned
                            ? "brand-gradient border-transparent"
                            : "border-white/10 bg-white/10",
                        )}
                      >
                        <span
                          aria-hidden="true"
                          className={cn(
                            "absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-white shadow-sm transition-all duration-200",
                            assigned ? "left-6" : "left-1",
                          )}
                        />
                      </button>
                    </div>
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
