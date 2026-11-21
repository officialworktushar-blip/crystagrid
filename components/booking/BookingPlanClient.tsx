"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  Crown,
  Info,
  Loader2,
  MapPin,
  Monitor,
  Package,
  Plus,
  Sparkles,
  Star,
  Tag,
  X,
  Zap,
} from "lucide-react";
import {
  DEFAULT_AD_SETTINGS,
  addDays,
  endDate,
  formatBookingDate,
  formatINR,
  formatReach,
  normalizeAdPackageStats,
  normalizeAdPropertyStats,
  normalizeBookingQuote,
  normalizeSavedBookingResult,
  todayIST,
  type AdCity,
  type AdPackage,
  type AdPackageProperty,
  type AdPackageStats,
  type AdProperty,
  type AdPropertyStats,
  type AdSettings,
  type BookingItemRef,
  type BookingQuote,
  type BookingTier,
} from "@/lib/ads";
import {
  clearBookingDraft,
  loadBookingDraft,
  saveBookingDraft,
  type BookingDraft,
} from "@/lib/booking-draft";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type UnknownRecord = Record<string, unknown>;
type SavingState = "save" | "checkout" | null;

interface PlanInventory {
  cities: AdCity[];
  packages: AdPackage[];
  properties: AdProperty[];
  packageProperties: AdPackageProperty[];
  settings: AdSettings;
}

const inputClass =
  "h-11 w-full rounded-2xl border border-[#dbe3ef] bg-white px-4 text-sm font-medium text-[#0f172a] outline-none transition placeholder:text-[#94a3b8] focus:border-[#1d6fff] focus:ring-4 focus:ring-[#dbeafe]";

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

function clampStartDate(value: string): string {
  const today = todayIST();
  const maxDate = addDays(today, 365);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : today;

  if (date < today) {
    return today;
  }

  if (date > maxDate) {
    return maxDate;
  }

  return date;
}

function calculateDays(start: string | null, end: string | null): number {
  if (!start || !end) {
    return 0;
  }

  const startTime = Date.parse(`${start.slice(0, 10)}T00:00:00Z`);
  const endTime = Date.parse(`${end.slice(0, 10)}T00:00:00Z`);

  if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) {
    return 0;
  }

  const days = Math.round((endTime - startTime) / 86_400_000);

  return days >= 0 ? days + 1 : 0;
}

function parseItemRef(row: UnknownRecord): BookingItemRef | null {
  const nested =
    firstRecord(row.item_ref) ??
    firstRecord(row.inventory_ref) ??
    firstRecord(row.ref);
  const typeValue =
    pickString(row, ["item_type", "type", "kind", "inventory_type"]) ??
    (nested
      ? pickString(nested, ["item_type", "type", "kind", "inventory_type"])
      : null);
  const packageId =
    pickString(row, ["package_id", "package_ref"]) ??
    (nested ? pickString(nested, ["package_id", "package_ref"]) : null);
  const propertyId =
    pickString(row, ["property_id", "property_ref"]) ??
    (nested ? pickString(nested, ["property_id", "property_ref"]) : null);
  const normalizedType = typeValue?.toLowerCase();
  const type: "package" | "property" =
    normalizedType === "package" || normalizedType === "packages"
      ? "package"
      : normalizedType === "property" ||
          normalizedType === "properties" ||
          normalizedType === "placement"
        ? "property"
        : packageId
          ? "package"
          : "property";
  const id =
    pickString(row, [
      "item_id",
      "reference_id",
      "ref_id",
      "inventory_id",
      "package_id",
      "property_id",
      "id",
    ]) ??
    (nested
      ? pickString(nested, [
          "item_id",
          "reference_id",
          "ref_id",
          "inventory_id",
          "package_id",
          "property_id",
          "id",
        ])
      : null);

  return id ? { type, id } : null;
}

function parseDraftItems(
  booking: UnknownRecord,
  itemRows: unknown[],
): BookingItemRef[] {
  const nestedItems = Array.isArray(booking.ad_booking_items)
    ? booking.ad_booking_items
    : Array.isArray(booking.items)
      ? booking.items
      : Array.isArray(booking.booking_items)
        ? booking.booking_items
        : [];
  const rows = itemRows.length > 0 ? itemRows : nestedItems;
  const items: BookingItemRef[] = [];
  const seen = new Set<string>();

  for (const value of rows) {
    const row = asRecord(value);

    if (!row) {
      continue;
    }

    const item = parseItemRef(row);

    if (!item) {
      continue;
    }

    const key = `${item.type}:${item.id}`;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    items.push(item);
  }

  return items;
}

