import type { ScreenStatus } from "@/lib/types";

export interface StaffScreenRow {
  id: string;
  name: string;
  status: string | null;
  last_seen: string | null;
  online: boolean;
  property_id: string | null;
  property_name: string | null;
  place_name: string | null;
  type_name: string | null;
  city_name: string | null;
  block: string | null;
  spot: string | null;
  shop_name: string | null;
  legacy_location: string | null;
  owner_id: string | null;
  owner_name: string | null;
  added_by: string | null;
  added_by_name: string | null;
  created_at: string;
  active_clients: string[] | null;
  active_bookings: number | null;
}

export function staffScreenStatus(row: StaffScreenRow): ScreenStatus {
  if (row.online) {
    return "online";
  }

  return row.last_seen ? "offline" : "pending";
}

export function exactLocation(row: StaffScreenRow): string {
  const parts = [
    row.block,
    row.spot,
    row.shop_name ? `Shop: ${row.shop_name}` : null,
  ].filter(
    (value): value is string => typeof value === "string" && value.trim().length > 0,
  );

  if (parts.length > 0) {
    return parts.join(" · ");
  }

  return row.legacy_location?.trim() || "Not set";
}

export function normalizeStaffScreens(value: unknown): StaffScreenRow[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (row): row is StaffScreenRow =>
      row !== null &&
      typeof row === "object" &&
      typeof (row as StaffScreenRow).id === "string" &&
      typeof (row as StaffScreenRow).name === "string",
  );
}
