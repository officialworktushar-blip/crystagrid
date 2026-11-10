"use client";

import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type KeyboardEvent,
} from "react";
import {
  AlertCircle,
  CheckCircle2,
  Film,
  Image as ImageIcon,
  Images,
  Loader2,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { notifyScreens } from "@/lib/realtime";
import { createClient } from "@/lib/supabase/client";
import type { Media, MediaType } from "@/lib/types";
import { cn } from "@/lib/utils";

const MAX_FILE_SIZE = 500 * 1024 * 1024;

const dateFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeZone: "UTC",
});

const FILTERS: { label: string; value: "all" | MediaType }[] = [
  { label: "All", value: "all" },
  { label: "Images", value: "image" },
  { label: "Videos", value: "video" },
];

type UploadStatus =
  | "queued"
  | "preparing"
  | "uploading"
  | "saving"
  | "done"
  | "error";

type UploadItem = {
  id: string;
  file: File;
  status: UploadStatus;
  progress: number;
  error: string | null;
};

const STATUS_LABELS: Record<UploadStatus, string> = {
  queued: "Waiting",
  preparing: "Preparing",
  uploading: "Uploading",
  saving: "Saving",
  done: "Uploaded",
  error: "Failed",
};

function createId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function getMediaType(file: File): MediaType | null {
  if (file.type.startsWith("image/")) {
    return "image";
  }

  if (file.type.startsWith("video/")) {
    return "video";
  }

  return null;
}

function getFileExtension(file: File) {
  const dotIndex = file.name.lastIndexOf(".");
  const fromName =
    dotIndex > 0 && dotIndex < file.name.length - 1
      ? file.name.slice(dotIndex + 1)
      : "";
  const fallback = file.type.split("/")[1]?.split("+")[0] ?? "bin";
  const extension = (fromName || fallback)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  return extension || "bin";
}

function formatFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0.0 MB";
  }

  const megabytes = bytes / (1024 * 1024);

  return `${megabytes >= 10 ? megabytes.toFixed(0) : megabytes.toFixed(1)} MB`;
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return dateFormatter.format(date);
}

function formatDuration(seconds: number) {
  const totalSeconds = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;

  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

function readVideoDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    const objectUrl = URL.createObjectURL(file);
    let settled = false;
    let timeoutId: number | null = null;

    const finish = (duration: number | null) => {
      if (settled) {
        return;
      }

      settled = true;

      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }

      video.removeAttribute("src");
      video.load();
      URL.revokeObjectURL(objectUrl);
      resolve(duration);
    };

    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;

    video.onloadedmetadata = () => {
      const duration = video.duration;

      finish(
        Number.isFinite(duration) && duration > 0
          ? Math.round(duration)
          : null,
      );
    };

    video.onerror = () => finish(null);

    timeoutId = window.setTimeout(() => finish(null), 15000);
    video.src = objectUrl;
    video.load();
  });
}

function buildUploadItem(file: File): UploadItem {
  const mediaType = getMediaType(file);
  const error = !mediaType
    ? "Only image and video files are supported."
    : file.size > MAX_FILE_SIZE
      ? "File is larger than 500 MB."
      : null;

  return {
    id: createId(),
    file,
    status: error ? "error" : "queued",
    progress: error ? 100 : 0,
    error,
  };
}