function bookingToDraft(
  value: unknown,
  itemRows: unknown[],
  inventory: PlanInventory,
): BookingDraft | null {
  const booking = asRecord(value);

  if (!booking) {
    return null;
  }

  const cityRelation =
    firstRecord(booking.ad_cities) ?? firstRecord(booking.city);
  const cityId =
    pickString(booking, ["city_id", "ad_city_id"]) ??
    (cityRelation ? pickString(cityRelation, ["id", "city_id"]) : null);
  const cityName =
    pickString(booking, ["city_name", "city_label"]) ??
    (cityRelation
      ? pickString(cityRelation, ["name", "city_name", "label"])
      : null) ??
    (typeof booking.city === "string" ? booking.city : null);
  const city =
    inventory.cities.find((entry) => entry.id === cityId) ??
    inventory.cities.find(
      (entry) =>
        cityName !== null &&
        entry.name.toLowerCase() === cityName.toLowerCase(),
    );

  if (!city) {
    return null;
  }

  const startDate =
    pickString(booking, [
      "start_date",
      "starts_at",
      "start",
      "start_on",
      "campaign_start",
    ]) ?? todayIST();
  const rawEndDate = pickString(booking, [
    "end_date",
    "ends_at",
    "end",
    "end_on",
    "campaign_end",
  ]);
  const explicitDays = pickNumber(booking, [
    "days",
    "duration_days",
    "total_days",
    "num_days",
  ]);
  const days =
    explicitDays && explicitDays > 0
      ? Math.min(365, Math.max(1, Math.round(explicitDays)))
      : Math.min(365, Math.max(1, calculateDays(startDate, rawEndDate) || 7));
  const packageIds = new Set(
    inventory.packages
      .filter((item) => item.city_id === city.id)
      .map((item) => item.id),
  );
  const propertyIds = new Set(
    inventory.properties
      .filter((item) => item.city_id === city.id)
      .map((item) => item.id),
  );
  const items = parseDraftItems(booking, itemRows).filter((item) =>
    item.type === "package" ? packageIds.has(item.id) : propertyIds.has(item.id),
  );
  const tierValue =
    pickString(booking, ["tier", "tier_name", "plan_tier"])?.toLowerCase() ??
    "";
  const bookingId = pickString(booking, ["id", "booking_id"]);

  return {
    cityId: city.id,
    areaIds: [],
    items,
    startDate: clampStartDate(startDate.slice(0, 10)),
    days,
    tier: tierValue === "platinum" ? "platinum" : "gold",
    promo:
      pickString(booking, ["promo_code", "coupon_code", "promocode"]) ?? "",
    bookingId: bookingId ?? undefined,
  };
}

function multiplierLabel(value: number): string {
  const safe = Number.isFinite(value) && value > 0 ? value : 1;
  const label = Number.isInteger(safe) ? String(safe) : safe.toFixed(1);

  return `${label}x impressions vs Gold`;
}

function percentLabel(value: number): string {
  if (!Number.isFinite(value) || value <= 0) {
    return "0%";
  }

  return `${Number.isInteger(value) ? value : value.toFixed(1)}%`;
}

function packageScreensCount(
  packageId: string,
  included: AdProperty[],
  packageStatsById: Map<string, AdPackageStats>,
  propertyStatsById: Map<string, AdPropertyStats>,
): number {
  const stats = packageStatsById.get(packageId);

  if (stats) {
    return stats.screens_count;
  }

  return included.reduce(
    (total, property) =>
      total + (propertyStatsById.get(property.id)?.screens_count ?? 0),
    0,
  );
}

