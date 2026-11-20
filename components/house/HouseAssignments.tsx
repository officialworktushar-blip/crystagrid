"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Check,
  Info,
  Loader2,
  Megaphone,
  RefreshCw,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import FilterBar from "@/components/ui/FilterBar";
import PanelSelect from "@/components/ui/PanelSelect";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type PlaylistOption = { id: string; name: string; itemCount: number };
type AssignmentScope = "global" | "property" | "screen";
type Source = "screen" | "property" | "global" | null;
type PlayingState = "campaign" | "house" | "none";

type ScreenRow = {
  screenId: string;
  screenName: string;
  propertyId: string | null;
  propertyName: string | null;
  placeName: string | null;
  block: string | null;
  spot: string | null;
  shopName: string | null;
  online: boolean;
  activeCampaigns: number;
  source: Source;
  playlistId: string | null;
  playlistName: string | null;
  playing: PlayingState;
};

type PropertyRow = {
  id: string;
  name: string;
  placeId: string | null;
  placeName: string | null;
  screensCount: number;
};

type PlaceRow = { id: string; name: string };

type AssignmentRow = {
  scope: AssignmentScope;
  targetId: string | null;
  playlistId: string | null;
};

type ScreenFilters = {
  search: string;
  property: string;
  place: string;
  playing: string;
  status: string;
  nothingOnly: boolean;
};

type PropertyFilters = {
  search: string;
  place: string;
  ownOnly: boolean;
};

type Notice = { kind: "saved" | "error"; text: string };
type RowError = { id: string; message: string };
type SaveResult = { message: string | null };

type UnknownRecord = Record<string, unknown>;

const EMPTY_SCREEN_FILTERS: ScreenFilters = {
  search: "",
  property: "",
  place: "",
  playing: "",
  status: "",
  nothingOnly: false,
};

const EMPTY_PROPERTY_FILTERS: PropertyFilters = {
  search: "",
  place: "",
  ownOnly: false,
};

function asRecord(value: unknown): UnknownRecord | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as UnknownRecord;
}

function readString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function readBool(value: unknown): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    return normalized === "true" || normalized === "1";
  }

  return typeof value === "number" && value === 1;
}

function readCount(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.round(value));
  }

  if (typeof value === "string") {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return Math.max(0, Math.round(parsed));
    }
  }

  return 0;
}

function getErrorMessage(value: unknown, fallback: string): string {
  if (value instanceof Error && value.message.trim().length > 0) {
    return value.message;
  }

  const record = asRecord(value);
  const message = record ? readString(record.message) : null;

  return message ?? fallback;
}

function firstMessage(...messages: (string | null | undefined)[]): string | null {
  for (const message of messages) {
    if (message) {
      return message;
    }
  }

  return null;
}

function normalizeScreens(value: unknown): ScreenRow[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    const row = asRecord(entry);
    const screenId = row ? readString(row.screen_id) : null;

    if (!row || !screenId) {
      return [];
    }

    const sourceValue = readString(row.source);
    const source: Source =
      sourceValue === "screen" ||
      sourceValue === "property" ||
      sourceValue === "global"
        ? sourceValue
        : null;
    const playingValue = readString(row.playing);
    const playing: PlayingState =
      playingValue === "campaign" || playingValue === "house"
        ? playingValue
        : "none";

    return [
      {
        screenId,
        screenName: readString(row.screen_name) ?? "Unnamed screen",
        propertyId: readString(row.property_id),
        propertyName: readString(row.property_name),
        placeName: readString(row.place_name),
        block: readString(row.block),
        spot: readString(row.spot),
        shopName: readString(row.shop_name),
        online: readBool(row.online),
        activeCampaigns: readCount(row.active_campaigns),
        source,
        playlistId: readString(row.playlist_id),
        playlistName: readString(row.playlist_name),
        playing,
      },
    ];
  });
}

function normalizeProperties(value: unknown): {
  id: string;
  name: string;
  placeId: string | null;
}[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    const row = asRecord(entry);
    const id = row ? readString(row.id) : null;
    const name = row ? readString(row.name) : null;

    if (!row || !id || !name) {
      return [];
    }

    return [{ id, name, placeId: readString(row.place_id) }];
  });
}

