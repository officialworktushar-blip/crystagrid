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
