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
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Grid2X2,
  Landmark,
  LayoutList,
  Loader2,
  MapPin,
  Monitor,
  Package,
  Plus,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import Stepper from "@/components/booking/Stepper";
import {
  DEFAULT_AD_SETTINGS,
  addDays,
  discountedRate,
  endDate,
  formatBookingDate,
  formatINR,
  formatReach,
  getAdImageUrl,
  normalizeAdPackageStats,
  normalizeAdPropertyStats,
  todayIST,
  type AdCity,
  type AdPackage,
  type AdPackageProperty,
  type AdPackageStats,
  type AdPlace,
  type AdProperty,
  type AdPropertyStats,
  type AdPropertyType,
  type AdRateUnit,
  type AdSettings,
  type BookingItemRef,
} from "@/lib/ads";
import {
  emptyBookingDraft,
  loadBookingDraft,
  saveBookingDraft,
  type BookingDraft,
} from "@/lib/booking-draft";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type Step = 1 | 2 | 3;
type InventoryTab = "packages" | "properties";
type PropertyLayout = "grid" | "list";

interface InventoryData {
  cities: AdCity[];
  places: AdPlace[];
  types: AdPropertyType[];
  properties: AdProperty[];
  packages: AdPackage[];
  packageProperties: AdPackageProperty[];
  settings: AdSettings;
}

interface FilterOption {
  id: string;
  name: string;
}

const PAGE_SIZE = 18;
const PRESET_DURATIONS = [7, 14, 28, 56];

const inputClass =
  "h-11 w-full rounded-2xl border border-[#dbe3ef] bg-white px-4 text-sm font-medium text-[#0f172a] outline-none transition placeholder:text-[#94a3b8] focus:border-[#1d6fff] focus:ring-4 focus:ring-[#dbeafe]";

function parseStep(value: string | null): Step {
  if (value === "2") {
    return 2;
  }

  if (value === "3") {
    return 3;
  }

  return 1;
}

function unitLabel(unit: AdRateUnit): string {
  return unit === "week" ? "/wk" : "/day";
}

function packageUnitLabel(unit: AdRateUnit): string {
  return unit === "week" ? "/7d" : "/day";
}