function normalizePlaces(value: unknown): PlaceRow[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    const row = asRecord(entry);
    const id = row ? readString(row.id) : null;
    const name = row ? readString(row.name) : null;

    if (!id || !name) {
      return [];
    }

    return [{ id, name }];
  });
}

function normalizeStats(value: unknown): Map<string, number> {
  const counts = new Map<string, number>();

  if (!Array.isArray(value)) {
    return counts;
  }

  for (const entry of value) {
    const row = asRecord(entry);
    const propertyId = row ? readString(row.property_id) : null;

    if (propertyId) {
      counts.set(propertyId, readCount(row?.screens_count));
    }
  }

  return counts;
}

function normalizeAssignments(value: unknown): AssignmentRow[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    const row = asRecord(entry);
    const scope = row ? readString(row.scope) : null;

    if (
      !row ||
      (scope !== "global" && scope !== "property" && scope !== "screen")
    ) {
      return [];
    }

    return [
      {
        scope,
        targetId: readString(row.target_id),
        playlistId: readString(row.playlist_id),
      },
    ];
  });
}

function sourceLabel(source: Source): string | null {
  if (source === "screen") {
    return "from screen";
  }

  if (source === "property") {
    return "from property";
  }

  if (source === "global") {
    return "from default";
  }

  return null;
}

function exactLocation(row: ScreenRow): string {
  const parts = [
    row.block,
    row.spot,
    row.shopName ? `Shop: ${row.shopName}` : null,
  ].filter(
    (value): value is string =>
      typeof value === "string" && value.trim().length > 0,
  );

  return parts.length > 0 ? parts.join(" | ") : "Not set";
}

function PlayingChip({
  row,
  playlistNameById,
}: {
  row: ScreenRow;
  playlistNameById: Map<string, string>;
}) {
  if (row.playing === "campaign") {
    return (
      <span className="inline-flex w-fit items-center rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-1 text-xs font-semibold text-emerald-200">
        Client campaigns ({row.activeCampaigns})
      </span>
    );
  }

  if (row.playing === "house") {
    const name =
      row.playlistName ??
      (row.playlistId ? playlistNameById.get(row.playlistId) : null) ??
      "Unknown playlist";
    const label = sourceLabel(row.source);

    return (
      <span className="inline-flex flex-wrap items-center gap-1.5">
        <span className="inline-flex w-fit items-center rounded-full border border-sky-400/25 bg-sky-400/10 px-2.5 py-1 text-xs font-semibold text-sky-200">
          Company content: {name}
        </span>
        {label ? (
          <span className="inline-flex w-fit items-center rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-muted">
            {label}
          </span>
        ) : null}
      </span>
    );
  }

  return (
    <span className="inline-flex w-fit items-center rounded-full border border-amber-400/25 bg-amber-400/10 px-2.5 py-1 text-xs font-semibold text-amber-200">
      Nothing playing
    </span>
  );
}

