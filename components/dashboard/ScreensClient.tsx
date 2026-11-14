"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import {
  ChevronDown,
  ChevronUp,
  Film,
  Images,
  ListVideo,
  Loader2,
  MapPin,
  Monitor,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import StatusBadge from "@/components/dashboard/StatusBadge";
import Button from "@/components/ui/Button";
import { getMediaUrl } from "@/lib/media";
import { notifyChannel, notifyScreens } from "@/lib/realtime";
import { getScreenStatus } from "@/lib/screens";
import { createClient } from "@/lib/supabase/client";
import type {
  MediaType,
  Playlist,
  Screen,
  ScreenPlaylist,
} from "@/lib/types";

const CODE_LENGTH = 6;
const REFRESH_INTERVAL_MS = 15_000;

const lastSeenFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

function formatLastSeen(value: string | null) {
  if (!value) {
    return "Never";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return lastSeenFormatter.format(date);
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200"
    >
      {message}
    </p>
  );
}

export type ScreenContentItem = {
  id: string;
  name: string;
  type: MediaType;
  file_path: string;
  duration: number | null;
};

export type ScreenContentMap = Record<string, ScreenContentItem[]>;

function formatDuration(seconds: number | null) {
  const total = Math.max(0, Math.round(seconds ?? 10));
  const minutes = Math.floor(total / 60);
  const remaining = total % 60;

  if (minutes === 0) {
    return `${remaining}s`;
  }

  return `${minutes}m ${remaining.toString().padStart(2, "0")}s`;
}

