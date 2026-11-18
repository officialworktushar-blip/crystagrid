export type AdRateUnit = "day" | "week";

export interface AdCity {
  id: string;
  name: string;
  state: string | null;
  is_active: boolean;
  sort: number;
}

export interface AdPlace {
  id: string;
  city_id: string;
  name: string;
  lat: number | null;
  lng: number | null;
  is_major: boolean;
  is_active: boolean;
  sort: number;
}

export interface AdPropertyType {
  id: string;
  name: string;
  sort: number;
}

export interface AdProperty {
  id: string;
  city_id: string;
  place_id: string | null;
  type_id: string | null;
  name: string;
  description: string | null;
  image_path: string | null;
  screens_count: number;
  monthly_reach: number;
  rate: number;
  rate_unit: AdRateUnit;
  is_active: boolean;
  sort: number;
}

export interface AdPropertyDependency {
  id: string;
  city_id: string;
  place_id: string | null;
  type_id: string | null;
}

export interface AdPackage {
  id: string;
  city_id: string;
  type_id: string | null;
  name: string;
  description: string | null;
  monthly_reach: number;
  rate: number;
  rate_unit: AdRateUnit;
  is_active: boolean;
  sort: number;
}

export interface AdPackageProperty {
  package_id: string;
  property_id: string;
}

export interface AdPropertyStats {
  property_id: string;
  screens_count: number;
  online_count: number;
}

export interface AdPackageStats {
  package_id: string;
  properties_count: number;
  screens_count: number;
  online_count: number;
}

export interface AdPropertyScreen {
  screen_id: string;
  screen_name: string | null;
  online: boolean;
  last_seen: string | null;
  block: string | null;
  spot: string | null;
  shop_name: string | null;
}

export interface AdSettings {
  id: number;
  online_discount_pct: number;
  gst_pct: number;
  platinum_multiplier: number;
  max_total_discount_pct: number;
}

export interface AdPromoCode {
  code: string;
  discount_pct: number;
  is_active: boolean;
  expires_at: string | null;
  note: string | null;
}

export type BookingTier = "gold" | "platinum";

export type BookingItemType = "package" | "property";

export interface BookingItemRef {
  type: BookingItemType;
  id: string;
}

export interface BookingQuoteItem {
  type: BookingItemType;
  id: string;
  name: string;
  detail: string | null;
  quantity: number;
  propertiesCount: number;
  monthlyReach: number;
  rate: number;
  amount: number;
  unit: string | null;
}

export interface BookingQuote {
  city: string | null;
  days: number;
  tier: BookingTier;
  items: BookingQuoteItem[];
  itemCount: number;
  propertiesCount: number;
  monthlyReach: number;
  standardTotal: number;
  onlineDiscountPct: number;
  onlineDiscount: number;
  promoCode: string | null;
  promoDiscount: number;
  taxableAmount: number;
  gstPct: number;
  gstAmount: number;
  rounding: number;
  total: number;
}

export interface SavedBookingResult {
  id: string;
  status: string;
  quote: BookingQuote | null;
}

export const DEFAULT_AD_SETTINGS: AdSettings = {
  id: 1,
  online_discount_pct: 0,
  gst_pct: 0,
  platinum_multiplier: 1,
  max_total_discount_pct: 0,
};

const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatINR(amount: number): string {
  if (!Number.isFinite(amount)) {
    return inrFormatter.format(0);
  }

  return inrFormatter.format(amount);
}

export function getAdImageUrl(
  path: string | null | undefined,
): string | null {
  const trimmed = path?.trim() ?? "";

  if (!trimmed) {
    return null;
  }

  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!baseUrl) {
    return null;
  }

  const encodedPath = trimmed
    .replace(/^\/+|\/+$/g, "")
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  if (!encodedPath) {
    return null;
  }

  return `${baseUrl.replace(/\/+$/, "")}/storage/v1/object/public/ad-inventory/${encodedPath}`;
}

