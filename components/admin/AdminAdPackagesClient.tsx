"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  ChevronDown,
  ChevronRight,
  Loader2,
  Package,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import FilterBar from "@/components/ui/FilterBar";
import type {
  AdCity,
  AdPackage,
  AdPackageProperty,
  AdPackageStats,
  AdPlace,
  AdProperty,
  AdPropertyScreen,
  AdPropertyType,
  AdRateUnit,
} from "@/lib/ads";
import {
  formatINR,
  normalizeAdPropertyScreens,
  ratePerWeek,
} from "@/lib/ads";
import { formatRelativeTime } from "@/lib/screens";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { useFilters } from "@/lib/useFilters";

type Notice = {
  type: "success" | "error";
  message: string;
};

type PackageFilters = {
  search: string;
  city: string;
  type: string;
  status: string;
  containsProperty: string;
  withoutScreens: boolean;
};

type PropertyScreensState = {
  rows: AdPropertyScreen[];
  loading: boolean;
  error: string | null;
  loaded: boolean;
};

type PackageForm = {
  id: string | null;
  name: string;
  city_id: string;
  type_id: string;
  description: string;
  monthly_reach: string;
  rate: string;
  rate_unit: AdRateUnit;
  is_active: boolean;
};

const inputClass =
  "h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white outline-none transition placeholder:text-muted focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/40 disabled:opacity-50";

const reachFormatter = new Intl.NumberFormat("en-IN");

const initialFilters: PackageFilters = {
  search: "",
  city: "",
  type: "",
  status: "",
  containsProperty: "",
  withoutScreens: false,
};

function compareRows(
  a: { sort: number; name: string },
  b: { sort: number; name: string },
) {
  return a.sort - b.sort || a.name.localeCompare(b.name);
}

function nextSort(rows: { sort: number }[]) {
  return rows.reduce((max, row) => Math.max(max, row.sort), 0) + 1;
}

function packageCounts(
  item: AdPackage,
  statsByPackage: Map<string, AdPackageStats>,
  linksByPackage: Map<string, string[]>,
  propertyById: Map<string, AdProperty>,
) {
  const stat = statsByPackage.get(item.id);

  if (stat) {
    return {
      propertiesCount: stat.properties_count,
      screensCount: stat.screens_count,
      onlineCount: stat.online_count,
    };
  }

  const propertyIds = linksByPackage.get(item.id) ?? [];
  const screensCount = propertyIds.reduce(
    (total, propertyId) =>
      total + (propertyById.get(propertyId)?.screens_count ?? 0),
    0,
  );

  return {
    propertiesCount: propertyIds.length,
    screensCount,
    onlineCount: 0,
  };
}

function screensLabel(counts: {
  screensCount: number;
  onlineCount: number;
}) {
  return `${counts.screensCount} screens (${counts.onlineCount} online)`;
}

function screenLocation(screen: AdPropertyScreen) {
  const parts = [
    screen.block,
    screen.spot,
    screen.shop_name ? `Shop: ${screen.shop_name}` : null,
  ].filter(
    (value): value is string =>
      typeof value === "string" && value.trim().length > 0,
  );

  return parts.length > 0 ? parts.join(" · ") : "Not set";
}

function parseNonNegativeInteger(value: string): number | null {
  if (!value.trim()) {
    return null;
  }

  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

function createEmptyForm(cities: AdCity[]): PackageForm {
  return {
    id: null,
    name: "",
    city_id: cities[0]?.id ?? "",
    type_id: "",
    description: "",
    monthly_reach: "0",
    rate: "",
    rate_unit: "week",
    is_active: true,
  };
}

function ActiveToggle({
  active,
  label,
  disabled,
  onChange,
}: {
  active: boolean;
  label: string;
  disabled?: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      aria-label={label}
      title={active ? "Active" : "Inactive"}
      disabled={disabled}
      onClick={onChange}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 disabled:pointer-events-none disabled:opacity-50",
        active
          ? "brand-gradient border-transparent"
          : "border-white/10 bg-white/10",
      )}
    >
      <span
        className={cn(
          "inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200",
          active ? "translate-x-6" : "translate-x-1",
        )}
      />
    </button>
  );
}