function ScreenContentSection({ items }: { items: ScreenContentItem[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.02] md:col-span-4">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left"
      >
        <span className="flex min-w-0 items-center gap-2">
          <Images
            aria-hidden="true"
            className="h-4 w-4 shrink-0 text-brand-sky"
          />
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
            Content on this screen
          </span>
          <span className="text-sm text-white">
            {items.length} {items.length === 1 ? "item" : "items"}
          </span>
        </span>
        {open ? (
          <ChevronUp aria-hidden="true" className="h-4 w-4 shrink-0 text-muted" />
        ) : (
          <ChevronDown
            aria-hidden="true"
            className="h-4 w-4 shrink-0 text-muted"
          />
        )}
      </button>

      {open ? (
        items.length === 0 ? (
          <p className="border-t border-white/5 px-4 py-4 text-sm text-body">
            This screen has no content assigned yet.
          </p>
        ) : (
          <ul className="space-y-2 border-t border-white/5 px-3 py-3">
            {items.map((item, index) => (
              <li
                key={item.id}
                className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-2"
              >
                <span className="relative h-12 w-16 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-black/40">
                  {item.type === "video" ? (
                    <video
                      src={getMediaUrl(item.file_path)}
                      muted
                      playsInline
                      preload="metadata"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <img
                      src={getMediaUrl(item.file_path)}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">
                    {item.name}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
                    {item.type === "video" ? (
                      <Film aria-hidden="true" className="h-3 w-3" />
                    ) : (
                      <Images aria-hidden="true" className="h-3 w-3" />
                    )}
                    {item.type === "video" ? "Video" : "Image"}
                    <span aria-hidden="true">·</span>
                    {formatDuration(item.duration)}
                  </p>
                </div>
                <span className="text-xs text-muted">#{index + 1}</span>
              </li>
            ))}
          </ul>
        )
      ) : null}
    </div>
  );
}

export default function ScreensClient({
  screens,
  playlists,
  screenPlaylists,
  loadError,
  customerId,
  canEdit,
  contentByScreen,
}: {
  screens: Screen[];
  playlists: Playlist[];
  screenPlaylists: ScreenPlaylist[];
  loadError: string | null;
  customerId: string;
  canEdit: boolean;
  contentByScreen: ScreenContentMap;
}) {
  const router = useRouter();
  const [assignments, setAssignments] =
    useState<ScreenPlaylist[]>(screenPlaylists);
  const [savingPlaylistId, setSavingPlaylistId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [isOpen, setIsOpen] = useState(false);
  const [code, setCode] = useState<string[]>(() =>
    Array<string>(CODE_LENGTH).fill(""),
  );
  const [screenName, setScreenName] = useState("");
  const [pairLocation, setPairLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [sent, setSent] = useState<{
    id: string;
    event: "refresh" | "restart";
  } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [editingScreen, setEditingScreen] = useState<Screen | null>(null);
  const [editName, setEditName] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const codeInputsRef = useRef<Array<HTMLInputElement | null>>([]);

  const assignmentByScreen = useMemo(
    () =>
      new Map<string, ScreenPlaylist>(
        assignments.map((assignment) => [assignment.screen_id, assignment]),
      ),
    [assignments],
  );

  const playlistNameById = useMemo(
    () =>
      new Map<string, string>(
        playlists.map((playlist) => [playlist.id, playlist.name] as const),
      ),
    [playlists],
  );

  async function handlePlaylistChange(screen: Screen, playlistId: string) {
    if (!canEdit) {
      return;
    }

    setSavingPlaylistId(screen.id);
    setActionError(null);

    const previousAssignments = assignments;
    const existing = assignmentByScreen.get(screen.id);
    const supabase = createClient();

    if (!playlistId) {
      setAssignments((current) =>
        current.filter((assignment) => assignment.screen_id !== screen.id),
      );

      const { error: deleteError } = await supabase
        .from("screen_playlists")
        .delete()
        .eq("screen_id", screen.id);

      if (deleteError) {
        setAssignments(previousAssignments);
        setActionError(deleteError.message);
        setSavingPlaylistId(null);
        return;
      }
    } else {
      const optimistic: ScreenPlaylist = {
        id: existing?.id ?? `assignment-${screen.id}`,
        screen_id: screen.id,
        playlist_id: playlistId,
        is_active: true,
        created_at: existing?.created_at ?? new Date().toISOString(),
      };

      setAssignments((current) => [
        ...current.filter((assignment) => assignment.screen_id !== screen.id),
        optimistic,
      ]);

      const { data, error: upsertError } = await supabase
        .from("screen_playlists")
        .upsert(
          {
            screen_id: screen.id,
            playlist_id: playlistId,
            is_active: true,
          },
          { onConflict: "screen_id" },
        )
        .select("id, screen_id, playlist_id, is_active, created_at")
        .single();

      if (upsertError || !data) {
        setAssignments(previousAssignments);
        setActionError(
          upsertError?.message ??
            "Could not update the playlist for this screen.",
        );
        setSavingPlaylistId(null);
        return;
      }

      setAssignments((current) => [
        ...current.filter((assignment) => assignment.screen_id !== screen.id),
        data as ScreenPlaylist,
      ]);
    }

    void notifyScreens([screen.id], "refresh");
    setSavingPlaylistId(null);
  }

  const closeModal = useCallback(() => {
    setIsOpen(false);
    setCode(Array<string>(CODE_LENGTH).fill(""));
    setScreenName("");
    setPairLocation("");
    setLoading(false);
    setError(null);
    router.refresh();
  }, [router]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeModal();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, closeModal]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    function refresh() {
      setNow(Date.now());

      if (document.visibilityState === "visible") {
        router.refresh();
      }
    }

    const interval = window.setInterval(refresh, REFRESH_INTERVAL_MS);

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        refresh();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [router]);

  useEffect(() => {
    if (!success) {
      return;
    }

    const timeout = window.setTimeout(() => setSuccess(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [success]);

  useEffect(() => {
    if (!sent) {
      return;
    }

    const timeout = window.setTimeout(() => setSent(null), 2000);
    return () => window.clearTimeout(timeout);
  }, [sent]);

  async function handleScreenSignal(
    screenId: string,
    event: "refresh" | "restart",
  ) {
    if (!canEdit) {
      return;
    }

    setActionError(null);
    await notifyScreens([screenId], event);
    setSent({ id: screenId, event });
  }

  async function handleDelete(screen: Screen) {
    if (!canEdit) {
      return;
    }

    const confirmed = window.confirm(
      `Delete "${screen.name}"? This will unpair the screen. It will show a new code.`,
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(screen.id);
    setActionError(null);

    try {
      await notifyScreens([screen.id], "refresh");

      const supabase = createClient();
      const { error: deleteError } = await supabase
        .from("screens")
        .delete()
        .eq("id", screen.id);

      if (deleteError) {
        setActionError(deleteError.message);
        return;
      }

      router.refresh();
    } catch {
      setActionError("Could not delete this screen. Please try again.");
    } finally {
      setDeletingId(null);
    }
  }

  function openModal() {
    if (!canEdit) {
      return;
    }

    setCode(Array<string>(CODE_LENGTH).fill(""));
    setScreenName("");
    setPairLocation("");
    setError(null);
    setIsOpen(true);
  }

  function openEditModal(screen: Screen) {
    if (!canEdit) {
      return;
    }

    setEditingScreen(screen);
    setEditName(screen.name);
    setEditLocation(screen.location ?? "");
    setEditError(null);
  }

  function closeEditModal() {
    setEditingScreen(null);
    setEditName("");
    setEditLocation("");
    setEditError(null);
  }

  async function handleEditSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canEdit || !editingScreen) {
      return;
    }

    const trimmedName = editName.trim();

    if (!trimmedName) {
      setEditError("Enter a name for this screen.");
      return;
    }

    setEditError(null);
    setSavingEdit(true);

    try {
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from("screens")
        .update({
          name: trimmedName,
          location: editLocation.trim() || null,
        })
        .eq("id", editingScreen.id);

      if (updateError) {
        setEditError(updateError.message);
        return;
      }

      closeEditModal();
      router.refresh();
    } catch {
      setEditError("Could not update this screen. Please try again.");
    } finally {
      setSavingEdit(false);
    }
  }

  function updateCode(index: number, digits: string) {
    const next = [...code];
    const characters = digits.replace(/\D/g, "").split("");
    let cursor = index;

    if (characters.length === 0) {
      next[index] = "";
      setCode(next);
      return;
    }

    for (const character of characters) {
      if (cursor >= CODE_LENGTH) {
        break;
      }

      next[cursor] = character;
      cursor += 1;
    }

    setCode(next);
    codeInputsRef.current[Math.min(cursor, CODE_LENGTH - 1)]?.focus();
  }

  function handleCodeChange(
    index: number,
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const digits = event.target.value.replace(/\D/g, "");
    updateCode(index, digits);
  }

  function handleCodeKeyDown(
    index: number,
    event: ReactKeyboardEvent<HTMLInputElement>,
  ) {
    if (event.key === "Backspace" && !code[index] && index > 0) {
      event.preventDefault();

      const next = [...code];
      next[index - 1] = "";
      setCode(next);
      codeInputsRef.current[index - 1]?.focus();
      return;
    }

    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      codeInputsRef.current[index - 1]?.focus();
      return;
    }

    if (event.key === "ArrowRight" && index < CODE_LENGTH - 1) {
      event.preventDefault();
      codeInputsRef.current[index + 1]?.focus();
    }
  }

  function handleCodePaste(event: ClipboardEvent<HTMLInputElement>) {
    event.preventDefault();

    const digits = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, CODE_LENGTH);

    if (!digits) {
      return;
    }

    const next = Array<string>(CODE_LENGTH).fill("");

    digits.split("").forEach((digit, index) => {
      next[index] = digit;
    });

    setCode(next);
    codeInputsRef.current[Math.min(digits.length, CODE_LENGTH - 1)]?.focus();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canEdit) {
      return;
    }

    const trimmedName = screenName.trim();
    const trimmedLocation = pairLocation.trim();
    const enteredCode = code.join("");

    if (code.some((digit) => !digit)) {
      setError("Enter the 6-digit code shown on your screen.");
      return;
    }

    if (!trimmedName) {
      setError("Enter a name for this screen.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { data, error: rpcError } = await supabase.rpc(
        "claim_device_code",
        {
          p_code: enteredCode,
          p_screen_name: trimmedName,
          p_customer_id: customerId,
          p_location: trimmedLocation || null,
        },
      );

      if (rpcError) {
        setError("Invalid or expired code. Check the number on your screen.");
        return;
      }

      const payload = (Array.isArray(data) ? data[0] : data) as
        | { screen_id?: unknown }
        | null;
      const pairedScreenId =
        typeof data === "string"
          ? data
          : typeof payload?.screen_id === "string"
            ? payload.screen_id
            : null;

      if (!pairedScreenId) {
        setError("Invalid or expired code. Check the number on your screen.");
        return;
      }

      void notifyChannel(`pair:${enteredCode}`, "paired");
      setSuccess("Screen paired successfully.");
      closeModal();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-body">
          {screens.length} {screens.length === 1 ? "screen" : "screens"}
        </p>

        {canEdit ? (
          <Button onClick={openModal} className="shrink-0 px-5">
            <Plus aria-hidden="true" className="h-4 w-4" />
            Pair Screen
          </Button>
        ) : null}
      </div>

      {success ? (
        <p
          role="status"
          className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200"
        >
          {success}
        </p>
      ) : null}
      {loadError ? <ErrorMessage message={loadError} /> : null}
      {actionError ? <ErrorMessage message={actionError} /> : null}

      <div className="overflow-hidden rounded-3xl border border-white/10 bg-surface">
        <div className="hidden grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)] gap-4 border-b border-white/5 px-6 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted md:grid">
          <span>Screen</span>
          <span>Status</span>
          <span>Last seen</span>
          <span>Location</span>
        </div>

        {screens.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-brand-sky">
              <Monitor aria-hidden="true" className="h-6 w-6" />
            </span>
            <h2 className="mt-4 text-base font-semibold text-white">
              No screens yet
            </h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-body">
              {canEdit
                ? "Use Pair Screen and enter the code shown on your display to connect your first screen."
                : "Screens connected to this account will appear here."}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-white/5">
            {screens.map((screen) => {
              const assignment = assignmentByScreen.get(screen.id);
              const assignedPlaylistName = assignment
                ? (playlistNameById.get(assignment.playlist_id) ?? "Playlist")
                : null;

              return (
              <li
                key={screen.id}
                className="grid gap-3 px-5 py-4 sm:px-6 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)] md:items-center md:gap-4"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-brand-sky">
                    <Monitor aria-hidden="true" className="h-5 w-5" />
                  </span>
                  <p className="truncate text-sm font-medium text-white">
                    {screen.name}
                  </p>
                </div>

                <div className="flex items-center justify-between gap-3 md:block">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted md:hidden">
                    Status
                  </span>
                  <StatusBadge
                    status={getScreenStatus(
                      screen.status,
                      screen.last_seen,
                      now,
                    )}
                  />
                </div>

                <div className="flex items-center justify-between gap-3 md:block">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted md:hidden">
                    Last seen
                  </span>
                  <span className="text-sm text-body">
                    {formatLastSeen(screen.last_seen)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3 md:block">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted md:hidden">
                    Location
                  </span>
                  <span className="flex min-w-0 items-center gap-1.5 text-sm text-body">
                    <MapPin
                      aria-hidden="true"
                      className="h-3.5 w-3.5 shrink-0 text-muted"
                    />
                    <span className="truncate">
                      {screen.location ?? "Location not set"}
                    </span>
                  </span>
                </div>

                <div className="flex flex-col gap-2 rounded-2xl border border-white/5 bg-white/[0.02] px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between md:col-span-4">
                  <div className="flex min-w-0 items-center gap-2">
                    <ListVideo
                      aria-hidden="true"
                      className="h-4 w-4 shrink-0 text-brand-sky"
                    />
                    <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                      Playlist
                    </span>
                    <span className="truncate text-sm text-white">
                      {assignedPlaylistName ?? "None"}
                    </span>
                  </div>

                  {canEdit ? (
                    <select
                      aria-label={`Playlist for ${screen.name}`}
                      value={assignment?.playlist_id ?? ""}
                      onChange={(event) =>
                        void handlePlaylistChange(screen, event.target.value)
                      }
                      disabled={savingPlaylistId === screen.id}
                      className="h-9 w-full rounded-full border border-white/10 bg-white/5 px-3 text-sm text-white outline-none transition focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/40 disabled:opacity-60 sm:w-auto sm:max-w-[240px]"
                    >
                      <option value="" className="bg-surface text-white">
                        No playlist
                      </option>
                      {playlists.map((playlist) => (
                        <option
                          key={playlist.id}
                          value={playlist.id}
                          className="bg-surface text-white"
                        >
                          {playlist.name}
                        </option>
                      ))}
                    </select>
                  ) : null}
                </div>

                {canEdit ? (
                  <div className="flex flex-wrap items-center gap-2 md:col-span-4">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => openEditModal(screen)}
                      className="gap-2"
                    >
                      <Pencil aria-hidden="true" className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        void handleScreenSignal(screen.id, "refresh")
                      }
                      className="gap-2"
                    >
                      <RefreshCw aria-hidden="true" className="h-3.5 w-3.5" />
                      Refresh
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        void handleScreenSignal(screen.id, "restart")
                      }
                      className="gap-2"
                    >
                      <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" />
                      Restart player
                    </Button>
                    {sent?.id === screen.id ? (
                      <span className="text-xs font-medium text-emerald-300">
                        Sent
                      </span>
                    ) : null}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void handleDelete(screen)}
                      disabled={deletingId === screen.id}
                      className="ml-auto gap-2 text-red-300 hover:bg-red-400/10 hover:text-red-200"
                    >
                      {deletingId === screen.id ? (
                        <Loader2
                          aria-hidden="true"
                          className="h-3.5 w-3.5 animate-spin"
                        />
                      ) : (
                        <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                      )}
                      {deletingId === screen.id ? "Deleting..." : "Delete"}
                    </Button>
                  </div>
                ) : null}

                {!canEdit ? (
                  <ScreenContentSection
                    items={contentByScreen[screen.id] ?? []}
                  />
                ) : null}
              </li>
              );
            })}
          </ul>
        )}
      </div>

      {isOpen && canEdit ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close modal"
            onClick={closeModal}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="pair-screen-title"
            className="relative max-h-[calc(100vh-2rem)] w-full max-w-md overflow-y-auto rounded-3xl border border-white/10 bg-surface p-6 shadow-card"
          >
            <button
              type="button"
              onClick={closeModal}
              aria-label="Close"
              className="absolute right-4 top-4 rounded-full p-1.5 text-white/40 transition duration-200 hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60"
            >
              <X className="h-5 w-5" />
            </button>

            <form onSubmit={handleSubmit}>
              <h2
                id="pair-screen-title"
                className="text-lg font-semibold tracking-tight text-white"
              >
                Pair a screen
              </h2>
              <p className="mt-2 text-sm leading-6 text-body">
                Open{" "}
                <Link
                  href="/player"
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-brand-sky underline-offset-4 hover:underline"
                >
                  /player
                </Link>{" "}
                on your screen to see the 6-digit code.
              </p>

              <div className="mt-5">
                <label
                  htmlFor="screen-name"
                  className="mb-2 block text-sm font-medium text-white"
                >
                  Screen name
                </label>
                <input
                  id="screen-name"
                  name="screenName"
                  type="text"
                  autoFocus
                  maxLength={80}
                  value={screenName}
                  onChange={(event) => setScreenName(event.target.value)}
                  disabled={loading}
                  placeholder="Lobby display"
                  className="h-12 w-full rounded-full border border-white/10 bg-white/5 px-5 text-sm text-white outline-none transition placeholder:text-muted focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/40 disabled:opacity-60"
                />
              </div>

              <div className="mt-5">
                <label
                  htmlFor="screen-location"
                  className="mb-2 block text-sm font-medium text-white"
                >
                  Location{" "}
                  <span className="font-normal text-muted">(optional)</span>
                </label>
                <input
                  id="screen-location"
                  name="screenLocation"
                  type="text"
                  maxLength={120}
                  value={pairLocation}
                  onChange={(event) => setPairLocation(event.target.value)}
                  disabled={loading}
                  placeholder="Front entrance"
                  className="h-12 w-full rounded-full border border-white/10 bg-white/5 px-5 text-sm text-white outline-none transition placeholder:text-muted focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/40 disabled:opacity-60"
                />
              </div>

              <fieldset className="mt-5">
                <legend className="mb-2 block text-sm font-medium text-white">
                  6-digit code
                </legend>
                <div className="flex justify-between gap-1.5 sm:gap-2">
                  {Array.from({ length: CODE_LENGTH }).map((_, index) => (
                    <input
                      key={index}
                      ref={(element) => {
                        codeInputsRef.current[index] = element;
                      }}
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      pattern="[0-9]*"
                      maxLength={1}
                      value={code[index]}
                      onChange={(event) => handleCodeChange(index, event)}
                      onKeyDown={(event) => handleCodeKeyDown(index, event)}
                      onPaste={handleCodePaste}
                      onFocus={(event) => event.currentTarget.select()}
                      disabled={loading}
                      aria-label={`Digit ${index + 1} of ${CODE_LENGTH}`}
                      className="h-14 w-10 rounded-2xl border border-white/10 bg-white/5 text-center text-2xl font-extrabold text-white outline-none transition focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/40 disabled:opacity-60 sm:w-11"
                    />
                  ))}
                </div>
              </fieldset>

              {error ? (
                <div className="mt-4">
                  <ErrorMessage message={error} />
                </div>
              ) : null}

              <div className="mt-6 flex gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={closeModal}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 gap-2"
                >
                  {loading ? (
                    <Loader2
                      aria-hidden="true"
                      className="h-4 w-4 animate-spin"
                    />
                  ) : null}
                  {loading ? "Pairing..." : "Pair screen"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {editingScreen && canEdit ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close modal"
            onClick={closeEditModal}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-screen-title"
            className="relative max-h-[calc(100vh-2rem)] w-full max-w-md overflow-y-auto rounded-3xl border border-white/10 bg-surface p-6 shadow-card"
          >
            <button
              type="button"
              onClick={closeEditModal}
              aria-label="Close"
              className="absolute right-4 top-4 rounded-full p-1.5 text-white/40 transition duration-200 hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60"
            >
              <X className="h-5 w-5" />
            </button>

            <form onSubmit={handleEditSubmit}>
              <h2
                id="edit-screen-title"
                className="text-lg font-semibold tracking-tight text-white"
              >
                Edit screen
              </h2>
              <p className="mt-2 text-sm leading-6 text-body">
                Update the name and location shown for this screen.
              </p>

              <div className="mt-5">
                <label
                  htmlFor="edit-screen-name"
                  className="mb-2 block text-sm font-medium text-white"
                >
                  Screen name
                </label>
                <input
                  id="edit-screen-name"
                  name="editScreenName"
                  type="text"
                  autoFocus
                  maxLength={80}
                  value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                  disabled={savingEdit}
                  placeholder="Lobby display"
                  className="h-12 w-full rounded-full border border-white/10 bg-white/5 px-5 text-sm text-white outline-none transition placeholder:text-muted focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/40 disabled:opacity-60"
                />
              </div>

              <div className="mt-4">
                <label
                  htmlFor="edit-screen-location"
                  className="mb-2 block text-sm font-medium text-white"
                >
                  Location{" "}
                  <span className="font-normal text-muted">(optional)</span>
                </label>
                <input
                  id="edit-screen-location"
                  name="editScreenLocation"
                  type="text"
                  maxLength={120}
                  value={editLocation}
                  onChange={(event) => setEditLocation(event.target.value)}
                  disabled={savingEdit}
                  placeholder="Front entrance"
                  className="h-12 w-full rounded-full border border-white/10 bg-white/5 px-5 text-sm text-white outline-none transition placeholder:text-muted focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/40 disabled:opacity-60"
                />
              </div>

              {editError ? (
                <div className="mt-4">
                  <ErrorMessage message={editError} />
                </div>
              ) : null}

              <div className="mt-6 flex gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={closeEditModal}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={savingEdit}
                  className="flex-1 gap-2"
                >
                  {savingEdit ? (
                    <Loader2
                      aria-hidden="true"
                      className="h-4 w-4 animate-spin"
                    />
                  ) : null}
                  {savingEdit ? "Saving..." : "Save changes"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
