"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, Scissors, X } from "lucide-react";
import Button from "@/components/ui/Button";
import { getMediaUrl } from "@/lib/media";
import type { Media } from "@/lib/types";
import { cn } from "@/lib/utils";

const CLIP_LENGTH = 10;

function formatClock(seconds: number) {
  const total = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(total / 60);
  const remaining = total % 60;

  return `${minutes}:${remaining.toString().padStart(2, "0")}`;
}

function roundToHalf(seconds: number) {
  return Math.round(seconds * 2) / 2;
}

function floorToHalf(seconds: number) {
  return Math.floor(seconds * 2) / 2;
}

export default function ClipDialog({
  media,
  initialStart = 0,
  onConfirm,
  onCancel,
}: {
  media: Media;
  initialStart?: number;
  onConfirm: (start: number) => void;
  onCancel: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const programmaticSeekRef = useRef(false);

  const [length, setLength] = useState<number>(
    media.duration && media.duration > 0 ? media.duration : 0,
  );
  const [start, setStart] = useState<number>(() =>
    Math.max(0, roundToHalf(initialStart)),
  );
  const [previewing, setPreviewing] = useState(false);

  const maxStart = useMemo(
    () => Math.max(0, floorToHalf(length - CLIP_LENGTH)),
    [length],
  );

  function clampStart(value: number) {
    return Math.min(maxStart, Math.max(0, roundToHalf(value)));
  }

  useEffect(() => {
    if (maxStart <= 0) {
      return;
    }

    setStart((current) =>
      Math.min(maxStart, Math.max(0, roundToHalf(current))),
    );
  }, [maxStart]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onCancel();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  function handleLoadedMetadata() {
    const video = videoRef.current;

    if (!video || !Number.isFinite(video.duration) || video.duration <= 0) {
      return;
    }

    setLength(video.duration);
  }

  function handleTimeUpdate() {
    const video = videoRef.current;

    if (!video || !previewing) {
      return;
    }

    if (video.currentTime >= start + CLIP_LENGTH) {
      video.pause();
      setPreviewing(false);
    }
  }

  function handleSeeked() {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    if (programmaticSeekRef.current) {
      programmaticSeekRef.current = false;
      return;
    }

    setPreviewing(false);
    setStart(clampStart(video.currentTime));
  }

  function handleSliderChange(value: number) {
    const video = videoRef.current;

    if (video && !video.paused) {
      video.pause();
    }

    setPreviewing(false);
    setStart(clampStart(value));
  }

  function handleUseCurrentPosition() {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    if (!video.paused) {
      video.pause();
    }

    setPreviewing(false);
    setStart(clampStart(video.currentTime));
  }

  async function handlePreview() {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    if (previewing) {
      video.pause();
      setPreviewing(false);
      return;
    }

    setPreviewing(true);

    if (Math.abs(video.currentTime - start) > 0.01) {
      programmaticSeekRef.current = true;
      video.currentTime = start;
    } else {
      programmaticSeekRef.current = false;
    }

    try {
      await video.play();
    } catch {
      setPreviewing(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close dialog"
        onClick={onCancel}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="clip-dialog-title"
        className="relative max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-3xl border border-white/10 bg-surface p-5 shadow-card sm:p-6"
      >
        <button
          type="button"
          onClick={onCancel}
          aria-label="Close"
          className="absolute right-4 top-4 z-10 rounded-full bg-black/40 p-1.5 text-white/50 transition duration-200 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60"
        >
          <X aria-hidden="true" className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-brand-sky">
            <Scissors aria-hidden="true" className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h2
              id="clip-dialog-title"
              className="truncate text-base font-semibold tracking-tight text-white"
            >
              Choose a 10 second clip
            </h2>
            <p className="truncate text-xs text-muted">{media.name}</p>
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-black/50">
          <video
            ref={videoRef}
            src={getMediaUrl(media.file_path)}
            controls
            muted
            playsInline
            preload="metadata"
            onLoadedMetadata={handleLoadedMetadata}
            onTimeUpdate={handleTimeUpdate}
            onSeeked={handleSeeked}
            className="aspect-video w-full bg-black"
          />
        </div>

        <div className="mt-3 flex items-center justify-between text-xs text-muted">
          <span>Total length</span>
          <span className="font-medium tabular-nums text-body">
            {length > 0 ? formatClock(length) : "Loading..."}
          </span>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between gap-3">
            <label
              htmlFor="clip-start"
              className="text-xs font-semibold uppercase tracking-[0.14em] text-muted"
            >
              Start point
            </label>
            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium tabular-nums text-white">
              {formatClock(start)}
            </span>
          </div>

          <input
            id="clip-start"
            type="range"
            min={0}
            max={Math.max(maxStart, 0.5)}
            step={0.5}
            value={Math.min(start, maxStart)}
            disabled={maxStart <= 0}
            onChange={(event) =>
              handleSliderChange(Number(event.target.value))
            }
            className="mt-3 w-full cursor-pointer accent-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
          />

          <div className="mt-1 flex justify-between text-[11px] tabular-nums text-muted">
            <span>0:00</span>
            <span>{formatClock(maxStart)}</span>
          </div>
        </div>

        <p className="mt-3 text-sm font-medium text-white">
          Clip: {formatClock(start)} to {formatClock(start + CLIP_LENGTH)} (10s)
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleUseCurrentPosition}
            className="gap-2"
          >
            Set start to current position
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void handlePreview()}
            disabled={maxStart <= 0}
            className={cn("gap-2", previewing && "border-sky-400/40 bg-sky-400/10")}
          >
            {previewing ? (
              <Pause aria-hidden="true" className="h-3.5 w-3.5" />
            ) : (
              <Play aria-hidden="true" className="h-3.5 w-3.5" />
            )}
            {previewing ? "Pause preview" : "Preview clip"}
          </Button>
        </div>

        <p className="mt-3 text-xs leading-5 text-muted">
          The video is not edited. The screen plays only this 10 second part.
        </p>

        <div className="mt-5 flex gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => onConfirm(clampStart(start))}
            disabled={length <= 0}
            className="flex-1"
          >
            Use this clip
          </Button>
        </div>
      </div>
    </div>
  );
}