function PropertyScreensContent({
  state,
}: {
  state?: PropertyScreensState;
}) {
  if (!state || (state.loading && !state.loaded)) {
    return <p className="text-xs text-muted">Loading screens...</p>;
  }

  if (state.error) {
    return (
      <p role="alert" className="text-xs text-red-300">
        Screens could not be loaded. {state.error}
      </p>
    );
  }

  if (state.rows.length === 0) {
    return <p className="text-xs text-muted">No screens found.</p>;
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
        Screens
      </p>
      <ul className="space-y-2">
        {state.rows.map((screen) => (
          <li
            key={screen.screen_id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2 text-xs"
          >
            <div className="min-w-0">
              <p className="font-medium text-white">
                {screen.screen_name || screen.screen_id}
              </p>
              <p className="mt-0.5 text-muted">{screenLocation(screen)}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                  screen.online
                    ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-200"
                    : "border-white/10 bg-white/5 text-white/50",
                )}
              >
                {screen.online ? "Online" : "Offline"}
              </span>
              <span className="text-muted">
                Last seen: {formatRelativeTime(screen.last_seen)}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PackagePropertiesDetail({
  packageId,
  linksByPackage,
  propertyById,
  screensByProperty,
}: {
  packageId: string;
  linksByPackage: Map<string, string[]>;
  propertyById: Map<string, AdProperty>;
  screensByProperty: Record<string, PropertyScreensState>;
}) {
  const propertyIds = linksByPackage.get(packageId) ?? [];

  if (propertyIds.length === 0) {
    return <p className="text-sm text-body">No included properties.</p>;
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
        Included properties
      </p>
      <ul className="space-y-3">
        {propertyIds.map((propertyId) => {
          const property = propertyById.get(propertyId);

          return (
            <li
              key={propertyId}
              className="rounded-xl border border-white/5 bg-white/[0.02] p-3"
            >
              <p className="text-sm font-medium text-white">
                {property?.name ?? propertyId}
              </p>
              {!property ? (
                <p className="mt-0.5 text-xs text-muted">
                  Property details are unavailable.
                </p>
              ) : null}
              <div className="mt-2">
                <PropertyScreensContent
                  state={screensByProperty[propertyId]}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function AdminAdPackagesClient({
  cities,
  places,
  propertyTypes,
  properties,
  packages: initialPackages,
  packageProperties: initialPackageProperties,
  packageStats,
  loadError,
}: {
  cities: AdCity[];
  places: AdPlace[];
  propertyTypes: AdPropertyType[];
  properties: AdProperty[];
  packages: AdPackage[];
  packageProperties: AdPackageProperty[];
  packageStats: AdPackageStats[];
  loadError: string | null;
}) {
  const supabase = useMemo(() => createClient(), []);
  const { filters, set, clear } = useFilters(initialFilters);
  const [packages, setPackages] = useState<AdPackage[]>(initialPackages);
  const [packageProperties, setPackageProperties] = useState<
    AdPackageProperty[]
  >(initialPackageProperties);
  const [expandedPackages, setExpandedPackages] = useState<Set<string>>(
    () => new Set(),
  );
  const [screensByProperty, setScreensByProperty] = useState<
    Record<string, PropertyScreensState>
  >({});
  const screensRequestRef = useRef<Set<string>>(new Set());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<PackageForm>(() =>
    createEmptyForm(cities),
  );
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<string[]>(
    [],
  );
  const [propertyQuery, setPropertyQuery] = useState("");
  const [propertyTypeFilter, setPropertyTypeFilter] = useState("all");
  const [propertyPlaceFilter, setPropertyPlaceFilter] = useState("all");
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  const sortedCities = useMemo(
    () => [...cities].sort(compareRows),
    [cities],
  );
  const sortedPlaces = useMemo(
    () => [...places].sort(compareRows),
    [places],
  );
  const sortedTypes = useMemo(
    () => [...propertyTypes].sort(compareRows),
    [propertyTypes],
  );
  const sortedProperties = useMemo(
    () => [...properties].sort(compareRows),
    [properties],
  );
  const cityById = useMemo(
    () =>
      new Map(sortedCities.map((city) => [city.id, city] as const)),
    [sortedCities],
  );
  const placeById = useMemo(
    () =>
      new Map(sortedPlaces.map((place) => [place.id, place] as const)),
    [sortedPlaces],
  );
  const typeById = useMemo(
    () =>
      new Map(sortedTypes.map((type) => [type.id, type] as const)),
    [sortedTypes],
  );
  const propertyById = useMemo(
    () =>
      new Map(
        sortedProperties.map(
          (property) => [property.id, property] as const,
        ),
      ),
    [sortedProperties],
  );
  const statsByPackage = useMemo(
    () =>
      new Map(
        packageStats.map(
          (stat) => [stat.package_id, stat] as const,
        ),
      ),
    [packageStats],
  );

  const linksByPackage = useMemo(() => {
    const links = new Map<string, string[]>();

    for (const link of packageProperties) {
      const current = links.get(link.package_id);

      if (current) {
        current.push(link.property_id);
      } else {
        links.set(link.package_id, [link.property_id]);
      }
    }

    return links;
  }, [packageProperties]);

  const visiblePackages = useMemo(() => {
    const normalizedQuery = filters.search.trim().toLowerCase();

    return packages
      .filter((item) => {
        const counts = packageCounts(
          item,
          statsByPackage,
          linksByPackage,
          propertyById,
        );

        if (filters.city && item.city_id !== filters.city) {
          return false;
        }

        if (filters.type && item.type_id !== filters.type) {
          return false;
        }

        if (filters.status === "active" && !item.is_active) {
          return false;
        }

        if (filters.status === "inactive" && item.is_active) {
          return false;
        }

        if (
          filters.containsProperty &&
          !(linksByPackage.get(item.id) ?? []).includes(
            filters.containsProperty,
          )
        ) {
          return false;
        }

        if (filters.withoutScreens && counts.screensCount > 0) {
          return false;
        }

        if (!normalizedQuery) {
          return true;
        }

        const values = [item.name, item.description];

        return values.some((value) =>
          value?.toLowerCase().includes(normalizedQuery),
        );
      })
      .sort(compareRows);
  }, [
    filters,
    linksByPackage,
    packages,
    propertyById,
    statsByPackage,
  ]);

  const formProperties = useMemo(
    () =>
      properties
        .filter((property) => property.city_id === form.city_id)
        .sort(compareRows),
    [form.city_id, properties],
  );

  const formPlaceOptions = useMemo(
    () =>
      sortedPlaces.filter((place) => place.city_id === form.city_id),
    [form.city_id, sortedPlaces],
  );

  const selectedPropertySet = useMemo(
    () => new Set(selectedPropertyIds),
    [selectedPropertyIds],
  );

  const selectedProperties = useMemo(
    () =>
      formProperties.filter((property) =>
        selectedPropertySet.has(property.id),
      ),
    [formProperties, selectedPropertySet],
  );

  const visibleFormProperties = useMemo(() => {
    const normalizedQuery = propertyQuery.trim().toLowerCase();

    return formProperties.filter((property) => {
      if (
        propertyTypeFilter !== "all" &&
        property.type_id !== propertyTypeFilter
      ) {
        return false;
      }

      if (
        propertyPlaceFilter !== "all" &&
        property.place_id !== propertyPlaceFilter
      ) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const values = [
        property.name,
        property.description,
        property.place_id
          ? placeById.get(property.place_id)?.name
          : null,
        property.type_id ? typeById.get(property.type_id)?.name : null,
      ];

      return values.some((value) =>
        value?.toLowerCase().includes(normalizedQuery),
      );
    });
  }, [
    formProperties,
    placeById,
    propertyPlaceFilter,
    propertyQuery,
    propertyTypeFilter,
    typeById,
  ]);

  const selectedReach = selectedProperties.reduce(
    (total, property) => total + property.monthly_reach,
    0,
  );
  const includedWeeklyRate = selectedProperties.reduce(
    (total, property) =>
      total + ratePerWeek(property.rate, property.rate_unit),
    0,
  );
  const packageWeeklyRate =
    form.rate.trim() && Number.isFinite(Number(form.rate))
      ? ratePerWeek(Number(form.rate), form.rate_unit)
      : 0;
  const allVisibleSelected =
    visibleFormProperties.length > 0 &&
    visibleFormProperties.every((property) =>
      selectedPropertySet.has(property.id),
    );

  const saving = pending === "package-save";
  const busy = pending !== null;

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setFormError(null);
    setPropertyQuery("");
    setPropertyTypeFilter("all");
    setPropertyPlaceFilter("all");
  }, []);

  useEffect(() => {
    if (!isModalOpen) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !saving) {
        closeModal();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeModal, isModalOpen, saving]);

  async function loadPropertyScreens(propertyId: string) {
    if (screensRequestRef.current.has(propertyId)) {
      return;
    }

    screensRequestRef.current.add(propertyId);
    setScreensByProperty((current) => ({
      ...current,
      [propertyId]: {
        rows: [],
        loading: true,
        error: null,
        loaded: false,
      },
    }));

    try {
      const { data, error } = await supabase.rpc("property_screens", {
        p_property: propertyId,
      });

      if (error) {
        throw new Error(error.message);
      }

      setScreensByProperty((current) => ({
        ...current,
        [propertyId]: {
          rows: normalizeAdPropertyScreens(data),
          loading: false,
          error: null,
          loaded: true,
        },
      }));
    } catch (error) {
      screensRequestRef.current.delete(propertyId);
      setScreensByProperty((current) => ({
        ...current,
        [propertyId]: {
          rows: [],
          loading: false,
          error:
            error instanceof Error
              ? error.message
              : "Screens could not be loaded.",
          loaded: true,
        },
      }));
    }
  }

  function togglePackageExpanded(packageId: string) {
    const willExpand = !expandedPackages.has(packageId);

    setExpandedPackages((current) => {
      const next = new Set(current);

      if (next.has(packageId)) {
        next.delete(packageId);
      } else {
        next.add(packageId);
      }

      return next;
    });

    if (willExpand) {
      for (const propertyId of linksByPackage.get(packageId) ?? []) {
        void loadPropertyScreens(propertyId);
      }
    }
  }

  function openAddModal() {
    if (sortedCities.length === 0) {
      setNotice({
        type: "error",
        message: "Add a city before creating a package.",
      });
      return;
    }

    setForm(createEmptyForm(sortedCities));
    setSelectedPropertyIds([]);
    setFormError(null);
    setPropertyQuery("");
    setPropertyTypeFilter("all");
    setPropertyPlaceFilter("all");
    setNotice(null);
    setIsModalOpen(true);
  }

  function openEditModal(item: AdPackage) {
    setForm({
      id: item.id,
      name: item.name,
      city_id: item.city_id,
      type_id: item.type_id ?? "",
      description: item.description ?? "",
      monthly_reach: String(item.monthly_reach),
      rate: String(item.rate),
      rate_unit: item.rate_unit,
      is_active: item.is_active,
    });
    setSelectedPropertyIds(linksByPackage.get(item.id) ?? []);
    setFormError(null);
    setPropertyQuery("");
    setPropertyTypeFilter("all");
    setPropertyPlaceFilter("all");
    setNotice(null);
    setIsModalOpen(true);
  }

  function handleFormCityChange(cityId: string) {
    const validProperties = new Set(
      properties
        .filter((property) => property.city_id === cityId)
        .map((property) => property.id),
    );

    setForm((current) => ({ ...current, city_id: cityId }));
    setSelectedPropertyIds((current) =>
      current.filter((propertyId) => validProperties.has(propertyId)),
    );
    setPropertyQuery("");
    setPropertyTypeFilter("all");
    setPropertyPlaceFilter("all");
  }

  function toggleProperty(propertyId: string) {
    setSelectedPropertyIds((current) =>
      current.includes(propertyId)
        ? current.filter((id) => id !== propertyId)
        : [...current, propertyId],
    );
  }

  function toggleVisibleProperties() {
    const visibleIds = visibleFormProperties.map(
      (property) => property.id,
    );

    setSelectedPropertyIds((current) => {
      if (allVisibleSelected) {
        return current.filter((id) => !visibleIds.includes(id));
      }

      return [...new Set([...current, ...visibleIds])];
    });
  }

  async function replacePackageProperties(
    packageId: string,
    propertyIds: string[],
  ) {
    const { error: deleteError } = await supabase
      .from("ad_package_properties")
      .delete()
      .eq("package_id", packageId);

    if (deleteError) {
      throw new Error(
        `The package was saved, but its included properties could not be cleared: ${deleteError.message}`,
      );
    }

    if (propertyIds.length > 0) {
      const { error: insertError } = await supabase
        .from("ad_package_properties")
        .insert(
          propertyIds.map((propertyId) => ({
            package_id: packageId,
            property_id: propertyId,
          })),
        );

      if (insertError) {
        throw new Error(
          `The package was saved, but its included properties could not be updated: ${insertError.message}`,
        );
      }
    }

    setPackageProperties((current) => [
      ...current.filter((link) => link.package_id !== packageId),
      ...propertyIds.map((propertyId) => ({
        package_id: packageId,
        property_id: propertyId,
      })),
    ]);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (busy) {
      return;
    }

    const name = form.name.trim();
    const cityId = form.city_id;
    const typeId = form.type_id || null;
    const reach = parseNonNegativeInteger(form.monthly_reach);
    const rate = Number(form.rate);

    if (!name) {
      setFormError("Package name is required.");
      return;
    }

    if (!cityId || !cityById.has(cityId)) {
      setFormError("Choose a valid city.");
      return;
    }

    if (typeId && !typeById.has(typeId)) {
      setFormError("Choose a valid type tag.");
      return;
    }

    if (reach === null) {
      setFormError(
        "Monthly reach must be a whole number of 0 or more.",
      );
      return;
    }

    if (form.rate.trim() === "" || !Number.isFinite(rate) || rate <= 0) {
      setFormError("Package rate must be a number greater than 0.");
      return;
    }

    const validPropertyIds = new Set(
      formProperties.map((property) => property.id),
    );
    const propertyIds = selectedPropertyIds.filter((propertyId) =>
      validPropertyIds.has(propertyId),
    );
    const description = form.description.trim();
    const payload = {
      name,
      city_id: cityId,
      type_id: typeId,
      description: description || null,
      monthly_reach: reach,
      rate,
      rate_unit: form.rate_unit,
      is_active: form.is_active,
    };

    setPending("package-save");
    setFormError(null);
    setNotice(null);

    try {
      if (form.id) {
        const packageId = form.id;
        const previous = packages.find((item) => item.id === packageId);

        if (!previous) {
          throw new Error("This package is no longer available.");
        }

        const optimistic: AdPackage = { ...previous, ...payload };

        setPackages((current) =>
          current.map((item) =>
            item.id === packageId ? optimistic : item,
          ),
        );

        const { error } = await supabase
          .from("ad_packages")
          .update(payload)
          .eq("id", packageId);

        if (error) {
          setPackages((current) =>
            current.map((item) =>
              item.id === packageId ? previous : item,
            ),
          );
          throw new Error(error.message);
        }

        await replacePackageProperties(packageId, propertyIds);
        setNotice({ type: "success", message: `Updated ${name}.` });
        closeModal();
        return;
      }

      const sort = nextSort(packages);
      const { data, error } = await supabase
        .from("ad_packages")
        .insert({ ...payload, sort })
        .select(
          "id, city_id, type_id, name, description, monthly_reach, rate, rate_unit, is_active, sort",
        )
        .single();

      if (error || !data) {
        throw new Error(
          error?.message ?? "The package could not be saved.",
        );
      }

      const saved = data as unknown as AdPackage;
      setPackages((current) => [...current, saved]);
      setForm((current) => ({ ...current, id: saved.id }));

      await replacePackageProperties(saved.id, propertyIds);
      setNotice({ type: "success", message: `Added ${name}.` });
      closeModal();
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setPending(null);
    }
  }

  async function handleToggle(item: AdPackage) {
    if (busy) {
      return;
    }

    const nextActive = !item.is_active;

    setPackages((current) =>
      current.map((entry) =>
        entry.id === item.id
          ? { ...entry, is_active: nextActive }
          : entry,
      ),
    );
    setPending(`package-toggle:${item.id}`);
    setNotice(null);

    const { error } = await supabase
      .from("ad_packages")
      .update({ is_active: nextActive })
      .eq("id", item.id);

    setPending(null);

    if (error) {
      setPackages((current) =>
        current.map((entry) =>
          entry.id === item.id
            ? { ...entry, is_active: item.is_active }
            : entry,
        ),
      );
      setNotice({ type: "error", message: error.message });
    }
  }

  async function handleDelete(item: AdPackage) {
    if (busy) {
      return;
    }

    if (
      !window.confirm(
        `Delete "${item.name}"? This cannot be undone.`,
      )
    ) {
      return;
    }

    const previousPackages = packages;
    const previousLinks = packageProperties;

    setPackages((current) =>
      current.filter((entry) => entry.id !== item.id),
    );
    setPackageProperties((current) =>
      current.filter((link) => link.package_id !== item.id),
    );
    setPending(`package-delete:${item.id}`);
    setNotice(null);

    const { error } = await supabase
      .from("ad_packages")
      .delete()
      .eq("id", item.id);

    setPending(null);

    if (error) {
      setPackages(previousPackages);
      setPackageProperties(previousLinks);
      setNotice({ type: "error", message: error.message });
      return;
    }

    setNotice({ type: "success", message: `Deleted "${item.name}".` });
  }

  return (
    <div className="space-y-6">
      {notice ? (
        <p
          role={notice.type === "error" ? "alert" : "status"}
          className={cn(
            "rounded-2xl border px-4 py-3 text-sm",
            notice.type === "error"
              ? "border-red-400/20 bg-red-400/10 text-red-200"
              : "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
          )}
        >
          {notice.message}
        </p>
      ) : null}

      {loadError ? (
        <p
          role="alert"
          className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200"
        >
          Packages could not be loaded. {loadError}
        </p>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold tracking-tight text-white">
          Ad packages
        </h2>
        <Button onClick={openAddModal} disabled={busy}>
          <Plus aria-hidden="true" className="h-4 w-4" />
          Add Package
        </Button>
      </div>

      <FilterBar
        search={{
          value: filters.search,
          onChange: (value) => set("search", value),
          placeholder: "Search name or description",
        }}
        selects={[
          {
            key: "city",
            label: "City",
            value: filters.city,
            onChange: (value) => set("city", value),
            options: sortedCities.map((city) => ({
              value: city.id,
              label: city.name,
            })),
          },
          {
            key: "type",
            label: "Type",
            value: filters.type,
            onChange: (value) => set("type", value),
            options: sortedTypes.map((type) => ({
              value: type.id,
              label: type.name,
            })),
          },
          {
            key: "status",
            label: "Status",
            value: filters.status,
            onChange: (value) => set("status", value),
            options: [
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
            ],
          },
          {
            key: "containsProperty",
            label: "Contains property",
            value: filters.containsProperty,
            onChange: (value) => set("containsProperty", value),
            options: sortedProperties.map((property) => ({
              value: property.id,
              label: property.name,
            })),
          },
        ]}
        toggles={[
          {
            key: "withoutScreens",
            label: "Without screens only",
            checked: filters.withoutScreens,
            onChange: (value) => set("withoutScreens", value),
          },
        ]}
        resultCount={visiblePackages.length}
        total={packages.length}
        onClear={clear}
      />

      {visiblePackages.length === 0 ? (
        <Card className="flex flex-col items-center justify-center px-6 py-14 text-center hover:border-white/10 hover:shadow-none">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-brand-sky">
            <Package aria-hidden="true" className="h-6 w-6" />
          </span>
          <h2 className="mt-4 text-base font-semibold text-white">
            {packages.length === 0
              ? "No packages yet"
              : "No packages match your filters"}
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-body">
            {packages.length === 0
              ? "Create a package to bundle properties into a ready-made campaign."
              : "Try another city, type, status, or search term."}
          </p>
          {packages.length === 0 ? (
            <Button
              onClick={openAddModal}
              disabled={busy}
              className="mt-5"
            >
              <Plus aria-hidden="true" className="h-4 w-4" />
              Add Package
            </Button>
          ) : null}
        </Card>
      ) : (
        <Card className="overflow-hidden p-0 hover:border-white/10 hover:shadow-none">
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[78rem] text-left text-sm">
              <thead className="border-b border-white/5 bg-white/[0.02] text-xs uppercase tracking-[0.12em] text-muted">
                <tr>
                  <th scope="col" className="px-5 py-3 font-semibold">
                    Package
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    City
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Type
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Rate
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Monthly reach
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Properties
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Screens
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Active
                  </th>
                  <th
                    scope="col"
                    className="px-5 py-3 text-right font-semibold"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {visiblePackages.map((item) => {
                  const city = cityById.get(item.city_id);
                  const type = item.type_id
                    ? typeById.get(item.type_id)
                    : null;
                  const counts = packageCounts(
                    item,
                    statsByPackage,
                    linksByPackage,
                    propertyById,
                  );
                  const expanded = expandedPackages.has(item.id);
                  const deleting =
                    pending === `package-delete:${item.id}`;

                  return (
                    <Fragment key={item.id}>
                      <tr className="transition duration-200 hover:bg-white/[0.03]">
                        <td className="max-w-[22rem] px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                togglePackageExpanded(item.id)
                              }
                              aria-expanded={expanded}
                              aria-controls={`package-properties-${item.id}`}
                              className="flex min-w-0 items-center gap-1.5 rounded text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60"
                            >
                              {expanded ? (
                                <ChevronDown
                                  aria-hidden="true"
                                  className="h-4 w-4 shrink-0 text-white/50"
                                />
                              ) : (
                                <ChevronRight
                                  aria-hidden="true"
                                  className="h-4 w-4 shrink-0 text-white/50"
                                />
                              )}
                              <span className="truncate font-semibold text-white">
                                {item.name}
                              </span>
                            </button>
                          </div>
                          <p className="mt-0.5 line-clamp-2 text-xs text-muted">
                            {item.description || "No description"}
                          </p>
                        </td>
                        <td className="px-4 py-3.5 text-white/70">
                          {city?.name || "Unknown city"}
                        </td>
                        <td className="px-4 py-3.5 text-white/70">
                          {type?.name || "—"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5 font-medium text-white/80">
                          {formatINR(item.rate)}{" "}
                          <span className="text-xs text-muted">
                            / {item.rate_unit}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-white/70 tabular-nums">
                          {reachFormatter.format(item.monthly_reach)}
                        </td>
                        <td className="px-4 py-3.5 text-white/70 tabular-nums">
                          {counts.propertiesCount}
                        </td>
                        <td className="px-4 py-3.5 text-white/70 tabular-nums">
                          {screensLabel(counts)}
                        </td>
                        <td className="px-4 py-3.5">
                          <ActiveToggle
                            active={item.is_active}
                            label={`${
                              item.is_active ? "Deactivate" : "Activate"
                            } ${item.name}`}
                            disabled={busy}
                            onChange={() => void handleToggle(item)}
                          />
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditModal(item)}
                              disabled={busy}
                              className="h-8 px-3 text-xs"
                            >
                              <Pencil
                                aria-hidden="true"
                                className="h-3.5 w-3.5"
                              />
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => void handleDelete(item)}
                              disabled={busy}
                              className="h-8 px-3 text-xs text-red-300 hover:bg-red-400/10 hover:text-red-200"
                            >
                              <Trash2
                                aria-hidden="true"
                                className="h-3.5 w-3.5"
                              />
                              {deleting ? "Deleting..." : "Delete"}
                            </Button>
                          </div>
                        </td>
                      </tr>
                      {expanded ? (
                        <tr className="bg-white/[0.02]">
                          <td colSpan={9} className="px-5 pb-4">
                            <div
                              id={`package-properties-${item.id}`}
                              className="rounded-2xl border border-white/10 bg-black/20 p-4"
                            >
                              <PackagePropertiesDetail
                                packageId={item.id}
                                linksByPackage={linksByPackage}
                                propertyById={propertyById}
                                screensByProperty={screensByProperty}
                              />
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-white/5 lg:hidden">
            {visiblePackages.map((item) => {
              const city = cityById.get(item.city_id);
              const type = item.type_id
                ? typeById.get(item.type_id)
                : null;
              const counts = packageCounts(
                item,
                statsByPackage,
                linksByPackage,
                propertyById,
              );
              const expanded = expandedPackages.has(item.id);
              const deleting = pending === `package-delete:${item.id}`;

              return (
                <div key={item.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() => togglePackageExpanded(item.id)}
                        aria-expanded={expanded}
                        aria-controls={`package-properties-mobile-${item.id}`}
                        className="flex min-w-0 items-center gap-1.5 rounded text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60"
                      >
                        {expanded ? (
                          <ChevronDown
                            aria-hidden="true"
                            className="h-3.5 w-3.5 shrink-0 text-white/50"
                          />
                        ) : (
                          <ChevronRight
                            aria-hidden="true"
                            className="h-3.5 w-3.5 shrink-0 text-white/50"
                          />
                        )}
                        <span className="truncate text-sm font-semibold text-white">
                          {item.name}
                        </span>
                      </button>
                      <p className="mt-0.5 truncate text-xs text-muted">
                        {city?.name || "Unknown city"}
                        {type ? ` · ${type.name}` : ""}
                      </p>
                      <p className="mt-1 line-clamp-2 text-xs text-body">
                        {item.description || "No description"}
                      </p>
                    </div>
                    <ActiveToggle
                      active={item.is_active}
                      label={`${
                        item.is_active ? "Deactivate" : "Activate"
                      } ${item.name}`}
                      disabled={busy}
                      onChange={() => void handleToggle(item)}
                    />
                  </div>

                  <dl className="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                    <div>
                      <dt className="text-muted">Rate</dt>
                      <dd className="mt-0.5 font-medium text-white/80">
                        {formatINR(item.rate)}{" "}
                        <span className="text-muted">
                          / {item.rate_unit}
                        </span>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted">Monthly reach</dt>
                      <dd className="mt-0.5 text-white/70 tabular-nums">
                        {reachFormatter.format(item.monthly_reach)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted">Properties</dt>
                      <dd className="mt-0.5 text-white/70 tabular-nums">
                        {counts.propertiesCount}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted">Screens</dt>
                      <dd className="mt-0.5 text-white/70 tabular-nums">
                        {screensLabel(counts)}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-4 flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditModal(item)}
                      disabled={busy}
                      className="h-8 px-3 text-xs"
                    >
                      <Pencil aria-hidden="true" className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void handleDelete(item)}
                      disabled={busy}
                      className="h-8 px-3 text-xs text-red-300 hover:bg-red-400/10 hover:text-red-200"
                    >
                      <Trash2
                        aria-hidden="true"
                        className="h-3.5 w-3.5"
                      />
                      {deleting ? "Deleting..." : "Delete"}
                    </Button>
                  </div>

                  {expanded ? (
                    <div
                      id={`package-properties-mobile-${item.id}`}
                      className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-3"
                    >
                      <PackagePropertiesDetail
                        packageId={item.id}
                        linksByPackage={linksByPackage}
                        propertyById={propertyById}
                        screensByProperty={screensByProperty}
                      />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <button
            type="button"
            aria-label="Close package dialog"
            tabIndex={-1}
            onClick={() => {
              if (!saving) {
                closeModal();
              }
            }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="package-dialog-title"
            aria-busy={saving}
            className="relative z-10 max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-white/10 bg-surface p-5 shadow-card sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-sky">
                  Ad inventory
                </p>
                <h2
                  id="package-dialog-title"
                  className="mt-1 text-xl font-bold tracking-tight text-white"
                >
                  {form.id ? "Edit package" : "Add package"}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                aria-label="Close dialog"
                className="rounded-full p-1.5 text-white/50 transition duration-200 hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 disabled:pointer-events-none disabled:opacity-50"
              >
                <X aria-hidden="true" className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              {formError ? (
                <p
                  role="alert"
                  className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200"
                >
                  {formError}
                </p>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label
                    htmlFor="package-name"
                    className="mb-1 block text-xs text-muted"
                  >
                    Name <span className="text-red-300">*</span>
                  </label>
                  <input
                    id="package-name"
                    value={form.name}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    placeholder="Mumbai retail launch"
                    autoFocus
                    className={inputClass}
                  />
                </div>

                <div>
                  <label
                    htmlFor="package-city"
                    className="mb-1 block text-xs text-muted"
                  >
                    City <span className="text-red-300">*</span>
                  </label>
                  <select
                    id="package-city"
                    value={form.city_id}
                    onChange={(event) =>
                      handleFormCityChange(event.target.value)
                    }
                    className={inputClass}
                  >
                    {sortedCities.length === 0 ? (
                      <option value="">No cities available</option>
                    ) : null}
                    {sortedCities.map((city) => (
                      <option key={city.id} value={city.id}>
                        {city.name}
                        {city.state ? `, ${city.state}` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="package-type"
                    className="mb-1 block text-xs text-muted"
                  >
                    Type tag
                  </label>
                  <select
                    id="package-type"
                    value={form.type_id}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        type_id: event.target.value,
                      }))
                    }
                    className={inputClass}
                  >
                    <option value="">No type</option>
                    {sortedTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label
                    htmlFor="package-description"
                    className="mb-1 block text-xs text-muted"
                  >
                    Description
                  </label>
                  <textarea
                    id="package-description"
                    rows={3}
                    value={form.description}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                    placeholder="What makes this package useful for advertisers?"
                    className={cn(inputClass, "h-auto py-2.5")}
                  />
                </div>

                <div className="sm:col-span-2">
                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_9rem]">
                    <div>
                      <label
                        htmlFor="package-rate"
                        className="mb-1 block text-xs text-muted"
                      >
                        Rate <span className="text-red-300">*</span>
                      </label>
                      <input
                        id="package-rate"
                        type="number"
                        min={0.01}
                        step="0.01"
                        value={form.rate}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            rate: event.target.value,
                          }))
                        }
                        placeholder="150000"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="package-rate-unit"
                        className="mb-1 block text-xs text-muted"
                      >
                        Unit
                      </label>
                      <select
                        id="package-rate-unit"
                        value={form.rate_unit}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            rate_unit: event.target
                              .value as AdRateUnit,
                          }))
                        }
                        className={inputClass}
                      >
                        <option value="week">Per week</option>
                        <option value="day">Per day</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <div className="flex items-end justify-between gap-3">
                    <label
                      htmlFor="package-reach"
                      className="mb-1 block text-xs text-muted"
                    >
                      Monthly reach
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          monthly_reach: String(selectedReach),
                        }))
                      }
                      disabled={selectedProperties.length === 0}
                      className="text-xs font-semibold text-brand-sky transition duration-200 hover:text-white disabled:pointer-events-none disabled:opacity-40"
                    >
                      Use sum of selected properties
                    </button>
                  </div>
                  <input
                    id="package-reach"
                    type="number"
                    min={0}
                    step={1}
                    value={form.monthly_reach}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        monthly_reach: event.target.value,
                      }))
                    }
                    className={inputClass}
                  />
                  <p className="mt-1 text-xs text-muted">
                    Selected properties total{" "}
                    {reachFormatter.format(selectedReach)} monthly reach.
                  </p>
                </div>

                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-white">
                        Active
                      </p>
                      <p className="mt-0.5 text-xs text-muted">
                        Inactive packages stay hidden from customers.
                      </p>
                    </div>
                    <ActiveToggle
                      active={form.is_active}
                      label="Toggle package active"
                      disabled={saving}
                      onChange={() =>
                        setForm((current) => ({
                          ...current,
                          is_active: !current.is_active,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <div className="rounded-2xl border border-sky-400/20 bg-sky-400/[0.06] px-4 py-3">
                    <p className="text-sm text-sky-100">
                      Included properties sum:{" "}
                      {formatINR(includedWeeklyRate)} / week, package
                      rate: {formatINR(packageWeeklyRate)} / week.
                    </p>
                    <p className="mt-1 text-xs text-sky-100/60">
                      {selectedProperties.length}{" "}
                      {selectedProperties.length === 1
                        ? "property selected"
                        : "properties selected"}
                      . Rates are compared per week.
                    </p>
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <div className="overflow-hidden rounded-2xl border border-white/10">
                    <div className="border-b border-white/5 bg-white/[0.02] px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-white">
                          Included properties
                        </p>
                        <span className="text-xs text-muted">
                          {selectedProperties.length} selected
                        </span>
                      </div>

                      <div className="mt-3 grid gap-2 sm:grid-cols-3">
                        <div className="relative sm:col-span-1">
                          <Search
                            aria-hidden="true"
                            className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted"
                          />
                          <input
                            type="search"
                            value={propertyQuery}
                            onChange={(event) =>
                              setPropertyQuery(event.target.value)
                            }
                            placeholder="Search properties"
                            aria-label="Search included properties"
                            className={cn(
                              inputClass,
                              "h-9 pl-8 text-xs",
                            )}
                          />
                        </div>
                        <select
                          value={propertyTypeFilter}
                          onChange={(event) =>
                            setPropertyTypeFilter(event.target.value)
                          }
                          aria-label="Filter included properties by type"
                          className={cn(inputClass, "h-9 text-xs")}
                        >
                          <option value="all">All types</option>
                          {sortedTypes.map((type) => (
                            <option key={type.id} value={type.id}>
                              {type.name}
                            </option>
                          ))}
                        </select>
                        <select
                          value={propertyPlaceFilter}
                          onChange={(event) =>
                            setPropertyPlaceFilter(event.target.value)
                          }
                          aria-label="Filter included properties by place"
                          className={cn(inputClass, "h-9 text-xs")}
                          disabled={formPlaceOptions.length === 0}
                        >
                          <option value="all">All places</option>
                          {formPlaceOptions.map((place) => (
                            <option key={place.id} value={place.id}>
                              {place.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {formProperties.length === 0 ? (
                      <p className="px-4 py-6 text-center text-sm text-body">
                        No properties in this city yet.
                      </p>
                    ) : visibleFormProperties.length === 0 ? (
                      <p className="px-4 py-6 text-center text-sm text-body">
                        No properties match these filters.
                      </p>
                    ) : (
                      <div className="max-h-72 divide-y divide-white/5 overflow-y-auto">
                        {visibleFormProperties.map((property) => {
                          const type = property.type_id
                            ? typeById.get(property.type_id)
                            : null;
                          const place = property.place_id
                            ? placeById.get(property.place_id)
                            : null;

                          return (
                            <label
                              key={property.id}
                              className="flex cursor-pointer items-start gap-3 px-4 py-3 transition duration-200 hover:bg-white/[0.03]"
                            >
                              <input
                                type="checkbox"
                                checked={selectedPropertySet.has(
                                  property.id,
                                )}
                                onChange={() =>
                                  toggleProperty(property.id)
                                }
                                className="mt-0.5 h-4 w-4 shrink-0 rounded border-white/20 bg-white/5 accent-sky-500"
                              />
                              <span className="min-w-0 flex-1">
                                <span className="flex flex-wrap items-center gap-2">
                                  <span className="truncate text-sm font-medium text-white">
                                    {property.name}
                                  </span>
                                  {!property.is_active ? (
                                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/40">
                                      Inactive
                                    </span>
                                  ) : null}
                                </span>
                                <span className="mt-0.5 block truncate text-xs text-muted">
                                  {type?.name || "No type"} ·{" "}
                                  {place?.name || "No place"} ·{" "}
                                  {formatINR(property.rate)} /{" "}
                                  {property.rate_unit}
                                </span>
                              </span>
                              <span className="shrink-0 text-right text-xs text-muted">
                                <span className="block text-white/70 tabular-nums">
                                  {reachFormatter.format(
                                    property.monthly_reach,
                                  )}
                                </span>
                                reach
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    )}

                    {visibleFormProperties.length > 0 ? (
                      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/5 bg-white/[0.02] px-4 py-2.5">
                        <p className="text-xs text-muted">
                          {visibleFormProperties.length} shown
                        </p>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={toggleVisibleProperties}
                            className="text-xs font-semibold text-brand-sky transition duration-200 hover:text-white"
                          >
                            {allVisibleSelected
                              ? "Clear visible"
                              : "Select visible"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedPropertyIds([])}
                            disabled={selectedProperties.length === 0}
                            className="text-xs font-semibold text-white/40 transition duration-200 hover:text-white disabled:pointer-events-none disabled:opacity-40"
                          >
                            Clear all
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-white/5 pt-4 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <Loader2
                      aria-hidden="true"
                      className="h-4 w-4 animate-spin"
                    />
                  ) : null}
                  {saving ? "Saving..." : "Save package"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
