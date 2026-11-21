import type { BookingItemType } from "@/lib/ads";

export const ADMIN_BOOKING_STATUSES = [
  "pending",
  "confirmed",
  "running",
  "completed",
  "cancelled",
] as const;

export const BOOKING_FILTER_STATUSES = [
  "draft",
  ...ADMIN_BOOKING_STATUSES,
] as const;

export interface AdBookingItem {
  id: string;
  type: BookingItemType | null;
  propertyId: string | null;
  packageId: string | null;
  name: string;
  detail: string | null;
  quantity: number;
  rate: number | null;
  rateUnit: string | null;
  amount: number | null;
  playlistId: string | null;
}

export interface AdBooking {
  id: string;
  customerName: string;
  companyName: string | null;
  city: string | null;
  startDate: string | null;
  endDate: string | null;
  days: number;
  tier: string | null;
  itemCount: number;
  standardTotal: number;
  discountAmount: number;
  promoCode: string | null;
  promoDiscount: number;
  gstAmount: number;
  roundingAmount: number;
  total: number;
  status: string;
  paymentStatus: string | null;
  paidAt: string | null;
  razorpayPaymentId: string | null;
  adminNotes: string;
  createdAt: string | null;
  playlistId: string | null;
  hasContent: boolean;
  items: AdBookingItem[];
}

export interface AdBookingScreen {
  screen_id: string;
  screen_name: string | null;
  online: boolean;
  last_seen: string | null;
  property_id: string | null;
  property_name: string | null;
  place_name: string | null;
  block: string | null;
  spot: string | null;
  shop_name: string | null;
}

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;
}

