"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { DEFAULT_PLACES, type MapPlace } from "@/lib/dehradun-places";
import { OUTLINE_LATLNG, OUTLINE_SOURCE, OUTLINE_STYLE } from "@/lib/dehradun-outline";
import {
  fitSitesToOutline,
  makeProjector,
  outlinePath,
  placeLabels,
  projectPlaces,
  voronoiCells,
  type BBox,
  type LatLng,
  type PlacedLabel,
  type ProjectedPoint,
} from "@/lib/map-geo";

type NoCoordPlace = { id: string; name: string };

const VIEWBOX_WIDTH = 720;

function sum(nums: number[]): number {
  return nums.reduce((a, b) => a + b, 0);
}

type SitePoint = ProjectedPoint & { outside: boolean };

type DebugRow = { id: string; name: string; lat: number; lng: number; outside: boolean };

type MapGeometry = {
  projection: { points: SitePoint[]; width: number; height: number };
  radius: number;
  outline: { path: string; bbox: BBox };
  cells: ReturnType<typeof voronoiCells>;
  sitesById: Map<string, SitePoint & { place: MapPlace }>;
  labelById: Map<string, PlacedLabel>;
  debugRows: DebugRow[];
};

function buildOutlineGeometry(
  outlineRing: LatLng[],
  validPlaces: MapPlace[],
): MapGeometry | null {
  if (outlineRing.length < 3 || validPlaces.length < 2) return null;
  const extras: LatLng[] = validPlaces.map((p) => [p.lat, p.lng]);
  const projector = makeProjector(outlineRing, VIEWBOX_WIDTH, 40, extras);
  const width = projector.viewW;
  const height = projector.viewH;
  if (!Number.isFinite(width) || !Number.isFinite(height) || !projector.path) return null;
  if (projector.polygon.length < 3) return null;

  const fitted = fitSitesToOutline(
    validPlaces.map((p) => {
      const pt = projector.project(p.lat, p.lng);
      return { id: p.id, x: pt[0], y: pt[1] };
    }),
    projector.polygon,
    14,
    16,
  );
  if (fitted.length < 2) return null;

  const placeById = new Map(validPlaces.map((p) => [p.id, p]));
  const cells = fitted.length >= 3
    ? voronoiCells(fitted, projector.bbox, projector.polygon)
    : [];
  const labelSites = fitted
    .map((site) => {
      const pl = placeById.get(site.id);
      return pl ? { ...site, name: pl.name, major: pl.major } : null;
    })
    .filter((site): site is SitePoint & { name: string; major: boolean } => site !== null);
  const labels = placeLabels(labelSites, 13, width, height);

  const sitesById = new Map<string, SitePoint & { place: MapPlace }>();
  const debugRows: DebugRow[] = [];
  for (const site of fitted) {
    const pl = placeById.get(site.id);
    if (!pl) continue;
    sitesById.set(site.id, { ...site, place: pl });
    debugRows.push({
      id: site.id,
      name: pl.name,
      lat: pl.lat,
      lng: pl.lng,
      outside: site.outside,
    });
  }

  return {
    projection: { points: fitted, width, height },
    radius: 0,
    outline: { path: projector.path, bbox: projector.bbox },
    cells,
    sitesById,
    labelById: new Map(labels.map((l) => [l.id, l])),
    debugRows,
  };
}

