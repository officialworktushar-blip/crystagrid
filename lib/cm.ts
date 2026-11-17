import { formatBookingDate, todayIST } from "@/lib/ads";
import {
  normalizeAdBooking,
  type AdBooking,
  type AdBookingScreen,
} from "@/lib/ad-bookings";
import type { AdminCustomerStats } from "@/lib/admin";
import type { MediaType } from "@/lib/types";

export type CmBooking = AdBooking & {
  customerId: string;
};

export type CmPlaylistSlot = {
  id: string;
  mediaId: string;
  position: number;
  duration: number;
  clipStart: number;
  name: string;
  type: MediaType;
  filePath: string;
};

export type CmPlaylistPreview = {
  id: string;
  name: string;
  slotCount: number;
  loopSeconds: number;
  slots: CmPlaylistSlot[];
};

export type PlaylistBookingUsage = {
  id: string;
  startDate: string | null;
  endDate: string | null;
  status: string;
};

export type CmCustomerWithCounts = AdminCustomerStats & {
  activeCampaigns: number;
  needsContent: number;
};

export type CmBookingScreenGroup = {
  key: string;
  propertyId: string | null;
  propertyName: string;
  screens: AdBookingScreen[];
};

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as UnknownRecord;
  }

  return null;
}

function pickString(row: UnknownRecord | null, keys: string[]): string | null {
  if (!row) {
    return null;
  }

  for (const key of keys) {
    const value = row[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function dateValue(value: string | null | undefined): number | null {
  if (!value) {
    return null;
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.slice(0, 10));

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date.getTime();
}

export function normalizeCmBookings(value: unknown): CmBooking[] {
  const rows = Array.isArray(value) ? value : [];
  const bookings: CmBooking[] = [];

  for (const row of rows) {
    const booking = normalizeAdBooking(row);
    const record = asRecord(row);

    if (!booking || !record) {
      continue;
    }

    const profile = asRecord(record.profiles) ?? asRecord(record.profile);
    const customerId =
      pickString(record, [
        "customer_id",
        "customer",
        "profile_id",
        "user_id",
        "owner_id",
      ]) ?? pickString(profile, ["id"]);

    if (!customerId) {
      continue;
    }

    bookings.push({ ...booking, customerId });
  }

  return bookings;
}

export function isCmBookingLive(
  booking: CmBooking,
  today: string = todayIST(),
): boolean {
  const status = booking.status.toLowerCase();

  if (status !== "confirmed" && status !== "running") {
    return false;
  }

  const todayValue = dateValue(today);
  const start = dateValue(booking.startDate);
  const end = dateValue(booking.endDate);

  return (
    todayValue !== null &&
    start !== null &&
    end !== null &&
    todayValue >= start &&
    todayValue <= end
  );
}

export function cmBookingNeedsContent(booking: CmBooking): boolean {
  const status = booking.status.toLowerCase();

  return (
    (status === "confirmed" || status === "running") &&
    !booking.playlistId &&
    !booking.hasContent &&
    !booking.items.some((item) => Boolean(item.playlistId))
  );
}

export function cmBookingDateState(
  booking: CmBooking,
  today: string = todayIST(),
): {
  label: string;
  tone: "live" | "upcoming" | "ended" | "scheduled";
} {
  if (isCmBookingLive(booking, today)) {
    return { label: "Live now", tone: "live" };
  }

  const todayValue = dateValue(today);
  const start = dateValue(booking.startDate);
  const end = dateValue(booking.endDate);

  if (end !== null && todayValue !== null && end < todayValue) {
    return { label: "Ended", tone: "ended" };
  }

  if (start !== null && todayValue !== null && start > todayValue) {
    const days = Math.round((start - todayValue) / 86_400_000);

    return {
      label: `Starts in ${days} day${days === 1 ? "" : "s"}`,
      tone: "upcoming",
    };
  }

  return { label: "Scheduled", tone: "scheduled" };
}

export function formatCmBookingDateRange(booking: CmBooking): string {
  const start = formatBookingDate(booking.startDate);
  const end = formatBookingDate(booking.endDate);

  if (start === "—" && end === "—") {
    return "Dates not set";
  }

  if (start === end) {
    return start;
  }

  return `${start} – ${end}`;
}

export function bookingUsesPlaylist(
  booking: Pick<CmBooking, "playlistId" | "items">,
  playlistId: string,
): boolean {
  return (
    booking.playlistId === playlistId ||
    booking.items.some((item) => item.playlistId === playlistId)
  );
}

export function groupCmBookingScreens(
  screens: AdBookingScreen[],
): CmBookingScreenGroup[] {
  const groups = new Map<string, CmBookingScreenGroup>();

  for (const screen of screens) {
    const propertyId = screen.property_id;
    const propertyName =
      screen.property_name?.trim() ||
      (propertyId ? `Property ${propertyId.slice(0, 8)}` : "Unassigned property");
    const key = propertyId || `name:${propertyName.toLowerCase()}`;
    const group = groups.get(key) ?? {
      key,
      propertyId,
      propertyName,
      screens: [],
    };

    group.screens.push(screen);
    groups.set(key, group);
  }

  return [...groups.values()].sort((left, right) =>
    left.propertyName.localeCompare(right.propertyName),
  );
}

export function cmBookingScreenSummary(screens: AdBookingScreen[]): string {
  const online = screens.filter((screen) => screen.online).length;

  return `${screens.length} screen${screens.length === 1 ? "" : "s"}, ${online} online`;
}

export function cmBookingScreenLocation(screen: AdBookingScreen): string {
  return [screen.block, screen.spot, screen.shop_name]
    .filter((value): value is string => Boolean(value?.trim()))
    .map((value) => value.trim())
    .join(" · ");
}

export function withCmBookingCounts(
  customers: AdminCustomerStats[],
  bookings: CmBooking[],
  today: string = todayIST(),
): CmCustomerWithCounts[] {
  return customers.map((customer) => ({
    ...customer,
    activeCampaigns: bookings.filter(
      (booking) =>
        booking.customerId === customer.customer_id &&
        isCmBookingLive(booking, today),
    ).length,
    needsContent: bookings.filter(
      (booking) =>
        booking.customerId === customer.customer_id &&
        cmBookingNeedsContent(booking),
    ).length,
  }));
}
