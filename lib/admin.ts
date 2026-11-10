import type { ScreenStatus } from "@/lib/types";

export interface AdminCustomerStats {
  customer_id: string;
  full_name: string | null;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  total_screens: number;
  online_screens: number;
  media_count: number;
  storage_bytes: number;
  joined_at: string | null;
}

export interface AdminScreenRow {
  id: string;
  name: string;
  owner_name: string;
  owner_company: string | null;
  last_seen: string | null;
  last_seen_label: string;
  created_at: string;
  display_status: ScreenStatus;
}

type UnknownRecord = Record<string, unknown>;

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

function asRecord(value: unknown): UnknownRecord | null {
  return value !== null && typeof value === "object"
    ? (value as UnknownRecord)
    : null;
}

function pickString(row: UnknownRecord, keys: string[]): string | null {
  for (const key of keys) {
    const value = row[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function pickNumber(row: UnknownRecord, keys: string[]): number {
  for (const key of keys) {
    const value = row[key];

    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);

      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return 0;
}

export function normalizeAdminCustomerStats(
  data: unknown,
): AdminCustomerStats[] {
  const rows = Array.isArray(data) ? data : [];
  const customers: AdminCustomerStats[] = [];

  for (const value of rows) {
    const row = asRecord(value);

    if (!row) {
      continue;
    }

    const customerId = pickString(row, [
      "customer_id",
      "id",
      "user_id",
      "profile_id",
    ]);

    if (!customerId) {
      continue;
    }

    customers.push({
      customer_id: customerId,
      full_name: pickString(row, [
        "full_name",
        "name",
        "customer_name",
        "display_name",
      ]),
      company_name: pickString(row, [
        "company_name",
        "company",
        "organization",
      ]),
      email: pickString(row, ["email", "user_email"]),
      phone: pickString(row, ["phone", "phone_number"]),
      total_screens: pickNumber(row, [
        "total_screens",
        "screen_count",
        "screens_total",
        "screens_count",
        "total_screen_count",
        "screens",
      ]),
      online_screens: pickNumber(row, [
        "online_screens",
        "online_screen_count",
        "screens_online",
        "screens_online_count",
        "online_count",
        "online",
      ]),
      media_count: pickNumber(row, [
        "media_count",
        "media_files",
        "media_files_count",
        "total_media",
        "media_total",
        "media",
      ]),
      storage_bytes: pickNumber(row, [
        "storage_bytes",
        "storage_used_bytes",
        "total_storage_bytes",
        "storage_used",
        "total_storage",
        "storage_size",
        "storage",
      ]),
      joined_at:
        pickString(row, [
          "joined_at",
          "created_at",
          "joined",
          "customer_since",
          "signup_date",
        ]) ?? null,
    });
  }

  return customers;
}

export function customerDisplayName(
  customer: AdminCustomerStats,
): string {
  return (
    customer.full_name ||
    customer.company_name ||
    customer.email ||
    "Unnamed customer"
  );
}

export function customerInitials(customer: AdminCustomerStats): string {
  const source = customerDisplayName(customer);
  const parts = source
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  return parts.map((part) => part[0]?.toUpperCase()).join("") || "C";
}

export function joinedTimestamp(customer: AdminCustomerStats): number {
  if (!customer.joined_at) {
    return 0;
  }

  const timestamp = Date.parse(customer.joined_at);

  return Number.isFinite(timestamp) ? timestamp : 0;
}

export function formatAdminDate(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }

  const timestamp = Date.parse(value);

  return Number.isFinite(timestamp) ? dateFormatter.format(timestamp) : "—";
}

export function formatStorage(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 MB";
  }

  const gigabytes = bytes / 1_073_741_824;

  if (gigabytes >= 1) {
    return `${gigabytes >= 10 ? Math.round(gigabytes) : gigabytes.toFixed(1)} GB`;
  }

  const megabytes = bytes / 1_048_576;

  if (megabytes < 1) {
    return `${Math.max(0.1, megabytes).toFixed(1)} MB`;
  }

  return `${megabytes >= 10 ? Math.round(megabytes) : megabytes.toFixed(1)} MB`;
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 KB";
  }

  if (bytes < 1_048_576) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  if (bytes < 1_073_741_824) {
    return `${(bytes / 1_048_576).toFixed(1)} MB`;
  }

  return `${(bytes / 1_073_741_824).toFixed(1)} GB`;
}