export default function HouseAssignments({
  ownerId,
  playlists,
}: {
  ownerId: string;
  playlists: PlaylistOption[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const mountedRef = useRef(true);

  const [screens, setScreens] = useState<ScreenRow[]>([]);
  const [properties, setProperties] = useState<PropertyRow[]>([]);
  const [places, setPlaces] = useState<PlaceRow[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [screenFilters, setScreenFilters] = useState<ScreenFilters>(() => {
    const param = searchParams?.get("playing") ?? null;
    const playing =
      param === "none" || param === "house" || param === "campaign"
        ? param
        : "";

    return {
      ...EMPTY_SCREEN_FILTERS,
      playing,
      nothingOnly: playing === "none",
    };
  });
  const [propertyFilters, setPropertyFilters] =
    useState<PropertyFilters>(EMPTY_PROPERTY_FILTERS);

  const [globalDraft, setGlobalDraft] = useState<string | null>(null);
  const [globalSaving, setGlobalSaving] = useState(false);
  const [globalNotice, setGlobalNotice] = useState<Notice | null>(null);

  const [propertyDrafts, setPropertyDrafts] = useState<
    Record<string, string>
  >({});
  const [savingPropertyId, setSavingPropertyId] = useState<string | null>(null);
  const [savedPropertyId, setSavedPropertyId] = useState<string | null>(null);
  const [propertyError, setPropertyError] = useState<RowError | null>(null);

  const [screenDrafts, setScreenDrafts] = useState<Record<string, string>>({});
  const [savingScreenId, setSavingScreenId] = useState<string | null>(null);
  const [savedScreenId, setSavedScreenId] = useState<string | null>(null);
  const [screenError, setScreenError] = useState<RowError | null>(null);

  const playlistsHref = useMemo(() => {
    const match = pathname.match(/^(.*?)\/(media|playlists)(\/.*)?$/);

    return match ? `${match[1]}/playlists` : `${pathname}/playlists`;
  }, [pathname]);

  const loadData = useCallback(
    async (withSpinner: boolean) => {
      if (withSpinner) {
        setLoading(true);
      }

      try {
        const [overviewResult, propertiesResult, placesResult, statsResult, assignmentsResult] =
          await Promise.all([
            supabase.rpc("house_screens_overview"),
            supabase
              .from("ad_properties")
              .select("id, name, place_id")
              .order("name", { ascending: true }),
            supabase
              .from("ad_places")
              .select("id, name")
              .order("name", { ascending: true }),
            supabase
              .from("ad_property_stats")
              .select("property_id, screens_count"),
            supabase
              .from("house_assignments")
              .select("scope, target_id, playlist_id"),
          ]);

        if (!mountedRef.current) {
          return;
        }

        const placeRows = normalizePlaces(placesResult.data);
        const placeNameById = new Map(
          placeRows.map((place) => [place.id, place.name] as const),
        );
        const stats = normalizeStats(statsResult.data);

        setScreens(normalizeScreens(overviewResult.data));
        setProperties(
          normalizeProperties(propertiesResult.data).map((property) => ({
            id: property.id,
            name: property.name,
            placeId: property.placeId,
            placeName: property.placeId
              ? placeNameById.get(property.placeId) ?? null
              : null,
            screensCount: stats.get(property.id) ?? 0,
          })),
        );
        setPlaces(placeRows);
        setAssignments(normalizeAssignments(assignmentsResult.data));
        setLoadError(
          firstMessage(
            overviewResult.error?.message,
            propertiesResult.error?.message,
            placesResult.error?.message,
            statsResult.error?.message,
            assignmentsResult.error?.message,
          ),
        );
      } catch (loadException) {
        if (mountedRef.current) {
          setLoadError(
            getErrorMessage(
              loadException,
              "Could not load company content settings.",
            ),
          );
        }
      } finally {
        if (mountedRef.current && withSpinner) {
          setLoading(false);
        }
      }
    },
    [supabase],
  );

  useEffect(() => {
    mountedRef.current = true;
    void loadData(true);

    return () => {
      mountedRef.current = false;
    };
  }, [loadData]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void loadData(false);
      }
    }, 20000);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        void loadData(false);
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [loadData]);

  const saveAssignment = useCallback(
    async (
      scope: AssignmentScope,
      targetId: string | null,
      playlistId: string | null,
    ): Promise<SaveResult> => {
      try {
        const { error } = await supabase.rpc("set_house_assignment", {
          p_scope: scope,
          p_target: targetId,
          p_playlist: playlistId,
        });

        return { message: error ? error.message : null };
      } catch (saveException) {
        return {
          message: getErrorMessage(
            saveException,
            "Could not save this assignment.",
          ),
        };
      }
    },
    [supabase],
  );

  const globalPlaylistId = useMemo(
    () =>
      assignments.find((assignment) => assignment.scope === "global")
        ?.playlistId ?? null,
    [assignments],
  );
  const globalValue = globalDraft ?? globalPlaylistId ?? "";

  const propertyPlaylistById = useMemo(() => {
    const values = new Map<string, string | null>();

    for (const assignment of assignments) {
      if (assignment.scope === "property" && assignment.targetId) {
        values.set(assignment.targetId, assignment.playlistId);
      }
    }

    return values;
  }, [assignments]);

  const screenPlaylistById = useMemo(() => {
    const values = new Map<string, string | null>();

    for (const assignment of assignments) {
      if (assignment.scope === "screen" && assignment.targetId) {
        values.set(assignment.targetId, assignment.playlistId);
      }
    }

    return values;
  }, [assignments]);

  const playlistNameById = useMemo(
    () =>
      new Map(
        playlists.map((playlist) => [playlist.id, playlist.name] as const),
      ),
    [playlists],
  );

  const playlistOptions = useMemo(
    () => playlists.map((playlist) => ({ value: playlist.id, label: playlist.name })),
    [playlists],
  );
  const globalOptions = useMemo(
    () => [{ value: "", label: "None" }, ...playlistOptions],
    [playlistOptions],
  );
  const propertyOptions = useMemo(
    () => [{ value: "", label: "Use default" }, ...playlistOptions],
    [playlistOptions],
  );
  const screenOptions = useMemo(
    () => [{ value: "", label: "Use property or default" }, ...playlistOptions],
    [playlistOptions],
  );

  const placeOptions = useMemo(
    () => places.map((place) => ({ value: place.id, label: place.name })),
    [places],
  );

  const screenPropertyOptions = useMemo(() => {
    const values = new Map<string, string>();

    for (const row of screens) {
      if (row.propertyId && row.propertyName) {
        values.set(row.propertyId, row.propertyName);
      }
    }

    return Array.from(values, ([value, label]) => ({ value, label })).sort(
      (left, right) => left.label.localeCompare(right.label),
    );
  }, [screens]);

  const screenPlaceOptions = useMemo(() => {
    const values = new Set<string>();

    for (const row of screens) {
      if (row.placeName) {
        values.add(row.placeName);
      }
    }

    return Array.from(values)
      .sort((left, right) => left.localeCompare(right))
      .map((value) => ({ value, label: value }));
  }, [screens]);

  const filteredProperties = useMemo(() => {
    const term = propertyFilters.search.trim().toLowerCase();

    return properties.filter((property) => {
      if (term && !property.name.toLowerCase().includes(term)) {
        return false;
      }

      if (propertyFilters.place && property.placeId !== propertyFilters.place) {
        return false;
      }

      if (propertyFilters.ownOnly && !propertyPlaylistById.get(property.id)) {
        return false;
      }

      return true;
    });
  }, [properties, propertyFilters, propertyPlaylistById]);

  const filteredScreens = useMemo(() => {
    const term = screenFilters.search.trim().toLowerCase();

    return screens.filter((row) => {
      if (term) {
        const haystack = [
          row.screenName,
          row.propertyName,
          row.block,
          row.spot,
          row.shopName,
        ]
          .filter((value): value is string => typeof value === "string")
          .join(" ")
          .toLowerCase();

        if (!haystack.includes(term)) {
          return false;
        }
      }

      if (screenFilters.property && row.propertyId !== screenFilters.property) {
        return false;
      }

      if (screenFilters.place && row.placeName !== screenFilters.place) {
        return false;
      }

      if (screenFilters.playing && row.playing !== screenFilters.playing) {
        return false;
      }

      if (screenFilters.status === "online" && !row.online) {
        return false;
      }

      if (screenFilters.status === "offline" && row.online) {
        return false;
      }

      if (screenFilters.nothingOnly && row.playing !== "none") {
        return false;
      }

      return true;
    });
  }, [screens, screenFilters]);

  const campaignCount = screens.filter(
    (row) => row.playing === "campaign",
  ).length;
  const houseCount = screens.filter((row) => row.playing === "house").length;
  const noneCount = screens.filter((row) => row.playing === "none").length;

  function setScreenFilter<K extends keyof ScreenFilters>(
    key: K,
    value: ScreenFilters[K],
  ) {
    setScreenFilters((current) => ({ ...current, [key]: value }));
  }

  function setPropertyFilter<K extends keyof PropertyFilters>(
    key: K,
    value: PropertyFilters[K],
  ) {
    setPropertyFilters((current) => ({ ...current, [key]: value }));
  }

  function applyPlayingFilter(playing: PlayingState) {
    setScreenFilters((current) => ({
      ...current,
      playing,
      nothingOnly: playing === "none" ? true : false,
    }));
  }

  async function handleGlobalSave() {
    setGlobalSaving(true);
    setGlobalNotice(null);

    const playlistId = globalValue === "" ? null : globalValue;
    const result = await saveAssignment("global", null, playlistId);

    if (!mountedRef.current) {
      return;
    }

    setGlobalSaving(false);

    if (result.message) {
      setGlobalNotice({ kind: "error", text: result.message });
      return;
    }

    setAssignments((current) => [
      ...current.filter((assignment) => assignment.scope !== "global"),
      { scope: "global", targetId: null, playlistId },
    ]);
    setGlobalDraft(null);
    setGlobalNotice({ kind: "saved", text: "Saved" });
    void loadData(false);
  }

  async function handlePropertySave(propertyId: string, nextValue?: string) {
    setSavingPropertyId(propertyId);
    setSavedPropertyId(null);
    setPropertyError(null);

    const currentValue =
      nextValue ??
      propertyDrafts[propertyId] ??
      propertyPlaylistById.get(propertyId) ??
      "";
    const playlistId = currentValue === "" ? null : currentValue;
    const result = await saveAssignment("property", propertyId, playlistId);

    if (!mountedRef.current) {
      return;
    }

    setSavingPropertyId(null);

    if (result.message) {
      setPropertyError({ id: propertyId, message: result.message });
      return;
    }

    setAssignments((current) => [
      ...current.filter(
        (assignment) =>
          !(
            assignment.scope === "property" &&
            assignment.targetId === propertyId
          ),
      ),
      { scope: "property", targetId: propertyId, playlistId },
    ]);
    setPropertyDrafts((current) => {
      const next = { ...current };
      delete next[propertyId];

      return next;
    });
    setSavedPropertyId(propertyId);
    void loadData(false);
  }

  async function handleScreenSave(screenId: string, nextValue?: string) {
    setSavingScreenId(screenId);
    setSavedScreenId(null);
    setScreenError(null);

    const currentValue =
      nextValue ?? screenDrafts[screenId] ?? screenPlaylistById.get(screenId) ?? "";
    const playlistId = currentValue === "" ? null : currentValue;
    const result = await saveAssignment("screen", screenId, playlistId);

    if (!mountedRef.current) {
      return;
    }

    setSavingScreenId(null);

    if (result.message) {
      setScreenError({ id: screenId, message: result.message });
      return;
    }

    setAssignments((current) => [
      ...current.filter(
        (assignment) =>
          !(assignment.scope === "screen" && assignment.targetId === screenId),
      ),
      { scope: "screen", targetId: screenId, playlistId },
    ]);
    setScreenDrafts((current) => {
      const next = { ...current };
      delete next[screenId];

      return next;
    });
    setSavedScreenId(screenId);
    void loadData(false);
  }

  return (
    <div data-owner-id={ownerId} className="space-y-6">
      <div className="flex flex-col gap-3 rounded-3xl border border-sky-400/20 bg-sky-400/[0.06] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-sky-400/25 bg-sky-400/10 text-brand-sky">
            <Info aria-hidden="true" className="h-4 w-4" />
          </span>
          <p className="text-sm leading-6 text-body">
            Company content plays on a screen only while no client campaign is
            running on it. When a client booking becomes active, the client&apos;s
            content takes over automatically.
          </p>
        </div>

        {playlists.length === 0 ? (
          <Link
            href={playlistsHref}
            className="inline-flex shrink-0 items-center justify-center rounded-full border border-sky-400/40 bg-sky-400/10 px-4 py-2 text-xs font-semibold text-sky-100 transition duration-200 hover:border-sky-400/60 hover:bg-sky-400/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60"
          >
            Create a playlist first
          </Link>
        ) : null}
      </div>

      {loadError ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200"
        >
          <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          {loadError}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <button
          type="button"
          aria-pressed={screenFilters.playing === "campaign"}
          onClick={() => applyPlayingFilter("campaign")}
          className={cn(
            "rounded-2xl border px-4 py-3 text-left text-sm transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60",
            screenFilters.playing === "campaign"
              ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-100"
              : "border-white/10 bg-surface text-body hover:border-white/20",
          )}
        >
          <span className="font-semibold tabular-nums text-white">
            {campaignCount}
          </span>{" "}
          screens showing client campaigns
        </button>
        <button
          type="button"
          aria-pressed={screenFilters.playing === "house"}
          onClick={() => applyPlayingFilter("house")}
          className={cn(
            "rounded-2xl border px-4 py-3 text-left text-sm transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60",
            screenFilters.playing === "house"
              ? "border-sky-400/40 bg-sky-400/10 text-sky-100"
              : "border-white/10 bg-surface text-body hover:border-white/20",
          )}
        >
          <span className="font-semibold tabular-nums text-white">
            {houseCount}
          </span>{" "}
          screens showing company content
        </button>
        <button
          type="button"
          aria-pressed={screenFilters.playing === "none"}
          onClick={() => applyPlayingFilter("none")}
          className={cn(
            "rounded-2xl border px-4 py-3 text-left text-sm transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60",
            screenFilters.playing === "none"
              ? "border-amber-400/40 bg-amber-400/10 text-amber-100"
              : "border-white/10 bg-surface text-body hover:border-white/20",
          )}
        >
          <span className="font-semibold tabular-nums text-white">
            {noneCount}
          </span>{" "}
          screens showing nothing
        </button>
      </div>

      {loading ? (
        <Card className="flex items-center justify-center gap-2 px-5 py-16 text-sm text-muted">
          <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
          Loading company content settings...
        </Card>
      ) : (
        <>
          <Card className="overflow-hidden p-0">
            <div className="border-b border-white/5 px-5 py-4">
              <h2 className="text-base font-semibold text-white">
                Default for all screens
              </h2>
              <p className="mt-1 text-xs leading-5 text-muted">
                Used on every screen that has no client campaign, unless its
                property or the screen has its own.
              </p>
            </div>

            <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1">
                <label
                  htmlFor="house-global-playlist"
                  className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-muted"
                >
                  Company playlist
                </label>
                <PanelSelect
                  id="house-global-playlist"
                  value={globalValue}
                  onChange={(value) => {
                    setGlobalDraft(value);
                    setGlobalNotice(null);
                  }}
                  options={globalOptions}
                  ariaLabel="Default playlist for all screens"
                  disabled={globalSaving || playlists.length === 0}
                  className="w-full sm:max-w-sm"
                />
                <p className="mt-2 text-xs text-muted">
                  Current:{" "}
                  <span className="font-medium text-body">
                    {globalPlaylistId
                      ? playlistNameById.get(globalPlaylistId) ??
                        "Unknown playlist"
                      : "None"}
                  </span>
                </p>
              </div>

              <Button
                onClick={() => void handleGlobalSave()}
                disabled={globalSaving || playlists.length === 0}
                className="shrink-0 gap-2"
              >
                {globalSaving ? (
                  <Loader2
                    aria-hidden="true"
                    className="h-4 w-4 animate-spin"
                  />
                ) : (
                  <Check aria-hidden="true" className="h-4 w-4" />
                )}
                {globalSaving ? "Saving..." : "Save"}
              </Button>
            </div>

            {globalNotice ? (
              <p
                role={globalNotice.kind === "error" ? "alert" : "status"}
                className={cn(
                  "border-t border-white/5 px-5 py-3 text-xs font-medium",
                  globalNotice.kind === "error"
                    ? "text-red-300"
                    : "text-emerald-300",
                )}
              >
                {globalNotice.text}
              </p>
            ) : null}
          </Card>

          <Card className="overflow-hidden p-0">
            <div className="border-b border-white/5 px-5 py-4">
              <div className="flex items-center gap-2">
                <Megaphone
                  aria-hidden="true"
                  className="h-4 w-4 shrink-0 text-brand-sky"
                />
                <h2 className="text-base font-semibold text-white">
                  By property
                </h2>
              </div>
              <p className="mt-1 text-xs leading-5 text-muted">
                Applies to every screen in the property. A screen can override
                it below.
              </p>
            </div>

            <div className="px-5 py-4">
              <FilterBar
                search={{
                  value: propertyFilters.search,
                  onChange: (value) => setPropertyFilter("search", value),
                  placeholder: "Search properties",
                }}
                selects={[
                  {
                    key: "place",
                    label: "Place",
                    value: propertyFilters.place,
                    onChange: (value) => setPropertyFilter("place", value),
                    options: placeOptions,
                    allLabel: "All places",
                  },
                ]}
                toggles={[
                  {
                    key: "ownOnly",
                    label: "With its own content only",
                    checked: propertyFilters.ownOnly,
                    onChange: (checked) =>
                      setPropertyFilter("ownOnly", checked),
                  },
                ]}
                resultCount={filteredProperties.length}
                total={properties.length}
                onClear={() => setPropertyFilters(EMPTY_PROPERTY_FILTERS)}
              />
            </div>

            {filteredProperties.length === 0 ? (
              <div className="px-5 py-14 text-center">
                <p className="text-sm text-body">
                  {properties.length === 0
                    ? "No properties found."
                    : "No properties match these filters."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="border-y border-white/5 bg-white/[0.02] text-xs uppercase tracking-[0.12em] text-muted">
                    <tr>
                      <th scope="col" className="px-5 py-3 font-semibold">
                        Property
                      </th>
                      <th scope="col" className="px-5 py-3 font-semibold">
                        Place
                      </th>
                      <th scope="col" className="px-5 py-3 font-semibold">
                        Screens
                      </th>
                      <th scope="col" className="px-5 py-3 font-semibold">
                        Own content
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredProperties.map((property) => {
                      const value =
                        propertyDrafts[property.id] ??
                        propertyPlaylistById.get(property.id) ??
                        "";
                      const isSaving = savingPropertyId === property.id;
                      const rowError =
                        propertyError?.id === property.id
                          ? propertyError.message
                          : null;

                      return (
                        <tr key={property.id} className="align-middle">
                          <td className="px-5 py-3 font-medium text-white">
                            {property.name}
                          </td>
                          <td className="px-5 py-3 text-body">
                            {property.placeName ?? "-"}
                          </td>
                          <td className="px-5 py-3 tabular-nums text-body">
                            {property.screensCount}
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <PanelSelect
                                value={value}
                                onChange={(next) => {
                                  setPropertyDrafts((current) => ({
                                    ...current,
                                    [property.id]: next,
                                  }));
                                  setPropertyError(null);
                                  setSavedPropertyId(null);
                                  void handlePropertySave(property.id, next);
                                }}
                                options={propertyOptions}
                                ariaLabel={`Company content for ${property.name}`}
                                disabled={
                                  isSaving || playlists.length === 0
                                }
                                className="min-w-[11rem]"
                              />
                              {isSaving ? (
                                <span className="text-xs text-muted">
                                  Saving...
                                </span>
                              ) : savedPropertyId === property.id ? (
                                <span className="inline-flex items-center gap-1 text-xs text-emerald-300">
                                  <Check
                                    aria-hidden="true"
                                    className="h-3 w-3"
                                  />
                                  Saved
                                </span>
                              ) : null}
                              {rowError ? (
                                <span className="text-xs text-red-300">
                                  {rowError}
                                </span>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card className="overflow-hidden p-0">
            <div className="flex flex-col gap-3 border-b border-white/5 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-white">By screen</h2>
                <p className="mt-1 text-xs leading-5 text-muted">
                  Screen choices take priority over property and default
                  company content.
                </p>
              </div>
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-muted">
                <RefreshCw aria-hidden="true" className="h-3.5 w-3.5" />
                Refreshes every 20 seconds
              </span>
            </div>

            <div className="px-5 py-4">
              <FilterBar
                search={{
                  value: screenFilters.search,
                  onChange: (value) => setScreenFilter("search", value),
                  placeholder: "Search screen, property, block, spot or shop",
                }}
                selects={[
                  {
                    key: "property",
                    label: "Property",
                    value: screenFilters.property,
                    onChange: (value) => setScreenFilter("property", value),
                    options: screenPropertyOptions,
                    allLabel: "All properties",
                  },
                  {
                    key: "place",
                    label: "Place",
                    value: screenFilters.place,
                    onChange: (value) => setScreenFilter("place", value),
                      options: screenPlaceOptions,
                      allLabel: "All places",
                    },
                    {
                      key: "playing",
                    label: "Playing",
                    value: screenFilters.playing,
                    onChange: (value) => setScreenFilter("playing", value),
                    options: [
                      { value: "campaign", label: "Client campaigns" },
                      { value: "house", label: "Company content" },
                      { value: "none", label: "Nothing" },
                    ],
                    allLabel: "All playing",
                  },
                  {
                    key: "status",
                    label: "Status",
                    value: screenFilters.status,
                    onChange: (value) => setScreenFilter("status", value),
                    options: [
                      { value: "online", label: "Online" },
                      { value: "offline", label: "Offline" },
                    ],
                    allLabel: "All statuses",
                  },
                ]}
                toggles={[
                  {
                    key: "nothingOnly",
                    label: "Nothing playing only",
                    checked: screenFilters.nothingOnly,
                    onChange: (checked) =>
                      setScreenFilter("nothingOnly", checked),
                  },
                ]}
                resultCount={filteredScreens.length}
                total={screens.length}
                onClear={() => setScreenFilters(EMPTY_SCREEN_FILTERS)}
              />
            </div>

            {filteredScreens.length === 0 ? (
              <div className="px-5 py-14 text-center">
                <p className="text-sm text-body">
                  {screens.length === 0
                    ? "No screens found."
                    : "No screens match these filters."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1120px] text-left text-sm">
                  <thead className="border-y border-white/5 bg-white/[0.02] text-xs uppercase tracking-[0.12em] text-muted">
                    <tr>
                      <th scope="col" className="px-5 py-3 font-semibold">
                        Screen
                      </th>
                      <th scope="col" className="px-5 py-3 font-semibold">
                        Property and place
                      </th>
                      <th scope="col" className="px-5 py-3 font-semibold">
                        Exact location
                      </th>
                      <th scope="col" className="px-5 py-3 font-semibold">
                        Status
                      </th>
                      <th scope="col" className="px-5 py-3 font-semibold">
                        Playing now
                      </th>
                      <th scope="col" className="px-5 py-3 font-semibold">
                        Own content
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredScreens.map((row) => {
                      const explicitValue = screenPlaylistById.has(row.screenId)
                        ? screenPlaylistById.get(row.screenId)
                        : row.source === "screen"
                          ? row.playlistId
                          : null;
                      const value = screenDrafts[row.screenId] ?? explicitValue ?? "";
                      const isSaving = savingScreenId === row.screenId;
                      const rowError =
                        screenError?.id === row.screenId
                          ? screenError.message
                          : null;

                      return (
                        <tr key={row.screenId} className="align-middle">
                          <td className="px-5 py-3 font-medium text-white">
                            {row.screenName}
                          </td>
                          <td className="px-5 py-3 text-body">
                            <span className="block truncate">
                              {row.propertyName ?? "-"}
                            </span>
                            <span className="block text-xs text-muted">
                              {row.placeName ?? "No place"}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-xs text-body">
                            {exactLocation(row)}
                          </td>
                          <td className="px-5 py-3">
                            <span className="inline-flex items-center gap-2 text-xs text-body">
                              <span
                                aria-hidden="true"
                                className={cn(
                                  "h-2 w-2 shrink-0 rounded-full",
                                  row.online
                                    ? "bg-emerald-400 shadow-brand"
                                    : "bg-white/30",
                                )}
                              />
                              {row.online ? "Online" : "Offline"}
                            </span>
                          </td>
                          <td className="px-5 py-3">
                            <PlayingChip
                              row={row}
                              playlistNameById={playlistNameById}
                            />
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <PanelSelect
                                value={value}
                                onChange={(next) => {
                                  setScreenDrafts((current) => ({
                                    ...current,
                                    [row.screenId]: next,
                                  }));
                                  setScreenError(null);
                                  setSavedScreenId(null);
                                  void handleScreenSave(row.screenId, next);
                                }}
                                options={screenOptions}
                                ariaLabel={`Company content for ${row.screenName}`}
                                disabled={isSaving || playlists.length === 0}
                                className="min-w-[12rem]"
                              />
                              {isSaving ? (
                                <span className="text-xs text-muted">
                                  Saving...
                                </span>
                              ) : savedScreenId === row.screenId ? (
                                <span className="inline-flex items-center gap-1 text-xs text-emerald-300">
                                  <Check
                                    aria-hidden="true"
                                    className="h-3 w-3"
                                  />
                                  Saved
                                </span>
                              ) : null}
                              {rowError ? (
                                <span className="text-xs text-red-300">
                                  {rowError}
                                </span>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
