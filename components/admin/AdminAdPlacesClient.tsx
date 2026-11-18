"use client";

import { useMemo, useState, type FormEvent } from "react";
import {
  Building2,
  Check,
  CheckCircle2,
  ExternalLink,
  MapPin,
  Pencil,
  Plus,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import FilterBar from "@/components/ui/FilterBar";
import type {
  AdCity,
  AdPlace,
  AdPropertyDependency,
  AdPropertyType,
} from "@/lib/ads";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { useFilters } from "@/lib/useFilters";

type PlaceFilters = {
  search: string;
  city: string;
  notOnMap: boolean;
};

function createInitialFilters(cities: AdCity[]): PlaceFilters {
  return {
    search: "",
    city: cities[0]?.id ?? "",
    notOnMap: false,
  };
}

type Notice = {
  type: "success" | "error";
  message: string;
};

type CityDraft = {
  name: string;
  state: string;
};

type PlaceDraft = {
  name: string;
  sort: string;
  mapPosition: string;
  lat: string;
  lng: string;
  isMajor: boolean;
};

const inputClass =
  "h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white outline-none transition placeholder:text-muted focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/40";

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

function propertyCountLabel(count: number) {
  return `${count} ${count === 1 ? "property" : "properties"}`;
}

function dependencyMessage(name: string, count: number) {
  return `"${name}" cannot be deleted because ${propertyCountLabel(
    count,
  )} still ${count === 1 ? "depends" : "depend"} on it. Reassign or delete ${
    count === 1 ? "that property" : "those properties"
  } first.`;
}

function compareRows(
  a: { sort: number; name: string },
  b: { sort: number; name: string },
) {
  return a.sort - b.sort || a.name.localeCompare(b.name);
}

function splitMapPosition(value: string): { lat: string; lng: string } | null {
  const parts = value.trim().split(/[\s,\t]+/).filter(Boolean);
  if (parts.length < 2) return null;
  return { lat: parts[0], lng: parts[1] };
}

function parseCoord(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

function isOutsideDehradun(lat: number, lng: number) {
  return lat < 29.9 || lat > 30.7 || lng < 77.7 || lng > 78.4;
}

function formatCoord(n: number | null) {
  if (n == null || !Number.isFinite(n)) return "";
  return String(n);
}

function emptyPlaceDraft(): PlaceDraft {
  return {
    name: "",
    sort: "",
    mapPosition: "",
    lat: "",
    lng: "",
    isMajor: false,
  };
}

function placeDraftFromPlace(place: AdPlace): PlaceDraft {
  const lat = formatCoord(place.lat);
  const lng = formatCoord(place.lng);
  return {
    name: place.name,
    sort: String(place.sort),
    mapPosition: lat && lng ? `${lat}, ${lng}` : "",
    lat,
    lng,
    isMajor: !!place.is_major,
  };
}

function validatePlaceCoords(latStr: string, lngStr: string): string | null {
  const hasLat = latStr.trim() !== "";
  const hasLng = lngStr.trim() !== "";
  if (hasLat !== hasLng) {
    return "Latitude and longitude must both be filled or both be empty.";
  }
  if (!hasLat && !hasLng) return null;
  const lat = parseCoord(latStr);
  const lng = parseCoord(lngStr);
  if (lat == null || lat < -90 || lat > 90) {
    return "Latitude must be a number between -90 and 90.";
  }
  if (lng == null || lng < -180 || lng > 180) {
    return "Longitude must be a number between -180 and 180.";
  }
  return null;
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

function MajorSwitch({
  checked,
  onChange,
  disabled,
  id,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  id: string;
}) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-center gap-3">
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 disabled:pointer-events-none disabled:opacity-50",
          checked
            ? "brand-gradient border-transparent"
            : "border-white/10 bg-white/10",
        )}
      >
        <span
          className={cn(
            "inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200",
            checked ? "translate-x-6" : "translate-x-1",
          )}
        />
      </button>
      <span className="text-sm text-body">
        Major area (shown bold on the website map)
      </span>
    </label>
  );
}

