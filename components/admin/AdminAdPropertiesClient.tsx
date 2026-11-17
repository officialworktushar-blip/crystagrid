"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import {
  Building2,
  ChevronDown,
  ChevronRight,
  Image as ImageIcon,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import FilterBar from "@/components/ui/FilterBar";
import type {
  AdCity,
  AdPlace,
  AdProperty,
  AdPropertyScreen,
  AdPropertyStats,
  AdPropertyType,
  AdRateUnit,
} from "@/lib/ads";
import {
  formatINR,
  getAdImageUrl,
  normalizeAdPropertyScreens,
} from "@/lib/ads";
import { formatRelativeTime } from "@/lib/screens";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { useFilters } from "@/lib/useFilters";

type Notice = {
  type: "success" | "error";
  message: string;
};

type PropertyFilters = {
  search: string;
  city: string;
  place: string;
  type: string;
  status: string;
  screens: string;
  withoutScreens: boolean;
};

type PropertyForm = {
  id: string | null;
  name: string;
  city_id: string;
  place_id: string;
  type_id: string;
  description: string;
  monthly_reach: string;
  rate: string;
  rate_unit: AdRateUnit;
  is_active: boolean;
  image_path: string | null;
};

type PropertyScreensState = {
  rows: AdPropertyScreen[];
  loading: boolean;
  error: string | null;
  loaded: boolean;
};

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const IMAGE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const reachFormatter = new Intl.NumberFormat("en-IN");

const inputClass =
  "h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white outline-none transition placeholder:text-muted focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/40 disabled:opacity-50";

function createId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function pendingKey(kind: string, id?: string) {
  return id ? `${kind}:${id}` : kind;
}

function nextSort(rows: { sort: number }[]) {
  return rows.reduce((max, row) => Math.max(max, row.sort), 0) + 1;
}

function compareRows(
  a: { sort: number; name: string },
  b: { sort: number; name: string },
) {
  return a.sort - b.sort || a.name.localeCompare(b.name);
}

function screenCounts(
  property: AdProperty,
  statsById: Map<string, AdPropertyStats>,
) {
  const stat = statsById.get(property.id);

  return {
    count: stat?.screens_count ?? property.screens_count ?? 0,
    online: stat?.online_count ?? 0,
  };
}

function screensLabel(counts: { count: number; online: number }) {
  return `${counts.count} screens (${counts.online} online)`;
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

function validateImageFile(file: File): string | null {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return "Choose a JPG, PNG, or WebP image.";
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return "The image must be 5 MB or smaller.";
  }

  return null;
}

function imageExtension(file: File): string {
  const fromName = file.name.split(".").pop()?.toLowerCase() ?? "";
  const normalized = fromName === "jpeg" ? "jpg" : fromName;

  if (["jpg", "png", "webp"].includes(normalized)) {
    return normalized;
  }

  return IMAGE_EXTENSIONS[file.type] ?? "jpg";
}

function formatFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 KB";
  }

  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function createInitialFilters(withoutScreens: boolean): PropertyFilters {
  return {
    search: "",
    city: "",
    place: "",
    type: "",
    status: "",
    screens: "",
    withoutScreens,
  };
}

function createEmptyForm(cities: AdCity[]): PropertyForm {
  return {
    id: null,
    name: "",
    city_id: cities[0]?.id ?? "",
    place_id: "",
    type_id: "",
    description: "",
    monthly_reach: "0",
    rate: "",
    rate_unit: "week",
    is_active: true,
    image_path: null,
  };
}

function PropertyThumbnail({
  url,
  name,
  className,
}: {
  url: string | null;
  name: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] text-white/30",
        className,
      )}
    >
      {url ? (
        <img
          src={url}
          alt={name}
          loading="lazy"
          className="h-full w-full object-cover"
        />
      ) : (
        <ImageIcon aria-hidden="true" className="h-5 w-5" />
      )}
    </span>
  );
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

