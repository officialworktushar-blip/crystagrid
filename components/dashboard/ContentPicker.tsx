"use client";

import { useEffect, useMemo, useState } from "react";
import { Film, Images, Loader2, Plus, Search, X } from "lucide-react";
import { getMediaUrl } from "@/lib/media";
import { createClient } from "@/lib/supabase/client";
import type { Media, MediaType } from "@/lib/types";
import { cn } from "@/lib/utils";

const MEDIA_FILTERS: { label: string; value: "all" | MediaType }[] = [
  { label: "All", value: "all" },
  { label: "Images", value: "image" },
  { label: "Videos", value: "video" },
];

function formatLength(seconds: number | null | undefined) {
  if (!seconds || seconds <= 0) {
    return null;
  }

  return `${Math.max(1, Math.round(seconds))}s`;
}

async function readVideoLength(url: string): Promise<number | null> {
  if (typeof document === "undefined") {
    return null;
  }

  return new Promise((resolve) => {
    const video = document.createElement("video");
    let settled = false;
    let timeout: number | null = null;

    function finish(value: number | null) {
      if (settled) {
        return;
      }

      settled = true;

      if (timeout !== null) {
        window.clearTimeout(timeout);
      }

      video.removeAttribute("src");
      video.load();
      resolve(value);
    }

    timeout = window.setTimeout(() => finish(null), 10000);

    video.preload = "metadata";
    video.muted = true;

    video.addEventListener(
      "loadedmetadata",
      () => {
        const duration = Number.isFinite(video.duration) ? video.duration : null;
        finish(duration && duration > 0 ? duration : null);
      },
      { once: true },
    );

    video.addEventListener(
      "error",
      () => {
        finish(null);
      },
      { once: true },
    );

    video.src = url;
  });
}

function MediaThumbnail({ item }: { item: Media }) {
  const url = getMediaUrl(item.file_path);

  if (item.type === "video") {
    return (
      <video
        src={`${url}#t=0.1`}
        muted
        playsInline
        preload="metadata"
        aria-hidden="true"
        className="h-full w-full object-cover"
      />
    );
  }

  return (
    <img
      src={url}
      alt=""
      aria-hidden="true"
      className="h-full w-full object-cover"
    />
  );
}

export default function ContentPicker({
  media,
  canEdit,
  title = "Add content",
  onClose,
  onPick,
  onDurationResolved,
}: {
  media: Media[];
  canEdit: boolean;
  title?: string;
  onClose: () => void;
  onPick: (media: Media, resolvedLength: number | null) => void;
  onDurationResolved?: (mediaId: string, duration: number) => void;
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | MediaType>("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filteredMedia = useMemo(() => {
    const query = search.trim().toLowerCase();

    return media.filter((item) => {
      if (filter !== "all" && item.type !== filter) {
        return false;
      }

      return query === "" || item.name.toLowerCase().includes(query);
    });
  }, [media, filter, search]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !busyId) {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [busyId, onClose]);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  async function handleChoose(item: Media) {
    if (busyId) {
      return;
    }

    setError(null);

    if (item.type === "image") {
      onPick(item, 10);
      return;
    }

    let length =
      item.duration && item.duration > 0 ? Number(item.duration) : null;

    if (length === null) {
      setBusyId(item.id);

      try {
        length = await readVideoLength(getMediaUrl(item.file_path));
      } finally {
        setBusyId(null);
      }

      if (length === null) {
        setError("Could not read this video's length. Please try again.");
        return;
      }

      const rounded = Math.max(1, Math.round(length));
      onDurationResolved?.(item.id, rounded);

      if (canEdit) {
        const supabase = createClient();
        await supabase
          .from("media")
          .update({ duration: rounded })
          .eq("id", item.id);
      }
    }

    onPick({ ...item, duration: length }, length);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close dialog"
        onClick={() => {
          if (!busyId) {
            onClose();
          }
        }}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="content-picker-title"
        className="relative flex max-h-[calc(100vh-2rem)] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-surface shadow-card"
      >
        <div className="flex items-start justify-between gap-3 border-b border-white/5 px-5 py-4">
          <div className="min-w-0">
            <h2
              id="content-picker-title"
              className="text-base font-semibold tracking-tight text-white"
            >
              {title}
            </h2>
            <p className="mt-1 text-xs text-muted">
              Images play for 10 seconds. Videos play in full up to 10 seconds.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={Boolean(busyId)}
            aria-label="Close"
            className="rounded-full p-1.5 text-white/40 transition duration-200 hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 disabled:opacity-50"
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>

        <div className="border-b border-white/5 px-5 py-3">
          <div className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
            />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search media"
              aria-label="Search media"
              className="h-10 w-full rounded-full border border-white/10 bg-white/5 pl-9 pr-3 text-sm text-white outline-none transition placeholder:text-muted focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/40"
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

        {error ? (
          <p
            role="alert"
            className="mx-5 mt-4 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200"
          >
            {error}
          </p>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
          {media.length === 0 ? (
            <div className="px-2 py-14 text-center">
              <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-brand-sky">
                <Images aria-hidden="true" className="h-5 w-5" />
              </span>
              <p className="mt-3 text-sm font-medium text-white">
                No media in this library
              </p>
              <p className="mt-1 text-xs leading-5 text-body">
                Upload images and videos before adding content to a playlist.
              </p>
            </div>
          ) : filteredMedia.length === 0 ? (
            <p className="px-2 py-14 text-center text-sm text-body">
              No media matches your search.
            </p>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {filteredMedia.map((item) => {
                const busy = busyId === item.id;
                const length = formatLength(item.duration);

                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => void handleChoose(item)}
                      disabled={Boolean(busyId)}
                      aria-label={`Choose ${item.name}`}
                      className="group flex w-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] text-left transition duration-200 hover:border-sky-400/40 hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <span className="relative block aspect-video w-full overflow-hidden bg-black/40">
                        <MediaThumbnail item={item} />

                        <span className="absolute left-2 top-2 inline-flex items-center rounded-full border border-white/10 bg-black/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/80 backdrop-blur">
                          {item.type === "video" ? "Video" : "Image"}
                        </span>

                        {item.type === "video" ? (
                          <span className="absolute bottom-2 right-2 inline-flex items-center rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-white backdrop-blur">
                            {length ?? "Video"}
                          </span>
                        ) : null}

                        <span className="absolute bottom-2 left-2 flex h-7 w-7 items-center justify-center rounded-full brand-gradient text-white shadow-brand transition duration-200 group-hover:scale-105">
                          {busy ? (
                            <Loader2
                              aria-hidden="true"
                              className="h-3.5 w-3.5 animate-spin"
                            />
                          ) : (
                            <Plus aria-hidden="true" className="h-3.5 w-3.5" />
                          )}
                        </span>
                      </span>

                      <span className="flex items-center gap-1.5 px-2.5 py-2">
                        {item.type === "video" ? (
                          <Film
                            aria-hidden="true"
                            className="h-3 w-3 shrink-0 text-brand-sky"
                          />
                        ) : (
                          <Images
                            aria-hidden="true"
                            className="h-3 w-3 shrink-0 text-brand-sky"
                          />
                        )}
                        <span className="truncate text-xs font-medium text-white">
                          {item.name}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
