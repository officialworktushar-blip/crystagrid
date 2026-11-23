"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { DEFAULT_PLACES } from "@/lib/dehradun-places";
import { buildGoogleEmbedUrl, buildGoogleMapsLink } from "@/lib/google-map-url";

type AreaPlace = {
  id: string;
  name: string;
  lat: number | null;
  lng: number | null;
  major: boolean;
  propertyNames: string[];
  propertiesCount: number;
  screensCount: number;
  onlineCount: number;
};

function sum(nums: number[]): number {
  return nums.reduce((a, b) => a + b, 0);
}

function StatTile({
  label,
  value,
  sub,
  isZero,
}: {
  label: string;
  value: number;
  sub?: string;
  isZero: boolean;
}) {
  return (
    <div className="rounded-3xl border border-[#e3e9f2] bg-white p-5">
      <p className="text-sm font-medium text-[#64748b]">{label}</p>
      {isZero ? (
        <p className="mt-2 text-lg font-semibold text-[#94a3b8]">
          Launching soon
        </p>
      ) : (
        <>
          <p className="mt-1 text-3xl font-extrabold tracking-tight text-[#0b1220]">
            {value}
          </p>
          {sub ? (
            <p className="mt-1 text-sm font-medium text-[#10b981]">{sub}</p>
          ) : null}
        </>
      )}
    </div>
  );
}

