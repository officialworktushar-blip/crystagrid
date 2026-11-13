"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import {
  Clock,
  ListVideo,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/client";
import type { Playlist } from "@/lib/types";
import { cn } from "@/lib/utils";

export type PlaylistSummary = Playlist & {
  itemCount: number;
  totalDuration: number;
};

const createdFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeZone: "UTC",
});

function formatDuration(seconds: number) {
  const totalSeconds = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;

  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

function formatCreated(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return createdFormatter.format(date);
}

type ModalState =
  | { mode: "create" }
  | { mode: "rename"; playlist: PlaylistSummary };

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

export default function PlaylistsClient({
  playlists,
  userId,
  loadError,
}: {
  playlists: PlaylistSummary[];
  userId: string;
  loadError: string | null;
}) {
  const router = useRouter();
  const [items, setItems] = useState<PlaylistSummary[]>(playlists);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!modal) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !saving) {
        setModal(null);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [modal, saving]);

  useEffect(() => {
    if (!modal) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [modal]);

  function openCreate() {
    setName("");
    setFormError(null);
    setModal({ mode: "create" });
  }

  function openRename(playlist: PlaylistSummary) {
    setName(playlist.name);
    setFormError(null);
    setModal({ mode: "rename", playlist });
  }

  function closeModal() {
    if (saving) {
      return;
    }

    setModal(null);
    setName("");
    setFormError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!modal) {
      return;
    }

    const trimmed = name.trim();

    if (!trimmed) {
      setFormError("Enter a name for this playlist.");
      return;
    }

    setSaving(true);
    setFormError(null);

    const supabase = createClient();
    const renameTarget = modal.mode === "rename" ? modal.playlist : null;

    try {
      if (renameTarget) {
        const { error } = await supabase
          .from("playlists")
          .update({ name: trimmed, updated_at: new Date().toISOString() })
          .eq("id", renameTarget.id)
          .eq("customer_id", userId);

        if (error) {
          setFormError(error.message);
          return;
        }

        setItems((current) =>
          current.map((playlist) =>
            playlist.id === renameTarget.id
              ? { ...playlist, name: trimmed }
              : playlist,
          ),
        );
        setModal(null);
        setName("");
        router.refresh();
        return;
      }

      const { data, error } = await supabase
        .from("playlists")
        .insert({ customer_id: userId, name: trimmed })
        .select("id")
        .single();

      if (error || !data) {
        setFormError(error?.message ?? "Could not create this playlist.");
        return;
      }

      setModal(null);
      setName("");
      router.push(`/dashboard/playlists/${data.id}`);
    } catch {
      setFormError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(playlist: PlaylistSummary) {
    const confirmed = window.confirm(
      `Delete "${playlist.name}"? This cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(playlist.id);
    setActionError(null);

    const supabase = createClient();
    const { error } = await supabase
      .from("playlists")
      .delete()
      .eq("id", playlist.id)
      .eq("customer_id", userId);

    if (error) {
      setActionError(error.message);
      setDeletingId(null);
      return;
    }

    setItems((current) =>
      current.filter((entry) => entry.id !== playlist.id),
    );
    setDeletingId(null);
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-body">
          {items.length} {items.length === 1 ? "playlist" : "playlists"}
        </p>

        <Button onClick={openCreate} className="shrink-0 px-5">
          <Plus aria-hidden="true" className="h-4 w-4" />
          New Playlist
        </Button>
      </div>

      {loadError ? <ErrorMessage message={loadError} /> : null}
      {actionError ? <ErrorMessage message={actionError} /> : null}

      {items.length === 0 ? (
        <Card className="p-0">
          <div className="px-6 py-16 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-brand-sky">
              <ListVideo aria-hidden="true" className="h-6 w-6" />
            </span>
            <h2 className="mt-4 text-base font-semibold text-white">
              No playlists yet
            </h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-body">
              Create a playlist, fill it with images and videos, then assign it
              to a screen.
            </p>
            <Button onClick={openCreate} className="mt-6">
              <Plus aria-hidden="true" className="h-4 w-4" />
              New Playlist
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((playlist) => (
            <Card
              key={playlist.id}
              className="flex flex-col overflow-hidden p-0 hover:border-sky-500/40 hover:shadow-card"
            >
              <Link
                href={`/dashboard/playlists/${playlist.id}`}
                className="group flex flex-1 flex-col gap-4 p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-brand-sky">
                    <ListVideo aria-hidden="true" className="h-5 w-5" />
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-body">
                    {playlist.itemCount}{" "}
                    {playlist.itemCount === 1 ? "item" : "items"}
                  </span>
                </div>

                <div className="min-w-0">
                  <h2 className="truncate text-base font-semibold tracking-tight text-white transition duration-200 group-hover:text-sky-200">
                    {playlist.name}
                  </h2>
                  <p className="mt-1 text-xs text-muted">
                    Created {formatCreated(playlist.created_at)}
                  </p>
                </div>

                <div className="mt-auto flex items-center gap-2 text-sm text-body">
                  <Clock aria-hidden="true" className="h-4 w-4 text-muted" />
                  <span className="tabular-nums">
                    {formatDuration(playlist.totalDuration)}
                  </span>
                </div>
              </Link>

              <div className="flex items-center gap-2 border-t border-white/5 px-5 py-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openRename(playlist)}
                  className="gap-2"
                >
                  <Pencil aria-hidden="true" className="h-3.5 w-3.5" />
                  Rename
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void handleDelete(playlist)}
                  disabled={deletingId === playlist.id}
                  className="ml-auto gap-2 text-red-300 hover:bg-red-400/10 hover:text-red-200"
                >
                  {deletingId === playlist.id ? (
                    <Loader2
                      aria-hidden="true"
                      className="h-3.5 w-3.5 animate-spin"
                    />
                  ) : (
                    <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                  )}
                  {deletingId === playlist.id ? "Deleting..." : "Delete"}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {modal ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close dialog"
            onClick={closeModal}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="playlist-modal-title"
            className="relative w-full max-w-md rounded-3xl border border-white/10 bg-surface p-6 shadow-card"
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
                id="playlist-modal-title"
                className="text-lg font-semibold tracking-tight text-white"
              >
                {modal.mode === "rename" ? "Rename playlist" : "New playlist"}
              </h2>
              <p className="mt-2 text-sm leading-6 text-body">
                {modal.mode === "rename"
                  ? "Give this playlist a new name."
                  : "Name your playlist. You can add media and screens next."}
              </p>

              <div className="mt-5">
                <label
                  htmlFor="playlist-name"
                  className="mb-2 block text-sm font-medium text-white"
                >
                  Playlist name
                </label>
                <input
                  id="playlist-name"
                  name="playlistName"
                  type="text"
                  autoFocus
                  required
                  maxLength={80}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  disabled={saving}
                  placeholder="Lobby loop"
                  className="h-12 w-full rounded-full border border-white/10 bg-white/5 px-5 text-sm text-white outline-none transition placeholder:text-muted focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/40 disabled:opacity-60"
                />
              </div>

              {formError ? (
                <div className="mt-4">
                  <ErrorMessage message={formError} />
                </div>
              ) : null}

              <div className="mt-6 flex gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={closeModal}
                  disabled={saving}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className={cn("flex-1 gap-2")}
                >
                  {saving ? (
                    <Loader2
                      aria-hidden="true"
                      className="h-4 w-4 animate-spin"
                    />
                  ) : null}
                  {saving
                    ? "Saving..."
                    : modal.mode === "rename"
                      ? "Rename"
                      : "Create playlist"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
