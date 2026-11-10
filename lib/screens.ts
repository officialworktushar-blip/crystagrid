import type { ScreenStatus } from "@/lib/types";

export const ONLINE_WINDOW_MS = 60_000;

const shortDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

export function isOnline(
  lastSeen: string | null | undefined,
  now = Date.now(),
): boolean {
  if (!lastSeen) {
    return false;
  }

  const seenAt = Date.parse(lastSeen);

  if (!Number.isFinite(seenAt)) {
    return false;
  }

  return Math.abs(now - seenAt) <= ONLINE_WINDOW_MS;
}

export function formatRelativeTime(
  value: string | null | undefined,
  now = Date.now(),
): string {
  if (!value) {
    return "Never";
  }

  const timestamp = Date.parse(value);

  if (!Number.isFinite(timestamp)) {
    return "Unknown";
  }

  const diff = Math.max(0, now - timestamp);

  if (diff < 60_000) {
    return "Just now";
  }

  if (diff < 3_600_000) {
    return `${Math.floor(diff / 60_000)} min ago`;
  }

  if (diff < 86_400_000) {
    return `${Math.floor(diff / 3_600_000)} hr ago`;
  }

  if (diff < 604_800_000) {
    return `${Math.floor(diff / 86_400_000)} day ago`;
  }

  return shortDateFormatter.format(timestamp);
}

export function getScreenStatus(
  status: ScreenStatus,
  lastSeen: string | null | undefined,
  now = Date.now(),
): ScreenStatus {
  if (isOnline(lastSeen, now)) {
    return "online";
  }

  if (status === "pending") {
    return "pending";
  }

  return "offline";
}