function PlaceMapFields({
  draft,
  onChange,
  disabled,
  idPrefix,
}: {
  draft: PlaceDraft;
  onChange: (next: PlaceDraft) => void;
  disabled?: boolean;
  idPrefix: string;
}) {
  const latNum = parseCoord(draft.lat);
  const lngNum = parseCoord(draft.lng);
  const bothSet = draft.lat.trim() !== "" && draft.lng.trim() !== "";
  const showWarning =
    bothSet &&
    latNum != null &&
    lngNum != null &&
    isOutsideDehradun(latNum, lngNum);

  return (
    <div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.02] p-3 sm:p-4">
      <div>
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <label
            htmlFor={`${idPrefix}-map-position`}
            className="block text-xs text-muted"
          >
            Map position
          </label>
          {bothSet ? (
            <a
              href={`https://www.google.com/maps?q=${encodeURIComponent(
                draft.lat.trim(),
              )},${encodeURIComponent(draft.lng.trim())}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-sky-400 transition hover:text-sky-300"
            >
              Open in Google Maps
              <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
            </a>
          ) : null}
        </div>
        <input
          id={`${idPrefix}-map-position`}
          value={draft.mapPosition}
          onChange={(event) => {
            const value = event.target.value;
            const split = splitMapPosition(value);
            onChange({
              ...draft,
              mapPosition: value,
              ...(split ? { lat: split.lat, lng: split.lng } : {}),
            });
          }}
          placeholder="30.3244, 78.0418"
          disabled={disabled}
          className={inputClass}
        />
        <p className="mt-1.5 text-xs text-muted">
          On Google Maps right-click the exact spot, click the numbers at the
          top of the menu to copy them, and paste here.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label
            htmlFor={`${idPrefix}-lat`}
            className="mb-1 block text-xs text-muted"
          >
            Latitude
          </label>
          <input
            id={`${idPrefix}-lat`}
            type="number"
            step="any"
            value={draft.lat}
            onChange={(event) =>
              onChange({ ...draft, lat: event.target.value })
            }
            placeholder="30.3244"
            disabled={disabled}
            className={inputClass}
          />
        </div>
        <div>
          <label
            htmlFor={`${idPrefix}-lng`}
            className="mb-1 block text-xs text-muted"
          >
            Longitude
          </label>
          <input
            id={`${idPrefix}-lng`}
            type="number"
            step="any"
            value={draft.lng}
            onChange={(event) =>
              onChange({ ...draft, lng: event.target.value })
            }
            placeholder="78.0418"
            disabled={disabled}
            className={inputClass}
          />
        </div>
      </div>

      {showWarning ? (
        <p className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-200">
          Position is outside the Dehradun area (latitude 29.9 to 30.7,
          longitude 77.7 to 78.4).
        </p>
      ) : null}

      <MajorSwitch
        id={`${idPrefix}-major`}
        checked={draft.isMajor}
        onChange={(checked) => onChange({ ...draft, isMajor: checked })}
        disabled={disabled}
      />
    </div>
  );
}

export default function AdminAdPlacesClient({
  cities: initialCities,
  places: initialPlaces,
  propertyTypes: initialPropertyTypes,
  propertyDependencies,
  loadError,
}: {
  cities: AdCity[];
  places: AdPlace[];
  propertyTypes: AdPropertyType[];
  propertyDependencies: AdPropertyDependency[];
  loadError: string | null;
}) {
  const supabase = useMemo(() => createClient(), []);
  const initialFilters = useMemo(
    () => createInitialFilters(initialCities),
    [initialCities],
  );
  const { filters, set, clear } = useFilters(initialFilters);
  const [cities, setCities] = useState<AdCity[]>(initialCities);
  const [places, setPlaces] = useState<AdPlace[]>(initialPlaces);
  const [propertyTypes, setPropertyTypes] =
    useState<AdPropertyType[]>(initialPropertyTypes);
  const [cityDraft, setCityDraft] = useState<CityDraft>({
    name: "",
    state: "",
  });
  const [placeDraft, setPlaceDraft] = useState<PlaceDraft>(emptyPlaceDraft());
  const [typeDraft, setTypeDraft] = useState("");
  const [editingCityId, setEditingCityId] = useState<string | null>(null);
  const [cityEdit, setCityEdit] = useState<CityDraft>({
    name: "",
    state: "",
  });
  const [editingPlaceId, setEditingPlaceId] = useState<string | null>(null);
  const [placeEdit, setPlaceEdit] = useState<PlaceDraft>(emptyPlaceDraft());
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);
  const [typeEdit, setTypeEdit] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  const sortedCities = useMemo(
    () => [...cities].sort(compareRows),
    [cities],
  );
  const activeCityId = useMemo(() => {
    if (filters.city && cities.some((city) => city.id === filters.city)) {
      return filters.city;
    }

    return sortedCities[0]?.id ?? "";
  }, [cities, filters.city, sortedCities]);

  const cityPlaces = useMemo(
    () =>
      places
        .filter((place) => place.city_id === activeCityId)
        .sort(compareRows),
    [activeCityId, places],
  );

  const visiblePlaces = useMemo(() => {
    const normalizedQuery = filters.search.trim().toLowerCase();

    return cityPlaces.filter((place) => {
      if (filters.notOnMap && place.lat != null && place.lng != null) {
        return false;
      }
      if (!normalizedQuery) return true;
      return place.name.toLowerCase().includes(normalizedQuery);
    });
  }, [cityPlaces, filters.search, filters.notOnMap]);

  const sortedTypes = useMemo(
    () => [...propertyTypes].sort(compareRows),
    [propertyTypes],
  );

  const propertiesByCity = useMemo(() => {
    const counts = new Map<string, number>();
    for (const property of propertyDependencies) {
      counts.set(property.city_id, (counts.get(property.city_id) ?? 0) + 1);
    }
    return counts;
  }, [propertyDependencies]);

  const propertiesByPlace = useMemo(() => {
    const counts = new Map<string, number>();
    for (const property of propertyDependencies) {
      if (!property.place_id) continue;
      counts.set(
        property.place_id,
        (counts.get(property.place_id) ?? 0) + 1,
      );
    }
    return counts;
  }, [propertyDependencies]);

  const propertiesByType = useMemo(() => {
    const counts = new Map<string, number>();
    for (const property of propertyDependencies) {
      if (!property.type_id) continue;
      counts.set(property.type_id, (counts.get(property.type_id) ?? 0) + 1);
    }
    return counts;
  }, [propertyDependencies]);

  const busy = pending !== null;

  function handleCityFilterChange(value: string) {
    set("city", value || activeCityId);
  }

  async function handleAddCity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    const name = cityDraft.name.trim();
    const state = cityDraft.state.trim();
    if (!name) {
      setNotice({ type: "error", message: "Enter a city name." });
      return;
    }

    const tempId = `temp-city-${createId()}`;
    const sort = nextSort(cities);
    const optimistic: AdCity = {
      id: tempId,
      name,
      state: state || null,
      is_active: true,
      sort,
    };

    setCities((current) => [...current, optimistic]);
    setCityDraft({ name: "", state: "" });
    setPending(pendingKey("city-add"));
    setNotice(null);

    const { data, error } = await supabase
      .from("ad_cities")
      .insert({ name, state: state || null, is_active: true, sort })
      .select("id, name, state, is_active, sort")
      .single();

    setPending(null);

    if (error || !data) {
      setCities((current) => current.filter((city) => city.id !== tempId));
      setCityDraft({ name, state });
      setNotice({
        type: "error",
        message: error?.message ?? "The city could not be added.",
      });
      return;
    }

    const saved = data as AdCity;
    setCities((current) =>
      current.map((city) => (city.id === tempId ? saved : city)),
    );
    set("city", saved.id);
    setNotice({ type: "success", message: `Added ${saved.name}.` });
  }

  function startEditCity(city: AdCity) {
    setEditingCityId(city.id);
    setCityEdit({ name: city.name, state: city.state ?? "" });
    setNotice(null);
  }

  async function handleSaveCity(city: AdCity) {
    if (busy) return;

    const name = cityEdit.name.trim();
    const state = cityEdit.state.trim();
    if (!name) {
      setNotice({ type: "error", message: "Enter a city name." });
      return;
    }

    if (name === city.name && (state || null) === (city.state ?? null)) {
      setEditingCityId(null);
      return;
    }

    const previous = city;
    const optimistic: AdCity = { ...city, name, state: state || null };

    setCities((current) =>
      current.map((item) => (item.id === city.id ? optimistic : item)),
    );
    setEditingCityId(null);
    setPending(pendingKey("city-save", city.id));
    setNotice(null);

    const { error } = await supabase
      .from("ad_cities")
      .update({ name, state: state || null })
      .eq("id", city.id);

    setPending(null);

    if (error) {
      setCities((current) =>
        current.map((item) => (item.id === city.id ? previous : item)),
      );
      setEditingCityId(city.id);
      setCityEdit({ name, state });
      setNotice({ type: "error", message: error.message });
      return;
    }

    setNotice({ type: "success", message: `Updated ${name}.` });
  }

  async function handleToggleCity(city: AdCity) {
    if (busy) return;

    const nextActive = !city.is_active;
    setCities((current) =>
      current.map((item) =>
        item.id === city.id ? { ...item, is_active: nextActive } : item,
      ),
    );
    setPending(pendingKey("city-toggle", city.id));
    setNotice(null);

    const { error } = await supabase
      .from("ad_cities")
      .update({ is_active: nextActive })
      .eq("id", city.id);

    setPending(null);

    if (error) {
      setCities((current) =>
        current.map((item) =>
          item.id === city.id ? { ...item, is_active: city.is_active } : item,
        ),
      );
      setNotice({ type: "error", message: error.message });
    }
  }

  async function handleDeleteCity(city: AdCity) {
    if (busy) return;

    const dependents = propertiesByCity.get(city.id) ?? 0;
    if (dependents > 0) {
      setNotice({
        type: "error",
        message: dependencyMessage(city.name, dependents),
      });
      return;
    }

    if (
      !window.confirm(
        `Delete "${city.name}"? Its places will also be removed. This cannot be undone.`,
      )
    ) {
      return;
    }

    const previousCities = cities;
    const previousPlaces = places;
    const previousCityFilter = filters.city;
    const nextCityFilter =
      cities.find((item) => item.id !== city.id)?.id ?? "";

    setCities((current) => current.filter((item) => item.id !== city.id));
    setPlaces((current) =>
      current.filter((place) => place.city_id !== city.id),
    );
    if (activeCityId === city.id) {
      set("city", nextCityFilter);
    }

    setPending(pendingKey("city-delete", city.id));
    setNotice(null);

    const { error } = await supabase
      .from("ad_cities")
      .delete()
      .eq("id", city.id);

    setPending(null);

    if (error) {
      setCities(previousCities);
      setPlaces(previousPlaces);
      set("city", previousCityFilter);
      setNotice({ type: "error", message: error.message });
      return;
    }

    setNotice({ type: "success", message: `Deleted "${city.name}".` });
  }

  async function handleAddPlace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    if (!activeCityId) {
      setNotice({
        type: "error",
        message: "Add a city before adding places.",
      });
      return;
    }

    const name = placeDraft.name.trim();
    const sortValue = placeDraft.sort.trim();
    if (!name) {
      setNotice({ type: "error", message: "Enter a place name." });
      return;
    }

    let sort = nextSort(cityPlaces);
    if (sortValue) {
      const parsed = Number(sortValue);
      if (!Number.isInteger(parsed) || parsed < 0) {
        setNotice({
          type: "error",
          message: "Sort order must be a whole number of 0 or more.",
        });
        return;
      }
      sort = parsed;
    }

    const coordError = validatePlaceCoords(placeDraft.lat, placeDraft.lng);
    if (coordError) {
      setNotice({ type: "error", message: coordError });
      return;
    }

    const lat = parseCoord(placeDraft.lat);
    const lng = parseCoord(placeDraft.lng);
    const isMajor = placeDraft.isMajor;

    const tempId = `temp-place-${createId()}`;
    const optimistic: AdPlace = {
      id: tempId,
      city_id: activeCityId,
      name,
      lat,
      lng,
      is_major: isMajor,
      is_active: true,
      sort,
    };

    setPlaces((current) => [...current, optimistic]);
    setPlaceDraft(emptyPlaceDraft());
    setPending(pendingKey("place-add"));
    setNotice(null);

    const { data, error } = await supabase
      .from("ad_places")
      .insert({
        city_id: activeCityId,
        name,
        lat,
        lng,
        is_major: isMajor,
        is_active: true,
        sort,
      })
      .select("id, city_id, name, lat, lng, is_major, is_active, sort")
      .single();

    setPending(null);

    if (error || !data) {
      setPlaces((current) => current.filter((place) => place.id !== tempId));
      setPlaceDraft({
        ...emptyPlaceDraft(),
        name,
        sort: sortValue,
        mapPosition: placeDraft.mapPosition,
        lat: placeDraft.lat,
        lng: placeDraft.lng,
        isMajor,
      });
      setNotice({
        type: "error",
        message: error?.message ?? "The place could not be added.",
      });
      return;
    }

    const saved = data as AdPlace;
    setPlaces((current) =>
      current.map((place) => (place.id === tempId ? saved : place)),
    );
    setNotice({ type: "success", message: `Added ${saved.name}.` });
  }

  function startEditPlace(place: AdPlace) {
    setEditingPlaceId(place.id);
    setPlaceEdit(placeDraftFromPlace(place));
    setNotice(null);
  }

  async function handleSavePlace(place: AdPlace) {
    if (busy) return;

    const name = placeEdit.name.trim();
    const sortValue = placeEdit.sort.trim();
    const parsedSort = Number(sortValue);
    if (!name) {
      setNotice({ type: "error", message: "Enter a place name." });
      return;
    }
    if (!sortValue || !Number.isInteger(parsedSort) || parsedSort < 0) {
      setNotice({
        type: "error",
        message: "Sort order must be a whole number of 0 or more.",
      });
      return;
    }

    const coordError = validatePlaceCoords(placeEdit.lat, placeEdit.lng);
    if (coordError) {
      setNotice({ type: "error", message: coordError });
      return;
    }

    const lat = parseCoord(placeEdit.lat);
    const lng = parseCoord(placeEdit.lng);
    const isMajor = placeEdit.isMajor;

    const unchanged =
      name === place.name &&
      parsedSort === place.sort &&
      lat === (place.lat ?? null) &&
      lng === (place.lng ?? null) &&
      isMajor === !!place.is_major;

    if (unchanged) {
      setEditingPlaceId(null);
      return;
    }

    const previous = place;
    const optimistic: AdPlace = {
      ...place,
      name,
      sort: parsedSort,
      lat,
      lng,
      is_major: isMajor,
    };

    setPlaces((current) =>
      current.map((item) => (item.id === place.id ? optimistic : item)),
    );
    setEditingPlaceId(null);
    setPending(pendingKey("place-save", place.id));
    setNotice(null);

    const { error } = await supabase
      .from("ad_places")
      .update({ name, sort: parsedSort, lat, lng, is_major: isMajor })
      .eq("id", place.id);

    setPending(null);

    if (error) {
      setPlaces((current) =>
        current.map((item) => (item.id === place.id ? previous : item)),
      );
      setEditingPlaceId(place.id);
      setPlaceEdit({
        ...placeEdit,
        name,
        sort: String(parsedSort),
      });
      setNotice({ type: "error", message: error.message });
      return;
    }

    setNotice({ type: "success", message: `Updated ${name}.` });
  }

  async function handleTogglePlace(place: AdPlace) {
    if (busy) return;

    const nextActive = !place.is_active;
    setPlaces((current) =>
      current.map((item) =>
        item.id === place.id ? { ...item, is_active: nextActive } : item,
      ),
    );
    setPending(pendingKey("place-toggle", place.id));
    setNotice(null);

    const { error } = await supabase
      .from("ad_places")
      .update({ is_active: nextActive })
      .eq("id", place.id);

    setPending(null);

    if (error) {
      setPlaces((current) =>
        current.map((item) =>
          item.id === place.id
            ? { ...item, is_active: place.is_active }
            : item,
        ),
      );
      setNotice({ type: "error", message: error.message });
    }
  }

  async function handleDeletePlace(place: AdPlace) {
    if (busy) return;

    const dependents = propertiesByPlace.get(place.id) ?? 0;
    if (dependents > 0) {
      setNotice({
        type: "error",
        message: dependencyMessage(place.name, dependents),
      });
      return;
    }

    if (!window.confirm(`Delete "${place.name}"? This cannot be undone.`)) {
      return;
    }

    const previous = places;
    setPlaces((current) => current.filter((item) => item.id !== place.id));
    setPending(pendingKey("place-delete", place.id));
    setNotice(null);

    const { error } = await supabase
      .from("ad_places")
      .delete()
      .eq("id", place.id);

    setPending(null);

    if (error) {
      setPlaces(previous);
      setNotice({ type: "error", message: error.message });
      return;
    }

    setNotice({ type: "success", message: `Deleted "${place.name}".` });
  }

  async function handleAddType(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    const name = typeDraft.trim();
    if (!name) {
      setNotice({ type: "error", message: "Enter a property type name." });
      return;
    }

    const tempId = `temp-type-${createId()}`;
    const sort = nextSort(propertyTypes);
    const optimistic: AdPropertyType = { id: tempId, name, sort };

    setPropertyTypes((current) => [...current, optimistic]);
    setTypeDraft("");
    setPending(pendingKey("type-add"));
    setNotice(null);

    const { data, error } = await supabase
      .from("ad_property_types")
      .insert({ name, sort })
      .select("id, name, sort")
      .single();

    setPending(null);

    if (error || !data) {
      setPropertyTypes((current) =>
        current.filter((type) => type.id !== tempId),
      );
      setTypeDraft(name);
      setNotice({
        type: "error",
        message: error?.message ?? "The property type could not be added.",
      });
      return;
    }

    const saved = data as AdPropertyType;
    setPropertyTypes((current) =>
      current.map((type) => (type.id === tempId ? saved : type)),
    );
    setNotice({ type: "success", message: `Added ${saved.name}.` });
  }

  function startEditType(type: AdPropertyType) {
    setEditingTypeId(type.id);
    setTypeEdit(type.name);
    setNotice(null);
  }

  async function handleSaveType(type: AdPropertyType) {
    if (busy) return;

    const name = typeEdit.trim();
    if (!name) {
      setNotice({ type: "error", message: "Enter a property type name." });
      return;
    }

    if (name === type.name) {
      setEditingTypeId(null);
      return;
    }

    const previous = type;
    const optimistic: AdPropertyType = { ...type, name };

    setPropertyTypes((current) =>
      current.map((item) => (item.id === type.id ? optimistic : item)),
    );
    setEditingTypeId(null);
    setPending(pendingKey("type-save", type.id));
    setNotice(null);

    const { error } = await supabase
      .from("ad_property_types")
      .update({ name })
      .eq("id", type.id);

    setPending(null);

    if (error) {
      setPropertyTypes((current) =>
        current.map((item) => (item.id === type.id ? previous : item)),
      );
      setEditingTypeId(type.id);
      setTypeEdit(name);
      setNotice({ type: "error", message: error.message });
      return;
    }

    setNotice({ type: "success", message: `Updated ${name}.` });
  }

  async function handleDeleteType(type: AdPropertyType) {
    if (busy) return;

    const dependents = propertiesByType.get(type.id) ?? 0;
    if (dependents > 0) {
      setNotice({
        type: "error",
        message: dependencyMessage(type.name, dependents),
      });
      return;
    }

    if (!window.confirm(`Delete "${type.name}"? This cannot be undone.`)) {
      return;
    }

    const previous = propertyTypes;
    setPropertyTypes((current) =>
      current.filter((item) => item.id !== type.id),
    );
    setPending(pendingKey("type-delete", type.id));
    setNotice(null);

    const { error } = await supabase
      .from("ad_property_types")
      .delete()
      .eq("id", type.id);

    setPending(null);

    if (error) {
      setPropertyTypes(previous);
      setNotice({ type: "error", message: error.message });
      return;
    }

    setNotice({ type: "success", message: `Deleted "${type.name}".` });
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
          Ad inventory could not be loaded. {loadError}
        </p>
      ) : null}

      <Card className="p-5 hover:border-white/10 hover:shadow-none sm:p-6">
        <div className="flex items-start gap-4">
          <span className="brand-gradient flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white shadow-brand">
            <MapPin aria-hidden="true" className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-white">
              Cities
            </h2>
            <p className="mt-1 text-sm text-body">
              Add cities, set their state, and control visibility.
            </p>
          </div>
        </div>

        <form
          onSubmit={handleAddCity}
          className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
        >
          <div>
            <label
              htmlFor="city-name"
              className="mb-1 block text-xs text-muted"
            >
              City name
            </label>
            <input
              id="city-name"
              value={cityDraft.name}
              onChange={(event) =>
                setCityDraft((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
              placeholder="Mumbai"
              className={inputClass}
            />
          </div>
          <div>
            <label
              htmlFor="city-state"
              className="mb-1 block text-xs text-muted"
            >
              State
            </label>
            <input
              id="city-state"
              value={cityDraft.state}
              onChange={(event) =>
                setCityDraft((current) => ({
                  ...current,
                  state: event.target.value,
                }))
              }
              placeholder="Maharashtra"
              className={inputClass}
            />
          </div>
          <Button type="submit" disabled={busy} className="sm:self-end">
            <Plus aria-hidden="true" className="h-4 w-4" />
            {pending === pendingKey("city-add") ? "Adding..." : "Add city"}
          </Button>
        </form>

        {sortedCities.length === 0 ? (
          <p className="mt-5 rounded-2xl border border-dashed border-white/10 px-4 py-6 text-center text-sm text-body">
            No cities yet. Add your first city above.
          </p>
        ) : (
          <ul className="mt-5 divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/10">
            {sortedCities.map((city) => {
              const isEditing = editingCityId === city.id;
              const dependents = propertiesByCity.get(city.id) ?? 0;

              return (
                <li
                  key={city.id}
                  className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  {isEditing ? (
                    <form
                      onSubmit={(event) => {
                        event.preventDefault();
                        void handleSaveCity(city);
                      }}
                      className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto]"
                    >
                      <input
                        value={cityEdit.name}
                        onChange={(event) =>
                          setCityEdit((current) => ({
                            ...current,
                            name: event.target.value,
                          }))
                        }
                        aria-label={`City name for ${city.name}`}
                        autoFocus
                        className={inputClass}
                      />
                      <input
                        value={cityEdit.state}
                        onChange={(event) =>
                          setCityEdit((current) => ({
                            ...current,
                            state: event.target.value,
                          }))
                        }
                        aria-label={`State for ${city.name}`}
                        placeholder="State"
                        className={inputClass}
                      />
                      <Button
                        type="submit"
                        size="sm"
                        disabled={busy}
                        className="h-10"
                      >
                        <Check aria-hidden="true" className="h-4 w-4" />
                        Save
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        onClick={() => setEditingCityId(null)}
                        className="h-10"
                      >
                        <X aria-hidden="true" className="h-4 w-4" />
                        Cancel
                      </Button>
                    </form>
                  ) : (
                    <>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">
                          {city.name}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-muted">
                          {city.state || "No state"} ·{" "}
                          {city.is_active ? "Active" : "Inactive"}
                          {dependents > 0
                            ? ` · ${propertyCountLabel(dependents)}`
                            : ""}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <ActiveToggle
                          active={city.is_active}
                          label={`${
                            city.is_active ? "Deactivate" : "Activate"
                          } ${city.name}`}
                          disabled={busy}
                          onChange={() => void handleToggleCity(city)}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => startEditCity(city)}
                          disabled={busy}
                          className="h-8 px-3 text-xs"
                        >
                          <Pencil aria-hidden="true" className="h-3.5 w-3.5" />
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => void handleDeleteCity(city)}
                          disabled={busy}
                          className="h-8 px-3 text-xs text-red-300 hover:bg-red-400/10 hover:text-red-200"
                        >
                          <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                          {pending === pendingKey("city-delete", city.id)
                            ? "Deleting..."
                            : "Delete"}
                        </Button>
                      </div>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card className="p-5 hover:border-white/10 hover:shadow-none sm:p-6">
        <div className="flex items-start gap-4">
          <span className="brand-gradient flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white shadow-brand">
            <Building2 aria-hidden="true" className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-white">
              Places
            </h2>
            <p className="mt-1 text-sm text-body">
              Localities and popular places inside the selected city.
            </p>
          </div>
        </div>

        <div className="mt-5">
          <FilterBar
            search={{
              value: filters.search,
              onChange: (value) => set("search", value),
              placeholder: "Search places",
            }}
            selects={[
              {
                key: "city",
                label: "City",
                value: activeCityId,
                onChange: handleCityFilterChange,
                options: sortedCities.map((city) => ({
                  value: city.id,
                  label: `${city.name}${city.state ? `, ${city.state}` : ""}${
                    city.is_active ? "" : " (inactive)"
                  }`,
                })),
              },
            ]}
            toggles={[
              {
                key: "notOnMap",
                label: "Not on map only",
                checked: filters.notOnMap,
                onChange: (checked) => set("notOnMap", checked),
              },
            ]}
            resultCount={visiblePlaces.length}
            total={places.length}
            onClear={clear}
          />
        </div>

        <form onSubmit={handleAddPlace} className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_8rem_auto]">
            <div>
              <label
                htmlFor="place-name"
                className="mb-1 block text-xs text-muted"
              >
                Place name
              </label>
              <input
                id="place-name"
                value={placeDraft.name}
                onChange={(event) =>
                  setPlaceDraft((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                placeholder="Bandra West"
                disabled={!activeCityId}
                className={inputClass}
              />
            </div>
            <div>
              <label
                htmlFor="place-sort"
                className="mb-1 block text-xs text-muted"
              >
                Sort
              </label>
              <input
                id="place-sort"
                type="number"
                min={0}
                step={1}
                value={placeDraft.sort}
                onChange={(event) =>
                  setPlaceDraft((current) => ({
                    ...current,
                    sort: event.target.value,
                  }))
                }
                placeholder="Auto"
                disabled={!activeCityId}
                className={inputClass}
              />
            </div>
            <Button
              type="submit"
              disabled={busy || !activeCityId}
              className="sm:self-end"
            >
              <Plus aria-hidden="true" className="h-4 w-4" />
              {pending === pendingKey("place-add") ? "Adding..." : "Add place"}
            </Button>
          </div>

          <PlaceMapFields
            draft={placeDraft}
            onChange={setPlaceDraft}
            disabled={!activeCityId}
            idPrefix="place-add"
          />
        </form>

        {!activeCityId ? (
          <p className="mt-5 rounded-2xl border border-dashed border-white/10 px-4 py-6 text-center text-sm text-body">
            Select or add a city to manage its places.
          </p>
        ) : visiblePlaces.length === 0 ? (
          <p className="mt-5 rounded-2xl border border-dashed border-white/10 px-4 py-6 text-center text-sm text-body">
            No places match the current filters.
          </p>
        ) : (
          <ul className="mt-5 divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/10">
            {visiblePlaces.map((place) => {
              const isEditing = editingPlaceId === place.id;
              const dependents = propertiesByPlace.get(place.id) ?? 0;
              const onMap = place.lat != null && place.lng != null;

              return (
                <li key={place.id} className="px-4 py-4">
                  {isEditing ? (
                    <form
                      onSubmit={(event) => {
                        event.preventDefault();
                        void handleSavePlace(place);
                      }}
                      className="space-y-4"
                    >
                      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_8rem]">
                        <div>
                          <label
                            htmlFor={`place-edit-name-${place.id}`}
                            className="mb-1 block text-xs text-muted"
                          >
                            Place name
                          </label>
                          <input
                            id={`place-edit-name-${place.id}`}
                            value={placeEdit.name}
                            onChange={(event) =>
                              setPlaceEdit((current) => ({
                                ...current,
                                name: event.target.value,
                              }))
                            }
                            aria-label={`Name for ${place.name}`}
                            autoFocus
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label
                            htmlFor={`place-edit-sort-${place.id}`}
                            className="mb-1 block text-xs text-muted"
                          >
                            Sort
                          </label>
                          <input
                            id={`place-edit-sort-${place.id}`}
                            type="number"
                            min={0}
                            step={1}
                            value={placeEdit.sort}
                            onChange={(event) =>
                              setPlaceEdit((current) => ({
                                ...current,
                                sort: event.target.value,
                              }))
                            }
                            aria-label={`Sort order for ${place.name}`}
                            className={inputClass}
                          />
                        </div>
                      </div>

                      <PlaceMapFields
                        draft={placeEdit}
                        onChange={setPlaceEdit}
                        disabled={busy}
                        idPrefix={`place-edit-${place.id}`}
                      />

                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="submit"
                          size="sm"
                          disabled={busy}
                          className="h-10"
                        >
                          <Check aria-hidden="true" className="h-4 w-4" />
                          Save
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={busy}
                          onClick={() => setEditingPlaceId(null)}
                          className="h-10"
                        >
                          <X aria-hidden="true" className="h-4 w-4" />
                          Cancel
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex flex-col gap-3">
                      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto_auto] lg:items-center">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-white">
                            {place.name}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-muted">
                            Sort {place.sort} ·{" "}
                            {place.is_active ? "Active" : "Inactive"}
                            {dependents > 0
                              ? ` · ${propertyCountLabel(dependents)}`
                              : ""}
                          </p>
                        </div>

                        <div className="min-w-0">
                          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
                            On map
                          </p>
                          {onMap ? (
                            <div className="mt-1 flex items-center gap-1.5 text-emerald-400">
                              <CheckCircle2
                                aria-hidden="true"
                                className="h-4 w-4 shrink-0"
                              />
                              <span className="text-xs text-emerald-300/90">
                                {place.lat}, {place.lng}
                              </span>
                            </div>
                          ) : (
                            <p className="mt-1 text-sm text-muted">Not on map</p>
                          )}
                        </div>

                        <div>
                          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
                            Major
                          </p>
                          <div className="mt-1">
                            {place.is_major ? (
                              <span className="inline-flex rounded-full border border-sky-400/30 bg-sky-400/10 px-2.5 py-1 text-xs font-medium text-sky-300">
                                Major
                              </span>
                            ) : (
                              <span className="text-sm text-muted">—</span>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                          <ActiveToggle
                            active={place.is_active}
                            label={`${
                              place.is_active ? "Deactivate" : "Activate"
                            } ${place.name}`}
                            disabled={busy}
                            onChange={() => void handleTogglePlace(place)}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => startEditPlace(place)}
                            disabled={busy}
                            className="h-8 px-3 text-xs"
                          >
                            <Pencil aria-hidden="true" className="h-3.5 w-3.5" />
                            Edit
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => void handleDeletePlace(place)}
                            disabled={busy}
                            className="h-8 px-3 text-xs text-red-300 hover:bg-red-400/10 hover:text-red-200"
                          >
                            <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                            {pending === pendingKey("place-delete", place.id)
                              ? "Deleting..."
                              : "Delete"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card className="p-5 hover:border-white/10 hover:shadow-none sm:p-6">
        <div className="flex items-start gap-4">
          <span className="brand-gradient flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white shadow-brand">
            <Tag aria-hidden="true" className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-white">
              Property types
            </h2>
            <p className="mt-1 text-sm text-body">
              Categories used to classify ad properties.
            </p>
          </div>
        </div>

        <form
          onSubmit={handleAddType}
          className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <div className="min-w-0 flex-1">
            <label
              htmlFor="type-name"
              className="mb-1 block text-xs text-muted"
            >
              Type name
            </label>
            <input
              id="type-name"
              value={typeDraft}
              onChange={(event) => setTypeDraft(event.target.value)}
              placeholder="Billboard"
              className={inputClass}
            />
          </div>
          <Button type="submit" disabled={busy} className="sm:h-10">
            <Plus aria-hidden="true" className="h-4 w-4" />
            {pending === pendingKey("type-add") ? "Adding..." : "Add type"}
          </Button>
        </form>

        {sortedTypes.length === 0 ? (
          <p className="mt-5 rounded-2xl border border-dashed border-white/10 px-4 py-6 text-center text-sm text-body">
            No property types yet. Add the first one above.
          </p>
        ) : (
          <ul className="mt-5 divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/10">
            {sortedTypes.map((type) => {
              const isEditing = editingTypeId === type.id;
              const dependents = propertiesByType.get(type.id) ?? 0;

              return (
                <li
                  key={type.id}
                  className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  {isEditing ? (
                    <form
                      onSubmit={(event) => {
                        event.preventDefault();
                        void handleSaveType(type);
                      }}
                      className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]"
                    >
                      <input
                        value={typeEdit}
                        onChange={(event) => setTypeEdit(event.target.value)}
                        aria-label={`Name for ${type.name}`}
                        autoFocus
                        className={inputClass}
                      />
                      <Button
                        type="submit"
                        size="sm"
                        disabled={busy}
                        className="h-10"
                      >
                        <Check aria-hidden="true" className="h-4 w-4" />
                        Save
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        onClick={() => setEditingTypeId(null)}
                        className="h-10"
                      >
                        <X aria-hidden="true" className="h-4 w-4" />
                        Cancel
                      </Button>
                    </form>
                  ) : (
                    <>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">
                          {type.name}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-muted">
                          Sort {type.sort}
                          {dependents > 0
                            ? ` · ${propertyCountLabel(dependents)}`
                            : ""}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => startEditType(type)}
                          disabled={busy}
                          className="h-8 px-3 text-xs"
                        >
                          <Pencil aria-hidden="true" className="h-3.5 w-3.5" />
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => void handleDeleteType(type)}
                          disabled={busy}
                          className="h-8 px-3 text-xs text-red-300 hover:bg-red-400/10 hover:text-red-200"
                        >
                          <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                          {pending === pendingKey("type-delete", type.id)
                            ? "Deleting..."
                            : "Delete"}
                        </Button>
                      </div>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
