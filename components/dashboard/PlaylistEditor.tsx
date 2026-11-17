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
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Film,
  GripVertical,
  ListVideo,
  Loader2,
  Plus,
  RefreshCw,
  Scissors,
  Trash2,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import ClipDialog from "@/components/dashboard/ClipDialog";
import ContentPicker from "@/components/dashboard/ContentPicker";
import { formatBookingStatus } from "@/lib/ad-bookings";
import { formatBookingDate } from "@/lib/ads";
import type { PlaylistBookingUsage } from "@/lib/cm";
import { getMediaUrl } from "@/lib/media";
import { notifyScreens } from "@/lib/realtime";
import { isOnline } from "@/lib/screens";
import { createClient } from "@/lib/supabase/client";
import type {
  Media,
  Playlist,
  PlaylistItem,
  Screen,
  ScreenPlaylist,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const MAX_SLOTS = 10;
const CLIP_LENGTH = 10;

type SaveState = "idle" | "saving" | "saved";

type PickerState =
  | { mode: "add" }
  | { mode: "change"; itemId: string }
  | null;

type ClipState =
  | { mode: "add"; media: Media; initialStart: number }
  | { mode: "change"; itemId: string; media: Media; initialStart: number }
  | { mode: "edit"; itemId: string; media: Media; initialStart: number };

function formatClock(seconds: number) {
  const total = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(total / 60);
  const remaining = total % 60;

  return `${minutes}:${remaining.toString().padStart(2, "0")}`;
}

function formatLoopTime(seconds: number) {
  const total = Math.max(0, Math.round(seconds));

  if (total <= 59) {
    return `${total}s`;
  }

  return formatClock(total);
}

function formatDurationChip(seconds: number) {
  return `${Math.max(1, Math.round(seconds))}s`;
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

function resolveSlotDuration(item: PlaylistItem, mediaItem?: Media) {
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

function isClippedItem(
  item: PlaylistItem,
  mediaItem: Media | undefined,
  resolvedDuration: number,
) {
  if (mediaItem?.type !== "video") {
    return false;
  }

  if ((item.clip_start ?? 0) > 0) {
    return true;
  }

  return (
    (mediaItem.duration ?? 0) > CLIP_LENGTH &&
    resolvedDuration >= CLIP_LENGTH
  );
}

function canEditClip(item: PlaylistItem, mediaItem: Media | undefined) {
  if (mediaItem?.type !== "video") {
    return false;
  }

  return (
    (mediaItem.duration ?? 0) > CLIP_LENGTH || (item.clip_start ?? 0) > 0
  );
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

function SortableSlotCard({
  item,
  slotNumber,
  mediaItem,
  busy,
  canEdit,
  onChange,
  onEditClip,
  onRemove,
}: {
  item: PlaylistItem;
  slotNumber: number;
  mediaItem: Media | undefined;
  busy: boolean;
  canEdit: boolean;
  onChange: () => void;
  onEditClip: () => void;
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, disabled: !canEdit });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const duration = resolveSlotDuration(item, mediaItem);
  const clipStart = item.clip_start ?? 0;
  const clipped = isClippedItem(item, mediaItem, duration);
  const showClipButton = canEdit && canEditClip(item, mediaItem);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] transition duration-200",
        isDragging && "z-10 border-sky-400/40 bg-surface-2 shadow-card",
      )}
    >
      <div className="relative aspect-video w-full overflow-hidden bg-black/40">
        {mediaItem ? (
          <MediaPreview item={mediaItem} />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-muted">
            <Film aria-hidden="true" className="h-5 w-5" />
          </span>
        )}

        <span className="absolute left-2 top-2 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-black/60 px-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/80 backdrop-blur">
          Slot {slotNumber}
        </span>

        <span className="absolute bottom-2 left-2 inline-flex items-center rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-white backdrop-blur">
          {formatDurationChip(duration)}
        </span>

        <span className="absolute bottom-2 right-2 inline-flex items-center rounded-full border border-white/10 bg-black/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/70 backdrop-blur">
          {mediaItem?.type === "video" ? "Video" : "Image"}
        </span>

        {canEdit ? (
          <button
            type="button"
            aria-label={`Drag slot ${slotNumber} to reorder`}
            className="absolute right-2 top-2 flex h-7 w-7 touch-none cursor-grab items-center justify-center rounded-full bg-black/60 text-white/60 backdrop-blur transition duration-200 hover:bg-black/80 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripVertical aria-hidden="true" className="h-3.5 w-3.5" />
          </button>
        ) : null}

        {busy ? (
          <span className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-[1px]">
            <Loader2
              aria-hidden="true"
              className="h-5 w-5 animate-spin text-white"
            />
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <p className="truncate text-sm font-medium text-white">
          {mediaItem?.name ?? "Media unavailable"}
        </p>

        {clipped ? (
          <span className="inline-flex w-fit items-center gap-1 rounded-full border border-sky-400/20 bg-sky-400/10 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-sky-100">
            <Scissors aria-hidden="true" className="h-3 w-3" />
            Clip {formatClock(clipStart)} - {formatClock(clipStart + CLIP_LENGTH)}
          </span>
        ) : null}

        {canEdit ? (
          <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-1">
            <button
              type="button"
              onClick={onChange}
              disabled={busy}
              className="inline-flex h-7 items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 text-[11px] font-medium text-white/80 transition duration-200 hover:border-white/20 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 disabled:opacity-50"
            >
              <RefreshCw aria-hidden="true" className="h-3 w-3" />
              Change
            </button>

            {showClipButton ? (
              <button
                type="button"
                onClick={onEditClip}
                disabled={busy}
                className="inline-flex h-7 items-center gap-1 rounded-full border border-sky-400/20 bg-sky-400/10 px-2.5 text-[11px] font-medium text-sky-100 transition duration-200 hover:border-sky-400/40 hover:bg-sky-400/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 disabled:opacity-50"
              >
                <Scissors aria-hidden="true" className="h-3 w-3" />
                Edit clip
              </button>
            ) : null}

            <button
              type="button"
              onClick={onRemove}
              disabled={busy}
              aria-label={`Remove slot ${slotNumber}`}
              className="ml-auto inline-flex h-7 items-center gap-1 rounded-full px-2 text-[11px] font-medium text-red-300 transition duration-200 hover:bg-red-400/10 hover:text-red-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 disabled:opacity-50"
            >
              <Trash2 aria-hidden="true" className="h-3 w-3" />
              Remove
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function EmptySlotCard({
  slotNumber,
  disabled,
  onAdd,
}: {
  slotNumber: number;
  disabled: boolean;
  onAdd: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onAdd}
      disabled={disabled}
      className="group relative flex min-h-[188px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 bg-white/[0.01] p-4 text-center transition duration-200 hover:border-sky-400/40 hover:bg-white/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span className="absolute left-2 top-2 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-white/5 px-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
        Slot {slotNumber}
      </span>

      <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-brand-sky transition duration-200 group-hover:border-sky-400/40 group-hover:bg-sky-400/10">
        <Plus aria-hidden="true" className="h-4 w-4" />
      </span>

      <span className="text-sm font-medium text-white">
        {disabled ? "Maximum 10 slots reached" : "+ Add content"}
      </span>
      <span className="text-xs text-muted">Up to 10 seconds</span>
    </button>
  );
}

function formatUsageDateRange(usage: PlaylistBookingUsage) {
  const start = formatBookingDate(usage.startDate);
  const end = formatBookingDate(usage.endDate);

  if (start === "—" && end === "—") {
    return "Dates not set";
  }

  if (start === end) {
    return start;
  }

  return `${start} – ${end}`;
}

function BookingUsageCard({ usages }: { usages: PlaylistBookingUsage[] }) {
  return (
    <Card className="flex flex-col overflow-hidden p-0">
      <div className="border-b border-white/5 px-4 py-4">
        <h2 className="text-sm font-semibold text-white">Used in bookings:</h2>
        <p className="mt-1 text-xs text-muted">
          Campaigns currently referencing this playlist.
        </p>
      </div>

      {usages.length === 0 ? (
        <div className="px-4 py-10 text-center">
          <p className="text-sm text-body">
            No bookings use this playlist yet.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-white/5">
          {usages.map((usage) => (
            <li key={usage.id} className="px-4 py-3.5">
              <p className="font-mono text-xs font-semibold uppercase tracking-wide text-white">
                {usage.id.slice(0, 8)}
              </p>
              <p className="mt-1 text-xs text-muted">
                {formatUsageDateRange(usage)}
              </p>
              <span className="mt-2 inline-flex rounded-full border border-sky-400/20 bg-sky-400/10 px-2 py-0.5 text-[10px] font-semibold text-sky-200">
                {formatBookingStatus(usage.status)}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-auto border-t border-white/5 px-4 py-3">
        <p className="text-xs leading-5 text-muted">
          Attach this playlist to a booking from the Bookings tab.
        </p>
      </div>
    </Card>
  );
}

export default function PlaylistEditor({
  playlist,
  initialItems,
  media,
  screens,
  screenPlaylists,
  playlists,
  canEdit,
  backHref,
  hideScreenAssign,
  bookingUsages = [],
}: {
  playlist: Playlist;
  initialItems: PlaylistItem[];
  media: Media[];
  screens: Screen[];
  screenPlaylists: ScreenPlaylist[];
  playlists: Playlist[];
  canEdit: boolean;
  backHref: string;
  hideScreenAssign?: boolean;
  bookingUsages?: PlaylistBookingUsage[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const [items, setItems] = useState<PlaylistItem[]>(initialItems);
  const [mediaList, setMediaList] = useState<Media[]>(media);
  const [assignments, setAssignments] =
    useState<ScreenPlaylist[]>(screenPlaylists);
  const [name, setName] = useState(playlist.name);
  const [savedName, setSavedName] = useState(playlist.name);
  const [picker, setPicker] = useState<PickerState>(null);
  const [clipState, setClipState] = useState<ClipState | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [busyItemId, setBusyItemId] = useState<string | null>(null);
  const [busyScreenId, setBusyScreenId] = useState<string | null>(null);
  const [now, setNow] = useState(0);

  const saveTimerRef = useRef<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
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

  const refreshAssignedScreens = useCallback(() => {
    const screenIds = assignments
      .filter(
        (assignment) =>
          assignment.playlist_id === playlist.id &&
          assignment.is_active !== false,
      )
      .map((assignment) => assignment.screen_id);

    if (screenIds.length > 0) {
      void notifyScreens(screenIds, "refresh");
    }
  }, [assignments, playlist.id]);

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
    () =>
      new Map<string, Media>(
        mediaList.map((item) => [item.id, item] as const),
      ),
    [mediaList],
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

  const assignedScreens = useMemo(
    () =>
      screens.filter(
        (screen) =>
          assignmentByScreen.get(screen.id)?.playlist_id === playlist.id,
      ),
    [screens, assignmentByScreen, playlist.id],
  );

  const visibleScreens = canEdit ? screens : assignedScreens;

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => a.position - b.position),
    [items],
  );

  const loopSeconds = useMemo(
    () =>
      sortedItems.reduce(
        (sum, item) =>
          sum + resolveSlotDuration(item, mediaById.get(item.media_id)),
        0,
      ),
    [sortedItems, mediaById],
  );

  const isFull = sortedItems.length >= MAX_SLOTS;
  const hasOverflow = sortedItems.length > MAX_SLOTS;
  const gridSlots = canEdit
    ? Math.max(MAX_SLOTS, sortedItems.length)
    : sortedItems.length;

  function buildRows(nextItems: PlaylistItem[]) {
    return nextItems.map((entry) => {
      const mediaItem = mediaById.get(entry.media_id);

      return {
        id: entry.id,
        playlist_id: playlist.id,
        media_id: entry.media_id,
        position: entry.position,
        duration: entry.duration ?? resolveSlotDuration(entry, mediaItem),
        clip_start: entry.clip_start ?? 0,
      };
    });
  }

  async function persistPositions(nextItems: PlaylistItem[]) {
    if (nextItems.length === 0) {
      return null;
    }

    const { error: upsertError } = await supabase
      .from("playlist_items")
      .upsert(buildRows(nextItems), { onConflict: "id" });

    return upsertError;
  }

  async function handleDragEnd(event: DragEndEvent) {
    if (!canEdit || busyItemId) {
      return;
    }

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

    const upsertError = await persistPositions(reordered);

    if (upsertError) {
      setItems(previousItems);
      setError(upsertError.message);
      setSaveState("idle");
      return;
    }

    await touchPlaylist();
    refreshAssignedScreens();
    markSaved();
  }

  async function handleAddItem(
    mediaItem: Media,
    duration: number,
    clipStart: number,
  ) {
    if (!canEdit || busyItemId) {
      return;
    }

    if (sortedItems.length >= MAX_SLOTS) {
      setError("Maximum 10 slots reached. Remove a slot before adding content.");
      return;
    }

    const position = sortedItems.length;
    const tempId = createTempId("item");
    const previousItems = items;
    const optimistic: PlaylistItem = {
      id: tempId,
      playlist_id: playlist.id,
      media_id: mediaItem.id,
      position,
      duration,
      clip_start: clipStart,
      created_at: new Date().toISOString(),
    };

    setError(null);
    setBusyItemId(tempId);
    setItems([...items, optimistic]);
    markSaving();

    const { data, error: insertError } = await supabase
      .from("playlist_items")
      .insert({
        playlist_id: playlist.id,
        media_id: mediaItem.id,
        position,
        duration,
        clip_start: clipStart,
      })
      .select(
        "id, playlist_id, media_id, position, duration, clip_start, created_at",
      )
      .single();

    if (insertError || !data) {
      setItems(previousItems);
      setError(insertError?.message ?? "Could not add this media item.");
      setSaveState("idle");
      setBusyItemId(null);
      return;
    }

    setItems((current) =>
      current.map((item) =>
        item.id === tempId ? (data as PlaylistItem) : item,
      ),
    );
    setBusyItemId(null);
    await touchPlaylist();
    refreshAssignedScreens();
    markSaved();
  }

  async function handleChangeItem(
    itemId: string,
    mediaItem: Media,
    duration: number,
    clipStart: number,
  ) {
    if (!canEdit || busyItemId) {
      return;
    }

    const existing = items.find((item) => item.id === itemId);

    if (!existing || existing.id.startsWith("item-")) {
      return;
    }

    const previousItems = items;
    const optimistic: PlaylistItem = {
      ...existing,
      media_id: mediaItem.id,
      duration,
      clip_start: clipStart,
    };

    setError(null);
    setBusyItemId(itemId);
    setItems((current) =>
      current.map((item) => (item.id === itemId ? optimistic : item)),
    );
    markSaving();

    const { error: saveError } = await supabase
      .from("playlist_items")
      .upsert(
        {
          id: existing.id,
          playlist_id: playlist.id,
          media_id: mediaItem.id,
          position: existing.position,
          duration,
          clip_start: clipStart,
        },
        { onConflict: "id" },
      );

    if (saveError) {
      setItems(previousItems);
      setError(saveError.message);
      setSaveState("idle");
      setBusyItemId(null);
      return;
    }

    setBusyItemId(null);
    await touchPlaylist();
    refreshAssignedScreens();
    markSaved();
  }

  async function handleUpdateClip(itemId: string, start: number) {
    if (!canEdit || busyItemId) {
      return;
    }

    const existing = items.find((item) => item.id === itemId);

    if (!existing || existing.id.startsWith("item-")) {
      return;
    }

    const previousItems = items;
    const optimistic: PlaylistItem = {
      ...existing,
      duration: CLIP_LENGTH,
      clip_start: start,
    };

    setError(null);
    setBusyItemId(itemId);
    setItems((current) =>
      current.map((item) => (item.id === itemId ? optimistic : item)),
    );
    markSaving();

    const { error: saveError } = await supabase
      .from("playlist_items")
      .upsert(
        {
          id: existing.id,
          playlist_id: playlist.id,
          media_id: existing.media_id,
          position: existing.position,
          duration: CLIP_LENGTH,
          clip_start: start,
        },
        { onConflict: "id" },
      );

    if (saveError) {
      setItems(previousItems);
      setError(saveError.message);
      setSaveState("idle");
      setBusyItemId(null);
      return;
    }

    setBusyItemId(null);
    await touchPlaylist();
    refreshAssignedScreens();
    markSaved();
  }

  async function handleRemoveItem(itemId: string) {
    if (!canEdit || busyItemId || itemId.startsWith("item-")) {
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

    const upsertError = await persistPositions(remaining);

    if (upsertError) {
      setError(upsertError.message);
      setSaveState("idle");
      setBusyItemId(null);
      return;
    }

    setBusyItemId(null);
    await touchPlaylist();
    refreshAssignedScreens();
    markSaved();
  }

  function openPicker(state: PickerState) {
    if (!canEdit || (state?.mode === "add" && isFull)) {
      return;
    }

    setPicker(state);
  }

  function applySelection(
    mediaItem: Media,
    duration: number,
    clipStart: number,
    target: { mode: "add" } | { mode: "change"; itemId: string },
  ) {
    if (target.mode === "change") {
      void handleChangeItem(target.itemId, mediaItem, duration, clipStart);
      return;
    }

    void handleAddItem(mediaItem, duration, clipStart);
  }

  function handlePickerPick(mediaItem: Media, resolvedLength: number | null) {
    const current = picker;

    if (!current) {
      return;
    }

    setPicker(null);

    const length =
      mediaItem.type === "video"
        ? resolvedLength && resolvedLength > 0
          ? resolvedLength
          : mediaItem.duration && mediaItem.duration > 0
            ? mediaItem.duration
            : null
        : CLIP_LENGTH;

    if (mediaItem.type === "video" && length === null) {
      setError("Could not read this video's length. Please try again.");
      return;
    }

    if (
      mediaItem.type === "video" &&
      length !== null &&
      length > CLIP_LENGTH
    ) {
      const clipMedia: Media = { ...mediaItem, duration: length };

      if (current.mode === "change") {
        setClipState({
          mode: "change",
          itemId: current.itemId,
          media: clipMedia,
          initialStart: 0,
        });
      } else {
        setClipState({
          mode: "add",
          media: clipMedia,
          initialStart: 0,
        });
      }

      return;
    }

    const duration =
      mediaItem.type === "image"
        ? CLIP_LENGTH
        : Math.max(
            1,
            Math.min(
              CLIP_LENGTH,
              Math.round(length ?? CLIP_LENGTH),
            ),
          );

    applySelection(mediaItem, duration, 0, current);
  }

  function handleClipConfirm(start: number) {
    const current = clipState;

    if (!current) {
      return;
    }

    setClipState(null);

    if (current.mode === "edit") {
      void handleUpdateClip(current.itemId, start);
      return;
    }

    if (current.mode === "change") {
      applySelection(current.media, CLIP_LENGTH, start, {
        mode: "change",
        itemId: current.itemId,
      });
      return;
    }

    applySelection(current.media, CLIP_LENGTH, start, { mode: "add" });
  }

  function handleDurationResolved(mediaId: string, duration: number) {
    setMediaList((current) =>
      current.map((item) =>
        item.id === mediaId ? { ...item, duration } : item,
      ),
    );
  }

  async function handleNameCommit() {
    if (!canEdit) {
      return;
    }

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
    if (!canEdit || busyScreenId) {
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
            href={backHref}
            aria-label="Back to playlists"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/60 transition duration-200 hover:border-white/20 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          </Link>

          <div className="min-w-0 flex-1">
            {canEdit ? (
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
            ) : (
              <h1 className="truncate text-xl font-extrabold tracking-tight text-white sm:text-2xl">
                {name}
              </h1>
            )}
            <p className="mt-1 text-xs text-muted">
              {sortedItems.length} of {MAX_SLOTS} slots · Loop{" "}
              {formatLoopTime(loopSeconds)}
            </p>
          </div>
        </div>

        {canEdit ? (
          <div
            aria-live="polite"
            className="flex min-h-6 items-center gap-2 pl-12 sm:pl-0"
          >
            {saveState === "saving" ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-body">
                <Loader2
                  aria-hidden="true"
                  className="h-3.5 w-3.5 animate-spin"
                />
                Saving...
              </span>
            ) : saveState === "saved" ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-300">
                <Check aria-hidden="true" className="h-3.5 w-3.5" />
                Saved
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200"
        >
          {error}
        </p>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <Card className="flex flex-col overflow-hidden p-0">
          <div className="flex flex-col gap-3 border-b border-white/5 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div>
              <h2 className="text-sm font-semibold text-white">Slot board</h2>
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
                <span>
                  Slots:{" "}
                  <span className="font-semibold tabular-nums text-white">
                    {sortedItems.length} / {MAX_SLOTS}
                  </span>
                </span>
                <span>
                  Loop time:{" "}
                  <span className="font-semibold tabular-nums text-white">
                    {formatLoopTime(loopSeconds)}
                  </span>
                </span>
              </div>
            </div>

            {canEdit ? (
              <Button
                size="sm"
                onClick={() => openPicker({ mode: "add" })}
                disabled={isFull}
                className="shrink-0 gap-2"
              >
                <Plus aria-hidden="true" className="h-4 w-4" />
                {isFull ? "Maximum 10 slots reached" : "Add content"}
              </Button>
            ) : null}
          </div>

          {hasOverflow ? (
            <p className="mx-4 mt-4 flex items-start gap-2 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-xs leading-5 text-amber-200 sm:mx-5">
              <AlertTriangle
                aria-hidden="true"
                className="mt-0.5 h-4 w-4 shrink-0"
              />
              This playlist has more than 10 slots. Remove extra slots to add
              new ones.
            </p>
          ) : null}

          {!canEdit && sortedItems.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-brand-sky">
                <ListVideo aria-hidden="true" className="h-6 w-6" />
              </span>
              <h3 className="mt-4 text-base font-semibold text-white">
                This playlist is empty
              </h3>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-body">
                This playlist has no items yet.
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
                strategy={rectSortingStrategy}
              >
                <div className="grid gap-3 p-3 sm:grid-cols-2 sm:p-4 xl:grid-cols-3">
                  {Array.from({ length: gridSlots }).map((_, index) => {
                    const item = sortedItems[index];

                    if (!item) {
                      return (
                        <EmptySlotCard
                          key={`empty-${index}`}
                          slotNumber={index + 1}
                          disabled={isFull}
                          onAdd={() => openPicker({ mode: "add" })}
                        />
                      );
                    }

                    const mediaItem = mediaById.get(item.media_id);

                    return (
                      <SortableSlotCard
                        key={item.id}
                        item={item}
                        slotNumber={index + 1}
                        mediaItem={mediaItem}
                        busy={busyItemId === item.id}
                        canEdit={canEdit}
                        onChange={() =>
                          openPicker({ mode: "change", itemId: item.id })
                        }
                        onEditClip={() => {
                          if (!mediaItem) {
                            return;
                          }

                          setClipState({
                            mode: "edit",
                            itemId: item.id,
                            media: mediaItem,
                            initialStart: item.clip_start ?? 0,
                          });
                        }}
                        onRemove={() => void handleRemoveItem(item.id)}
                      />
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </Card>

        {hideScreenAssign ? (
          <BookingUsageCard usages={bookingUsages} />
        ) : (
          <Card className="flex flex-col overflow-hidden p-0">
            <div className="border-b border-white/5 px-4 py-4">
              <h2 className="text-sm font-semibold text-white">
                {canEdit ? "Assign to screens" : "Assigned screens"}
              </h2>
              <p className="mt-1 text-xs text-muted">
                {canEdit
                  ? "A screen can only play one playlist at a time."
                  : "Screens currently using this playlist."}
              </p>
            </div>

            {visibleScreens.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <p className="text-sm text-body">
                  {canEdit
                    ? "Pair a screen before assigning a playlist."
                    : "This playlist is not assigned to any screen."}
                </p>
                {canEdit ? (
                  <Link
                    href="/dashboard/screens"
                    className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-sky transition duration-200 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60"
                  >
                    Go to screens
                  </Link>
                ) : null}
              </div>
            ) : (
              <ul className="divide-y divide-white/5">
                {visibleScreens.map((screen) => {
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

                        {canEdit ? (
                          <button
                            type="button"
                            role="switch"
                            aria-checked={assigned}
                            aria-label={`${assigned ? "Unassign" : "Assign"} playlist for ${screen.name}`}
                            onClick={() =>
                              void handleToggleAssignment(screen.id)
                            }
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
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        )}
      </div>

      {picker && canEdit ? (
        <ContentPicker
          media={mediaList}
          canEdit={canEdit}
          title={picker.mode === "add" ? "Add content" : "Change content"}
          onClose={() => setPicker(null)}
          onPick={handlePickerPick}
          onDurationResolved={handleDurationResolved}
        />
      ) : null}

      {clipState ? (
        <ClipDialog
          media={clipState.media}
          initialStart={clipState.initialStart}
          onCancel={() => setClipState(null)}
          onConfirm={handleClipConfirm}
        />
      ) : null}
    </div>
  );
}