function firstRecord(value: unknown): UnknownRecord | null {
  if (Array.isArray(value)) {
    for (const entry of value) {
      const record = asRecord(entry);

      if (record) {
        return record;
      }
    }

    return null;
  }

  return asRecord(value);
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

function pickNumber(row: UnknownRecord, keys: string[]): number | null {
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

  return null;
}

function normalizeItemType(
  value: string | null,
  row: UnknownRecord,
): BookingItemType | null {
  const normalized = value?.toLowerCase();

  if (normalized === "package" || normalized === "packages") {
    return "package";
  }

  if (
    normalized === "property" ||
    normalized === "properties" ||
    normalized === "placement"
  ) {
    return "property";
  }

  if (pickString(row, ["package_id", "package_ref"])) {
    return "package";
  }

  if (pickString(row, ["property_id", "property_ref"])) {
    return "property";
  }

  return null;
}

function pickRelationName(
  row: UnknownRecord,
  relationKeys: string[],
  nameKeys: string[],
): string | null {
  for (const key of relationKeys) {
    const relation = firstRecord(row[key]);

    if (!relation) {
      continue;
    }

    const name = pickString(relation, nameKeys);

    if (name) {
      return name;
    }
  }

  return null;
}

function toDateTimestamp(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const datePart = value.slice(0, 10);
  const timestamp = Date.parse(`${datePart}T00:00:00Z`);

  return Number.isFinite(timestamp) ? timestamp : null;
}

function calculateDays(start: string | null, end: string | null): number {
  const startTimestamp = toDateTimestamp(start);
  const endTimestamp = toDateTimestamp(end);

  if (startTimestamp === null || endTimestamp === null) {
    return 0;
  }

  const difference = Math.round(
    (endTimestamp - startTimestamp) / 86_400_000,
  );

  return difference >= 0 ? difference + 1 : 0;
}

function normalizeItem(value: unknown, index: number): AdBookingItem {
  const row = asRecord(value) ?? {};
  const name =
    pickString(row, [
      "name",
      "property_name",
      "package_name",
      "title",
      "label",
    ]) ??
    pickString(row, ["description", "placement", "place_name"]) ??
    "Booking item";
  const packageId =
    pickString(row, ["package_id", "package_ref"]) ??
    pickRelationName(row, ["package", "ad_package"], ["id"]);
  const propertyId =
    pickString(row, ["property_id", "property_ref"]) ??
    pickRelationName(row, ["property", "ad_property"], ["id"]);

  return {
    id:
      pickString(row, ["id", "item_id", "uuid"]) ??
      `booking-item-${index}`,
    type: normalizeItemType(
      pickString(row, ["item_type", "type", "kind", "inventory_type"]),
      row,
    ),
    propertyId,
    packageId,
    name,
    detail:
      pickString(row, [
        "detail",
        "placement",
        "place_name",
        "type_name",
        "city_name",
        "description",
      ]) ?? null,
    quantity: Math.max(
      1,
      Math.round(
        pickNumber(row, ["quantity", "qty", "count", "units"]) ?? 1,
      ),
    ),
    rate: pickNumber(row, [
      "rate",
      "unit_rate",
      "rate_per_unit",
      "price",
    ]),
    rateUnit: pickString(row, ["rate_unit", "unit", "billing_unit"]),
    amount: pickNumber(row, [
      "amount",
      "line_total",
      "total",
      "subtotal",
      "price_total",
    ]),
    playlistId: pickString(row, [
      "playlist_id",
      "content_playlist_id",
      "creative_playlist_id",
    ]),
  };
}

export function normalizeAdBooking(value: unknown): AdBooking | null {
  const row = asRecord(value);

  if (!row) {
    return null;
  }

  const id = pickString(row, ["id", "booking_id", "uuid"]);

  if (!id) {
    return null;
  }

  const profile =
    firstRecord(row.profiles) ??
    firstRecord(row.profile) ??
    firstRecord(row.customer);

  const customerName =
    (profile &&
      pickString(profile, [
        "full_name",
        "name",
        "display_name",
        "email",
      ])) ??
    pickString(row, [
      "customer_name",
      "full_name",
      "customer_email",
      "email",
    ]) ??
    "Unknown customer";

  const companyName =
    (profile &&
      pickString(profile, ["company_name", "company", "organization"])) ??
    pickString(row, ["company_name", "company", "organization"]);

  const city =
    pickString(row, [
      "city_name",
      "city_label",
      "city",
      "location_name",
    ]) ??
    pickRelationName(
      row,
      ["ad_cities", "cities", "city"],
      ["name", "city_name", "label"],
    );

  const tier =
    pickString(row, [
      "tier",
      "tier_name",
      "tier_label",
      "plan_tier",
      "plan",
      "package_tier",
    ]) ??
    pickRelationName(
      row,
      ["tier", "plan", "package"],
      ["name", "tier_name", "label", "title"],
    );

  const startDate = pickString(row, [
    "start_date",
    "starts_at",
    "start",
    "from_date",
    "campaign_start",
    "start_on",
  ]);

  const endDate = pickString(row, [
    "end_date",
    "ends_at",
    "end",
    "to_date",
    "campaign_end",
    "end_on",
  ]);

  const explicitDays = pickNumber(row, [
    "days",
    "duration_days",
    "total_days",
    "num_days",
  ]);

  const rawItems = Array.isArray(row.ad_booking_items)
    ? row.ad_booking_items
    : row.ad_booking_items
      ? [row.ad_booking_items]
      : [];

  const items = rawItems.map(normalizeItem);
  const itemCount =
    items.length > 0
      ? items.length
      : Math.max(
          0,
          Math.round(
            pickNumber(row, [
              "item_count",
              "items_count",
              "property_count",
              "properties_count",
            ]) ?? 0,
          ),
        );

  const promoCode =
    pickString(row, [
      "promo_code",
      "promo_code_value",
      "coupon_code",
      "promocode",
      "promo",
    ]) ??
    pickRelationName(
      row,
      ["promo", "promo_code", "promo_code_data"],
      ["code", "promo_code"],
    );

  const status =
    pickString(row, ["status", "booking_status", "state"])?.toLowerCase() ??
    "pending";
  const paymentStatus =
    pickString(row, ["payment_status", "paymentStatus"])?.toLowerCase() ?? null;
  const paidAt = pickString(row, ["paid_at", "paidAt"]);
  const razorpayPaymentId = pickString(row, [
    "razorpay_payment_id",
    "razorpayPaymentId",
  ]);
  const playlistId =
    pickString(row, [
      "playlist_id",
      "content_playlist_id",
      "creative_playlist_id",
    ]) ??
    pickRelationName(row, ["playlist", "content_playlist"], ["id"]);
  const hasContent =
    Boolean(playlistId) || items.some((item) => Boolean(item.playlistId));

  return {
    id,
    customerName,
    companyName,
    city,
    startDate,
    endDate,
    days:
      explicitDays !== null
        ? Math.max(0, Math.round(explicitDays))
        : calculateDays(startDate, endDate),
    tier,
    itemCount,
    standardTotal:
      pickNumber(row, [
        "standard_total",
        "standard_total_amount",
        "standard_amount",
        "subtotal",
        "base_total",
        "base_amount",
        "list_total",
        "gross_total",
        "pre_discount_total",
        "amount_before_discount",
      ]) ?? 0,
    discountAmount:
      pickNumber(row, [
        "discount_amount",
        "tier_discount",
        "tier_discount_amount",
        "online_discount",
        "online_discount_amount",
        "discount_value",
        "discount_total",
        "discount",
      ]) ?? 0,
    promoCode,
    promoDiscount:
      pickNumber(row, [
        "promo_discount",
        "promo_discount_amount",
        "promo_amount",
        "promo_discount_value",
        "coupon_discount",
        "coupon_discount_amount",
      ]) ?? 0,
    gstAmount:
      pickNumber(row, [
        "gst_amount",
        "gst",
        "tax_amount",
        "tax",
        "gst_total",
      ]) ?? 0,
    roundingAmount:
      pickNumber(row, [
        "rounding",
        "rounding_amount",
        "round_off",
        "roundoff",
        "round_off_amount",
      ]) ?? 0,
    total:
      pickNumber(row, [
        "total",
        "total_amount",
        "grand_total",
        "final_total",
        "amount",
        "total_inr",
      ]) ?? 0,
    status,
    paymentStatus,
    paidAt,
    razorpayPaymentId,
    adminNotes:
      pickString(row, [
        "admin_notes",
        "admin_note",
        "internal_notes",
        "internal_note",
      ]) ?? "",
    createdAt:
      pickString(row, [
        "created_at",
        "created",
        "booked_at",
        "booking_date",
        "inserted_at",
      ]) ?? null,
    playlistId,
    hasContent,
    items,
  };
}

export function normalizeAdBookings(value: unknown): AdBooking[] {
  const rows = Array.isArray(value) ? value : [];
  const bookings: AdBooking[] = [];

  for (const row of rows) {
    const booking = normalizeAdBooking(row);

    if (booking) {
      bookings.push(booking);
    }
  }

  return bookings;
}

export function formatBookingId(id: string): string {
  const trimmed = id.trim();

  return trimmed ? trimmed.slice(0, 8).toUpperCase() : "—";
}

export function formatBookingStatus(status: string): string {
  const trimmed = status.trim();

  if (!trimmed) {
    return "Unknown";
  }

  return trimmed
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function bookingTimestamp(booking: AdBooking): number {
  if (!booking.createdAt) {
    return 0;
  }

  const timestamp = Date.parse(booking.createdAt);

  return Number.isFinite(timestamp) ? timestamp : 0;
}

function toBookingBoolean(value: unknown): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value > 0;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    return ["1", "true", "yes", "online", "active"].includes(normalized);
  }

  return false;
}

export function normalizeAdBookingScreens(
  value: unknown,
): AdBookingScreen[] {
  const rows = Array.isArray(value) ? value : [];

  return rows.flatMap((entry) => {
    const row = asRecord(entry);
    const screenId = row
      ? pickString(row, ["screen_id", "id", "device_id"])
      : null;

    if (!row || !screenId) {
      return [];
    }

    return [
      {
        screen_id: screenId,
        screen_name: pickString(row, ["screen_name", "name", "title"]),
        online: toBookingBoolean(row.online ?? row.is_online ?? row.status),
        last_seen: pickString(row, ["last_seen", "last_seen_at"]),
        property_id: pickString(row, ["property_id"]),
        property_name: pickString(row, ["property_name", "property"]),
        place_name: pickString(row, ["place_name", "place", "city_name"]),
        block: pickString(row, ["block", "block_name"]),
        spot: pickString(row, ["spot", "spot_name"]),
        shop_name: pickString(row, ["shop_name", "shop"]),
      },
    ];
  });
}