function SummaryRow({
  label,
  value,
  tone = "default",
}: {
  label: ReactNode;
  value: ReactNode;
  tone?: "default" | "success";
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-[#64748b]">{label}</span>
      <span
        className={cn(
          "font-semibold tabular-nums",
          tone === "success" ? "text-[#16a34a]" : "text-[#0f172a]",
        )}
      >
        {value}
      </span>
    </div>
  );
}

export default function BookingPlanClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const draftId = searchParams.get("draft");
  const quoteRequest = useRef(0);
  const [draft, setDraft] = useState<BookingDraft | null>(null);
  const [inventory, setInventory] = useState<PlanInventory | null>(null);
  const [propertyStats, setPropertyStats] = useState<AdPropertyStats[]>([]);
  const [packageStats, setPackageStats] = useState<AdPackageStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [quote, setQuote] = useState<BookingQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [quoteNonce, setQuoteNonce] = useState(0);
  const [promoInput, setPromoInput] = useState("");
  const [saving, setSaving] = useState<SavingState>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const supabase = createClient();
      const [
        citiesResult,
        packagesResult,
        propertiesResult,
        packagePropertiesResult,
        propertyStatsResult,
        packageStatsResult,
        settingsResult,
        userResult,
      ] = await Promise.all([
        supabase
          .from("ad_cities")
          .select("id, name, state, is_active, sort")
          .order("sort", { ascending: true })
          .order("name", { ascending: true }),
        supabase
          .from("ad_packages")
          .select(
            "id, city_id, type_id, name, description, monthly_reach, rate, rate_unit, is_active, sort",
          )
          .order("sort", { ascending: true })
          .order("name", { ascending: true }),
        supabase
          .from("ad_properties")
          .select(
            "id, city_id, place_id, type_id, name, description, image_path, screens_count, monthly_reach, rate, rate_unit, is_active, sort",
          )
          .order("sort", { ascending: true })
          .order("name", { ascending: true }),
        supabase
          .from("ad_package_properties")
          .select("package_id, property_id"),
        supabase
          .from("ad_property_stats")
          .select("property_id, screens_count, online_count"),
        supabase
          .from("ad_package_stats")
          .select("package_id, properties_count, screens_count, online_count"),
        supabase
          .from("ad_settings")
          .select(
            "id, online_discount_pct, gst_pct, platinum_multiplier, max_total_discount_pct",
          )
          .eq("id", 1)
          .maybeSingle(),
        supabase.auth.getUser(),
      ]);

      if (cancelled) {
        return;
      }

      setPropertyStats(normalizeAdPropertyStats(propertyStatsResult.data));
      setPackageStats(normalizeAdPackageStats(packageStatsResult.data));

      const nextInventory: PlanInventory = {
        cities: (citiesResult.data ?? []) as AdCity[],
        packages: (packagesResult.data ?? []) as AdPackage[],
        properties: (propertiesResult.data ?? []) as AdProperty[],
        packageProperties: (packagePropertiesResult.data ??
          []) as AdPackageProperty[],
        settings:
          (settingsResult.data as AdSettings | null) ?? DEFAULT_AD_SETTINGS,
      };

      setInventory(nextInventory);
      setIsLoggedIn(Boolean(userResult.data.user));

      if (draftId && !userResult.data.user) {
        router.replace(
          `/login?next=${encodeURIComponent(`/book/plan?draft=${draftId}`)}`,
        );
        return;
      }

      if (draftId) {
        const { data: bookingData, error: bookingError } = await supabase
          .from("ad_bookings")
          .select("*")
          .eq("id", draftId)
          .eq("status", "draft")
          .maybeSingle();

        if (cancelled) {
          return;
        }

        if (bookingError || !bookingData) {
          setLoadError(
            "We couldn't load that draft. It may have been submitted or removed.",
          );
          setLoading(false);
          return;
        }

        const { data: itemData } = await supabase
          .from("ad_booking_items")
          .select("*")
          .eq("booking_id", draftId);

        if (cancelled) {
          return;
        }

        const nextDraft = bookingToDraft(
          bookingData,
          (itemData ?? []) as unknown[],
          nextInventory,
        );

        if (!nextDraft) {
          setLoadError(
            "This draft is missing its city or inventory. Start a new plan to continue.",
          );
          setLoading(false);
          return;
        }

        setDraft(nextDraft);
        setPromoInput(nextDraft.promo);
        setLoading(false);
        return;
      }

      const stored = loadBookingDraft();

      if (!stored) {
        router.replace("/book");
        return;
      }

      if (!nextInventory.cities.some((city) => city.id === stored.cityId)) {
        router.replace("/book");
        return;
      }

      const normalizedDraft = {
        ...stored,
        startDate: clampStartDate(stored.startDate),
      };

      setDraft(normalizedDraft);
      setPromoInput(normalizedDraft.promo);
      setLoading(false);
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [draftId, router]);

  useEffect(() => {
    if (draft) {
      saveBookingDraft(draft);
    }
  }, [draft]);

  useEffect(() => {
    if (draft) {
      setPromoInput(draft.promo);
    }
  }, [draft?.promo]);

  useEffect(() => {
    if (!draft || !inventory || draft.items.length === 0) {
      setQuote(null);
      setQuoteLoading(false);
      setQuoteError(null);
      return;
    }

    let cancelled = false;
    const requestId = ++quoteRequest.current;

    setQuoteLoading(true);
    setQuoteError(null);

    const timer = window.setTimeout(() => {
      const load = async () => {
        const supabase = createClient();
        const { data, error } = await supabase.rpc("quote_booking", {
          p_city: draft.cityId,
          p_items: draft.items,
          p_days: draft.days,
          p_tier: draft.tier,
          p_promo: draft.promo.trim() || null,
        });

        if (cancelled || requestId !== quoteRequest.current) {
          return;
        }

        if (error) {
          setQuote(null);
          setQuoteError(error.message || "Could not calculate this quote.");
          setQuoteLoading(false);
          return;
        }

        const normalized = normalizeBookingQuote(data);

        if (!normalized) {
          setQuote(null);
          setQuoteError("Could not calculate this quote.");
          setQuoteLoading(false);
          return;
        }

        setQuote(normalized);
        setQuoteError(null);
        setQuoteLoading(false);
      };

      void load();
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    draft?.cityId,
    draft?.days,
    draft?.items,
    draft?.promo,
    draft?.tier,
    inventory,
    quoteNonce,
  ]);

  const packages = inventory?.packages ?? [];
  const properties = inventory?.properties ?? [];
  const packageProperties = inventory?.packageProperties ?? [];
  const settings = inventory?.settings ?? DEFAULT_AD_SETTINGS;
  const packageById = useMemo(
    () => new Map(packages.map((item) => [item.id, item])),
    [packages],
  );
  const propertyById = useMemo(
    () => new Map(properties.map((item) => [item.id, item])),
    [properties],
  );
  const propertyStatsById = useMemo(
    () => new Map(propertyStats.map((stat) => [stat.property_id, stat])),
    [propertyStats],
  );
  const packageStatsById = useMemo(
    () => new Map(packageStats.map((stat) => [stat.package_id, stat])),
    [packageStats],
  );
  const packagePropertyIds = useMemo(() => {
    const map = new Map<string, string[]>();

    for (const link of packageProperties) {
      const current = map.get(link.package_id) ?? [];
      current.push(link.property_id);
      map.set(link.package_id, current);
    }

    return map;
  }, [packageProperties]);
  const quoteItems = useMemo(() => {
    const map = new Map<string, BookingQuote["items"][number]>();

    for (const item of quote?.items ?? []) {
      map.set(`${item.type}:${item.id}`, item);
    }

    return map;
  }, [quote]);
  const selectedCity =
    inventory?.cities.find((city) => city.id === draft?.cityId) ?? null;

  if (loading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center py-24 text-center">
        <Loader2
          aria-hidden="true"
          className="h-7 w-7 animate-spin text-[#1d6fff]"
        />
        <p className="mt-4 text-sm font-semibold text-[#64748b]">
          Loading your plan...
        </p>
      </div>
    );
  }

  if (loadError || !draft || !inventory) {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center py-20 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#fffbeb] text-[#d97706]">
          <Info aria-hidden="true" className="h-6 w-6" />
        </span>
        <h1 className="mt-5 text-2xl font-extrabold text-[#0f172a]">
          We couldn&apos;t open this plan
        </h1>
        <p className="mt-2 text-sm leading-6 text-[#64748b]">
          {loadError || "Start a new plan to continue booking your campaign."}
        </p>
        <Link
          href="/book"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-[#1d6fff] px-6 text-sm font-bold text-white transition hover:bg-[#155ee7]"
        >
          Start a new plan
        </Link>
      </div>
    );
  }

  const discountPct =
    quote && quote.onlineDiscountPct > 0
      ? quote.onlineDiscountPct
      : settings.online_discount_pct;
  const gstPct =
    quote && quote.gstPct > 0 ? quote.gstPct : settings.gst_pct;
  const total = quote?.total ?? 0;
  const busy = saving !== null;
  const quoteUnavailable = !quote || quoteLoading || Boolean(quoteError);
  const canAct = draft.items.length > 0 && !quoteUnavailable;

  const setTier = (tier: BookingTier) => {
    setDraft((current) => (current ? { ...current, tier } : current));
    setSavedMessage(null);
  };

  const removeItem = (item: BookingItemRef) => {
    setDraft((current) =>
      current
        ? {
            ...current,
            items: current.items.filter(
              (entry) => entry.type !== item.type || entry.id !== item.id,
            ),
          }
        : current,
    );
    setSavedMessage(null);
  };

  const applyPromo = () => {
    const code = promoInput.trim().toUpperCase();

    if (!draft) {
      return;
    }

    setDraft({ ...draft, promo: code });
    setQuoteNonce((current) => current + 1);
    setSavedMessage(null);
    setActionError(null);
  };

  const removePromo = () => {
    if (!draft) {
      return;
    }

    setDraft({ ...draft, promo: "" });
    setPromoInput("");
    setQuoteNonce((current) => current + 1);
    setSavedMessage(null);
  };

  const removeUnavailableItems = () => {
    if (!draft) {
      return;
    }

    const packageIds = new Set(
      packages
        .filter((item) => item.city_id === draft.cityId)
        .map((item) => item.id),
    );
    const propertyIds = new Set(
      properties
        .filter((item) => item.city_id === draft.cityId)
        .map((item) => item.id),
    );

    setDraft({
      ...draft,
      items: draft.items.filter((item) =>
        item.type === "package"
          ? packageIds.has(item.id)
          : propertyIds.has(item.id),
      ),
    });
  };

  const discardPlan = () => {
    if (!window.confirm("Discard this plan? This cannot be undone.")) {
      return;
    }

    clearBookingDraft();
    router.push("/book");
  };

  const savePlan = async (submit: boolean) => {
    if (!draft || busy || !quote || quoteLoading || quoteError) {
      return;
    }

    setSaving(submit ? "checkout" : "save");
    setActionError(null);
    setSavedMessage(null);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        saveBookingDraft(draft);
        router.push(`/login?next=${encodeURIComponent("/book/plan")}`);
        return;
      }

      const { data, error } = await supabase.rpc("save_booking", {
        p_booking_id: draft.bookingId ?? null,
        p_city: draft.cityId,
        p_items: draft.items,
        p_start: draft.startDate,
        p_days: draft.days,
        p_tier: draft.tier,
        p_promo: draft.promo.trim() || null,
        p_submit: false,
      });

      if (error) {
        setActionError(error.message || "Could not save this booking.");
        return;
      }

      const result = normalizeSavedBookingResult(data);

      if (!result) {
        setActionError("The booking was saved without a reference. Try again.");
        return;
      }

      if (result.quote) {
        setQuote(result.quote);
      }

      const nextDraft = { ...draft, bookingId: result.id };
      setDraft(nextDraft);
      saveBookingDraft(nextDraft);

      if (submit) {
        router.push(`/book/checkout?booking=${result.id}`);
        return;
      }

      setSavedMessage("Saved. Find it in My Plans.");
    } catch {
      setActionError("Something went wrong while saving your booking.");
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={isLoggedIn ? "/dashboard/plans" : "/"}
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#64748b] transition hover:text-[#0f172a]"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Back to My Plans
        </Link>
        <button
          type="button"
          onClick={discardPlan}
          className="text-sm font-semibold text-[#dc2626] transition hover:text-[#b91c1c]"
        >
          Discard plan
        </button>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2.5">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#eff6ff] px-3 py-1.5 text-sm font-bold text-[#1d6fff]">
          <MapPin aria-hidden="true" className="h-4 w-4" />
          {selectedCity?.name ?? "Selected city"}
        </span>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold",
            draft.bookingId
              ? "bg-[#dcfce7] text-[#15803d]"
              : "bg-[#fef3c7] text-[#b45309]",
          )}
        >
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              draft.bookingId ? "bg-[#16a34a]" : "bg-[#d97706]",
            )}
          />
          {draft.bookingId ? "Draft saved" : "Unsaved"}
        </span>
        <Link
          href="/book?step=1"
          className="text-xs font-bold text-[#1d6fff] transition hover:text-[#155ee7]"
        >
          Change City
        </Link>
      </div>

      <div className="mt-4">
        <h1 className="text-2xl font-extrabold tracking-tight text-[#0f172a] sm:text-4xl">
          New plan for {selectedCity?.name ?? "your city"}
        </h1>
        <p className="mt-2 text-sm leading-6 text-[#64748b] sm:text-base">
          Choose your dates, boost level, and inventory below.
        </p>
      </div>

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-5">
          <section className="rounded-3xl border border-[#e5e7eb] bg-white p-5 shadow-[0_24px_70px_-60px_rgba(15,23,42,0.4)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eff6ff] text-[#1d6fff]">
                  <CalendarDays aria-hidden="true" className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-base font-extrabold text-[#0f172a]">
                    Campaign dates
                  </h2>
                  <p className="text-xs text-[#64748b]">
                    {formatBookingDate(draft.startDate)} –{" "}
                    {formatBookingDate(endDate(draft.startDate, draft.days))}
                  </p>
                </div>
              </div>
              <Link
                href="/book?step=3"
                className="text-xs font-bold text-[#1d6fff] transition hover:text-[#155ee7]"
              >
                Change dates
              </Link>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-[#f8fafc] p-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#94a3b8]">
                  Start
                </p>
                <p className="mt-1 text-sm font-bold text-[#0f172a]">
                  {formatBookingDate(draft.startDate)}
                </p>
              </div>
              <div className="rounded-2xl bg-[#f8fafc] p-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#94a3b8]">
                  End
                </p>
                <p className="mt-1 text-sm font-bold text-[#0f172a]">
                  {formatBookingDate(endDate(draft.startDate, draft.days))}
                </p>
              </div>
              <div className="rounded-2xl bg-[#f8fafc] p-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#94a3b8]">
                  Duration
                </p>
                <p className="mt-1 text-sm font-bold text-[#0f172a]">
                  {draft.days} {draft.days === 1 ? "day" : "days"}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-[#e5e7eb] bg-white p-5 shadow-[0_24px_70px_-60px_rgba(15,23,42,0.4)]">
            <div className="flex items-center gap-2">
              <Crown aria-hidden="true" className="h-4 w-4 text-[#d97706]" />
              <h2 className="text-base font-extrabold text-[#0f172a]">
                Campaign Tier
              </h2>
            </div>
            <p className="mt-1 text-xs text-[#64748b]">
              Pick the visibility level that fits your campaign.
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                aria-pressed={draft.tier === "gold"}
                onClick={() => setTier("gold")}
                className={cn(
                  "relative overflow-hidden rounded-2xl border p-4 text-left transition",
                  draft.tier === "gold"
                    ? "border-[#f59e0b] bg-[#fffbeb] ring-4 ring-[#fef3c7]"
                    : "border-[#e5e7eb] bg-white hover:border-[#fcd34d]",
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm font-extrabold text-[#0f172a]">
                    <Star
                      aria-hidden="true"
                      className="h-4 w-4 fill-[#f59e0b] text-[#f59e0b]"
                    />
                    Gold
                  </span>
                  {draft.tier === "gold" ? (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#f59e0b] text-white">
                      <Check aria-hidden="true" className="h-3 w-3" />
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 text-xs leading-5 text-[#64748b]">
                  Standard visibility across your selected inventory.
                </p>
                <div className="mt-3 h-1.5 rounded-full bg-[#f59e0b]" />
              </button>

              <button
                type="button"
                aria-pressed={draft.tier === "platinum"}
                onClick={() => setTier("platinum")}
                className={cn(
                  "relative overflow-hidden rounded-2xl border p-4 text-left transition",
                  draft.tier === "platinum"
                    ? "border-[#7c3aed] bg-[#f5f3ff] ring-4 ring-[#ede9fe]"
                    : "border-[#e5e7eb] bg-white hover:border-[#c4b5fd]",
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm font-extrabold text-[#0f172a]">
                    <Zap
                      aria-hidden="true"
                      className="h-4 w-4 fill-[#7c3aed] text-[#7c3aed]"
                    />
                    Platinum
                  </span>
                  <span className="rounded-full bg-[#7c3aed] px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.1em] text-white">
                    Most chosen
                  </span>
                </div>
                <p className="mt-2 text-xs leading-5 text-[#64748b]">
                  {multiplierLabel(settings.platinum_multiplier)}
                </p>
                <div className="mt-3 h-1.5 rounded-full bg-gradient-to-r from-[#7c3aed] to-[#2563eb]" />
              </button>
            </div>
          </section>

          <section className="rounded-3xl border border-[#e5e7eb] bg-white p-5 shadow-[0_24px_70px_-60px_rgba(15,23,42,0.4)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Package aria-hidden="true" className="h-4 w-4 text-[#1d6fff]" />
                <h2 className="text-base font-extrabold text-[#0f172a]">
                  Selected inventory
                </h2>
                <span className="rounded-full bg-[#eff6ff] px-2.5 py-1 text-xs font-bold text-[#1d6fff]">
                  {draft.items.length}
                </span>
              </div>
              <Link
                href="/book?step=2"
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[#1d6fff] bg-white px-3 text-xs font-bold text-[#1d6fff] transition hover:bg-[#eff6ff]"
              >
                <Plus aria-hidden="true" className="h-3.5 w-3.5" />
                Add Package
              </Link>
            </div>

            {draft.items.length > 0 ? (
              <div className="mt-4 space-y-3">
                {draft.items.map((item) => {
                  const source =
                    item.type === "package"
                      ? packageById.get(item.id)
                      : propertyById.get(item.id);
                  const quoteItem = quoteItems.get(`${item.type}:${item.id}`);
                  const included =
                    item.type === "package"
                      ? (packagePropertyIds.get(item.id) ?? [])
                          .map((id) => propertyById.get(id))
                          .filter((property): property is AdProperty =>
                            Boolean(property),
                          )
                      : [];
                  const name =
                    quoteItem?.name ??
                    source?.name ??
                    (item.type === "package"
                      ? "Ad package"
                      : "Ad property");
                  const propertyCount =
                    quoteItem?.propertiesCount ??
                    (item.type === "package" ? included.length : 1);
                  const reach =
                    quoteItem?.monthlyReach ??
                    source?.monthly_reach ??
                    0;
                  const amount = quoteItem?.amount ?? 0;
                  const screensCount =
                    item.type === "package"
                      ? packageScreensCount(
                          item.id,
                          included,
                          packageStatsById,
                          propertyStatsById,
                        )
                      : (propertyStatsById.get(item.id)?.screens_count ??
                        propertyById.get(item.id)?.screens_count ??
                        0);

                  return (
                    <div
                      key={`${item.type}:${item.id}`}
                      className="rounded-2xl border border-[#e5e7eb] bg-[#f8fafc] p-4"
                    >
                      <div className="flex items-start gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#1d6fff] shadow-sm">
                          {item.type === "package" ? (
                            <Package aria-hidden="true" className="h-4 w-4" />
                          ) : (
                            <Building2
                              aria-hidden="true"
                              className="h-4 w-4"
                            />
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-sm font-extrabold text-[#0f172a]">
                              {name}
                            </p>
                            <span className="rounded-full bg-white px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-[#64748b]">
                              {item.type}
                            </span>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[#64748b]">
                            <span>
                              {propertyCount}{" "}
                              {propertyCount === 1
                                ? "property"
                                : "properties"}
                            </span>
                            <span>{formatReach(reach)} monthly reach</span>
                            {screensCount > 0 ? (
                              <span className="inline-flex items-center gap-1">
                                <Monitor
                                  aria-hidden="true"
                                  className="h-3 w-3"
                                />
                                {screensCount} screens
                              </span>
                            ) : (
                              <span className="text-[#94a3b8]">
                                Screens coming soon
                              </span>
                            )}
                          </div>
                          <div className="mt-3 flex flex-wrap items-end justify-between gap-2">
                            <div>
                              <p className="text-base font-extrabold text-[#0f172a]">
                                {quoteLoading ? (
                                  <span className="inline-flex items-center gap-2 text-sm text-[#94a3b8]">
                                    <Loader2
                                      aria-hidden="true"
                                      className="h-3.5 w-3.5 animate-spin"
                                    />
                                    Calculating
                                  </span>
                                ) : quoteItem ? (
                                  formatINR(amount)
                                ) : (
                                  "—"
                                )}
                              </p>
                              <p className="text-[10px] font-semibold text-[#94a3b8]">
                                for {draft.days} {draft.days === 1 ? "day" : "days"}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeItem(item)}
                              className="flex h-8 w-8 items-center justify-center rounded-full text-[#94a3b8] transition hover:bg-[#fee2e2] hover:text-[#dc2626]"
                              aria-label={`Remove ${name}`}
                            >
                              <X aria-hidden="true" className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {item.type === "package" && included.length > 0 ? (
                        <details className="group mt-3 border-t border-[#e2e8f0] pt-3">
                          <summary className="flex cursor-pointer list-none items-center gap-1.5 text-xs font-bold text-[#1d6fff] [&::-webkit-details-marker]:hidden">
                            Included properties
                            <ChevronDown
                              aria-hidden="true"
                              className="h-3.5 w-3.5 transition group-open:rotate-180"
                            />
                          </summary>
                          <ul className="mt-2 space-y-1.5">
                            {included.map((property) => {
                              const includedScreensCount =
                                propertyStatsById.get(property.id)
                                  ?.screens_count ?? 0;

                              return (
                                <li
                                  key={property.id}
                                  className="flex items-center justify-between gap-3 text-xs text-[#64748b]"
                                >
                                  <span className="truncate">
                                    {property.name}
                                  </span>
                                  <span className="flex shrink-0 items-center gap-3 font-semibold text-[#94a3b8]">
                                    {includedScreensCount > 0 ? (
                                      <span>
                                        {includedScreensCount} screens
                                      </span>
                                    ) : (
                                      <span>Screens coming soon</span>
                                    )}
                                    <span>
                                      {formatReach(property.monthly_reach)}
                                    </span>
                                  </span>
                                </li>
                              );
                            })}
                          </ul>
                        </details>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-[#dbe3ef] bg-[#f8fafc] px-4 py-8 text-center">
                <p className="text-sm font-semibold text-[#64748b]">
                  Your plan is empty.
                </p>
                <Link
                  href="/book?step=2"
                  className="mt-3 inline-flex h-9 items-center justify-center rounded-full bg-[#1d6fff] px-4 text-xs font-bold text-white"
                >
                  Add Package
                </Link>
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24">
          <section className="rounded-3xl border border-[#e5e7eb] bg-white p-5 shadow-[0_24px_70px_-40px_rgba(15,23,42,0.35)]">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-extrabold text-[#0f172a]">
                Summary
              </h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#f5f3ff] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#7c3aed]">
                {draft.tier === "platinum" ? (
                  <Zap aria-hidden="true" className="h-3 w-3" />
                ) : (
                  <Star aria-hidden="true" className="h-3 w-3" />
                )}
                {draft.tier}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-2xl bg-[#f8fafc] p-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#94a3b8]">
                  Properties
                </p>
                <p className="mt-1 text-lg font-extrabold text-[#0f172a]">
                  {quote?.propertiesCount ?? 0}
                </p>
              </div>
              <div className="rounded-2xl bg-[#f8fafc] p-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#94a3b8]">
                  Reach
                </p>
                <p className="mt-1 text-lg font-extrabold text-[#0f172a]">
                  {formatReach(quote?.monthlyReach ?? 0)}
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-2.5">
              <SummaryRow
                label="Standard Rate Total"
                value={
                  quote ? (
                    <span className="text-[#94a3b8] line-through">
                      {formatINR(quote.standardTotal)}
                    </span>
                  ) : (
                    "—"
                  )
                }
              />
              {discountPct > 0 || (quote?.onlineDiscount ?? 0) > 0 ? (
                <SummaryRow
                  label={`Discount (${percentLabel(discountPct)})`}
                  tone="success"
                  value={`− ${formatINR(quote?.onlineDiscount ?? 0)}`}
                />
              ) : null}
              {quote?.promoCode ? (
                <SummaryRow
                  label={`Promo (${quote.promoCode})`}
                  tone="success"
                  value={`− ${formatINR(quote.promoDiscount)}`}
                />
              ) : null}
              <SummaryRow
                label={`GST (${percentLabel(gstPct)})`}
                value={quote ? formatINR(quote.gstAmount) : "—"}
              />
              <SummaryRow
                label="Rounding"
                value={quote ? formatINR(quote.rounding) : "—"}
              />
            </div>

            <div className="mt-4 flex items-end justify-between gap-3 border-t border-[#e5e7eb] pt-4">
              <span className="text-sm font-bold text-[#0f172a]">Total</span>
              <span className="text-2xl font-extrabold tracking-tight text-[#0f172a]">
                {quoteLoading ? (
                  <Loader2
                    aria-hidden="true"
                    className="h-5 w-5 animate-spin text-[#1d6fff]"
                  />
                ) : quote ? (
                  formatINR(total)
                ) : (
                  "—"
                )}
              </span>
            </div>

            {discountPct > 0 ? (
              <div className="mt-4 rounded-2xl bg-gradient-to-br from-[#1d6fff] to-[#4f46e5] p-4 text-white">
                <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.1em]">
                  <Sparkles aria-hidden="true" className="h-4 w-4" />
                  {percentLabel(discountPct)} online booking discount
                </div>
                <p className="mt-1.5 text-sm font-semibold text-white/90">
                  {quote
                    ? `You're saving ${formatINR(quote.onlineDiscount)} on this plan.`
                    : "Savings are unlocked when you book online."}
                </p>
              </div>
            ) : null}

            <div className="mt-4">
              <label
                htmlFor="promo-code"
                className="mb-2 block text-xs font-bold text-[#0f172a]"
              >
                Promo code
              </label>
              <div className="flex gap-2">
                <div className="relative min-w-0 flex-1">
                  <Tag
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#94a3b8]"
                  />
                  <input
                    id="promo-code"
                    value={promoInput}
                    onChange={(event) => setPromoInput(event.target.value)}
                    placeholder="e.g. SAVE20"
                    className={cn(inputClass, "h-10 pl-9 text-xs uppercase")}
                  />
                </div>
                <button
                  type="button"
                  onClick={applyPromo}
                  disabled={!promoInput.trim() || busy}
                  className="h-10 rounded-full bg-[#0f172a] px-4 text-xs font-bold text-white transition hover:bg-[#1e293b] disabled:cursor-not-allowed disabled:bg-[#cbd5e1]"
                >
                  Apply
                </button>
              </div>
              {draft.promo ? (
                <button
                  type="button"
                  onClick={removePromo}
                  className="mt-2 text-xs font-bold text-[#dc2626] hover:text-[#b91c1c]"
                >
                  Remove promo
                </button>
              ) : null}
            </div>

            {quoteError ? (
              <div
                role="alert"
                className="mt-4 rounded-2xl border border-[#fecaca] bg-[#fef2f2] p-3 text-xs font-medium text-[#b91c1c]"
              >
                <p>{quoteError}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={removeUnavailableItems}
                    className="rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-[#b91c1c] shadow-sm"
                  >
                    Remove unavailable items
                  </button>
                  {draft.promo ? (
                    <button
                      type="button"
                      onClick={removePromo}
                      className="rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-[#b91c1c] shadow-sm"
                    >
                      Remove promo
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}

            {actionError ? (
              <div
                role="alert"
                className="mt-4 rounded-2xl border border-[#fecaca] bg-[#fef2f2] px-3 py-2.5 text-xs font-medium text-[#b91c1c]"
              >
                {actionError}
              </div>
            ) : null}

            {savedMessage ? (
              <div
                role="status"
                className="mt-4 rounded-2xl border border-[#bbf7d0] bg-[#f0fdf4] px-3 py-2.5 text-xs font-bold text-[#15803d]"
              >
                {savedMessage}
              </div>
            ) : null}

            <div className="mt-4 space-y-2">
              <button
                type="button"
                onClick={() => void savePlan(true)}
                disabled={!canAct || busy}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#1d6fff] text-sm font-extrabold text-white shadow-[0_14px_30px_-14px_rgba(29,111,255,0.9)] transition hover:bg-[#155ee7] disabled:cursor-not-allowed disabled:bg-[#cbd5e1] disabled:shadow-none"
              >
                {saving === "checkout" ? (
                  <Loader2
                    aria-hidden="true"
                    className="h-4 w-4 animate-spin"
                  />
                ) : null}
                Proceed to Checkout
              </button>
              <button
                type="button"
                onClick={() => void savePlan(false)}
                disabled={!canAct || busy}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-[#dbe3ef] bg-white text-sm font-bold text-[#0f172a] transition hover:border-[#b8c6da] hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving === "save" ? (
                  <Loader2
                    aria-hidden="true"
                    className="h-4 w-4 animate-spin"
                  />
                ) : null}
                Save for Later
              </button>
            </div>
          </section>
        </aside>
      </div>

      <div className="sticky bottom-0 z-30 mt-5 flex items-center justify-between gap-3 rounded-t-2xl border border-[#e5e7eb] bg-white/95 px-4 py-3 shadow-[0_-14px_40px_-30px_rgba(15,23,42,0.55)] backdrop-blur lg:hidden">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#94a3b8]">
            Total
          </p>
          <p className="text-lg font-extrabold text-[#0f172a]">
            {quote ? formatINR(total) : "—"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void savePlan(true)}
          disabled={!canAct || busy}
          className="inline-flex h-11 items-center justify-center rounded-full bg-[#1d6fff] px-5 text-sm font-extrabold text-white transition hover:bg-[#155ee7] disabled:cursor-not-allowed disabled:bg-[#cbd5e1]"
        >
          Proceed
        </button>
      </div>

      <p className="mt-4 text-center text-[11px] font-medium text-[#94a3b8]">
        You will review billing details and pay securely on the next step.
      </p>
    </div>
  );
}