function FilterDropdown({
  label,
  allLabel,
  options,
  selected,
  onChange,
}: {
  label: string;
  allLabel: string;
  options: FilterOption[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const selectedSet = new Set(selected);

  return (
    <details className="group relative">
      <summary className="flex h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-2xl border border-[#dbe3ef] bg-white px-4 text-sm font-semibold text-[#475569] outline-none transition hover:border-[#b8c6da] focus-visible:border-[#1d6fff] focus-visible:ring-4 focus-visible:ring-[#dbeafe] [&::-webkit-details-marker]:hidden">
        <span className="truncate">
          {selected.length > 0 ? `${label} (${selected.length})` : label}
        </span>
        <ChevronDown
          aria-hidden="true"
          className="h-4 w-4 shrink-0 transition group-open:rotate-180"
        />
      </summary>
      <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-30 max-h-64 overflow-y-auto rounded-2xl border border-[#e5e7eb] bg-white p-2 shadow-[0_24px_70px_-30px_rgba(15,23,42,0.45)]">
        <button
          type="button"
          onClick={() => onChange([])}
          className={cn(
            "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-semibold transition hover:bg-[#f8fafc]",
            selected.length === 0 ? "text-[#1d6fff]" : "text-[#334155]",
          )}
        >
          {allLabel}
          {selected.length === 0 ? (
            <Check aria-hidden="true" className="h-4 w-4" />
          ) : null}
        </button>
        {options.map((option) => (
          <label
            key={option.id}
            className="flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-[#475569] transition hover:bg-[#f8fafc]"
          >
            <input
              type="checkbox"
              checked={selectedSet.has(option.id)}
              onChange={(event) => {
                if (event.target.checked) {
                  onChange([...selected, option.id]);
                } else {
                  onChange(selected.filter((id) => id !== option.id));
                }
              }}
              className="h-4 w-4 rounded border-[#cbd5e1] text-[#1d6fff] focus:ring-[#1d6fff]"
            />
            <span className="truncate">{option.name}</span>
          </label>
        ))}
      </div>
    </details>
  );
}

function EmptyImage({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center justify-center bg-gradient-to-br from-[#e0f2fe] via-[#f1f5f9] to-[#e2e8f0] text-[#1d6fff]",
        className,
      )}
    >
      <Building2 aria-hidden="true" className="h-8 w-8" />
    </div>
  );
}

function PackageMosaic({
  properties,
  discountPct,
  propertyStatsById,
}: {
  properties: AdProperty[];
  discountPct: number;
  propertyStatsById: Map<string, AdPropertyStats>;
}) {
  const visible = properties.slice(0, 3);

  if (visible.length === 0) {
    return (
      <div className="h-48 overflow-hidden rounded-2xl">
        <EmptyImage className="h-full w-full" />
      </div>
    );
  }

  return (
    <div className="grid h-48 grid-cols-2 grid-rows-2 gap-1 overflow-hidden rounded-2xl bg-[#e2e8f0]">
      {visible.map((property, index) => {
        const imageUrl = getAdImageUrl(property.image_path);
        const screensCount =
          propertyStatsById.get(property.id)?.screens_count ?? 0;

        return (
          <div
            key={property.id}
            className={cn(
              "relative overflow-hidden",
              visible.length === 1 && "col-span-2 row-span-2",
              visible.length === 2 && "row-span-2",
              visible.length === 3 && index === 0 && "row-span-2",
            )}
          >
            {imageUrl ? (
              <img
                src={imageUrl}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover"
              />
            ) : (
              <EmptyImage className="h-full w-full" />
            )}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#020617]/85 via-[#020617]/35 to-transparent px-2.5 pb-2 pt-8 text-white">
              <p className="truncate text-[11px] font-bold">{property.name}</p>
              <p className="text-[10px] text-white/75">
                {formatINR(discountedRate(property.rate, discountPct))}{" "}
                {unitLabel(property.rate_unit)}
              </p>
              {screensCount > 0 ? (
                <p className="text-[10px] text-white/75">
                  {screensCount} screens
                </p>
              ) : (
                <p className="text-[10px] text-[#94a3b8]">
                  Screens coming soon
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StepShell({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "w-full rounded-3xl border border-[#e5e7eb] bg-white p-5 shadow-[0_30px_80px_-50px_rgba(15,23,42,0.35)] sm:p-8",
        className,
      )}
    >
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-[#0f172a] sm:text-3xl">
          {title}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#64748b]">
          {description}
        </p>
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}

export default function BookWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedStep = useRef<Step>(parseStep(searchParams.get("step")));
  const [step, setStep] = useState<Step>(1);
  const [draft, setDraft] = useState<BookingDraft>(() => emptyBookingDraft());
  const [ready, setReady] = useState(false);
  const [data, setData] = useState<InventoryData | null>(null);
  const [propertyStats, setPropertyStats] = useState<AdPropertyStats[]>([]);
  const [packageStats, setPackageStats] = useState<AdPackageStats[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [citySearch, setCitySearch] = useState("");
  const [inventoryTab, setInventoryTab] = useState<InventoryTab>("packages");
  const [packageSearch, setPackageSearch] = useState("");
  const [propertySearch, setPropertySearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [placeFilter, setPlaceFilter] = useState<string[]>([]);
  const [propertyLayout, setPropertyLayout] =
    useState<PropertyLayout>("grid");
  const [page, setPage] = useState(1);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedPageProperties, setSelectedPageProperties] = useState<
    Set<string>
  >(new Set<string>());
  const [customDuration, setCustomDuration] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const supabase = createClient();
      const [
        citiesResult,
        placesResult,
        typesResult,
        propertiesResult,
        packagesResult,
        packagePropertiesResult,
        propertyStatsResult,
        packageStatsResult,
        settingsResult,
      ] = await Promise.all([
        supabase
          .from("ad_cities")
          .select("id, name, state, is_active, sort")
          .eq("is_active", true)
          .order("sort", { ascending: true })
          .order("name", { ascending: true }),
        supabase
          .from("ad_places")
          .select("id, city_id, name, is_active, sort")
          .eq("is_active", true)
          .order("sort", { ascending: true })
          .order("name", { ascending: true }),
        supabase
          .from("ad_property_types")
          .select("id, name, sort")
          .order("sort", { ascending: true })
          .order("name", { ascending: true }),
        supabase
          .from("ad_properties")
          .select(
            "id, city_id, place_id, type_id, name, description, image_path, screens_count, monthly_reach, rate, rate_unit, is_active, sort",
          )
          .eq("is_active", true)
          .order("sort", { ascending: true })
          .order("name", { ascending: true }),
        supabase
          .from("ad_packages")
          .select(
            "id, city_id, type_id, name, description, monthly_reach, rate, rate_unit, is_active, sort",
          )
          .eq("is_active", true)
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
      ]);

      if (cancelled) {
        return;
      }

      setPropertyStats(normalizeAdPropertyStats(propertyStatsResult.data));
      setPackageStats(normalizeAdPackageStats(packageStatsResult.data));

      const cities = (citiesResult.data ?? []) as AdCity[];
      const nextData: InventoryData = {
        cities,
        places: (placesResult.data ?? []) as AdPlace[],
        types: (typesResult.data ?? []) as AdPropertyType[],
        properties: (propertiesResult.data ?? []) as AdProperty[],
        packages: (packagesResult.data ?? []) as AdPackage[],
        packageProperties: (packagePropertiesResult.data ??
          []) as AdPackageProperty[],
        settings:
          (settingsResult.data as AdSettings | null) ?? DEFAULT_AD_SETTINGS,
      };

      setData(nextData);
      setLoadError(
        citiesResult.error?.message ??
          placesResult.error?.message ??
          typesResult.error?.message ??
          propertiesResult.error?.message ??
          packagesResult.error?.message ??
          packagePropertiesResult.error?.message ??
          settingsResult.error?.message ??
          null,
      );

      const stored = loadBookingDraft();
      const base = stored ?? emptyBookingDraft();
      const hasCity = Boolean(
        base.cityId && cities.some((city) => city.id === base.cityId),
      );
      const nextDraft = hasCity
        ? base
        : {
            ...base,
            cityId: "",
            areaIds: [],
            items: [],
          };
      const requested = requestedStep.current;
      const initialStep: Step = !hasCity
        ? 1
        : requested === 3 && nextDraft.items.length === 0
          ? 2
          : requested;

      setDraft(nextDraft);
      setStep(initialStep);
      setReady(true);
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (ready) {
      saveBookingDraft(draft);
    }
  }, [draft, ready]);

  useEffect(() => {
    if (!ready) {
      return;
    }

    setPlaceFilter(draft.areaIds);
  }, [draft.areaIds, draft.cityId, ready]);

  useEffect(() => {
    if (!notice) {
      return;
    }

    const timer = window.setTimeout(() => setNotice(null), 4200);

    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    setPage(1);
  }, [draft.cityId, placeFilter, propertySearch, typeFilter]);

  const cities = data?.cities ?? [];
  const places = data?.places ?? [];
  const types = data?.types ?? [];
  const properties = data?.properties ?? [];
  const packages = data?.packages ?? [];
  const packageProperties = data?.packageProperties ?? [];
  const settings = data?.settings ?? DEFAULT_AD_SETTINGS;

  const selectedCity = cities.find((city) => city.id === draft.cityId) ?? null;
  const cityPlaces = places.filter((place) => place.city_id === draft.cityId);
  const typeById = useMemo(
    () => new Map(types.map((type) => [type.id, type])),
    [types],
  );
  const placeById = useMemo(
    () => new Map(places.map((place) => [place.id, place])),
    [places],
  );
  const propertyById = useMemo(
    () => new Map(properties.map((property) => [property.id, property])),
    [properties],
  );
  const packageById = useMemo(
    () => new Map(packages.map((item) => [item.id, item])),
    [packages],
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

  const selectedPackageIds = useMemo(
    () =>
      new Set(
        draft.items
          .filter((item) => item.type === "package")
          .map((item) => item.id),
      ),
    [draft.items],
  );
  const selectedPropertyIds = useMemo(
    () =>
      new Set(
        draft.items
          .filter((item) => item.type === "property")
          .map((item) => item.id),
      ),
    [draft.items],
  );
  const includedProperties = useMemo(() => {
    const map = new Map<string, string>();

    for (const packageId of selectedPackageIds) {
      const packageName =
        packageById.get(packageId)?.name ?? "a selected package";
      const ids = packagePropertyIds.get(packageId) ?? [];

      for (const id of ids) {
        if (!map.has(id)) {
          map.set(id, packageName);
        }
      }
    }

    return map;
  }, [packageById, packagePropertyIds, selectedPackageIds]);

  const filteredCities = cities.filter((city) => {
    const query = citySearch.trim().toLowerCase();

    if (!query) {
      return true;
    }

    return (
      city.name.toLowerCase().includes(query) ||
      (city.state ?? "").toLowerCase().includes(query)
    );
  });

  const cityPackages = packages.filter((item) => {
    if (item.city_id !== draft.cityId) {
      return false;
    }

    const query = packageSearch.trim().toLowerCase();

    return (
      !query ||
      item.name.toLowerCase().includes(query) ||
      (item.description ?? "").toLowerCase().includes(query)
    );
  });

  const filteredProperties = properties.filter((property) => {
    if (property.city_id !== draft.cityId) {
      return false;
    }

    const query = propertySearch.trim().toLowerCase();

    if (query) {
      const placeName = property.place_id
        ? placeById.get(property.place_id)?.name ?? ""
        : "";

      if (
        !property.name.toLowerCase().includes(query) &&
        !placeName.toLowerCase().includes(query)
      ) {
        return false;
      }
    }

    if (
      typeFilter.length > 0 &&
      (!property.type_id || !typeFilter.includes(property.type_id))
    ) {
      return false;
    }

    if (
      placeFilter.length > 0 &&
      (!property.place_id || !placeFilter.includes(property.place_id))
    ) {
      return false;
    }

    return true;
  });

  const pageCount = Math.max(1, Math.ceil(filteredProperties.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pagedProperties = filteredProperties.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );
  const addableOnPage = pagedProperties.filter(
    (property) =>
      !includedProperties.has(property.id) &&
      !selectedPropertyIds.has(property.id),
  );

  const activeStep: Step =
    !draft.cityId
      ? 1
      : step === 3 && draft.items.length === 0
        ? 2
        : step;

  const today = todayIST();
  const maxStartDate = addDays(today, 365);
  const startDateValid =
    /^\d{4}-\d{2}-\d{2}$/.test(draft.startDate) &&
    draft.startDate >= today &&
    draft.startDate <= maxStartDate;
  const validDays =
    Number.isInteger(draft.days) && draft.days >= 1 && draft.days <= 365;
  const showCustomDuration =
    customDuration || !PRESET_DURATIONS.includes(draft.days);

  const goToStep = (next: Step) => {
    setStep(next);
    router.replace(next === 1 ? "/book" : `/book?step=${next}`, {
      scroll: false,
    });
  };

  const selectCity = (city: AdCity) => {
    setDraft((current) => {
      if (current.cityId === city.id) {
        return current;
      }

      return {
        ...current,
        cityId: city.id,
        areaIds: [],
        items: [],
      };
    });
    setPlaceFilter([]);
  };

  const addPackage = (item: AdPackage) => {
    if (selectedPackageIds.has(item.id)) {
      return;
    }

    const includedIds = new Set(packagePropertyIds.get(item.id) ?? []);
    const removedCount = draft.items.filter(
      (entry) => entry.type === "property" && includedIds.has(entry.id),
    ).length;

    setDraft((current) => {
      if (
        current.items.some(
          (entry) => entry.type === "package" && entry.id === item.id,
        )
      ) {
        return current;
      }

      return {
        ...current,
        items: [
          ...current.items.filter(
            (entry) =>
              !(entry.type === "property" && includedIds.has(entry.id)),
          ),
          { type: "package", id: item.id },
        ],
      };
    });

    if (removedCount > 0) {
      setNotice(
        `${removedCount} selected ${
          removedCount === 1 ? "property is" : "properties are"
        } now included in ${item.name}.`,
      );
    }
  };

  const addProperties = (ids: string[], clearSelection = false) => {
    const addable = ids.filter(
      (id) => !includedProperties.has(id) && !selectedPropertyIds.has(id),
    );

    if (addable.length === 0) {
      return;
    }

    setDraft((current) => {
      const existing = new Set(
        current.items.map((item) => `${item.type}:${item.id}`),
      );
      const additions: BookingItemRef[] = addable
        .filter((id) => !existing.has(`property:${id}`))
        .map((id) => ({ type: "property", id }));

      return {
        ...current,
        items: [...current.items, ...additions],
      };
    });

    if (clearSelection) {
      setSelectedPageProperties(new Set<string>());
      setSelectMode(false);
    }
  };

  const removeItem = (item: BookingItemRef) => {
    setDraft((current) => ({
      ...current,
      items: current.items.filter(
        (entry) => entry.type !== item.type || entry.id !== item.id,
      ),
    }));
  };

  const toggleSelectedProperty = (id: string) => {
    setSelectedPageProperties((current) => {
      const next = new Set(current);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  };

  if (!ready || !data) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center py-24 text-center">
        <Loader2
          aria-hidden="true"
          className="h-7 w-7 animate-spin text-[#1d6fff]"
        />
        <p className="mt-4 text-sm font-semibold text-[#64748b]">
          Loading booking options...
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-8">
      <Stepper current={activeStep} />

      {loadError ? (
        <div className="rounded-2xl border border-[#fcd34d] bg-[#fffbeb] px-4 py-3 text-sm font-medium text-[#92400e]">
          Some booking data could not be loaded. Please refresh and try again.
        </div>
      ) : null}

      {notice ? (
        <div
          role="status"
          className="fixed bottom-24 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-start gap-3 rounded-2xl border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-3 text-sm font-semibold text-[#166534] shadow-[0_24px_60px_-24px_rgba(15,23,42,0.4)]"
        >
          <Sparkles aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{notice}</span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="ml-auto text-[#166534]/70 hover:text-[#166534]"
            aria-label="Dismiss notice"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      {activeStep === 1 ? (
        <StepShell
          title="Select a city"
          description="Choose where your campaign should appear. You can refine locations once you pick your inventory."
          className="mx-auto max-w-4xl"
        >
          <label htmlFor="city-search" className="sr-only">
            Search cities
          </label>
          <div className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]"
            />
            <input
              id="city-search"
              value={citySearch}
              onChange={(event) => setCitySearch(event.target.value)}
              placeholder="Search cities..."
              className={cn(inputClass, "pl-11")}
            />
          </div>

          <div className="mt-7 flex items-center gap-3">
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#94a3b8]">
              Or select your city
            </span>
            <span className="h-px flex-1 bg-[#e5e7eb]" />
          </div>

          {filteredCities.length > 0 ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredCities.map((city) => {
                const selected = city.id === draft.cityId;

                return (
                  <button
                    key={city.id}
                    type="button"
                    onClick={() => selectCity(city)}
                    aria-pressed={selected}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl border bg-white p-4 text-left transition",
                      selected
                        ? "border-[#1d6fff] ring-4 ring-[#dbeafe]"
                        : "border-[#e5e7eb] hover:border-[#b8c6da] hover:bg-[#f8fafc]",
                    )}
                  >
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#ecfeff] text-[#0891b2]">
                      <Landmark aria-hidden="true" className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-[#0f172a]">
                        {city.name}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-[#64748b]">
                        {city.state || "India"}
                      </span>
                    </span>
                    {selected ? (
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1d6fff] text-white">
                        <Check aria-hidden="true" className="h-3.5 w-3.5" />
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-dashed border-[#dbe3ef] bg-[#f8fafc] px-5 py-10 text-center text-sm font-semibold text-[#64748b]">
              More cities coming soon
            </div>
          )}

          {selectedCity ? (
            <div className="mt-7 rounded-2xl border border-[#e5e7eb] bg-[#f8fafc] p-4">
              <p className="text-sm font-bold text-[#0f172a]">
                Popular places in {selectedCity.name}
              </p>
              <p className="mt-1 text-xs text-[#64748b]">
                Pick the areas you want to prioritize. You can adjust this
                later.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {cityPlaces.length > 0 ? (
                  cityPlaces.map((place) => {
                    const selected = draft.areaIds.includes(place.id);

                    return (
                      <button
                        key={place.id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() =>
                          setDraft((current) => ({
                            ...current,
                            areaIds: selected
                              ? current.areaIds.filter((id) => id !== place.id)
                              : [...current.areaIds, place.id],
                          }))
                        }
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                          selected
                            ? "border-[#1d6fff] bg-[#eff6ff] text-[#1d6fff]"
                            : "border-[#dbe3ef] bg-white text-[#475569] hover:border-[#b8c6da]",
                        )}
                      >
                        {selected ? (
                          <Check aria-hidden="true" className="h-3 w-3" />
                        ) : (
                          <MapPin aria-hidden="true" className="h-3 w-3" />
                        )}
                        {place.name}
                      </button>
                    );
                  })
                ) : (
                  <span className="text-xs text-[#64748b]">
                    Choose a location in the next step.
                  </span>
                )}
              </div>
            </div>
          ) : null}

          <div className="mt-8 flex justify-end">
            <button
              type="button"
              disabled={!selectedCity}
              onClick={() => goToStep(2)}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#1d6fff] px-6 text-sm font-bold text-white shadow-[0_14px_30px_-14px_rgba(29,111,255,0.9)] transition hover:bg-[#155ee7] disabled:cursor-not-allowed disabled:bg-[#cbd5e1] disabled:shadow-none"
            >
              Continue
              <ChevronRight aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        </StepShell>
      ) : null}

      {activeStep === 2 ? (
        <StepShell
          title="Add Properties"
          description="Pick a ready-made package or build your own mix of ad properties."
          className="mx-auto max-w-6xl"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#eff6ff] px-3 py-1.5 text-sm font-bold text-[#1d6fff]">
              <MapPin aria-hidden="true" className="h-4 w-4" />
              {selectedCity?.name}
            </div>
            <button
              type="button"
              onClick={() => goToStep(1)}
              className="text-sm font-semibold text-[#64748b] transition hover:text-[#0f172a]"
            >
              Cancel
            </button>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-b border-[#e5e7eb] pb-4">
            <div className="inline-flex rounded-full bg-[#f1f5f9] p-1">
              <button
                type="button"
                onClick={() => setInventoryTab("packages")}
                className={cn(
                  "inline-flex h-9 items-center gap-2 rounded-full px-4 text-sm font-bold transition",
                  inventoryTab === "packages"
                    ? "bg-white text-[#0f172a] shadow-sm"
                    : "text-[#64748b] hover:text-[#0f172a]",
                )}
              >
                <Package aria-hidden="true" className="h-4 w-4" />
                Packages
              </button>
              <button
                type="button"
                onClick={() => setInventoryTab("properties")}
                className={cn(
                  "inline-flex h-9 items-center gap-2 rounded-full px-4 text-sm font-bold transition",
                  inventoryTab === "properties"
                    ? "bg-white text-[#0f172a] shadow-sm"
                    : "text-[#64748b] hover:text-[#0f172a]",
                )}
              >
                <Building2 aria-hidden="true" className="h-4 w-4" />
                Properties
              </button>
            </div>
            <span className="rounded-full bg-[#f8fafc] px-3 py-1.5 text-xs font-bold text-[#475569]">
              {draft.items.length} selected
            </span>
          </div>

          {inventoryTab === "packages" ? (
            <div className="mt-5 space-y-5">
              <div className="relative">
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]"
                />
                <input
                  value={packageSearch}
                  onChange={(event) => setPackageSearch(event.target.value)}
                  placeholder="Search packages..."
                  aria-label="Search packages"
                  className={cn(inputClass, "pl-11")}
                />
              </div>

              {cityPackages.length > 0 ? (
                <div className="space-y-4">
                  {cityPackages.map((item) => {
                    const selected = selectedPackageIds.has(item.id);
                    const included = (packagePropertyIds.get(item.id) ?? [])
                      .map((id) => propertyById.get(id))
                      .filter((property): property is AdProperty =>
                        Boolean(property),
                      );
                    const discountPct = settings.online_discount_pct;
                    const price = discountedRate(item.rate, discountPct);
                    const packageStat = packageStatsById.get(item.id);
                    const propertiesCount = packageStat?.properties_count ?? 0;
                    const screensCount = packageStat?.screens_count ?? 0;

                    return (
                      <article
                        key={item.id}
                        className={cn(
                          "overflow-hidden rounded-3xl border bg-white transition",
                          selected
                            ? "border-[#16a34a] ring-4 ring-[#dcfce7]"
                            : "border-[#e5e7eb]",
                        )}
                      >
                        <div className="grid gap-5 p-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:p-5">
                          <div className="flex min-w-0 flex-col">
                            <div className="flex flex-wrap items-center gap-2">
                              <h2 className="text-lg font-extrabold text-[#0f172a]">
                                {item.name}
                              </h2>
                              {item.type_id && typeById.get(item.type_id) ? (
                                <span className="rounded-full bg-[#f1f5f9] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#475569]">
                                  {typeById.get(item.type_id)?.name}
                                </span>
                              ) : null}
                              {screensCount > 0 ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-[#f1f5f9] px-2.5 py-1 text-[10px] font-bold text-[#475569]">
                                  <Monitor
                                    aria-hidden="true"
                                    className="h-3 w-3"
                                  />
                                  {propertiesCount} properties · {screensCount}{" "}
                                  screens
                                </span>
                              ) : (
                                <span className="rounded-full bg-[#f1f5f9] px-2.5 py-1 text-[10px] font-bold text-[#94a3b8]">
                                  Screens coming soon
                                </span>
                              )}
                            </div>
                            <p className="mt-2 line-clamp-3 text-sm leading-6 text-[#64748b]">
                              {item.description ||
                                "A curated bundle of high-impact ad placements."}
                            </p>
                            <p className="mt-3 text-xs font-bold uppercase tracking-[0.14em] text-[#0891b2]">
                              {formatReach(item.monthly_reach)} monthly reach
                            </p>
                            <div className="mt-auto flex flex-wrap items-end gap-x-2 gap-y-1 pt-5">
                              {discountPct > 0 ? (
                                <span className="text-sm font-semibold text-[#94a3b8] line-through">
                                  {formatINR(item.rate)}
                                </span>
                              ) : null}
                              <span className="text-2xl font-extrabold tracking-tight text-[#0f172a]">
                                {formatINR(price)}
                              </span>
                              <span className="pb-1 text-xs font-semibold text-[#64748b]">
                                {packageUnitLabel(item.rate_unit)}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                selected
                                  ? removeItem({ type: "package", id: item.id })
                                  : addPackage(item)
                              }
                              className={cn(
                                "mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full text-sm font-bold transition",
                                selected
                                  ? "bg-[#dcfce7] text-[#15803d] hover:bg-[#bbf7d0]"
                                  : "bg-[#1d6fff] text-white hover:bg-[#155ee7]",
                              )}
                            >
                              {selected ? (
                                <>
                                  <Check
                                    aria-hidden="true"
                                    className="h-4 w-4"
                                  />
                                  Added · Remove
                                </>
                              ) : (
                                <>
                                  <Plus aria-hidden="true" className="h-4 w-4" />
                                  Add Package
                                </>
                              )}
                            </button>
                          </div>

                          <PackageMosaic
                            properties={included}
                            discountPct={discountPct}
                            propertyStatsById={propertyStatsById}
                          />
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-3xl border border-dashed border-[#dbe3ef] bg-[#f8fafc] px-5 py-14 text-center text-sm font-semibold text-[#64748b]">
                  No packages or properties available yet.
                </div>
              )}
            </div>
          ) : (
            <div className="mt-5 space-y-5">
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_12rem_12rem_auto]">
                <div className="relative">
                  <Search
                    aria-hidden="true"
                    className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]"
                  />
                  <input
                    value={propertySearch}
                    onChange={(event) => setPropertySearch(event.target.value)}
                    placeholder="Search by name or zone..."
                    aria-label="Search properties"
                    className={cn(inputClass, "pl-11")}
                  />
                </div>
                <FilterDropdown
                  label="Property type"
                  allLabel="All properties"
                  options={types.map((type) => ({
                    id: type.id,
                    name: type.name,
                  }))}
                  selected={typeFilter}
                  onChange={setTypeFilter}
                />
                <FilterDropdown
                  label="Location"
                  allLabel="All locations"
                  options={cityPlaces.map((place) => ({
                    id: place.id,
                    name: place.name,
                  }))}
                  selected={placeFilter}
                  onChange={setPlaceFilter}
                />
                <div className="flex items-center gap-1 rounded-2xl border border-[#dbe3ef] bg-white p-1">
                  <button
                    type="button"
                    aria-label="Grid view"
                    aria-pressed={propertyLayout === "grid"}
                    onClick={() => setPropertyLayout("grid")}
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-xl transition",
                      propertyLayout === "grid"
                        ? "bg-[#eff6ff] text-[#1d6fff]"
                        : "text-[#94a3b8] hover:text-[#475569]",
                    )}
                  >
                    <Grid2X2 aria-hidden="true" className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="List view"
                    aria-pressed={propertyLayout === "list"}
                    onClick={() => setPropertyLayout("list")}
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-xl transition",
                      propertyLayout === "list"
                        ? "bg-[#eff6ff] text-[#1d6fff]"
                        : "text-[#94a3b8] hover:text-[#475569]",
                    )}
                  >
                    <LayoutList aria-hidden="true" className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs font-semibold text-[#64748b]">
                  {filteredProperties.length}{" "}
                  {filteredProperties.length === 1 ? "property" : "properties"}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectMode((current) => !current);
                      setSelectedPageProperties(new Set<string>());
                    }}
                    className={cn(
                      "h-9 rounded-full border px-4 text-xs font-bold transition",
                      selectMode
                        ? "border-[#1d6fff] bg-[#eff6ff] text-[#1d6fff]"
                        : "border-[#dbe3ef] bg-white text-[#475569] hover:border-[#b8c6da]",
                    )}
                  >
                    {selectMode ? "Cancel selection" : "Select"}
                  </button>
                  <button
                    type="button"
                    disabled={addableOnPage.length === 0}
                    onClick={() =>
                      addProperties(addableOnPage.map((item) => item.id))
                    }
                    className="h-9 rounded-full bg-[#1d6fff] px-4 text-xs font-bold text-white transition hover:bg-[#155ee7] disabled:cursor-not-allowed disabled:bg-[#cbd5e1]"
                  >
                    + Add {addableOnPage.length} on page
                  </button>
                </div>
              </div>

              {pagedProperties.length > 0 ? (
                <div
                  className={cn(
                    propertyLayout === "grid"
                      ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
                      : "space-y-3",
                  )}
                >
                  {pagedProperties.map((property) => {
                    const imageUrl = getAdImageUrl(property.image_path);
                    const place = property.place_id
                      ? placeById.get(property.place_id)
                      : null;
                    const type = property.type_id
                      ? typeById.get(property.type_id)
                      : null;
                    const includedIn = includedProperties.get(property.id);
                    const selected = selectedPropertyIds.has(property.id);
                    const checked = selectedPageProperties.has(property.id);
                    const discountPct = settings.online_discount_pct;
                    const price = discountedRate(property.rate, discountPct);
                    const screensCount =
                      propertyStatsById.get(property.id)?.screens_count ??
                      property.screens_count;
                    const disabled = Boolean(includedIn) || selected;

                    return (
                      <article
                        key={property.id}
                        className={cn(
                          "overflow-hidden rounded-3xl border bg-white transition",
                          propertyLayout === "list" &&
                            "flex sm:items-stretch",
                          selected
                            ? "border-[#16a34a] ring-2 ring-[#dcfce7]"
                            : "border-[#e5e7eb] hover:border-[#b8c6da]",
                        )}
                      >
                        <div
                          className={cn(
                            "relative shrink-0 bg-[#f1f5f9]",
                            propertyLayout === "grid"
                              ? "aspect-[4/3]"
                              : "h-32 w-32 sm:h-auto sm:w-44",
                          )}
                        >
                          {imageUrl ? (
                            <img
                              src={imageUrl}
                              alt=""
                              loading="lazy"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <EmptyImage className="h-full w-full" />
                          )}
                          {selectMode && !disabled ? (
                            <label className="absolute left-3 top-3 flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl border border-white/80 bg-white/90 shadow-sm">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() =>
                                  toggleSelectedProperty(property.id)
                                }
                                aria-label={`Select ${property.name}`}
                                className="h-4 w-4 rounded border-[#cbd5e1] text-[#1d6fff] focus:ring-[#1d6fff]"
                              />
                            </label>
                          ) : null}
                        </div>

                        <div className="flex min-w-0 flex-1 flex-col p-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-[#f1f5f9] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#475569]">
                              {type?.name || "Ad property"}
                            </span>
                            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#0891b2]">
                              {formatReach(property.monthly_reach)} reach
                            </span>
                            {screensCount > 0 ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-[#f1f5f9] px-2.5 py-1 text-[10px] font-bold text-[#475569]">
                                <Monitor
                                  aria-hidden="true"
                                  className="h-3 w-3"
                                />
                                {screensCount} screens
                              </span>
                            ) : (
                              <span className="text-[10px] font-semibold text-[#94a3b8]">
                                Screens coming soon
                              </span>
                            )}
                          </div>
                          <h3 className="mt-2 truncate text-sm font-extrabold text-[#0f172a]">
                            {property.name}
                          </h3>
                          <p className="mt-1 flex items-center gap-1 truncate text-xs text-[#64748b]">
                            <MapPin aria-hidden="true" className="h-3 w-3" />
                            {place?.name || "Central location"}
                          </p>

                          <div className="mt-auto flex flex-wrap items-end justify-between gap-2 pt-4">
                            <div>
                              {discountPct > 0 ? (
                                <span className="mr-1.5 text-xs font-semibold text-[#94a3b8] line-through">
                                  {formatINR(property.rate)}
                                </span>
                              ) : null}
                              <span className="text-lg font-extrabold text-[#0f172a]">
                                {formatINR(price)}
                              </span>
                              <span className="ml-1 text-[11px] font-semibold text-[#64748b]">
                                {unitLabel(property.rate_unit)}
                              </span>
                            </div>
                            {includedIn ? (
                              <span className="max-w-full rounded-full bg-[#dcfce7] px-2.5 py-1 text-[10px] font-bold text-[#15803d]">
                                Included in {includedIn}
                              </span>
                            ) : selected ? (
                              <button
                                type="button"
                                onClick={() =>
                                  removeItem({
                                    type: "property",
                                    id: property.id,
                                  })
                                }
                                className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#dcfce7] px-3 text-xs font-bold text-[#15803d] transition hover:bg-[#bbf7d0]"
                              >
                                <Check aria-hidden="true" className="h-3.5 w-3.5" />
                                Added
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => addProperties([property.id])}
                                className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#1d6fff] px-3 text-xs font-bold text-white transition hover:bg-[#155ee7]"
                              >
                                <Plus aria-hidden="true" className="h-3.5 w-3.5" />
                                Add
                              </button>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-3xl border border-dashed border-[#dbe3ef] bg-[#f8fafc] px-5 py-14 text-center text-sm font-semibold text-[#64748b]">
                  No packages or properties available yet.
                </div>
              )}

              {filteredProperties.length > PAGE_SIZE ? (
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    disabled={safePage <= 1}
                    onClick={() => setPage(safePage - 1)}
                    className="inline-flex h-9 items-center gap-1 rounded-full border border-[#dbe3ef] bg-white px-3 text-xs font-bold text-[#475569] transition hover:border-[#b8c6da] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft aria-hidden="true" className="h-4 w-4" />
                    Previous
                  </button>
                  <span className="text-xs font-semibold text-[#64748b]">
                    Page {safePage} of {pageCount}
                  </span>
                  <button
                    type="button"
                    disabled={safePage >= pageCount}
                    onClick={() => setPage(safePage + 1)}
                    className="inline-flex h-9 items-center gap-1 rounded-full border border-[#dbe3ef] bg-white px-3 text-xs font-bold text-[#475569] transition hover:border-[#b8c6da] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next
                    <ChevronRight aria-hidden="true" className="h-4 w-4" />
                  </button>
                </div>
              ) : null}
            </div>
          )}

          <div className="sticky bottom-4 z-20 mt-8 space-y-2">
            {selectMode && selectedPageProperties.size > 0 ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#bfdbfe] bg-[#eff6ff] px-4 py-3 shadow-[0_20px_50px_-30px_rgba(15,23,42,0.45)]">
                <p className="text-sm font-bold text-[#1e3a8a]">
                  {selectedPageProperties.size} selected on this page
                </p>
                <button
                  type="button"
                  onClick={() =>
                    addProperties(
                      Array.from(selectedPageProperties),
                      true,
                    )
                  }
                  className="inline-flex h-9 items-center justify-center rounded-full bg-[#1d6fff] px-4 text-xs font-bold text-white transition hover:bg-[#155ee7]"
                >
                  Add selected ({selectedPageProperties.size})
                </button>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#e5e7eb] bg-white/95 px-4 py-3 shadow-[0_20px_50px_-30px_rgba(15,23,42,0.45)] backdrop-blur">
              <p className="text-sm font-bold text-[#0f172a]">
                {draft.items.length}{" "}
                {draft.items.length === 1 ? "item" : "items"} selected
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => goToStep(1)}
                  className="inline-flex h-10 items-center gap-1.5 rounded-full border border-[#dbe3ef] bg-white px-4 text-sm font-bold text-[#475569] transition hover:border-[#b8c6da]"
                >
                  <ChevronLeft aria-hidden="true" className="h-4 w-4" />
                  Back
                </button>
                <button
                  type="button"
                  disabled={draft.items.length === 0}
                  onClick={() => goToStep(3)}
                  className="inline-flex h-10 items-center gap-1.5 rounded-full bg-[#1d6fff] px-5 text-sm font-bold text-white transition hover:bg-[#155ee7] disabled:cursor-not-allowed disabled:bg-[#cbd5e1]"
                >
                  Continue
                  <ChevronRight aria-hidden="true" className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </StepShell>
      ) : null}

      {activeStep === 3 ? (
        <StepShell
          title="When should it run?"
          description="Set the start date and duration for your campaign."
          className="mx-auto max-w-2xl"
        >
          <div className="flex justify-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#eff6ff] text-[#1d6fff]">
              <CalendarDays aria-hidden="true" className="h-7 w-7" />
            </span>
          </div>

          <div className="mt-6 space-y-5">
            <div>
              <label
                htmlFor="start-date"
                className="mb-2 block text-sm font-bold text-[#0f172a]"
              >
                Start Date
              </label>
              <input
                id="start-date"
                type="date"
                value={startDateValid ? draft.startDate : today}
                min={today}
                max={maxStartDate}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    startDate: event.target.value,
                  }))
                }
                className={inputClass}
              />
            </div>

            <div>
              <p className="mb-2 text-sm font-bold text-[#0f172a]">
                Duration
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  { days: 7, label: "1w" },
                  { days: 14, label: "2w" },
                  { days: 28, label: "4w" },
                  { days: 56, label: "8w" },
                ].map((option) => (
                  <button
                    key={option.days}
                    type="button"
                    aria-pressed={draft.days === option.days}
                    onClick={() => {
                      setCustomDuration(false);
                      setDraft((current) => ({
                        ...current,
                        days: option.days,
                      }));
                    }}
                    className={cn(
                      "h-10 rounded-full border px-4 text-sm font-bold transition",
                      draft.days === option.days && !customDuration
                        ? "border-[#1d6fff] bg-[#eff6ff] text-[#1d6fff]"
                        : "border-[#dbe3ef] bg-white text-[#475569] hover:border-[#b8c6da]",
                    )}
                  >
                    {option.label}
                  </button>
                ))}
                <button
                  type="button"
                  aria-pressed={showCustomDuration}
                  onClick={() => setCustomDuration(true)}
                  className={cn(
                    "h-10 rounded-full border px-4 text-sm font-bold transition",
                    showCustomDuration
                      ? "border-[#1d6fff] bg-[#eff6ff] text-[#1d6fff]"
                      : "border-[#dbe3ef] bg-white text-[#475569] hover:border-[#b8c6da]",
                  )}
                >
                  Custom
                </button>
              </div>

              {showCustomDuration ? (
                <div className="mt-3 flex items-center gap-3">
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={draft.days}
                    onChange={(event) => {
                      const parsed = Number(event.target.value);
                      setDraft((current) => ({
                        ...current,
                        days: Number.isFinite(parsed)
                          ? Math.min(Math.max(Math.round(parsed), 1), 365)
                          : 1,
                      }));
                    }}
                    aria-label="Custom duration in days"
                    className={cn(inputClass, "max-w-36")}
                  />
                  <span className="text-sm font-semibold text-[#64748b]">
                    days
                  </span>
                </div>
              ) : null}
            </div>

            <div>
              <p className="mb-2 text-sm font-bold text-[#0f172a]">
                END DATE
              </p>
              <div className="flex h-11 items-center rounded-2xl border border-[#dbe3ef] bg-[#f8fafc] px-4 text-sm font-bold text-[#334155]">
                {formatBookingDate(
                  endDate(startDateValid ? draft.startDate : today, draft.days),
                )}
              </div>
            </div>
          </div>

          <div className="mt-7 flex items-center justify-between gap-3 border-t border-[#e5e7eb] pt-5">
            <button
              type="button"
              onClick={() => goToStep(2)}
              className="inline-flex h-11 items-center gap-1.5 rounded-full border border-[#dbe3ef] bg-white px-5 text-sm font-bold text-[#475569] transition hover:border-[#b8c6da]"
            >
              <ChevronLeft aria-hidden="true" className="h-4 w-4" />
              Back
            </button>
            <button
              type="button"
              disabled={!startDateValid || !validDays}
              onClick={() => {
                saveBookingDraft(draft);
                router.push("/book/plan");
              }}
              className="inline-flex h-11 items-center gap-1.5 rounded-full bg-[#1d6fff] px-6 text-sm font-bold text-white transition hover:bg-[#155ee7] disabled:cursor-not-allowed disabled:bg-[#cbd5e1]"
            >
              Continue
              <ChevronRight aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        </StepShell>
      ) : null}

      {activeStep === 2 && draft.items.length === 0 ? (
        <p className="mx-auto -mt-4 text-center text-xs font-medium text-[#94a3b8]">
          Add at least one package or property to continue.
        </p>
      ) : null}

      <div className="mx-auto flex w-full max-w-6xl justify-center pb-2">
        <Link
          href="/"
          className="text-xs font-semibold text-[#94a3b8] transition hover:text-[#64748b]"
        >
          Back to Crystagrid
        </Link>
      </div>
    </div>
  );
}
