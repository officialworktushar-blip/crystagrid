import {
  DEFAULT_DISPLAY,
  type DisplayFit,
  type DisplayRotation,
  type DisplaySettings,
  type Screen,
} from "@/lib/types";

const FIT_VALUES: DisplayFit[] = ["fit", "fill", "stretch"];

const FIT_LABELS: Record<DisplayFit, string> = {
  fit: "Fit",
  fill: "Fill",
  stretch: "Stretch",
};

const OBJECT_FIT: Record<DisplayFit, "contain" | "cover" | "fill"> = {
  fit: "contain",
  fill: "cover",
  stretch: "fill",
};

export const DISPLAY_LIMITS = {
  width: { min: 10, max: 200 },
  height: { min: 10, max: 200 },
  left: { min: -100, max: 100 },
  top: { min: -100, max: 100 },
} as const;

export const DISPLAY_STEP = 5;

export interface DisplayColumns {
  display_fit: DisplayFit;
  display_rotation: DisplayRotation;
  display_flip_h: boolean;
  display_flip_v: boolean;
  display_width: number;
  display_height: number;
  display_left: number;
  display_top: number;
}

export interface DisplayLayout {
  box: { left: number; top: number; width: number; height: number };
  canvas: { width: number; height: number };
  transform: string;
  objectFit: "contain" | "cover" | "fill";
}

function toFiniteNumber(value: unknown, fallback: number): number {
  const parsed = typeof value === "number" ? value : Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
}

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const parsed = toFiniteNumber(value, fallback);

  return Math.min(max, Math.max(min, Math.round(parsed)));
}

function normalizeFit(value: unknown): DisplayFit {
  return FIT_VALUES.includes(value as DisplayFit)
    ? (value as DisplayFit)
    : DEFAULT_DISPLAY.fit;
}

function normalizeRotation(value: unknown): DisplayRotation {
  const parsed = toFiniteNumber(value, DEFAULT_DISPLAY.rotation);
  const wrapped = ((Math.round(parsed / 90) * 90) % 360 + 360) % 360;

  return wrapped as DisplayRotation;
}

export function clampDisplay(settings: DisplaySettings): DisplaySettings {
  return {
    fit: normalizeFit(settings.fit),
    rotation: normalizeRotation(settings.rotation),
    flipH: Boolean(settings.flipH),
    flipV: Boolean(settings.flipV),
    width: clampNumber(
      settings.width,
      DISPLAY_LIMITS.width.min,
      DISPLAY_LIMITS.width.max,
      DEFAULT_DISPLAY.width,
    ),
    height: clampNumber(
      settings.height,
      DISPLAY_LIMITS.height.min,
      DISPLAY_LIMITS.height.max,
      DEFAULT_DISPLAY.height,
    ),
    left: clampNumber(
      settings.left,
      DISPLAY_LIMITS.left.min,
      DISPLAY_LIMITS.left.max,
      DEFAULT_DISPLAY.left,
    ),
    top: clampNumber(
      settings.top,
      DISPLAY_LIMITS.top.min,
      DISPLAY_LIMITS.top.max,
      DEFAULT_DISPLAY.top,
    ),
  };
}

export function screenToDisplay(screen: Screen): DisplaySettings {
  return clampDisplay({
    fit: screen.display_fit ?? DEFAULT_DISPLAY.fit,
    rotation: screen.display_rotation ?? DEFAULT_DISPLAY.rotation,
    flipH: screen.display_flip_h ?? DEFAULT_DISPLAY.flipH,
    flipV: screen.display_flip_v ?? DEFAULT_DISPLAY.flipV,
    width: screen.display_width ?? DEFAULT_DISPLAY.width,
    height: screen.display_height ?? DEFAULT_DISPLAY.height,
    left: screen.display_left ?? DEFAULT_DISPLAY.left,
    top: screen.display_top ?? DEFAULT_DISPLAY.top,
  });
}

export function displayToColumns(settings: DisplaySettings): DisplayColumns {
  const clamped = clampDisplay(settings);

  return {
    display_fit: clamped.fit,
    display_rotation: clamped.rotation,
    display_flip_h: clamped.flipH,
    display_flip_v: clamped.flipV,
    display_width: clamped.width,
    display_height: clamped.height,
    display_left: clamped.left,
    display_top: clamped.top,
  };
}

export function isDefaultDisplay(settings: DisplaySettings): boolean {
  const clamped = clampDisplay(settings);

  return (
    clamped.fit === DEFAULT_DISPLAY.fit &&
    clamped.rotation === DEFAULT_DISPLAY.rotation &&
    clamped.flipH === DEFAULT_DISPLAY.flipH &&
    clamped.flipV === DEFAULT_DISPLAY.flipV &&
    clamped.width === DEFAULT_DISPLAY.width &&
    clamped.height === DEFAULT_DISPLAY.height &&
    clamped.left === DEFAULT_DISPLAY.left &&
    clamped.top === DEFAULT_DISPLAY.top
  );
}

export function displaySummary(settings: DisplaySettings): string {
  const clamped = clampDisplay(settings);
  const parts: string[] = [];

  if (clamped.rotation !== DEFAULT_DISPLAY.rotation) {
    parts.push(`Rotated ${clamped.rotation}°`);
  }

  if (clamped.fit !== DEFAULT_DISPLAY.fit) {
    parts.push(FIT_LABELS[clamped.fit]);
  }

  if (clamped.flipH) {
    parts.push("Flip H");
  }

  if (clamped.flipV) {
    parts.push("Flip V");
  }

  if (
    clamped.width !== DEFAULT_DISPLAY.width ||
    clamped.height !== DEFAULT_DISPLAY.height
  ) {
    parts.push(`${clamped.width}×${clamped.height}%`);
  }

  if (
    clamped.left !== DEFAULT_DISPLAY.left ||
    clamped.top !== DEFAULT_DISPLAY.top
  ) {
    parts.push(`Offset ${clamped.left}, ${clamped.top}%`);
  }

  return parts.join(" · ");
}

export function displayLayout(
  settings: DisplaySettings,
  frameWidthPx: number,
  frameHeightPx: number,
): DisplayLayout {
  const clamped = clampDisplay(settings);

  const frameWidth =
    Number.isFinite(frameWidthPx) && frameWidthPx > 0 ? frameWidthPx : 0;
  const frameHeight =
    Number.isFinite(frameHeightPx) && frameHeightPx > 0 ? frameHeightPx : 0;

  const boxW = (frameWidth * clamped.width) / 100;
  const boxH = (frameHeight * clamped.height) / 100;
  const boxLeft = (frameWidth * clamped.left) / 100;
  const boxTop = (frameHeight * clamped.top) / 100;

  const rotated = clamped.rotation === 90 || clamped.rotation === 270;
  const canvasW = rotated ? boxH : boxW;
  const canvasH = rotated ? boxW : boxH;

  const fx = clamped.flipH ? -1 : 1;
  const fy = clamped.flipV ? -1 : 1;

  return {
    box: { left: boxLeft, top: boxTop, width: boxW, height: boxH },
    canvas: { width: canvasW, height: canvasH },
    transform: `translate(-50%, -50%) scale(${fx}, ${fy}) rotate(${clamped.rotation}deg)`,
    objectFit: OBJECT_FIT[clamped.fit],
  };
}