export default function MediaClient({
  initialMedia,
  userId,
  loadError,
}: {
  initialMedia: Media[];
  userId: string;
  loadError: string | null;
}) {
  const supabase = useMemo(() => createClient(), []);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const [media, setMedia] = useState<Media[]>(initialMedia);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [filter, setFilter] = useState<"all" | MediaType>("all");
  const [isDragging, setIsDragging] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const publicUrl = useCallback(
    (path: string) =>
      supabase.storage.from("media").getPublicUrl(path).data.publicUrl,
    [supabase],
  );

  const filteredMedia = useMemo(
    () =>
      filter === "all"
        ? media
        : media.filter((item) => item.type === filter),
    [filter, media],
  );

  function updateUpload(id: string, patch: Partial<UploadItem>) {
    setUploads((current) =>
      current.map((item) =>
        item.id === id ? { ...item, ...patch } : item,
      ),
    );
  }

  function openFilePicker() {
    inputRef.current?.click();
  }

  async function uploadFile(item: UploadItem) {
    const mediaType = getMediaType(item.file);

    if (!mediaType) {
      updateUpload(item.id, {
        status: "error",
        progress: 100,
        error: "Only image and video files are supported.",
      });
      return false;
    }

    try {
      updateUpload(item.id, {
        status: "preparing",
        progress: 15,
        error: null,
      });

      let duration: number | null = null;

      if (mediaType === "video") {
        duration = await readVideoDuration(item.file);
      }

      updateUpload(item.id, {
        status: "uploading",
        progress: 45,
        error: null,
      });

      const path = `${userId}/${createId()}.${getFileExtension(item.file)}`;
      const { error: uploadError } = await supabase.storage
        .from("media")
        .upload(path, item.file, {
          cacheControl: "3600",
          contentType: item.file.type || undefined,
          upsert: false,
        });

      if (uploadError) {
        updateUpload(item.id, {
          status: "error",
          progress: 100,
          error: uploadError.message,
        });
        return false;
      }

      updateUpload(item.id, {
        status: "saving",
        progress: 85,
        error: null,
      });

      const { data: inserted, error: insertError } = await supabase
        .from("media")
        .insert({
          customer_id: userId,
          name: item.file.name,
          type: mediaType,
          file_path: path,
          file_size: item.file.size,
          duration,
        })
        .select(
          "id, customer_id, name, type, file_path, file_size, duration, created_at",
        )
        .single();

      if (insertError || !inserted) {
        await supabase.storage.from("media").remove([path]);
        updateUpload(item.id, {
          status: "error",
          progress: 100,
          error:
            insertError?.message ??
            "The file was uploaded but could not be saved.",
        });
        return false;
      }

      setMedia((current) => [inserted as Media, ...current]);
      updateUpload(item.id, {
        status: "done",
        progress: 100,
        error: null,
      });

      window.setTimeout(() => {
        setUploads((current) =>
          current.filter((upload) => upload.id !== item.id),
        );
      }, 1200);

      return true;
    } catch {
      updateUpload(item.id, {
        status: "error",
        progress: 100,
        error: "Upload failed. Please try again.",
      });
      return false;
    }
  }

  async function queueFiles(files: FileList | File[]) {
    const items = Array.from(files).map(buildUploadItem);

    if (items.length === 0) {
      return;
    }

    setError(null);
    setNotice(null);
    setUploads((current) => [...current, ...items]);

    let uploadedCount = 0;

    for (const item of items) {
      if (item.status === "error") {
        continue;
      }

      const uploaded = await uploadFile(item);

      if (uploaded) {
        uploadedCount += 1;
      }
    }

    if (uploadedCount > 0) {
      setFilter("all");
      setNotice(
        `${uploadedCount} ${
          uploadedCount === 1 ? "file" : "files"
        } uploaded.`,
      );
    }
  }

  async function handleDelete(item: Media) {
    const confirmed = window.confirm(
      `Delete "${item.name}"? This cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(item.id);
    setError(null);
    setNotice(null);

    try {
      const { error: rowError } = await supabase
        .from("media")
        .delete()
        .eq("id", item.id)
        .eq("customer_id", userId);

      if (rowError) {
        setError(rowError.message);
        return;
      }

      setMedia((current) =>
        current.filter((mediaItem) => mediaItem.id !== item.id),
      );

      const { data: screenRows } = await supabase
        .from("screens")
        .select("id")
        .eq("customer_id", userId);

      const screenIds = (screenRows ?? [])
        .map((row) => (typeof row.id === "string" ? row.id : null))
        .filter((id): id is string => id !== null);

      if (screenIds.length > 0) {
        await notifyScreens(screenIds, "refresh");
      }

      const { error: storageError } = await supabase.storage
        .from("media")
        .remove([item.file_path]);

      if (storageError) {
        setError(
          "The item was removed from your library, but the stored file could not be deleted.",
        );
        return;
      }

      setNotice(`Deleted "${item.name}".`);
    } catch {
      setError("Could not delete this item. Please try again.");
    } finally {
      setDeletingId(null);
    }
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;

    if (files) {
      void queueFiles(files);
    }

    event.target.value = "";
  }

  function handleDragEnter(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    dragDepth.current += 1;
    setIsDragging(true);
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    dragDepth.current = Math.max(0, dragDepth.current - 1);

    if (dragDepth.current === 0) {
      setIsDragging(false);
    }
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    dragDepth.current = 0;
    setIsDragging(false);

    if (event.dataTransfer.files.length > 0) {
      void queueFiles(event.dataTransfer.files);
    }
  }

  function handleDropZoneKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openFilePicker();
    }
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

      {error ? (
        <p
          role="alert"
          className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200"
        >
          {error}
        </p>
      ) : null}

      {notice ? (
        <p
          role="status"
          className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200"
        >
          {notice}
        </p>
      ) : null}

      <Card
        role="button"
        tabIndex={0}
        onClick={openFilePicker}
        onKeyDown={handleDropZoneKeyDown}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center border-dashed px-6 text-center outline-none transition duration-200 focus-visible:ring-2 focus-visible:ring-sky-400/60",
          media.length === 0 ? "py-16" : "py-9",
          isDragging
            ? "border-sky-400/60 bg-sky-400/[0.06] shadow-card"
            : "bg-white/[0.02] hover:border-sky-400/40",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          onChange={handleInputChange}
          onClick={(event) => event.stopPropagation()}
          className="hidden"
        />

        <span
          className={cn(
            "flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-brand-sky transition duration-200",
            media.length === 0 ? "h-14 w-14" : "h-11 w-11",
          )}
        >
          <UploadCloud
            aria-hidden="true"
            className={media.length === 0 ? "h-7 w-7" : "h-5 w-5"}
          />
        </span>

        <h2 className="mt-4 text-base font-semibold tracking-tight text-white">
          {media.length === 0
            ? "Upload your first files"
            : "Drag and drop more media"}
        </h2>
        <p className="mt-2 max-w-md text-sm leading-6 text-body">
          Drop images or videos here, or{" "}
          <span className="font-medium text-brand-sky">browse your files</span>.
          Up to 500 MB per file.
        </p>
      </Card>

      {uploads.length > 0 ? (
        <Card
          role="status"
          aria-live="polite"
          className="overflow-hidden p-0"
        >
          <div className="border-b border-white/5 px-5 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
              Uploads
            </p>
          </div>

          <ul className="divide-y divide-white/5">
            {uploads.map((item) => (
              <li key={item.id} className="px-5 py-4">
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      "mt-0.5 shrink-0",
                      item.status === "error"
                        ? "text-red-300"
                        : item.status === "done"
                          ? "text-emerald-300"
                          : "text-brand-sky",
                    )}
                  >
                    {item.status === "error" ? (
                      <AlertCircle aria-hidden="true" className="h-5 w-5" />
                    ) : item.status === "done" ? (
                      <CheckCircle2 aria-hidden="true" className="h-5 w-5" />
                    ) : (
                      <Loader2
                        aria-hidden="true"
                        className="h-5 w-5 animate-spin"
                      />
                    )}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-white">
                          {item.file.name}
                        </p>
                        <p className="mt-0.5 text-xs text-muted">
                          {formatFileSize(item.file.size)}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setUploads((current) =>
                            current.filter(
                              (upload) => upload.id !== item.id,
                            ),
                          )
                        }
                        aria-label={`Dismiss ${item.file.name}`}
                        className="shrink-0 rounded-full p-1 text-white/35 transition duration-200 hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-300",
                          item.status === "error"
                            ? "bg-red-400"
                            : item.status === "done"
                              ? "bg-emerald-400"
                              : "brand-gradient animate-pulse",
                        )}
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>

                    <p
                      className={cn(
                        "mt-1.5 text-xs",
                        item.status === "error"
                          ? "text-red-300"
                          : "text-muted",
                      )}
                    >
                      {item.error ?? STATUS_LABELS[item.status]}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {media.length === 0 ? (
        <Card className="flex flex-col items-center justify-center px-6 py-16 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-brand-sky">
            <Images aria-hidden="true" className="h-6 w-6" />
          </span>
          <h2 className="mt-4 text-base font-semibold text-white">
            No media yet
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-body">
            Upload images and videos using the zone above. Your library will
            appear here.
          </p>
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            {FILTERS.map((option) => {
              const value = option.value;
              const count =
                value === "all"
                  ? media.length
                  : media.filter((item) => item.type === value).length;
              const active = filter === value;

              return (
                <Button
                  key={value}
                  size="sm"
                  variant={active ? "primary" : "ghost"}
                  onClick={() => setFilter(value)}
                  aria-pressed={active}
                  className="gap-2"
                >
                  {option.label}
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums",
                      active
                        ? "bg-white/20 text-white"
                        : "bg-white/5 text-muted",
                    )}
                  >
                    {count}
                  </span>
                </Button>
              );
            })}
          </div>

          {filteredMedia.length === 0 ? (
            <Card className="flex flex-col items-center justify-center px-6 py-14 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-brand-sky">
                {filter === "image" ? (
                  <ImageIcon aria-hidden="true" className="h-6 w-6" />
                ) : (
                  <Film aria-hidden="true" className="h-6 w-6" />
                )}
              </span>
              <h2 className="mt-4 text-base font-semibold text-white">
                No {filter === "image" ? "images" : "videos"} yet
              </h2>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-body">
                Upload {filter === "image" ? "an image" : "a video"} or switch
                back to all media.
              </p>
            </Card>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
              {filteredMedia.map((item) => {
                const url = publicUrl(item.file_path);
                const isDeleting = deletingId === item.id;

                return (
                  <Card
                    key={item.id}
                    className="overflow-hidden p-0 transition duration-200 hover:-translate-y-0.5"
                  >
                    <div className="relative aspect-video overflow-hidden bg-black/40">
                      {item.type === "image" ? (
                        <img
                          src={url}
                          alt={item.name}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <video
                          src={url}
                          muted
                          preload="metadata"
                          playsInline
                          aria-label={item.name}
                          className="h-full w-full object-cover"
                        />
                      )}

                      <span
                        className={cn(
                          "absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] backdrop-blur",
                          item.type === "image"
                            ? "border-sky-400/25 bg-sky-400/15 text-sky-200"
                            : "border-violet-400/25 bg-violet-400/15 text-violet-200",
                        )}
                      >
                        {item.type === "image" ? (
                          <ImageIcon
                            aria-hidden="true"
                            className="h-3.5 w-3.5"
                          />
                        ) : (
                          <Film aria-hidden="true" className="h-3.5 w-3.5" />
                        )}
                        {item.type === "image" ? "Image" : "Video"}
                      </span>
                    </div>

                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p
                            className="truncate text-sm font-semibold text-white"
                            title={item.name}
                          >
                            {item.name}
                          </p>
                          <p className="mt-1 text-xs text-muted">
                            {formatFileSize(item.file_size)} ·{" "}
                            {formatDate(item.created_at)}
                            {item.type === "video" &&
                            item.duration !== null &&
                            Number.isFinite(item.duration)
                              ? ` · ${formatDuration(item.duration)}`
                              : null}
                          </p>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => void handleDelete(item)}
                          disabled={isDeleting}
                          aria-label={`Delete ${item.name}`}
                          title="Delete"
                          className="h-8 w-8 shrink-0 px-0 text-white/40 hover:bg-red-400/10 hover:text-red-300"
                        >
                          {isDeleting ? (
                            <Loader2
                              aria-hidden="true"
                              className="h-4 w-4 animate-spin"
                            />
                          ) : (
                            <Trash2
                              aria-hidden="true"
                              className="h-4 w-4"
                            />
                          )}
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