export default function DehradunMap() {
  const [places, setPlaces] = useState<AreaPlace[]>(DEFAULT_PLACES);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    async function load() {
      try {
        const { data: city, error: cityError } = await supabase
          .from("ad_cities")
          .select("id")
          .eq("name", "Dehradun")
          .eq("is_active", true)
          .maybeSingle();

        if (cityError || !city?.id) return;

        const { data: placeRows, error: placesError } = await supabase
          .from("ad_places")
          .select("id,name,lat,lng,is_major,sort")
          .eq("city_id", city.id)
          .eq("is_active", true)
          .order("sort", { ascending: true });

        if (placesError || !placeRows) return;

        const { data: propRows, error: propsError } = await supabase
          .from("ad_properties")
          .select("id,name,place_id")
          .eq("city_id", city.id)
          .eq("is_active", true);

        if (propsError || !propRows) return;

        const propIds = propRows.map((p) => p.id);
        let statsRows: { property_id: string; screens_count: number | null; online_count: number | null }[] = [];
        if (propIds.length > 0) {
          const { data: sRows, error: statsError } = await supabase
            .from("ad_property_stats")
            .select("property_id,screens_count,online_count")
            .in("property_id", propIds);
          if (statsError) return;
          statsRows = sRows ?? [];
        }

        const statsByProp = new Map<string, { screens: number; online: number }>();
        for (const s of statsRows) {
          statsByProp.set(s.property_id, {
            screens: Number(s.screens_count ?? 0),
            online: Number(s.online_count ?? 0),
          });
        }

        const propsByPlace = new Map<string, { name: string; id: string }[]>();
        for (const p of propRows) {
          if (!p.place_id) continue;
          const list = propsByPlace.get(p.place_id) ?? [];
          list.push({ id: p.id, name: p.name ?? "" });
          propsByPlace.set(p.place_id, list);
        }

        const mapped: AreaPlace[] = [];

        for (const row of placeRows) {
          const lat = row.lat != null ? Number(row.lat) : null;
          const lng = row.lng != null ? Number(row.lng) : null;
          const hasCoords =
            lat !== null && lng !== null && Number.isFinite(lat) && Number.isFinite(lng);
          const props = propsByPlace.get(row.id) ?? [];

          mapped.push({
            id: row.id,
            name: row.name ?? "Unnamed",
            lat: hasCoords ? lat : null,
            lng: hasCoords ? lng : null,
            major: !!row.is_major,
            propertyNames: props.map((p) => p.name).filter(Boolean),
            propertiesCount: props.length,
            screensCount: sum(props.map((p) => statsByProp.get(p.id)?.screens ?? 0)),
            onlineCount: sum(props.map((p) => statsByProp.get(p.id)?.online ?? 0)),
          });
        }

        if (mapped.length === 0) return;
        if (cancelled) return;
        setPlaces(mapped);
      } catch {
        return;
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedPlace = places.find((p) => p.id === selectedId) ?? null;

  const totalAreas = places.length;
  const totalProperties = sum(places.map((p) => p.propertiesCount));
  const totalScreens = sum(places.map((p) => p.screensCount));
  const totalOnline = sum(places.map((p) => p.onlineCount));

  const embedUrl = buildGoogleEmbedUrl(selectedPlace);
  const mapsLink = buildGoogleMapsLink(selectedPlace);
  const mapTitle = `Google map of ${selectedPlace ? selectedPlace.name : "Dehradun"}`;

  const activePills = selectedPlace ? selectedPlace.propertyNames.slice(0, 5) : [];
  const activeMore = selectedPlace ? Math.max(0, selectedPlace.propertyNames.length - 5) : 0;

  const toggleSelect = (id: string) => {
    setSelectedId((curr) => (curr === id ? null : id));
  };

  return (
    <section id="network" className="relative scroll-mt-24 border-t border-[#e8eef6] bg-white py-24">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(#cbd5e1 1px, transparent 1px)",
          backgroundSize: "22px 22px",
          opacity: 0.5,
        }}
      />

      <div className="relative mx-auto max-w-[1540px] px-6">
        <div className="grid grid-cols-1 items-center gap-14 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="order-2 lg:order-1">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#1d6fff]">
              OUR NETWORK
            </p>
            <h2 className="mt-4 text-4xl font-extrabold tracking-tight text-[#0b1220] md:text-5xl">
              Screens across Dehradun
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-[#475569]">
              Select an area to see it on the map. These are the places in Dehradun where your ads can run.
            </p>

            <div className="mt-8 grid grid-cols-3 gap-3 sm:gap-4">
              <StatTile label="Areas" value={totalAreas} isZero={totalAreas === 0} />
              <StatTile label="Properties" value={totalProperties} isZero={totalProperties === 0} />
              <StatTile
                label="Screens"
                value={totalScreens}
                sub={totalOnline > 0 ? `${totalOnline} online` : undefined}
                isZero={totalScreens === 0}
              />
            </div>

            <div className="mt-6 min-h-[220px] rounded-3xl border border-[#e3e9f2] bg-white p-6">
              {selectedPlace ? (
                <div className="flex h-full flex-col">
                  <h3 className="text-2xl font-semibold text-[#0b8bc4]">{selectedPlace.name}</h3>
                  <p className="mt-2 text-base text-[#475569]">
                    {selectedPlace.propertiesCount} properties - {selectedPlace.screensCount} screens
                  </p>
                  <div className="mt-4 flex min-h-[56px] flex-wrap content-start gap-2">
                    {activePills.map((name) => (
                      <span
                        key={name}
                        className="inline-flex rounded-full border border-[#e3e9f2] bg-[#f8fafc] px-3 py-1 text-sm text-[#334155]"
                      >
                        {name}
                      </span>
                    ))}
                    {activeMore > 0 ? (
                      <span className="inline-flex rounded-full border border-[#e3e9f2] bg-[#f8fafc] px-3 py-1 text-sm text-[#64748b]">
                        +{activeMore} more
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-auto pt-5">
                    <Link
                      href="/book"
                      className="inline-flex items-center rounded-full px-5 py-2.5 text-sm font-semibold text-white hover:opacity-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d6fff]"
                      style={{
                        background: "linear-gradient(90deg, #0ea5e9 0%, #1d6fff 100%)",
                      }}
                    >
                      {`Book ads in ${selectedPlace.name} ->`}
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="flex h-full items-center">
                  <p className="text-base text-[#64748b]">
                    Select an area to see it on the map.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <div
              className="overflow-hidden rounded-[28px] border border-[#e3e9f2] bg-white"
              style={{ boxShadow: "0 24px 60px -30px rgba(15,61,94,0.25)" }}
            >
              <iframe
                src={embedUrl}
                title={mapTitle}
                width="100%"
                height="420"
                className="block h-[420px] w-full lg:h-[560px]"
                style={{ border: 0 }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
              <div className="flex flex-wrap items-center gap-3 border-t border-[#e3e9f2] px-5 py-4">
                {selectedPlace ? (
                  <button
                    type="button"
                    onClick={() => setSelectedId(null)}
                    className="rounded-full px-3 py-1.5 text-sm font-semibold text-[#1d6fff] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d6fff]"
                  >
                    Show all of Dehradun
                  </button>
                ) : null}
                <a
                  href={mapsLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto rounded-full px-3 py-1.5 text-sm font-semibold text-[#0f3d5e] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d6fff]"
                >
                  Open in Google Maps
                </a>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {places.map((pl) => {
                const selected = selectedId === pl.id;
                return (
                  <button
                    key={pl.id}
                    type="button"
                    onClick={() => toggleSelect(pl.id)}
                    aria-pressed={selected}
                    className={`rounded-full border px-3 py-1.5 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d6fff] ${
                      selected
                        ? "border-[#1d6fff] bg-[#1d6fff] text-white"
                        : "border-[#cbd5e1] bg-white text-[#0f3d5e] hover:underline"
                    }`}
                  >
                    {pl.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