export default function AdminAdPropertiesClient({
  cities,
  places,
  propertyTypes,
  properties: initialProperties,
  propertyStats,
  withoutScreens = false,
  loadError,
}: {
  cities: AdCity[];
  places: AdPlace[];
  propertyTypes: AdPropertyType[];
  properties: AdProperty[];
  propertyStats: AdPropertyStats[];
  withoutScreens?: boolean;
  loadError: string | null;
}) {
  const supabase = useMemo(() => createClient(), []);
  const initialFilters = useMemo(
    () => createInitialFilters(withoutScreens),
    [withoutScreens],
  );
  const { filters, set, clear } = useFilters(initialFilters);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [properties, setProperties] =
    useState<AdProperty[]>(initialProperties);
  const [expandedProperties, setExpandedProperties] = useState<Set<string>>(
    () => new Set(),
  );
  const [screensByProperty, setScreensByProperty] = useState<
    Record<string, PropertyScreensState>
  >({});
  const screensRequestRef = useRef<Set<string>>(new Set());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<PropertyForm>(() =>
    createEmptyForm(cities),
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [removeExistingImage, setRemoveExistingImage] = useState(false);
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
  const statsById = useMemo(
    () =>
      new Map(
        propertyStats.map(
          (stat) => [stat.property_id, stat] as const,
        ),
      ),
    [propertyStats],
  );

  const filterPlaceOptions = useMemo(
    () =>
      sortedPlaces.filter(
        (place) => !filters.city || place.city_id === filters.city,
      ),
    [filters.city, sortedPlaces],
  );

  const formPlaceOptions = useMemo(
    () =>
      sortedPlaces.filter((place) => place.city_id === form.city_id),
    [form.city_id, sortedPlaces],
  );

  const visibleProperties = useMemo(() => {
    const normalizedQuery = filters.search.trim().toLowerCase();

    return properties
      .filter((property) => {
        const counts = screenCounts(property, statsById);

        if (filters.city && property.city_id !== filters.city) {
          return false;
        }

        if (filters.type && property.type_id !== filters.type) {
          return false;
        }

        if (filters.place && property.place_id !== filters.place) {
          return false;
        }

        if (filters.status === "active" && !property.is_active) {
          return false;
        }

        if (filters.status === "inactive" && property.is_active) {
          return false;
        }

        if (filters.screens === "with" && counts.count === 0) {
          return false;
        }

        if (filters.screens === "without" && counts.count > 0) {
          return false;
        }

        if (filters.withoutScreens && counts.count > 0) {
          return false;
        }

        if (!normalizedQuery) {
          return true;
        }

        const values = [
          property.name,
          property.place_id
            ? placeById.get(property.place_id)?.name
            : null,
        ];

        return values.some((value) =>
          value?.toLowerCase().includes(normalizedQuery),
        );
      })
      .sort(compareRows);
  }, [filters, placeById, properties, statsById]);

  const existingImageUrl =
    form.image_path && !removeExistingImage
      ? getAdImageUrl(form.image_path)
      : null;
  const previewUrl = imagePreview ?? existingImageUrl;
  const saving = pending === "property-save";
  const busy = pending !== null;

  useEffect(() => {
    return () => {
      if (imagePreview?.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setFormError(null);
    setImageFile(null);
    setImagePreview(null);
    setRemoveExistingImage(false);
  }, []);

  useEffect(() => {
    if (!isModalOpen) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && pending !== "property-save") {
        closeModal();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeModal, isModalOpen, pending]);

  function openAddModal() {
    if (sortedCities.length === 0) {
      setNotice({
        type: "error",
        message: "Add a city before creating a property.",
      });
      return;
    }

    setForm(createEmptyForm(sortedCities));
    setFormError(null);
    setImageFile(null);
    setImagePreview(null);
    setRemoveExistingImage(false);
    setNotice(null);
    setIsModalOpen(true);
  }

  function openEditModal(property: AdProperty) {
    setForm({
      id: property.id,
      name: property.name,
      city_id: property.city_id,
      place_id: property.place_id ?? "",
      type_id: property.type_id ?? "",
      description: property.description ?? "",
      monthly_reach: String(property.monthly_reach),
      rate: String(property.rate),
      rate_unit: property.rate_unit,
      is_active: property.is_active,
      image_path: property.image_path,
    });
    setFormError(null);
    setImageFile(null);
    setImagePreview(null);
    setRemoveExistingImage(false);
    setNotice(null);
    setIsModalOpen(true);
  }

  function handleCityFilterChange(value: string) {
    set("city", value);

    if (filters.place) {
      const selectedPlace = places.find(
        (place) => place.id === filters.place,
      );

      if (
        !selectedPlace ||
        (value !== "" && selectedPlace.city_id !== value)
      ) {
        set("place", "");
      }
    }
  }

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

  function togglePropertyExpanded(propertyId: string) {
    const willExpand = !expandedProperties.has(propertyId);

    setExpandedProperties((current) => {
      const next = new Set(current);

      if (next.has(propertyId)) {
        next.delete(propertyId);
      } else {
        next.add(propertyId);
      }

      return next;
    });

    if (willExpand) {
      void loadPropertyScreens(propertyId);
    }
  }

  function handleFormCityChange(cityId: string) {
    setForm((current) => {
      const selectedPlace = current.place_id
        ? places.find((place) => place.id === current.place_id)
        : null;

      return {
        ...current,
        city_id: cityId,
        place_id:
          selectedPlace && selectedPlace.city_id === cityId
            ? current.place_id
            : "",
      };
    });
  }

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    const error = validateImageFile(file);

    if (error) {
      setFormError(error);
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setRemoveExistingImage(false);
    setFormError(null);
  }

  function handleRemoveImage() {
    setImageFile(null);
    setImagePreview(null);
    setRemoveExistingImage(true);
    setFormError(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (busy) {
      return;
    }

    const name = form.name.trim();
    const cityId = form.city_id;
    const reach = parseNonNegativeInteger(form.monthly_reach);
    const rate = Number(form.rate);

    if (!name) {
      setFormError("Property name is required.");
      return;
    }

    if (!cityId || !cityById.has(cityId)) {
      setFormError("Choose a valid city.");
      return;
    }

    if (reach === null) {
      setFormError(
        "Monthly reach must be a whole number of 0 or more.",
      );
      return;
    }

    if (form.rate.trim() === "" || !Number.isFinite(rate) || rate <= 0) {
      setFormError("Rate must be a number greater than 0.");
      return;
    }

    const placeId = form.place_id || null;
    const selectedPlace = placeId ? placeById.get(placeId) : null;

    if (selectedPlace && selectedPlace.city_id !== cityId) {
      setFormError("Choose a place that belongs to the selected city.");
      return;
    }

    const typeId = form.type_id || null;
    const description = form.description.trim();
    let uploadedPath: string | null = null;

    setPending(pendingKey("property-save"));
    setFormError(null);
    setNotice(null);

    try {
      if (imageFile) {
        const path = `properties/${crypto.randomUUID()}.${imageExtension(
          imageFile,
        )}`;
        const { error: uploadError } = await supabase.storage
          .from("ad-inventory")
          .upload(path, imageFile, {
            cacheControl: "3600",
            contentType: imageFile.type || undefined,
            upsert: false,
          });

        if (uploadError) {
          throw new Error(uploadError.message);
        }

        uploadedPath = path;
      }

      const nextImagePath =
        uploadedPath ?? (removeExistingImage ? null : form.image_path);
      const payload = {
        name,
        city_id: cityId,
        place_id: placeId,
        type_id: typeId,
        description: description || null,
        monthly_reach: reach,
        rate,
        rate_unit: form.rate_unit,
        is_active: form.is_active,
        image_path: nextImagePath,
      };

      if (form.id) {
        const propertyId = form.id;
        const previous = properties.find(
          (property) => property.id === propertyId,
        );

        if (!previous) {
          throw new Error("This property is no longer available.");
        }

        const optimistic: AdProperty = {
          ...previous,
          ...payload,
          screens_count: previous.screens_count ?? 0,
        };

        setProperties((current) =>
          current.map((property) =>
            property.id === propertyId ? optimistic : property,
          ),
        );

        const { error } = await supabase
          .from("ad_properties")
          .update(payload)
          .eq("id", propertyId);

        if (error) {
          setProperties((current) =>
            current.map((property) =>
              property.id === propertyId ? previous : property,
            ),
          );
          throw new Error(error.message);
        }

        const previousImagePath = previous.image_path;

        if (
          previousImagePath &&
          previousImagePath !== nextImagePath
        ) {
          const { error: removeError } = await supabase.storage
            .from("ad-inventory")
            .remove([previousImagePath]);

          if (removeError) {
            setNotice({
              type: "error",
              message: `${name} was saved, but the previous image could not be removed.`,
            });
          } else {
            setNotice({
              type: "success",
              message: `Updated ${name}.`,
            });
          }
        } else {
          setNotice({
            type: "success",
            message: `Updated ${name}.`,
          });
        }

        closeModal();
        return;
      }

      const sort = nextSort(properties);
      const tempId = `temp-property-${createId()}`;
      const optimistic: AdProperty = {
        id: tempId,
        ...payload,
        screens_count: 0,
        sort,
      };

      setProperties((current) => [...current, optimistic]);

      const { data, error } = await supabase
        .from("ad_properties")
        .insert({ ...payload, sort })
        .select(
          "id, city_id, place_id, type_id, name, description, image_path, screens_count, monthly_reach, rate, rate_unit, is_active, sort",
        )
        .single();

      if (error || !data) {
        setProperties((current) =>
          current.filter((property) => property.id !== tempId),
        );
        throw new Error(
          error?.message ?? "The property could not be saved.",
        );
      }

      const saved = data as AdProperty;
      setProperties((current) =>
        current.map((property) =>
          property.id === tempId ? saved : property,
        ),
      );
      setNotice({
        type: "success",
        message: `Added ${saved.name}.`,
      });
      closeModal();
    } catch (error) {
      if (uploadedPath) {
        await supabase.storage
          .from("ad-inventory")
          .remove([uploadedPath]);
      }

      setFormError(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setPending(null);
    }
  }

  async function handleToggle(property: AdProperty) {
    if (busy) {
      return;
    }

    const nextActive = !property.is_active;

    setProperties((current) =>
      current.map((item) =>
        item.id === property.id
          ? { ...item, is_active: nextActive }
          : item,
      ),
    );
    setPending(pendingKey("property-toggle", property.id));
    setNotice(null);

    const { error } = await supabase
      .from("ad_properties")
      .update({ is_active: nextActive })
      .eq("id", property.id);

    setPending(null);

    if (error) {
      setProperties((current) =>
        current.map((item) =>
          item.id === property.id
            ? { ...item, is_active: property.is_active }
            : item,
        ),
      );
      setNotice({ type: "error", message: error.message });
    }
  }

  async function handleDelete(property: AdProperty) {
    if (busy) {
      return;
    }

    if (
      !window.confirm(
        `Delete "${property.name}"? This cannot be undone.`,
      )
    ) {
      return;
    }

    const previous = properties;
    setProperties((current) =>
      current.filter((item) => item.id !== property.id),
    );
    setPending(pendingKey("property-delete", property.id));
    setNotice(null);

    const { error } = await supabase
      .from("ad_properties")
      .delete()
      .eq("id", property.id);

    if (error) {
      setProperties(previous);
      setPending(null);
      setNotice({ type: "error", message: error.message });
      return;
    }

    if (property.image_path) {
      const { error: storageError } = await supabase.storage
        .from("ad-inventory")
        .remove([property.image_path]);

      if (storageError) {
        setNotice({
          type: "error",
          message: `"${property.name}" was deleted, but its image could not be removed.`,
        });
        setPending(null);
        return;
      }
    }

    setPending(null);
    setNotice({
      type: "success",
      message: `Deleted "${property.name}".`,
    });
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
          Properties could not be loaded. {loadError}
        </p>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold tracking-tight text-white">
          Ad properties
        </h2>
        <Button onClick={openAddModal} disabled={busy}>
          <Plus aria-hidden="true" className="h-4 w-4" />
          Add Property
        </Button>
      </div>

      <FilterBar
        search={{
          value: filters.search,
          onChange: (value) => set("search", value),
          placeholder: "Search name or place",
        }}
        selects={[
          {
            key: "city",
            label: "City",
            value: filters.city,
            onChange: handleCityFilterChange,
            options: sortedCities.map((city) => ({
              value: city.id,
              label: city.name,
            })),
          },
          {
            key: "place",
            label: "Place (location)",
            value: filters.place,
            onChange: (value) => set("place", value),
            options: filterPlaceOptions.map((place) => ({
              value: place.id,
              label: place.name,
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
            key: "screens",
            label: "Screens",
            value: filters.screens,
            onChange: (value) => set("screens", value),
            allLabel: "All screens",
            options: [
              { value: "with", label: "Has screens" },
              { value: "without", label: "No screens" },
            ],
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
        resultCount={visibleProperties.length}
        total={properties.length}
        onClear={clear}
      />

      {visibleProperties.length === 0 ? (
        <Card className="flex flex-col items-center justify-center px-6 py-14 text-center hover:border-white/10 hover:shadow-none">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-brand-sky">
            <Building2 aria-hidden="true" className="h-6 w-6" />
          </span>
          <h2 className="mt-4 text-base font-semibold text-white">
            {properties.length === 0
              ? "No properties yet"
              : "No properties match your filters"}
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-body">
            {properties.length === 0
              ? "Add your first ad property to start building inventory."
              : "Try another city, type, place, status, or search term."}
          </p>
          {properties.length === 0 ? (
            <Button
              onClick={openAddModal}
              disabled={busy}
              className="mt-5"
            >
              <Plus aria-hidden="true" className="h-4 w-4" />
              Add Property
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
                    Property
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Type
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Place
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Rate
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Monthly reach
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
                {visibleProperties.map((property) => {
                  const imageUrl = getAdImageUrl(property.image_path);
                  const city = cityById.get(property.city_id);
                  const place = property.place_id
                    ? placeById.get(property.place_id)
                    : null;
                  const type = property.type_id
                    ? typeById.get(property.type_id)
                    : null;
                  const expanded = expandedProperties.has(property.id);
                  const counts = screenCounts(property, statsById);
                  const deleting =
                    pending === pendingKey("property-delete", property.id);

                  return (
                    <Fragment key={property.id}>
                      <tr className="transition duration-200 hover:bg-white/[0.03]">
                        <td className="max-w-[19rem] px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <PropertyThumbnail
                              url={imageUrl}
                              name={property.name}
                            />
                            <div className="min-w-0">
                              <button
                                type="button"
                                onClick={() =>
                                  togglePropertyExpanded(property.id)
                                }
                                aria-expanded={expanded}
                                aria-controls={`property-screens-${property.id}`}
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
                                  {property.name}
                                </span>
                              </button>
                              <p className="mt-0.5 truncate text-xs text-muted">
                                {city?.name || "Unknown city"}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-white/70">
                          {type?.name || "—"}
                        </td>
                        <td className="px-4 py-3.5 text-white/70">
                          {place?.name || "—"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5 font-medium text-white/80">
                          {formatINR(property.rate)}{" "}
                          <span className="text-xs text-muted">
                            / {property.rate_unit}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-white/70 tabular-nums">
                          {reachFormatter.format(property.monthly_reach)}
                        </td>
                        <td className="px-4 py-3.5 text-white/70 tabular-nums">
                          {screensLabel(counts)}
                        </td>
                        <td className="px-4 py-3.5">
                          <ActiveToggle
                            active={property.is_active}
                            label={`${
                              property.is_active ? "Deactivate" : "Activate"
                            } ${property.name}`}
                            disabled={busy}
                            onChange={() => void handleToggle(property)}
                          />
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditModal(property)}
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
                              onClick={() => void handleDelete(property)}
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
                          <td colSpan={8} className="px-5 pb-4">
                            <div
                              id={`property-screens-${property.id}`}
                              className="rounded-2xl border border-white/10 bg-black/20 p-4"
                            >
                              <PropertyScreensContent
                                state={screensByProperty[property.id]}
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
            {visibleProperties.map((property) => {
              const imageUrl = getAdImageUrl(property.image_path);
              const city = cityById.get(property.city_id);
              const place = property.place_id
                ? placeById.get(property.place_id)
                : null;
              const type = property.type_id
                ? typeById.get(property.type_id)
                : null;
              const expanded = expandedProperties.has(property.id);
              const counts = screenCounts(property, statsById);
              const deleting =
                pending === pendingKey("property-delete", property.id);

              return (
                <div key={property.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <PropertyThumbnail
                        url={imageUrl}
                        name={property.name}
                        className="h-12 w-12"
                      />
                      <div className="min-w-0">
                        <button
                          type="button"
                          onClick={() => togglePropertyExpanded(property.id)}
                          aria-expanded={expanded}
                          aria-controls={`property-screens-mobile-${property.id}`}
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
                            {property.name}
                          </span>
                        </button>
                        <p className="mt-0.5 truncate text-xs text-muted">
                          {city?.name || "Unknown city"}
                          {place ? ` · ${place.name}` : ""}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-body">
                          {type?.name || "No type"}
                        </p>
                      </div>
                    </div>
                    <ActiveToggle
                      active={property.is_active}
                      label={`${
                        property.is_active ? "Deactivate" : "Activate"
                      } ${property.name}`}
                      disabled={busy}
                      onChange={() => void handleToggle(property)}
                    />
                  </div>

                  <dl className="mt-4 grid grid-cols-3 gap-3 text-xs">
                    <div>
                      <dt className="text-muted">Rate</dt>
                      <dd className="mt-0.5 font-medium text-white/80">
                        {formatINR(property.rate)}{" "}
                        <span className="text-muted">
                          / {property.rate_unit}
                        </span>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted">Monthly reach</dt>
                      <dd className="mt-0.5 text-white/70 tabular-nums">
                        {reachFormatter.format(property.monthly_reach)}
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
                      onClick={() => openEditModal(property)}
                      disabled={busy}
                      className="h-8 px-3 text-xs"
                    >
                      <Pencil aria-hidden="true" className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void handleDelete(property)}
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
                      id={`property-screens-mobile-${property.id}`}
                      className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-3"
                    >
                      <PropertyScreensContent
                        state={screensByProperty[property.id]}
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
            aria-label="Close property dialog"
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
            aria-labelledby="property-dialog-title"
            aria-busy={saving}
            className="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-white/10 bg-surface p-5 shadow-card sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-sky">
                  Ad inventory
                </p>
                <h2
                  id="property-dialog-title"
                  className="mt-1 text-xl font-bold tracking-tight text-white"
                >
                  {form.id ? "Edit property" : "Add property"}
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
                    htmlFor="property-name"
                    className="mb-1 block text-xs text-muted"
                  >
                    Name <span className="text-red-300">*</span>
                  </label>
                  <input
                    id="property-name"
                    value={form.name}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    placeholder="Bandra Linking Road billboard"
                    autoFocus
                    className={inputClass}
                  />
                </div>

                <div>
                  <label
                    htmlFor="property-city"
                    className="mb-1 block text-xs text-muted"
                  >
                    City <span className="text-red-300">*</span>
                  </label>
                  <select
                    id="property-city"
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
                    htmlFor="property-place"
                    className="mb-1 block text-xs text-muted"
                  >
                    Place
                  </label>
                  <select
                    id="property-place"
                    value={form.place_id}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        place_id: event.target.value,
                      }))
                    }
                    disabled={formPlaceOptions.length === 0}
                    className={inputClass}
                  >
                    <option value="">No place</option>
                    {formPlaceOptions.map((place) => (
                      <option key={place.id} value={place.id}>
                        {place.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="property-type"
                    className="mb-1 block text-xs text-muted"
                  >
                    Type
                  </label>
                  <select
                    id="property-type"
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
                  <p className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-muted">
                    Screens are added by the Device Managers.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="property-reach"
                    className="mb-1 block text-xs text-muted"
                  >
                    Monthly reach
                  </label>
                  <input
                    id="property-reach"
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
                </div>

                <div className="sm:col-span-2">
                  <label
                    htmlFor="property-description"
                    className="mb-1 block text-xs text-muted"
                  >
                    Description
                  </label>
                  <textarea
                    id="property-description"
                    rows={3}
                    value={form.description}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                    placeholder="Describe the audience, location, and screen."
                    className={cn(inputClass, "h-auto py-2.5")}
                  />
                </div>

                <div className="sm:col-span-2">
                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_9rem]">
                    <div>
                      <label
                        htmlFor="property-rate"
                        className="mb-1 block text-xs text-muted"
                      >
                        Rate <span className="text-red-300">*</span>
                      </label>
                      <input
                        id="property-rate"
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
                        placeholder="50000"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="property-rate-unit"
                        className="mb-1 block text-xs text-muted"
                      >
                        Unit
                      </label>
                      <select
                        id="property-rate-unit"
                        value={form.rate_unit}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            rate_unit: event.target.value as AdRateUnit,
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
                  <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-white">
                        Active
                      </p>
                      <p className="mt-0.5 text-xs text-muted">
                        Inactive properties stay hidden from customers.
                      </p>
                    </div>
                    <ActiveToggle
                      active={form.is_active}
                      label="Toggle property active"
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
                  <p className="mb-1 text-xs text-muted">Image</p>

                  {previewUrl ? (
                    <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/30">
                      <img
                        src={previewUrl}
                        alt="Property preview"
                        className="h-44 w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex h-36 flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] text-center">
                      <ImageIcon
                        aria-hidden="true"
                        className="h-6 w-6 text-white/30"
                      />
                      <p className="mt-2 text-sm text-body">
                        No image selected
                      </p>
                    </div>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleImageChange}
                    className="hidden"
                  />

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={saving}
                    >
                      <UploadCloud
                        aria-hidden="true"
                        className="h-4 w-4"
                      />
                      {previewUrl ? "Replace image" : "Upload image"}
                    </Button>

                    {previewUrl ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleRemoveImage}
                        disabled={saving}
                        className="text-red-300 hover:bg-red-400/10 hover:text-red-200"
                      >
                        <Trash2
                          aria-hidden="true"
                          className="h-4 w-4"
                        />
                        Remove
                      </Button>
                    ) : null}
                  </div>

                  <p className="mt-2 text-xs text-muted">
                    JPG, PNG, or WebP. Maximum 5 MB.
                    {imageFile
                      ? ` ${imageFile.name} · ${formatFileSize(imageFile.size)}`
                      : ""}
                  </p>
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
                  {saving
                    ? "Saving..."
                    : form.id
                      ? "Save changes"
                      : "Add property"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
