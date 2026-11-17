"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Loader2, X } from "lucide-react";
import DisplaySettingsDialog from "@/components/dashboard/DisplaySettingsDialog";
import Button from "@/components/ui/Button";
import type { AdCity, AdPlace, AdProperty } from "@/lib/ads";
import type { StaffScreenRow } from "@/lib/staff-screens";
import { createClient } from "@/lib/supabase/client";
import type { Screen } from "@/lib/types";
import { cn } from "@/lib/utils";

const inputClass =
  "h-11 w-full rounded-xl border border-white/10 bg-white/5 px-3.5 text-sm text-white outline-none transition placeholder:text-muted focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/40";

type ScreenOptions = {
  cities?: AdCity[];
  places?: AdPlace[];
  properties?: AdProperty[];
};

export default function EditScreenDialog({
  screen,
  siblingsCount = 1,
  onClose,
  onChanged,
  ...options
}: ScreenOptions & {
  screen: StaffScreenRow;
  siblingsCount?: number;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [name, setName] = useState(screen.name);
  const [propertyId, setPropertyId] = useState(screen.property_id ?? "");
  const [block, setBlock] = useState(screen.block ?? "");
  const [spot, setSpot] = useState(screen.spot ?? "");
  const [shop, setShop] = useState(screen.shop_name ?? "");
  const [notes, setNotes] = useState("");
  const [initializing, setInitializing] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [displayScreen, setDisplayScreen] = useState<Screen | null>(null);
  const [displayLoading, setDisplayLoading] = useState(false);
  const [showDisplay, setShowDisplay] = useState(false);

  const [loadedCities, setLoadedCities] = useState<AdCity[]>([]);
  const [loadedPlaces, setLoadedPlaces] = useState<AdPlace[]>([]);
  const [loadedProperties, setLoadedProperties] = useState<AdProperty[]>([]);

  const citiesData = options.cities ?? loadedCities;
  const placesData = options.places ?? loadedPlaces;
  const propertiesData = options.properties ?? loadedProperties;

  const [cityId, setCityId] = useState(
    () =>
      propertiesData.find((property) => property.id === screen.property_id)?.city_id ??
      citiesData[0]?.id ??
      "",
  );
  const [placeId, setPlaceId] = useState(
    () =>
      propertiesData.find((property) => property.id === screen.property_id)?.place_id ??
      "",
  );
  const [propertyQuery, setPropertyQuery] = useState("");

  useEffect(() => {
    if (options.cities && options.places && options.properties) {
      return;
    }

    let active = true;

    async function loadOptions() {
      const supabase = createClient();
      const [citiesResult, placesResult, propertiesResult] = await Promise.all([
        supabase.from("ad_cities").select("id, name, state, is_active, sort").order("sort").order("name"),
        supabase.from("ad_places").select("id, city_id, name, is_active, sort").order("sort").order("name"),
        supabase
          .from("ad_properties")
          .select("id, city_id, place_id, type_id, name, is_active, sort")
          .order("sort")
          .order("name"),
      ]);

      if (!active) {
        return;
      }

      setLoadedCities((citiesResult.data ?? []) as unknown as AdCity[]);
      setLoadedPlaces((placesResult.data ?? []) as unknown as AdPlace[]);
      setLoadedProperties((propertiesResult.data ?? []) as unknown as AdProperty[]);
    }

    void loadOptions();

    return () => {
      active = false;
    };
  }, [options.cities, options.places, options.properties]);

  useEffect(() => {
    let active = true;

    async function loadScreen() {
      const supabase = createClient();
      const { data } = await supabase
        .from("screens")
        .select("name, property_id, block, spot, shop_name, notes")
        .eq("id", screen.id)
        .maybeSingle();

      if (!active) {
        return;
      }

      if (data) {
        const full = data as {
          name: string;
          property_id: string | null;
          block: string | null;
          spot: string | null;
          shop_name: string | null;
          notes: string | null;
        };

        setName(full.name);
        setPropertyId(full.property_id ?? "");
        setBlock(full.block ?? "");
        setSpot(full.spot ?? "");
        setShop(full.shop_name ?? "");
        setNotes(full.notes ?? "");
      }

      setInitializing(false);
    }

    void loadScreen();

    return () => {
      active = false;
    };
  }, [screen.id]);

  useEffect(() => {
    const currentProperty = propertiesData.find(
      (property) => property.id === screen.property_id,
    );

    if (currentProperty) {
      setCityId(currentProperty.city_id);
      setPlaceId(currentProperty.place_id ?? "");
    }
  }, [propertiesData, screen.property_id]);

  useEffect(() => {
    if (!cityId && citiesData.length > 0) {
      setCityId(citiesData[0].id);
    }
  }, [citiesData, cityId]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !showDisplay) {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, showDisplay]);

  const cityPlaces = useMemo(
    () => placesData.filter((place) => place.city_id === cityId),
    [cityId, placesData],
  );

  const availableProperties = useMemo(() => {
    const query = propertyQuery.trim().toLowerCase();

    return propertiesData.filter((property) => {
      if (property.city_id !== cityId) {
        return false;
      }

      if (placeId && property.place_id !== placeId) {
        return false;
      }

      return !query || property.name.toLowerCase().includes(query);
    });
  }, [cityId, placeId, propertyQuery, propertiesData]);

  const groupedProperties = useMemo(() => {
    const groups = new Map<string, AdProperty[]>();

    for (const property of availableProperties) {
      const placeName =
        placesData.find((place) => place.id === property.place_id)?.name ??
        "Other";
      const group = groups.get(placeName) ?? [];
      group.push(property);
      groups.set(placeName, group);
    }

    return Array.from(groups.entries());
  }, [availableProperties, placesData]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const cleanName = name.trim();

    if (!cleanName) {
      setError("Enter a screen name.");
      return;
    }

    setSaving(true);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("screens")
      .update({
        name: cleanName,
        property_id: propertyId || null,
        block: block.trim() || null,
        spot: spot.trim() || null,
        shop_name: shop.trim() || null,
        notes: notes.trim() || null,
      })
      .eq("id", screen.id);

    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    onChanged();
  }

  async function openDisplaySettings() {
    setDisplayLoading(true);
    setError(null);

    const supabase = createClient();
    const { data } = await supabase
      .from("screens")
      .select("*")
      .eq("id", screen.id)
      .maybeSingle();

    setDisplayLoading(false);

    if (!data) {
      setError("The screen's display settings could not be loaded.");
      return;
    }

    setDisplayScreen(data as unknown as Screen);
    setShowDisplay(true);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-stretch justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close dialog"
        onClick={onClose}
        className="absolute inset-0"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-screen-title"
        className="relative flex h-full w-full flex-col overflow-y-auto border border-white/10 bg-surface shadow-card sm:h-auto sm:max-h-[calc(100vh-2rem)] sm:max-w-2xl sm:rounded-3xl"
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-white/5 bg-surface/95 px-5 py-4 backdrop-blur sm:px-6">
          <div>
            <h2
              id="edit-screen-title"
              className="text-lg font-semibold tracking-tight text-white"
            >
              Edit screen
            </h2>
            <p className="mt-0.5 text-xs text-muted">
              {screen.property_name ?? "Not placed"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1.5 text-white/40 transition duration-200 hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60"
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-5 sm:px-6">
          <fieldset disabled={initializing} className="space-y-5">
          {initializing ? (
            <p
              role="status"
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-muted"
            >
              Loading screen...
            </p>
          ) : null}
          {screen.legacy_location &&
          !(screen.block || screen.spot || screen.shop_name) ? (
            <p className="rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm leading-6 text-amber-200">
              Legacy location: {screen.legacy_location}. Update the exact location below.
            </p>
          ) : null}

          <div>
            <label htmlFor="edit-screen-name" className="mb-1.5 block text-sm font-medium text-white">
              Screen name
            </label>
            <input
              id="edit-screen-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              className={inputClass}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="edit-screen-city" className="mb-1.5 block text-sm font-medium text-white">
                City
              </label>
              <select
                id="edit-screen-city"
                value={cityId}
                onChange={(event) => {
                  setCityId(event.target.value);
                  setPlaceId("");
                  setPropertyId("");
                }}
                className={inputClass}
              >
                {citiesData.length === 0 ? (
                  <option value="">No cities available</option>
                ) : (
                  citiesData.map((city) => (
                    <option key={city.id} value={city.id}>
                      {city.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label htmlFor="edit-screen-place" className="mb-1.5 block text-sm font-medium text-white">
                Place
              </label>
              <select
                id="edit-screen-place"
                value={placeId}
                onChange={(event) => {
                  setPlaceId(event.target.value);
                  setPropertyId("");
                }}
                className={inputClass}
              >
                <option value="">All places</option>
                {cityPlaces.map((place) => (
                  <option key={place.id} value={place.id}>
                    {place.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="edit-screen-property-search" className="mb-1.5 block text-sm font-medium text-white">
              Property
            </label>
            <input
              id="edit-screen-property-search"
              type="search"
              value={propertyQuery}
              onChange={(event) => setPropertyQuery(event.target.value)}
              placeholder="Search properties"
              className={inputClass}
            />
            <select
              value={propertyId}
              onChange={(event) => setPropertyId(event.target.value)}
              aria-label="Property"
              className={cn(inputClass, "mt-2")}
            >
              <option value="">Not placed</option>
              {groupedProperties.map(([placeName, items]) => (
                <optgroup key={placeName} label={placeName}>
                  {items.map((property) => (
                    <option key={property.id} value={property.id}>
                      {property.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="edit-screen-block" className="mb-1.5 block text-sm font-medium text-white">
                Block
              </label>
              <input
                id="edit-screen-block"
                value={block}
                onChange={(event) => setBlock(event.target.value)}
                placeholder="B1"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="edit-screen-spot" className="mb-1.5 block text-sm font-medium text-white">
                Spot
              </label>
              <input
                id="edit-screen-spot"
                value={spot}
                onChange={(event) => setSpot(event.target.value)}
                placeholder="Near Lift 2, Main Gate, Lobby"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label htmlFor="edit-screen-shop" className="mb-1.5 block text-sm font-medium text-white">
              Shop name <span className="text-muted">(optional)</span>
            </label>
            <input
              id="edit-screen-shop"
              value={shop}
              onChange={(event) => setShop(event.target.value)}
              placeholder="Raj Mart"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="edit-screen-notes" className="mb-1.5 block text-sm font-medium text-white">
              Notes <span className="text-muted">(optional)</span>
            </label>
            <textarea
              id="edit-screen-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              className={cn(inputClass, "h-auto py-2.5")}
            />
          </div>

          {error ? (
            <p
              role="alert"
              className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200"
            >
              {error}
            </p>
          ) : null}

          <div className="flex flex-col-reverse gap-3 border-t border-white/5 pt-4 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => void openDisplaySettings()}
              disabled={displayLoading}
              className="gap-2"
            >
              {displayLoading ? (
                <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
              ) : null}
              Display
            </Button>
            <Button type="submit" disabled={saving} className="gap-2">
              {saving ? (
                <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
              ) : null}
              {saving ? "Saving..." : "Save changes"}
            </Button>
          </div>
          </fieldset>
        </form>
      </div>

      {showDisplay && displayScreen ? (
        <DisplaySettingsDialog
          screen={displayScreen}
          siblingsCount={siblingsCount}
          onClose={() => setShowDisplay(false)}
          onSaved={() => {
            setShowDisplay(false);
            onChanged();
          }}
        />
      ) : null}
    </div>
  );
}