function buildHullGeometry(validPlaces: MapPlace[]): MapGeometry | null {
  if (validPlaces.length < 2) return null;

  const projection = projectPlaces(
    validPlaces.map((p) => ({ id: p.id, lat: p.lat, lng: p.lng })),
    VIEWBOX_WIDTH,
    70,
  );
  if (projection.points.length < 2) return null;
  if (!Number.isFinite(projection.width) || !Number.isFinite(projection.height)) return null;

  const radius = 0.11 * projection.width;
  if (!Number.isFinite(radius)) return null;
  const outline = outlinePath(projection.points, radius);
  if (!outline.path) return null;
  const { minX, minY, maxX, maxY } = outline.bbox;
  if (![minX, minY, maxX, maxY].every(Number.isFinite)) return null;

  const bounds: BBox = {
    minX: minX - 20,
    minY: minY - 20,
    maxX: maxX + 20,
    maxY: maxY + 20,
  };
  const points: SitePoint[] = projection.points.map((p) => ({ ...p, outside: false }));
  const cells = points.length >= 3 ? voronoiCells(points, bounds) : [];

  const labelSites = points
    .map((pt) => {
      const pl = validPlaces.find((p) => p.id === pt.id);
      return pl ? { ...pt, name: pl.name, major: pl.major } : null;
    })
    .filter(
      (site): site is SitePoint & { name: string; major: boolean } => site !== null,
    );
  const labels = placeLabels(labelSites, 13, projection.width, projection.height);

  const sitesById = new Map<string, SitePoint & { place: MapPlace }>();
  const debugRows: DebugRow[] = [];
  for (const pt of points) {
    const pl = validPlaces.find((p) => p.id === pt.id);
    if (!pl) continue;
    sitesById.set(pt.id, { ...pt, place: pl });
    debugRows.push({
      id: pt.id,
      name: pl.name,
      lat: pl.lat,
      lng: pl.lng,
      outside: false,
    });
  }

  return {
    projection: { points, width: projection.width, height: projection.height },
    radius,
    outline: { path: outline.path, bbox: outline.bbox },
    cells,
    sitesById,
    labelById: new Map(labels.map((l) => [l.id, l])),
    debugRows,
  };
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
  const [places, setPlaces] = useState<MapPlace[]>(DEFAULT_PLACES);
  const [noCoordPlaces, setNoCoordPlaces] = useState<NoCoordPlace[]>([]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isTouch, setIsTouch] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [mapDebug, setMapDebug] = useState(false);
  const reduce = useReducedMotion();

  useEffect(() => {
    try {
      setMapDebug(new URLSearchParams(window.location.search).get("mapdebug") === "1");
    } catch {
      setMapDebug(false);
    }
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(hover: none)");
    const update = () => setIsTouch(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

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

        const mapped: MapPlace[] = [];
        const noCoords: NoCoordPlace[] = [];

        for (const row of placeRows) {
          const hasCoords = row.lat != null && row.lng != null;
          const base = {
            id: row.id,
            name: row.name ?? "Unnamed",
            major: !!row.is_major,
            propertyNames: (propsByPlace.get(row.id) ?? []).map((p) => p.name).filter(Boolean),
          };
          const props = propsByPlace.get(row.id) ?? [];
          const screensCount = sum(props.map((p) => statsByProp.get(p.id)?.screens ?? 0));
          const onlineCount = sum(props.map((p) => statsByProp.get(p.id)?.online ?? 0));

          if (!hasCoords) {
            noCoords.push({ id: row.id, name: base.name });
            continue;
          }

          mapped.push({
            ...base,
            lat: Number(row.lat),
            lng: Number(row.lng),
            propertiesCount: props.length,
            screensCount,
            onlineCount,
          });
        }

        if (mapped.length === 0) return;
        if (cancelled) return;
        setPlaces(mapped);
        setNoCoordPlaces(noCoords);
      } catch {
        // keep defaults
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const activeId = hoveredId ?? selectedId;
  const activePlace = places.find((p) => p.id === activeId) ?? null;
  const isDotted = OUTLINE_STYLE === "dotted";
  const outlineStroke = isDotted ? "#e11d48" : "#1294e0";
  const outlineStrokeWidth = isDotted ? 2 : 1.6;
  const outlineDash = isDotted ? "2 5" : undefined;
  const outlineCap = isDotted ? "round" : undefined;

  const totalAreas = places.length + noCoordPlaces.length;
  const totalProperties = sum(places.map((p) => p.propertiesCount));
  const totalScreens = sum(places.map((p) => p.screensCount));
  const totalOnline = sum(places.map((p) => p.onlineCount));

  const geometry = useMemo<MapGeometry | null>(() => {
    const validPlaces = places.filter(
      (p) => p && Number.isFinite(p.lat) && Number.isFinite(p.lng),
    );
    if (validPlaces.length < 2) return null;

    const outlineRing: LatLng[] = [];
    for (const pair of OUTLINE_LATLNG) {
      if (pair && Number.isFinite(pair[0]) && Number.isFinite(pair[1])) {
        outlineRing.push([pair[0], pair[1]]);
      }
    }

    if (outlineRing.length >= 3) {
      try {
        const fromOutline = buildOutlineGeometry(outlineRing, validPlaces);
        if (fromOutline) return fromOutline;
      } catch {
        try {
          return buildHullGeometry(validPlaces);
        } catch {
          return null;
        }
      }
    }

    try {
      return buildHullGeometry(validPlaces);
    } catch {
      return null;
    }
  }, [places]);

  const projection = geometry?.projection ?? {
    points: [],
    width: VIEWBOX_WIDTH,
    height: 520,
  };
  const radius = geometry?.radius ?? 0;
  const outline = geometry?.outline ?? {
    path: "",
    bbox: { minX: 0, minY: 0, maxX: 0, maxY: 0 } as BBox,
  };
  const cells = geometry?.cells ?? [];
  const sitesById = geometry?.sitesById ?? new Map<string, SitePoint & { place: MapPlace }>();
  const labelById = geometry?.labelById ?? new Map<string, PlacedLabel>();

  const handleCellEnter = (id: string, e: React.PointerEvent<SVGPathElement>) => {
    if (e.pointerType === "mouse") setHoveredId(id);
  };
  const handleCellLeave = (id: string, e: React.PointerEvent<SVGPathElement>) => {
    if (e.pointerType === "mouse") setHoveredId((curr) => (curr === id ? null : curr));
  };
  const toggleSelect = (id: string) => {
    setSelectedId((curr) => (curr === id ? null : id));
    setHasInteracted(true);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedId(null);
        setHoveredId(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const reveal = (delay: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 24 } as const,
          whileInView: { opacity: 1, y: 0 } as const,
          viewport: { once: true } as const,
          transition: { duration: 0.6, delay },
        };

  const hoverText = isTouch
    ? "Tap on the map to see the areas of Dehradun where your ads can run."
    : "Hover over the map to see the areas of Dehradun where your ads can run.";

  const activePills = activePlace ? activePlace.propertyNames.slice(0, 5) : [];
  const activeMore = activePlace ? Math.max(0, activePlace.propertyNames.length - 5) : 0;

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
          <motion.div {...reveal(0)} className="order-2 lg:order-1">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#1d6fff]">
              OUR NETWORK
            </p>
            <h2 className="mt-4 text-4xl font-extrabold tracking-tight text-[#0b1220] md:text-5xl">
              Screens across Dehradun
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-[#475569]">{hoverText}</p>

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
              {activePlace ? (
                <div className="flex h-full flex-col">
                  <h3 className="text-2xl font-semibold text-[#0b8bc4]">{activePlace.name}</h3>
                  <p className="mt-2 text-base text-[#475569]">
                    {activePlace.propertiesCount} properties - {activePlace.screensCount} screens
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
                      className="inline-flex items-center rounded-full px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d6fff]"
                      style={{
                        background: "linear-gradient(90deg, #0ea5e9 0%, #1d6fff 100%)",
                      }}
                    >
                      {`Book ads in ${activePlace.name} ->`}
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="flex h-full items-center">
                  <p className="text-base text-[#64748b]">
                    Select an area on the map to see what is there.
                  </p>
                </div>
              )}
            </div>
          </motion.div>

          <motion.div {...reveal(0.1)} className="order-1 lg:order-2">
            {geometry ? (
            <div
              className="overflow-visible rounded-[36px] border border-[#e3e9f2] bg-white p-4 sm:p-6"
              style={{
                boxShadow: "0 30px 80px -30px rgba(14,165,233,0.35)",
                overflow: "visible",
              }}
            >
              <svg
                width="100%"
                height="auto"
                viewBox={`0 0 ${projection.width} ${projection.height}`}
                role="group"
                aria-label="Map of Dehradun areas"
                className="block overflow-visible"
                style={{ overflow: "visible" }}
              >
                <defs>
                  <linearGradient id="land" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#dff1fd" />
                    <stop offset="100%" stopColor="#bfe3fb" />
                  </linearGradient>
                  <clipPath id="dehradun-clip">
                    <path d={outline.path} />
                  </clipPath>
                  <filter id="land-shadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="rgba(14,116,198,0.25)" />
                  </filter>
                </defs>

                <path
                  d={outline.path}
                  fill="url(#land)"
                  stroke={outlineStroke}
                  strokeWidth={outlineStrokeWidth}
                  strokeDasharray={outlineDash}
                  strokeLinecap={outlineCap}
                  strokeLinejoin="round"
                  filter="url(#land-shadow)"
                  pointerEvents="none"
                />

                <g clipPath="url(#dehradun-clip)">
                  {projection.points.length >= 3
                    ? cells.map((cell) => {
                        if (!cell.path || cell.polygon.length < 3) return null;
                        const pl = sitesById.get(cell.id)?.place;
                        if (!pl) return null;
                        const isActive = activeId === cell.id;
                        const isSelected = selectedId === cell.id;
                        return (
                          <path
                            key={cell.id}
                            d={cell.path}
                            role="button"
                            tabIndex={0}
                            aria-label={`${pl.name}: ${pl.propertiesCount} properties, ${pl.screensCount} screens`}
                            cursor="pointer"
                            pointerEvents="all"
                            fill={
                              isSelected
                                ? "rgba(14,116,198,0.65)"
                                : isActive
                                  ? "rgba(14,116,198,0.55)"
                                  : "transparent"
                            }
                            stroke="rgba(255,255,255,0.9)"
                            strokeWidth={1.2}
                            style={{
                              transition: reduce ? "none" : "fill 200ms",
                              outline: "none",
                            }}
                            className="focus-visible:stroke-[#1d6fff] focus-visible:stroke-[3px]"
                            onPointerEnter={(e) => handleCellEnter(cell.id, e)}
                            onPointerLeave={(e) => handleCellLeave(cell.id, e)}
                            onClick={() => toggleSelect(cell.id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                toggleSelect(cell.id);
                              }
                            }}
                            onFocus={() => setHoveredId(cell.id)}
                            onBlur={() => setHoveredId((curr) => (curr === cell.id ? null : curr))}
                          />
                        );
                      })
                    : projection.points.map((pt) => {
                        const pl = sitesById.get(pt.id)?.place;
                        if (!pl) return null;
                        const isActive = activeId === pt.id;
                        const isSelected = selectedId === pt.id;
                        return (
                          <circle
                            key={pt.id}
                            cx={pt.x}
                            cy={pt.y}
                            r={radius}
                            role="button"
                            tabIndex={0}
                            aria-label={`${pl.name}: ${pl.propertiesCount} properties, ${pl.screensCount} screens`}
                            cursor="pointer"
                            pointerEvents="all"
                            fill={
                              isSelected
                                ? "rgba(14,116,198,0.35)"
                                : isActive
                                  ? "rgba(14,116,198,0.25)"
                                  : "transparent"
                            }
                            stroke="rgba(255,255,255,0.3)"
                            strokeWidth={1}
                            style={{ outline: "none", transition: reduce ? "none" : "fill 200ms" }}
                            className="focus-visible:stroke-[#1d6fff] focus-visible:stroke-[3px]"
                            onPointerEnter={(e) => {
                              if (e.pointerType === "mouse") setHoveredId(pt.id);
                            }}
                            onPointerLeave={(e) => {
                              if (e.pointerType === "mouse") setHoveredId((c) => (c === pt.id ? null : c));
                            }}
                            onClick={() => toggleSelect(pt.id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                toggleSelect(pt.id);
                              }
                            }}
                            onFocus={() => setHoveredId(pt.id)}
                            onBlur={() => setHoveredId((c) => (c === pt.id ? null : c))}
                          />
                        );
                      })}
                </g>

                <path
                  d={outline.path}
                  fill="none"
                  stroke={outlineStroke}
                  strokeWidth={outlineStrokeWidth}
                  strokeDasharray={outlineDash}
                  strokeLinecap={outlineCap}
                  strokeLinejoin="round"
                  pointerEvents="none"
                />

                <g pointerEvents="none">
                  {projection.points.map((pt) => {
                    const pl = sitesById.get(pt.id)?.place;
                    if (!pl) return null;
                    const isActive = activeId === pt.id;
                    const baseR = pl.major ? 7 : 5;
                    const r = isActive ? baseR * 1.3 : baseR;
                    return (
                      <g key={`dot-${pt.id}`}>
                        {isActive && !reduce ? (
                          <circle cx={pt.x} cy={pt.y} r={baseR + 6} fill="rgba(14,165,233,0.25)">
                            <animate
                              attributeName="r"
                              values={`${baseR + 4};${baseR + 10};${baseR + 4}`}
                              dur="1.8s"
                              repeatCount="indefinite"
                            />
                            <animate
                              attributeName="opacity"
                              values="0.45;0.15;0.45"
                              dur="1.8s"
                              repeatCount="indefinite"
                            />
                          </circle>
                        ) : null}
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r={r}
                          fill={pl.major ? "#0a7fd8" : "#0ea5e9"}
                          stroke="white"
                          strokeWidth={2}
                          style={{ transition: reduce ? "none" : "r 200ms" }}
                        />
                      </g>
                    );
                  })}

                  {projection.points.map((pt) => {
                    const pl = sitesById.get(pt.id)?.place;
                    const lb = labelById.get(pt.id);
                    if (!pl || !lb) return null;
                    const isActive = activeId === pt.id;
                    const fontSize = pl.major ? 14 : 13;
                    return (
                      <text
                        key={`label-${pt.id}`}
                        x={lb.x}
                        y={lb.y}
                        dy={lb.dy}
                        textAnchor={lb.anchor}
                        fontSize={fontSize}
                        fontWeight={isActive ? 700 : pl.major ? 600 : 500}
                        fill={isActive ? "#0a7fd8" : "#0f3d5e"}
                        paintOrder="stroke"
                        stroke="white"
                        strokeWidth={3.5}
                        strokeLinejoin="round"
                      >
                        {pl.name}
                      </text>
                    );
                  })}
                </g>
              </svg>

              {OUTLINE_SOURCE === "osm" ? (
                <p className="mt-2 text-xs text-[#94a3b8]">
                  Map data: OpenStreetMap contributors
                </p>
              ) : null}

              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-[#475569]">
                <span className="inline-flex items-center gap-2">
                  <span className="h-[14px] w-[14px] rounded-full border-2 border-white bg-[#0a7fd8] shadow-sm" />
                  Major area
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="h-[10px] w-[10px] rounded-full border-2 border-white bg-[#0ea5e9] shadow-sm" />
                  Area
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="h-3 w-5 rounded-sm bg-[rgba(14,116,198,0.55)]" />
                  Highlighted on hover
                </span>
              </div>
            </div>
            ) : null}

            {mapDebug ? (
              <div className="mt-4 rounded-2xl border border-[#e3e9f2] bg-white p-4 text-xs text-[#475569]">
                <p className="font-semibold text-[#0f3d5e]">Debug: place coordinates</p>
                <ul className="mt-2 space-y-1">
                  {(geometry?.debugRows ?? []).map((row) => (
                    <li key={row.id}>
                      {row.name}: {row.lat.toFixed(4)}, {row.lng.toFixed(4)}
                      {row.outside ? " - outside: moved to the edge" : ""}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-2">
              {places.map((pl) => {
                const selected = selectedId === pl.id;
                const active = activeId === pl.id;
                return (
                  <button
                    key={pl.id}
                    type="button"
                    onClick={() => toggleSelect(pl.id)}
                    onMouseEnter={() => {
                      if (!isTouch) {
                        setHoveredId(pl.id);
                      }
                    }}
                    onMouseLeave={() => setHoveredId((c) => (c === pl.id ? null : c))}
                    className={`rounded-full border px-3 py-1.5 text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d6fff] ${
                      selected || active
                        ? "border-[#7dd3fc] bg-[#e8f6ff] text-[#0b8bc4]"
                        : "border-[#e3e9f2] bg-white text-[#475569] hover:border-[#bae6fd]"
                    }`}
                    aria-pressed={selected}
                  >
                    {pl.name}
                  </button>
                );
              })}
            </div>

            {noCoordPlaces.length > 0 ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-[#64748b]">More places:</span>
                {noCoordPlaces.map((pl) => (
                  <span
                    key={pl.id}
                    className="rounded-full border border-[#e3e9f2] bg-[#f8fafc] px-3 py-1.5 text-sm text-[#64748b]"
                  >
                    {pl.name}
                  </span>
                ))}
              </div>
            ) : null}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
