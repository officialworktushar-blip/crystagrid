"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeftRight,
  ArrowUp,
  ArrowUpDown,
  Loader2,
  Minus,
  MonitorCog,
  Plus,
  RotateCcw,
  X,
} from "lucide-react";
import Button from "@/components/ui/Button";
import {
  DISPLAY_LIMITS,
  DISPLAY_STEP,
  clampDisplay,
  displayLayout,
  displayToColumns,
  screenToDisplay,
} from "@/lib/display";
import { notifyScreens } from "@/lib/realtime";
import { createClient } from "@/lib/supabase/client";
import {
  DEFAULT_DISPLAY,
  type DisplayFit,
  type DisplayRotation,
  type DisplaySettings,
  type Screen,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const FIT_OPTIONS: {
  value: DisplayFit;
  label: string;
  hint: string;
}[] = [
  { value: "fit", label: "Fit", hint: "Whole video visible" },
  { value: "fill", label: "Fill", hint: "Edges may crop" },
  { value: "stretch", label: "Stretch", hint: "May distort" },
];

const FIT_HINTS: Record<DisplayFit, string> = {
  fit: "Whole video visible, black bars possible.",
  fill: "Fills the screen, edges may be cropped.",
  stretch: "Fills the screen and may distort.",
};

const ROTATION_OPTIONS: { value: DisplayRotation; label: string }[] = [
  { value: 0, label: "Auto (0°)" },
  { value: 90, label: "90°" },
  { value: 180, label: "180°" },
  { value: 270, label: "270°" },
];

type NumberKey = "width" | "height" | "left" | "top";

const NUMBER_ROWS: { key: NumberKey; label: string }[] = [
  { key: "width", label: "Width" },
  { key: "height", label: "Height" },
  { key: "left", label: "Left" },
  { key: "top", label: "Top" },
];

const TEST_PATTERN_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900">
  <defs>
    <linearGradient id="pattern-gradient" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0ea5e9" />
      <stop offset="0.55" stop-color="#1d6fff" />
      <stop offset="1" stop-color="#071a44" />
    </linearGradient>
  </defs>
  <rect width="1600" height="900" fill="url(#pattern-gradient)" />
  <g stroke="rgba(255,255,255,0.22)" stroke-width="2">
    <path d="M160 0V900M320 0V900M480 0V900M640 0V900M800 0V900M960 0V900M1120 0V900M1280 0V900M1440 0V900" />
    <path d="M0 150H1600M0 300H1600M0 450H1600M0 600H1600M0 750H1600" />
  </g>
  <rect x="28" y="28" width="1544" height="844" fill="none" stroke="white" stroke-width="8" opacity="0.85" />
  <g fill="white" font-family="Arial, Helvetica, sans-serif" font-weight="800">
    <text x="72" y="128" font-size="72" letter-spacing="10">↑ TOP</text>
    <text x="70" y="640" font-size="72" letter-spacing="10" transform="rotate(-90 70 640)">LEFT</text>
    <text x="800" y="495" font-size="128" text-anchor="middle" letter-spacing="14">CRYSTAGRID</text>
    <text x="800" y="575" font-size="34" text-anchor="middle" opacity="0.8" letter-spacing="8">DISPLAY TEST PATTERN</text>
  </g>
</svg>
`;

const TEST_PATTERN_URL = `data:image/svg+xml,${encodeURIComponent(TEST_PATTERN_SVG)}`;

function TestPattern({
  objectFit,
}: {
  objectFit: "contain" | "cover" | "fill";
}) {
  return (
    <div className="relative h-full w-full overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(135deg,#0ea5e9_0%,#1d6fff_55%,#071a44_100%)]" />
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.35) 1px, transparent 1px)",
          backgroundSize: "10% 10%",
        }}
      />
      <div className="absolute inset-[5%] rounded-sm border border-white/80" />
      <div className="absolute left-1/2 top-[4%] flex -translate-x-1/2 items-center gap-1 text-white/95">
        <ArrowUp
          aria-hidden="true"
          strokeWidth={3}
          className="h-[clamp(12px,2.4vw,28px)] w-[clamp(12px,2.4vw,28px)]"
        />
        <span className="text-[clamp(12px,2.2vw,26px)] font-extrabold tracking-[0.3em]">
          TOP
        </span>
      </div>
      <div className="absolute left-[4%] top-1/2 -translate-y-1/2">
        <span
          className="text-[clamp(10px,1.6vw,20px)] font-extrabold tracking-[0.24em] text-white/95"
          style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
        >
          LEFT
        </span>
      </div>
      <div className="absolute left-1/2 top-1/2 h-[58%] w-[76%] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-md border-2 border-white/90 bg-black/30">
        <img
          src={TEST_PATTERN_URL}
          alt="Display test pattern"
          draggable={false}
          className="h-full w-full select-none"
          style={{ objectFit }}
        />
      </div>
    </div>
  );
}

export default function DisplaySettingsDialog({
  screen,
  onClose,
  onSaved,
  siblingsCount,
}: {
  screen: Screen;
  onClose: () => void;
  onSaved: () => void;
  siblingsCount: number;
}) {
  const [settings, setSettings] = useState<DisplaySettings>(() =>
    screenToDisplay(screen),
  );
  const [previewOrientation, setPreviewOrientation] = useState<
    "landscape" | "portrait"
  >("landscape");
  const [frameSize, setFrameSize] = useState({ width: 0, height: 0 });
  const [applyAll, setApplyAll] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [frameNode, setFrameNode] = useState<HTMLDivElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  const layout = useMemo(
    () => displayLayout(settings, frameSize.width, frameSize.height),
    [settings, frameSize],
  );

  useEffect(() => {
    if (!frameNode) {
      return;
    }

    const node = frameNode;

    function updateSize() {
      const rect = node.getBoundingClientRect();
      setFrameSize({ width: rect.width, height: rect.height });
    }

    updateSize();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateSize);

      return () => window.removeEventListener("resize", updateSize);
    }

    const observer = new ResizeObserver(updateSize);
    observer.observe(node);

    return () => observer.disconnect();
  }, [frameNode]);

  useEffect(() => {
    const node = dialogRef.current;
    const previousFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const originalOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    function getFocusable() {
      if (!node) {
        return [] as HTMLElement[];
      }

      return Array.from(
        node.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => element.getClientRects().length > 0);
    }

    getFocusable()[0]?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusable = getFocusable();

      if (focusable.length === 0) {
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey) {
        if (
          document.activeElement === first ||
          !node?.contains(document.activeElement)
        ) {
          event.preventDefault();
          last.focus();
        }

        return;
      }

      if (
        document.activeElement === last ||
        !node?.contains(document.activeElement)
      ) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
      previousFocus?.focus();
    };
  }, [onClose]);

  function updateSettings(patch: Partial<DisplaySettings>) {
    setSettings((current) => ({ ...current, ...patch }));
    setSaved(false);
    setError(null);
  }

  function setNumber(key: NumberKey, value: number) {
    if (key === "width") {
      updateSettings({ width: value });
    } else if (key === "height") {
      updateSettings({ height: value });
    } else if (key === "left") {
      updateSettings({ left: value });
    } else {
      updateSettings({ top: value });
    }
  }

  function updateNumber(key: NumberKey, rawValue: number) {
    if (!Number.isFinite(rawValue)) {
      return;
    }

    const limits = DISPLAY_LIMITS[key];
    const next = Math.min(limits.max, Math.max(limits.min, Math.round(rawValue)));

    setNumber(key, next);
  }

  function adjustNumber(key: NumberKey, direction: -1 | 1) {
    const limits = DISPLAY_LIMITS[key];
    const next = Math.min(
      limits.max,
      Math.max(limits.min, settings[key] + direction * DISPLAY_STEP),
    );

    setNumber(key, next);
  }

  function handleReset() {
    const confirmed = window.confirm(
      "Reset all display settings for this screen?",
    );

    if (!confirmed) {
      return;
    }

    setSettings({ ...DEFAULT_DISPLAY });
    setSaved(false);
    setError(null);
  }

  async function handleSave() {
    const clamped = clampDisplay(settings);

    setSettings(clamped);
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      const supabase = createClient();
      const update = supabase
        .from("screens")
        .update(displayToColumns(clamped));

      const filtered =
        applyAll && siblingsCount > 1 && screen.customer_id
          ? update.eq("customer_id", screen.customer_id)
          : update.eq("id", screen.id);

      const { data, error: updateError } = await filtered.select("id");

      if (updateError) {
        setError(updateError.message);
        return;
      }

      const affected = (data ?? []) as { id: string }[];
      const screenIds =
        affected.length > 0 ? affected.map((row) => row.id) : [screen.id];

      try {
        void notifyScreens(screenIds, "refresh").catch(() => undefined);
      } catch {
        /* realtime notifications are best effort */
      }

      setSaved(true);
      onSaved();
    } catch {
      setError("Could not save the display settings. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-stretch justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close dialog"
        onClick={onClose}
        className="absolute inset-0"
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="display-settings-title"
        className="relative flex h-full w-full flex-col overflow-y-auto border border-white/10 bg-surface shadow-card sm:h-auto sm:max-h-[calc(100vh-2rem)] sm:max-w-2xl sm:rounded-3xl"
      >
        <div className="sticky top-0 z-10 flex items-start gap-3 border-b border-white/5 bg-surface/95 px-5 py-4 backdrop-blur sm:px-6">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-brand-sky">
            <MonitorCog aria-hidden="true" className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2
              id="display-settings-title"
              className="text-lg font-semibold tracking-tight text-white"
            >
              Screen display settings
            </h2>
            <p className="truncate text-xs text-muted">{screen.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1.5 text-white/40 transition duration-200 hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60"
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 px-5 py-5 sm:px-6">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                Live preview
              </span>
              <div className="inline-flex rounded-full border border-white/10 bg-white/5 p-1">
                {(
                  [
                    { value: "landscape", label: "Landscape 16:9" },
                    { value: "portrait", label: "Portrait 9:16" },
                  ] as const
                ).map((option) => {
                  const active = previewOrientation === option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setPreviewOrientation(option.value)}
                      className={cn(
                        "rounded-full px-3 py-1 text-[11px] font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60",
                        active
                          ? "bg-brand-blue text-white"
                          : "text-muted hover:text-white",
                      )}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-3 flex justify-center">
              <div
                ref={setFrameNode}
                className="relative overflow-hidden rounded-2xl border border-white/20 bg-black"
                style={
                  previewOrientation === "landscape"
                    ? { width: "100%", aspectRatio: "16 / 9" }
                    : {
                        height: "clamp(240px, 44vh, 420px)",
                        aspectRatio: "9 / 16",
                      }
                }
              >
                <div
                  className="absolute overflow-hidden"
                  style={{
                    left: layout.box.left,
                    top: layout.box.top,
                    width: layout.box.width,
                    height: layout.box.height,
                    boxShadow: "inset 0 0 0 1px rgba(56,189,248,0.35)",
                  }}
                >
                  <div
                    className="absolute left-1/2 top-1/2"
                    style={{
                      width: layout.canvas.width,
                      height: layout.canvas.height,
                      transform: layout.transform,
                      transformOrigin: "center center",
                    }}
                  >
                    <TestPattern objectFit={layout.objectFit} />
                  </div>
                </div>
              </div>
            </div>

            <p className="mt-2 text-xs leading-5 text-muted">
              The frame shows where your content lands on the screen. Black
              areas are unused space.
            </p>
          </div>

          <div className="border-t border-white/5 pt-5">
            <p className="text-sm font-semibold text-white">Fit mode</p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {FIT_OPTIONS.map((option) => {
                const active = settings.fit === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => updateSettings({ fit: option.value })}
                    className={cn(
                      "rounded-2xl border px-2 py-2 text-left transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60",
                      active
                        ? "border-sky-400/50 bg-sky-400/10 text-white"
                        : "border-white/10 bg-white/[0.03] text-body hover:border-white/20 hover:bg-white/5",
                    )}
                  >
                    <span className="block text-xs font-semibold">
                      {option.label}
                    </span>
                    <span
                      className={cn(
                        "mt-0.5 block text-[10px] leading-4",
                        active ? "text-sky-100" : "text-muted",
                      )}
                    >
                      {option.hint}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs leading-5 text-muted">
              {FIT_HINTS[settings.fit]}
            </p>
          </div>

          <div>
            <p className="text-sm font-semibold text-white">Orientation</p>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {ROTATION_OPTIONS.map((option) => {
                const active = settings.rotation === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => updateSettings({ rotation: option.value })}
                    className={cn(
                      "h-9 rounded-full border px-2 text-xs font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60",
                      active
                        ? "border-sky-400/50 bg-sky-400/10 text-white"
                        : "border-white/10 bg-white/[0.03] text-body hover:border-white/20 hover:bg-white/5 hover:text-white",
                    )}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs leading-5 text-muted">
              Rotates the content clockwise. Use 90° or 270° for a screen
              mounted upright.
            </p>
          </div>

          <div>
            <p className="text-sm font-semibold text-white">Flip</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                aria-pressed={settings.flipH}
                onClick={() => updateSettings({ flipH: !settings.flipH })}
                className={cn(
                  "inline-flex h-9 items-center gap-2 rounded-full border px-4 text-xs font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60",
                  settings.flipH
                    ? "border-sky-400/50 bg-sky-400/10 text-white"
                    : "border-white/10 bg-white/5 text-body hover:border-white/20 hover:text-white",
                )}
              >
                <ArrowLeftRight aria-hidden="true" className="h-3.5 w-3.5" />
                Flip horizontal
              </button>
              <button
                type="button"
                aria-pressed={settings.flipV}
                onClick={() => updateSettings({ flipV: !settings.flipV })}
                className={cn(
                  "inline-flex h-9 items-center gap-2 rounded-full border px-4 text-xs font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60",
                  settings.flipV
                    ? "border-sky-400/50 bg-sky-400/10 text-white"
                    : "border-white/10 bg-white/5 text-body hover:border-white/20 hover:text-white",
                )}
              >
                <ArrowUpDown aria-hidden="true" className="h-3.5 w-3.5" />
                Flip vertical
              </button>
            </div>
          </div>

          <div className="space-y-3 border-t border-white/5 pt-5">
            {NUMBER_ROWS.map((row) => {
              const limits = DISPLAY_LIMITS[row.key];
              const value = settings[row.key];

              return (
                <div
                  key={row.key}
                  className="flex items-center justify-between gap-3"
                >
                  <label
                    htmlFor={`display-${row.key}`}
                    className="text-sm text-white"
                  >
                    {row.label}
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label={`Decrease ${row.label}`}
                      onClick={() => adjustNumber(row.key, -1)}
                      disabled={value <= limits.min}
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition duration-200 hover:border-white/20 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Minus aria-hidden="true" className="h-3.5 w-3.5" />
                    </button>
                    <div className="relative">
                      <input
                        id={`display-${row.key}`}
                        type="number"
                        inputMode="numeric"
                        min={limits.min}
                        max={limits.max}
                        step={DISPLAY_STEP}
                        value={value}
                        onChange={(event) =>
                          updateNumber(row.key, Number(event.target.value))
                        }
                        className="h-10 w-24 rounded-full border border-white/10 bg-white/5 pl-3 pr-8 text-center text-sm tabular-nums text-white outline-none transition focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/40 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">
                        %
                      </span>
                    </div>
                    <button
                      type="button"
                      aria-label={`Increase ${row.label}`}
                      onClick={() => adjustNumber(row.key, 1)}
                      disabled={value >= limits.max}
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition duration-200 hover:border-white/20 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Plus aria-hidden="true" className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col gap-2 border-t border-white/5 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-5 text-muted">
              Start over with the full screen at its original orientation.
            </p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleReset}
              className="shrink-0 gap-2"
            >
              <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" />
              Reset Screen
            </Button>
          </div>

          {siblingsCount > 1 ? (
            <label className="flex cursor-pointer items-start gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-body transition duration-200 hover:border-white/20">
              <input
                type="checkbox"
                checked={applyAll}
                onChange={(event) => setApplyAll(event.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-white/20 bg-white/5 accent-sky-400"
              />
              <span>
                Apply to all screens of this customer
                <span className="mt-0.5 block text-xs text-muted">
                  {siblingsCount} screens
                </span>
              </span>
            </label>
          ) : null}

          {error ? (
            <p
              role="alert"
              className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200"
            >
              {error}
            </p>
          ) : null}

          {saved ? (
            <p
              role="status"
              className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200"
            >
              Saved. The screen applies it within about 10 seconds.
            </p>
          ) : null}

          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="flex-1"
            >
              Close
            </Button>
            <Button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              className="flex-1 gap-2"
            >
              {saving ? (
                <Loader2
                  aria-hidden="true"
                  className="h-4 w-4 animate-spin"
                />
              ) : null}
              {saving ? "Saving..." : "Save display"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