export function ratePerDay(rate: number, unit: AdRateUnit): number {
  if (!Number.isFinite(rate) || rate < 0) {
    return 0;
  }

  return unit === "week" ? rate / 7 : rate;
}

export function ratePerWeek(rate: number, unit: AdRateUnit): number {
  if (!Number.isFinite(rate) || rate < 0) {
    return 0;
  }

  return unit === "week" ? rate : rate * 7;
}

export function discountedRate(rate: number, discountPct: number): number {
  if (!Number.isFinite(rate) || rate < 0) {
    return 0;
  }

  const discount = Number.isFinite(discountPct)
    ? Math.min(Math.max(discountPct, 0), 100)
    : 0;

  return Math.max(0, rate * (1 - discount / 100));
}

export function formatReach(value: number): string {
  if (!Number.isFinite(value) || value <= 0) {
    return "0";
  }

  if (value >= 1_000_000) {
    const millions = value / 1_000_000;

    return `${Number.isInteger(millions) ? millions : millions.toFixed(1)}M`;
  }

  if (value >= 1_000) {
    const thousands = value / 1_000;

    return `${Number.isInteger(thousands) ? thousands : thousands.toFixed(1)}K`;
  }

  return new Intl.NumberFormat("en-IN").format(Math.round(value));
}

export function todayIST(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = new Map(parts.map((part) => [part.type, part.value]));

  return `${values.get("year")}-${values.get("month")}-${values.get("day")}`;
}

function toUtcDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());

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

  return date;
}

export function addDays(value: string, days: number): string {
  const date = toUtcDate(value);

  if (!date || !Number.isFinite(days)) {
    return value;
  }

  date.setUTCDate(date.getUTCDate() + Math.round(days));

  return date.toISOString().slice(0, 10);
}

export function endDate(startDate: string, days: number): string {
  const duration = Number.isFinite(days) ? Math.max(1, Math.round(days)) : 1;

  return addDays(startDate, duration - 1);
}

export function formatBookingDate(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }

  const date = toUtcDate(value.slice(0, 10));

  if (!date) {
    return value;
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  })
    .format(date)
    .replace(/,/g, "");
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

function normalizeTier(value: string | null): BookingTier {
  return value?.toLowerCase() === "platinum" ? "platinum" : "gold";
}

function normalizeItemType(
  value: string | null,
  row: UnknownRecord,
): BookingItemType {
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

  return pickString(row, ["package_id", "package_ref"]) ? "package" : "property";
}

function findItemRows(records: UnknownRecord[]): unknown[] {
  const keys = ["items", "lines", "quote_items", "booking_items", "inventory"];

  for (const record of records) {
    for (const key of keys) {
      const value = record[key];

      if (Array.isArray(value)) {
        return value;
      }

      const nested = firstRecord(value);

      if (nested) {
        return [nested];
      }
    }
  }

  return [];
}

function normalizeQuoteItem(value: unknown, index: number): BookingQuoteItem {
  const row = asRecord(value) ?? {};
  const type = normalizeItemType(
    pickString(row, ["item_type", "type", "kind", "inventory_type"]),
    row,
  );

  return {
    type,
    id:
      pickString(row, [
        "item_id",
        "reference_id",
        "ref_id",
        "inventory_id",
        "package_id",
        "property_id",
        "id",
      ]) ?? `quote-item-${index}`,
    name:
      pickString(row, [
        "name",
        "package_name",
        "property_name",
        "title",
        "label",
      ]) ?? (type === "package" ? "Ad package" : "Ad property"),
    detail:
      pickString(row, [
        "detail",
        "place_name",
        "type_name",
        "description",
        "city_name",
      ]) ?? null,
    quantity: Math.max(
      1,
      Math.round(pickNumber(row, ["quantity", "qty", "count", "units"]) ?? 1),
    ),
    propertiesCount: Math.max(
      0,
      Math.round(
        pickNumber(row, [
          "properties_count",
          "property_count",
          "properties",
          "included_properties",
          "screens_count",
        ]) ?? 0,
      ),
    ),
    monthlyReach: Math.max(
      0,
      pickNumber(row, ["monthly_reach", "reach", "total_reach"]) ?? 0,
    ),
    rate: pickNumber(row, ["rate", "unit_rate", "rate_per_unit", "price"]) ?? 0,
    amount:
      pickNumber(row, [
        "amount",
        "line_total",
        "standard_amount",
        "total",
        "subtotal",
        "price_total",
      ]) ?? 0,
    unit: pickString(row, ["rate_unit", "unit", "billing_unit", "duration"]),
  };
}

