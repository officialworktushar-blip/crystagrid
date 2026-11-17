"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ClipboardEvent, type FormEvent, type KeyboardEvent } from "react";
import { Loader2, Plus, X } from "lucide-react";
import DisplaySettingsDialog from "@/components/dashboard/DisplaySettingsDialog";
import Button from "@/components/ui/Button";
import type { AdCity, AdPlace, AdProperty } from "@/lib/ads";
import { createClient } from "@/lib/supabase/client";
import type { Screen } from "@/lib/types";
import { cn } from "@/lib/utils";

const inputClass =
  "h-11 w-full rounded-xl border border-white/10 bg-white/5 px-3.5 text-sm text-white outline-none transition placeholder:text-muted focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/40 disabled:opacity-50";

type ScreenOptions = {
  cities?: AdCity[];
  places?: AdPlace[];
  properties?: AdProperty[];
};

export function AddScreenButton({
  onAdded,
  className,
  ...options
}: ScreenOptions & {
  onAdded?: () => void;
  className?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)} className={cn("gap-2", className)}>
        <Plus aria-hidden="true" className="h-4 w-4" />
        Add screen
      </Button>
      {open ? (
        <AddScreenDialog
          {...options}
          onClose={() => setOpen(false)}
          onAdded={() => {
            setOpen(false);
            router.refresh();
            onAdded?.();
          }}
        />
      ) : null}
    </>
  );
}

