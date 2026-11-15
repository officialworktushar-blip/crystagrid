import {
  addDays,
  todayIST,
  type BookingItemRef,
  type BookingItemType,
  type BookingTier,
} from "@/lib/ads";

export const BOOKING_DRAFT_KEY = "crystagrid_booking_draft";

export interface BookingDraft {
  cityId: string;
  areaIds: string[];
  items: BookingItemRef[];
  startDate: string;
  days: number;
  tier: BookingTier;
  promo: string;
  bookingId?: string;
}

function isItemType(value: unknown): value is BookingItemType {
  return value === "package" || value === "property";
}

function normalizeItems(value: unknown): BookingItemRef[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const items: BookingItemRef[] = [];
  const seen = new Set<string>();

  for (const entry of value) {
    if (entry === null || typeof entry !== "object") {
      continue;
    }

    const row = entry as Record<string, unknown>;
    const type = row.type;
    const id = row.id;

    if (!isItemType(type) || typeof id !== "string" || !id.trim()) {
      continue;
    }

    const key = `${type}:${id}`;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    items.push({ type, id });
  }

  return items;
}

function normalizeAreas(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (entry): entry is string =>
      typeof entry === "string" && Boolean(entry.trim()),
  );
}

function normalizeTier(value: unknown): BookingTier {
  return value === "platinum" ? "platinum" : "gold";
}

function normalizeDraft(value: unknown): BookingDraft | null {
  if (value === null || typeof value !== "object") {
    return null;
  }

  const row = value as Record<string, unknown>;
  const cityId = typeof row.cityId === "string" ? row.cityId : "";

  if (!cityId) {
    return null;
  }

  const rawDays =
    typeof row.days === "number" && Number.isFinite(row.days)
      ? Math.round(row.days)
      : 7;
  const today = todayIST();
  const maxStart = addDays(today, 365);
  const rawStart =
    typeof row.startDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(row.startDate)
      ? row.startDate
      : today;
  const startDate =
    rawStart < today ? today : rawStart > maxStart ? maxStart : rawStart;
  const promo = typeof row.promo === "string" ? row.promo : "";
  const bookingId =
    typeof row.bookingId === "string" && row.bookingId.trim()
      ? row.bookingId
      : undefined;

  return {
    cityId,
    areaIds: normalizeAreas(row.areaIds),
    items: normalizeItems(row.items),
    startDate,
    days: Math.min(Math.max(rawDays, 1), 365),
    tier: normalizeTier(row.tier),
    promo,
    bookingId,
  };
}

export function emptyBookingDraft(): BookingDraft {
  return {
    cityId: "",
    areaIds: [],
    items: [],
    startDate: todayIST(),
    days: 7,
    tier: "gold",
    promo: "",
  };
}

export function loadBookingDraft(): BookingDraft | null {
  try {
    if (typeof window === "undefined") {
      return null;
    }

    const raw = window.localStorage.getItem(BOOKING_DRAFT_KEY);

    if (!raw) {
      return null;
    }

    return normalizeDraft(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

export function saveBookingDraft(draft: BookingDraft): void {
  try {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(BOOKING_DRAFT_KEY, JSON.stringify(draft));
  } catch {
    return;
  }
}

export function clearBookingDraft(): void {
  try {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.removeItem(BOOKING_DRAFT_KEY);
  } catch {
    return;
  }
}