export function normalizeBookingQuote(value: unknown): BookingQuote | null {
  const root = firstRecord(value);

  if (!root) {
    return null;
  }

  const container =
    firstRecord(root.quote) ?? firstRecord(root.data) ?? root;
  const summary =
    firstRecord(container.totals) ??
    firstRecord(container.summary) ??
    firstRecord(root.totals) ??
    firstRecord(root.summary) ??
    container;
  const items = findItemRows([container, root, summary]).map(
    normalizeQuoteItem,
  );
  const explicitProperties = pickNumber(summary, [
    "properties_count",
    "property_count",
    "total_properties",
    "properties",
  ]);
  const explicitReach = pickNumber(summary, [
    "monthly_reach",
    "total_reach",
    "reach",
  ]);
  const propertiesCount =
    explicitProperties ??
    items.reduce((total, item) => total + item.propertiesCount, 0);
  const monthlyReach =
    explicitReach ??
    items.reduce((total, item) => total + item.monthlyReach, 0);
  const itemCount =
    pickNumber(summary, ["item_count", "items_count", "total_items"]) ??
    items.length;
  const promoCode =
    pickString(summary, ["promo_code", "coupon_code", "promocode"]) ??
    pickString(root, ["promo_code", "coupon_code", "promocode"]);

  return {
    city:
      pickString(summary, ["city", "city_name", "city_label"]) ??
      pickString(root, ["city", "city_name", "city_label"]),
    days: Math.max(
      1,
      Math.round(
        pickNumber(summary, ["days", "duration_days", "total_days"]) ??
          pickNumber(root, ["days", "duration_days", "total_days"]) ??
          1,
      ),
    ),
    tier: normalizeTier(
      pickString(summary, ["tier", "tier_name", "plan_tier"]) ??
        pickString(root, ["tier", "tier_name", "plan_tier"]),
    ),
    items,
    itemCount: Math.max(0, Math.round(itemCount)),
    propertiesCount: Math.max(0, Math.round(propertiesCount)),
    monthlyReach: Math.max(0, monthlyReach),
    standardTotal: Math.max(
      0,
      pickNumber(summary, [
        "standard_total",
        "standard_total_amount",
        "standard_rate_total",
        "standard_amount",
        "standard_rate",
        "rate_total",
        "subtotal",
        "base_total",
        "gross_total",
        "list_total",
        "pre_discount_total",
        "amount_before_discount",
      ]) ?? 0,
    ),
    onlineDiscountPct: Math.max(
      0,
      pickNumber(summary, [
        "online_discount_pct",
        "online_discount_percentage",
        "discount_pct",
        "discount_percent",
        "online_discount_percent",
      ]) ?? 0,
    ),
    onlineDiscount: Math.max(
      0,
      pickNumber(summary, [
        "online_discount",
        "online_discount_amount",
        "online_booking_discount",
        "discount_amount",
        "tier_discount",
        "tier_discount_amount",
        "discount_total",
        "discount",
      ]) ?? 0,
    ),
    promoCode: promoCode ? promoCode.toUpperCase() : null,
    promoDiscount: Math.max(
      0,
      pickNumber(summary, [
        "promo_discount",
        "promo_discount_amount",
        "promo_amount",
        "promo_discount_value",
        "coupon_discount",
        "coupon_discount_amount",
      ]) ?? 0,
    ),
    taxableAmount: Math.max(
      0,
      pickNumber(summary, [
        "taxable_amount",
        "taxable_total",
        "taxable",
        "amount_after_discount",
        "net_amount",
      ]) ?? 0,
    ),
    gstPct: Math.max(
      0,
      pickNumber(summary, [
        "gst_pct",
        "gst_percentage",
        "tax_pct",
        "gst_percent",
      ]) ?? 0,
    ),
    gstAmount: Math.max(
      0,
      pickNumber(summary, ["gst_amount", "gst", "tax_amount", "tax"]) ?? 0,
    ),
    rounding: pickNumber(summary, [
      "rounding",
      "rounding_amount",
      "round_off",
      "roundoff",
      "round_off_amount",
    ]) ?? 0,
    total: Math.max(
      0,
      pickNumber(summary, [
        "total",
        "total_amount",
        "grand_total",
        "final_total",
        "amount",
      ]) ?? 0,
    ),
  };
}