export default function AddScreenDialog({
  onClose,
  onAdded,
  cities,
  places,
  properties,
}: ScreenOptions & {
  onClose: () => void;
  onAdded: () => void;
}) {
  const [name, setName] = useState("");
  const [digits, setDigits] = useState<string[]>(() => Array(6).fill(""));
  const digitRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [cityId, setCityId] = useState("");
  const [placeId, setPlaceId] = useState("");
  const [propertyQuery, setPropertyQuery] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [block, setBlock] = useState("");
  const [spot, setSpot] = useState("");
  const [shop, setShop] = useState("");
  const [notes, setNotes] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [screenId, setScreenId] = useState<string | null>(null);
  const [displayScreen, setDisplayScreen] = useState<Screen | null>(null);
  const [displayLoading, setDisplayLoading] = useState(false);
  const [showDisplay, setShowDisplay] = useState(false);

  const [loadedCities, setLoadedCities] = useState<AdCity[]>([]);
  const [loadedPlaces, setLoadedPlaces] = useState<AdPlace[]>([]);
  const [loadedProperties, setLoadedProperties] = useState<AdProperty[]>([]);

  const citiesData = cities ?? loadedCities;
  const placesData = places ?? loadedPlaces;
  const propertiesData = properties ?? loadedProperties;

  useEffect(() => {
    if (cities && places && properties) {
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
  }, [cities, places, properties]);

  useEffect(() => {
    if (!cityId && citiesData.length > 0) {
      setCityId(citiesData[0].id);
    }
  }, [citiesData, cityId]);

  useEffect(() => {
    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape" && !showDisplay) {
        if (screenId) {
          finish();
        } else {
          onClose();
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, screenId, showDisplay]);

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

  function setDigit(index: number, rawValue: string) {
    const value = rawValue.replace(/\D/g, "").slice(-1);
    setDigits((current) => {
      const next = [...current];
      next[index] = value;
      return next;
    });

    if (value && index < 5) {
      digitRefs.current[index + 1]?.focus();
    }
  }

  function handleDigitKeyDown(
    index: number,
    event: KeyboardEvent<HTMLInputElement>,
  ) {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      digitRefs.current[index - 1]?.focus();
    } else if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      digitRefs.current[index - 1]?.focus();
    } else if (event.key === "ArrowRight" && index < 5) {
      event.preventDefault();
      digitRefs.current[index + 1]?.focus();
    }
  }

  function handlePaste(index: number, event: ClipboardEvent<HTMLInputElement>) {
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);

    if (!pasted) {
      return;
    }

    event.preventDefault();
    setDigits((current) => {
      const next = [...current];

      for (let offset = 0; offset < pasted.length && index + offset < 6; offset++) {
        next[index + offset] = pasted[offset];
      }

      return next;
    });
    digitRefs.current[Math.min(index + pasted.length, 5)]?.focus();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const cleanName = name.trim();
    const code = digits.join("");

    if (!cleanName) {
      setError("Enter a screen name.");
      return;
    }

    if (code.length !== 6 || !/^\d{6}$/.test(code)) {
      setError("Enter the 6-digit pairing code.");
      return;
    }

    if (!propertyId) {
      setError("Choose a property.");
      return;
    }

    setSending(true);

    const supabase = createClient();
    const { data, error: rpcError } = await supabase.rpc(
      "claim_device_code_network",
      {
        p_code: code,
        p_name: cleanName,
        p_property: propertyId,
        p_block: block.trim() || null,
        p_spot: spot.trim() || null,
        p_shop: shop.trim() || null,
        p_notes: notes.trim() || null,
      },
    );

    setSending(false);

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    const result = Array.isArray(data) ? data[0] : data;
    const createdId =
      result && typeof result === "object" && "screen_id" in result
        ? String((result as { screen_id: unknown }).screen_id)
        : null;

    if (!createdId || createdId === "null" || createdId === "undefined") {
      setError("The screen was added, but its details could not be loaded.");
      return;
    }

    setScreenId(createdId);
  }

  async function openDisplaySettings() {
    if (!screenId) {
      return;
    }

    setDisplayLoading(true);
    setError(null);

    const supabase = createClient();
    const { data } = await supabase
      .from("screens")
      .select("*")
      .eq("id", screenId)
      .maybeSingle();

    setDisplayLoading(false);

    if (!data) {
      setError("The screen's display settings could not be loaded.");
      return;
    }

    setDisplayScreen(data as unknown as Screen);
    setShowDisplay(true);
  }

  function finish() {
    setShowDisplay(false);
    onAdded();
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-stretch justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close dialog"
        onClick={() => (screenId ? finish() : onClose())}
        className="absolute inset-0"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-screen-title"
        className="relative flex h-full w-full flex-col overflow-y-auto border border-white/10 bg-surface shadow-card sm:h-auto sm:max-h-[calc(100vh-2rem)] sm:max-w-2xl sm:rounded-3xl"
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-white/5 bg-surface/95 px-5 py-4 backdrop-blur sm:px-6">
          <div>
            <h2
              id="add-screen-title"
              className="text-lg font-semibold tracking-tight text-white"
            >
              Add screen
            </h2>
            <p className="mt-0.5 text-xs text-muted">
              {screenId ? "Step 2 of 2" : "Step 1 of 2"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => (screenId ? finish() : onClose())}
            aria-label="Close"
            className="rounded-full p-1.5 text-white/40 transition duration-200 hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60"
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 px-5 py-5 sm:px-6">
          {!screenId ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="screen-name" className="mb-1.5 block text-sm font-medium text-white">
                  Screen name
                </label>
                <input
                  id="screen-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Lobby display"
                  required
                  className={inputClass}
                />
              </div>

              <div>
                <p className="mb-1.5 text-sm font-medium text-white">Pair code</p>
                <div className="flex gap-2">
                  {digits.map((digit, index) => (
                    <input
                      key={index}
                      ref={(node) => {
                        digitRefs.current[index] = node;
                      }}
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={1}
                      value={digit}
                      onChange={(event) => setDigit(index, event.target.value)}
                      onKeyDown={(event) => handleDigitKeyDown(index, event)}
                      onPaste={(event) => handlePaste(index, event)}
                      aria-label={`Pair code digit ${index + 1}`}
                      className="h-12 w-full min-w-0 rounded-xl border border-white/10 bg-white/5 text-center text-lg font-semibold text-white outline-none transition focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/40"
                    />
                  ))}
                </div>
                <p className="mt-2 text-xs leading-5 text-muted">
                  Open /player on the screen to see the code.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="screen-city" className="mb-1.5 block text-sm font-medium text-white">
                    City
                  </label>
                  <select
                    id="screen-city"
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
                  <label htmlFor="screen-place" className="mb-1.5 block text-sm font-medium text-white">
                    Place
                  </label>
                  <select
                    id="screen-place"
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
                <label htmlFor="screen-property-search" className="mb-1.5 block text-sm font-medium text-white">
                  Property
                </label>
                <input
                  id="screen-property-search"
                  type="search"
                  value={propertyQuery}
                  onChange={(event) => setPropertyQuery(event.target.value)}
                  placeholder="Search properties"
                  className={inputClass}
                />
                {availableProperties.length === 0 ? (
                  <p className="mt-2 text-xs leading-5 text-muted">
                    Ask a Sales Manager to add the property first
                  </p>
                ) : (
                  <select
                    value={propertyId}
                    onChange={(event) => setPropertyId(event.target.value)}
                    aria-label="Property"
                    className={cn(inputClass, "mt-2")}
                  >
                    <option value="">Choose a property</option>
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
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="screen-block" className="mb-1.5 block text-sm font-medium text-white">
                    Block
                  </label>
                  <input
                    id="screen-block"
                    value={block}
                    onChange={(event) => setBlock(event.target.value)}
                    placeholder="B1"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="screen-spot" className="mb-1.5 block text-sm font-medium text-white">
                    Spot
                  </label>
                  <input
                    id="screen-spot"
                    value={spot}
                    onChange={(event) => setSpot(event.target.value)}
                    placeholder="Near Lift 2, Main Gate, Lobby"
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="screen-shop" className="mb-1.5 block text-sm font-medium text-white">
                  Shop name <span className="text-muted">(optional)</span>
                </label>
                <input
                  id="screen-shop"
                  value={shop}
                  onChange={(event) => setShop(event.target.value)}
                  placeholder="Raj Mart"
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="screen-notes" className="mb-1.5 block text-sm font-medium text-white">
                  Notes <span className="text-muted">(optional)</span>
                </label>
                <textarea
                  id="screen-notes"
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

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button type="button" variant="secondary" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={sending} className="gap-2">
                  {sending ? (
                    <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                  ) : null}
                  {sending ? "Adding..." : "Add screen"}
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-5">
              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
                Screen added. It pairs by itself within a few seconds.
              </div>

              <div>
                <h3 className="text-base font-semibold text-white">
                  Set the orientation
                </h3>
                <p className="mt-1 text-sm leading-6 text-body">
                  Choose how content fits this screen. You can change it later.
                </p>
              </div>

              {error ? (
                <p
                  role="alert"
                  className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200"
                >
                  {error}
                </p>
              ) : null}

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button type="button" variant="secondary" onClick={finish}>
                  Skip for now
                </Button>
                <Button
                  type="button"
                  onClick={() => void openDisplaySettings()}
                  disabled={displayLoading}
                  className="gap-2"
                >
                  {displayLoading ? (
                    <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                  ) : null}
                  Save
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showDisplay && displayScreen ? (
        <DisplaySettingsDialog
          screen={displayScreen}
          siblingsCount={1}
          onClose={finish}
          onSaved={finish}
        />
      ) : null}
    </div>
  );
}