export function normalizeSavedBookingResult(
  value: unknown,
): SavedBookingResult | null {
  if (typeof value === "string" && value.trim()) {
    return { id: value.trim(), status: "draft", quote: null };
  }

  const root = firstRecord(value);

  if (!root) {
    return null;
  }

  const booking = firstRecord(root.booking) ?? root;
  const id = pickString(booking, ["id", "booking_id", "uuid"]);

  if (!id) {
    return null;
  }

  const quoteSource = root.quote ?? booking.quote;
  const quote = quoteSource ? normalizeBookingQuote(quoteSource) : null;

  return {
    id,
    status:
      pickString(booking, ["status", "booking_status"])?.toLowerCase() ??
      "draft",
    quote,
  };
}

function toCount(value: unknown): number {
  const parsed = pickNumber(value !== null && typeof value === "object"
    ? (value as UnknownRecord)
    : { value },
    ["value", "count", "total", "screens", "properties"],
  );

  return Math.max(0, Math.round(parsed ?? 0));
}

function toBoolean(value: unknown): boolean {
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

export function normalizeAdPropertyStats(value: unknown): AdPropertyStats[] {
  const rows = Array.isArray(value) ? value : [];

  return rows.flatMap((entry) => {
    const row = asRecord(entry);
    const propertyId = row ? pickString(row, ["property_id", "id"]) : null;

    if (!row || !propertyId) {
      return [];
    }

    return [
      {
        property_id: propertyId,
        screens_count: toCount(pickNumber(row, ["screens_count", "screens"])),
        online_count: toCount(pickNumber(row, ["online_count", "online"])),
      },
    ];
  });
}

export function normalizeAdPackageStats(value: unknown): AdPackageStats[] {
  const rows = Array.isArray(value) ? value : [];

  return rows.flatMap((entry) => {
    const row = asRecord(entry);
    const packageId = row ? pickString(row, ["package_id", "id"]) : null;

    if (!row || !packageId) {
      return [];
    }

    return [
      {
        package_id: packageId,
        properties_count: toCount(
          pickNumber(row, ["properties_count", "properties"]),
        ),
        screens_count: toCount(pickNumber(row, ["screens_count", "screens"])),
        online_count: toCount(pickNumber(row, ["online_count", "online"])),
      },
    ];
  });
}

export function normalizeAdPropertyScreens(
  value: unknown,
): AdPropertyScreen[] {
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
        online: toBoolean(row.online ?? row.is_online ?? row.status),
        last_seen: pickString(row, ["last_seen", "last_seen_at"]),
        block: pickString(row, ["block", "block_name"]),
        spot: pickString(row, ["spot", "spot_name"]),
        shop_name: pickString(row, ["shop_name", "shop"]),
      },
    ];
  });
}
