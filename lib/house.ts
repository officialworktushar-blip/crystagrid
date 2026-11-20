import { createClient } from "@/lib/supabase/server";
import type { Media, Playlist, PlaylistItem } from "@/lib/types";

type PlaylistSummary = Playlist & {
  slotCount: number;
  loopSeconds: number;
};

export type HousePlaylistSummary = {
  id: string;
  name: string;
  itemCount: number;
};

export type HouseContext = {
  ownerId: string | null;
  playlists: HousePlaylistSummary[];
  error: string | null;
};

export type HousePlaylistDetail = {
  playlist: Playlist;
  initialItems: PlaylistItem[];
  media: Media[];
  playlists: Playlist[];
};

type UnknownRecord = Record<string, unknown>;

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

function readNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 0;
}

function readOwnerId(value: unknown): string | null {
  const direct = readString(value);

  if (direct) {
    return direct;
  }

  if (Array.isArray(value) && value.length > 0) {
    return readString(value[0]);
  }

  const record = asRecord(value);
  const nested = record ? readString(record.house_owner_id) : null;

  return nested;
}

function firstMessage(...messages: (string | null | undefined)[]): string | null {
  for (const message of messages) {
    if (message) {
      return message;
    }
  }

  return null;
}

export async function getHouseContext(): Promise<HouseContext> {
  const supabase = await createClient();
  const ownerResult = await supabase.rpc("house_owner_id");
  const ownerId = readOwnerId(ownerResult.data);

  if (!ownerId) {
    return {
      ownerId: null,
      playlists: [],
      error: ownerResult.error?.message ?? null,
    };
  }

  const { data, error } = await supabase
    .from("playlists")
    .select("id, name")
    .eq("customer_id", ownerId)
    .order("name", { ascending: true });

  const rows = Array.isArray(data) ? data : [];
  const companyPlaylists = rows.flatMap((entry) => {
    const row = asRecord(entry);
    const id = row ? readString(row.id) : null;
    const name = row ? readString(row.name) : null;

    if (!row || !id || !name) {
      return [];
    }

    return [{ id, name }];
  });

  if (companyPlaylists.length === 0) {
    return {
      ownerId,
      playlists: [],
      error: firstMessage(error?.message, ownerResult.error?.message),
    };
  }

  const { data: itemData, error: itemError } = await supabase
    .from("playlist_items")
    .select("playlist_id")
    .in(
      "playlist_id",
      companyPlaylists.map((playlist) => playlist.id),
    );

  const counts = new Map<string, number>();

  for (const entry of Array.isArray(itemData) ? itemData : []) {
    const row = asRecord(entry);
    const playlistId = row ? readString(row.playlist_id) : null;

    if (!playlistId) {
      continue;
    }

    counts.set(playlistId, (counts.get(playlistId) ?? 0) + 1);
  }

  return {
    ownerId,
    playlists: companyPlaylists.map((playlist) => ({
      id: playlist.id,
      name: playlist.name,
      itemCount: counts.get(playlist.id) ?? 0,
    })),
    error: firstMessage(
      error?.message,
      itemError?.message,
      ownerResult.error?.message,
    ),
  };
}

export async function getHouseMedia(
  ownerId: string,
): Promise<{ media: Media[]; error: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("media")
    .select(
      "id, customer_id, name, type, file_path, file_size, duration, created_at",
    )
    .eq("customer_id", ownerId)
    .order("created_at", { ascending: false });

  return {
    media: (data ?? []) as unknown as Media[],
    error: error?.message ?? null,
  };
}

export async function getHousePlaylists(
  ownerId: string,
): Promise<{ playlists: PlaylistSummary[]; error: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("playlists")
    .select("id, customer_id, name, created_at, updated_at")
    .eq("customer_id", ownerId)
    .order("updated_at", { ascending: false });

  const playlists = (data ?? []) as unknown as Playlist[];
  const playlistIds = playlists.map((playlist) => playlist.id);

  if (playlistIds.length === 0) {
    return { playlists: [], error: error?.message ?? null };
  }

  const [itemsResult, mediaResult] = await Promise.all([
    supabase
      .from("playlist_items")
      .select("playlist_id, media_id, duration")
      .in("playlist_id", playlistIds),
    supabase
      .from("media")
      .select("id, type, duration")
      .eq("customer_id", ownerId),
  ]);

  type ItemRow = {
    playlist_id: string;
    media_id: string;
    duration: number | null;
  };
  type MediaLookup = Pick<Media, "id" | "type" | "duration">;

  const items = (itemsResult.data ?? []) as unknown as ItemRow[];
  const media = (mediaResult.data ?? []) as unknown as MediaLookup[];
  const mediaById = new Map(media.map((entry) => [entry.id, entry] as const));
  const counts = new Map<string, number>();
  const totals = new Map<string, number>();

  for (const item of items) {
    counts.set(item.playlist_id, (counts.get(item.playlist_id) ?? 0) + 1);

    const declared = readNumber(item.duration);
    const mediaDuration = readNumber(mediaById.get(item.media_id)?.duration);
    const seconds =
      declared > 0 ? declared : Math.min(10, mediaDuration > 0 ? mediaDuration : 10);

    totals.set(item.playlist_id, (totals.get(item.playlist_id) ?? 0) + seconds);
  }

  return {
    playlists: playlists.map((playlist) => ({
      ...playlist,
      slotCount: counts.get(playlist.id) ?? 0,
      loopSeconds: totals.get(playlist.id) ?? 0,
    })),
    error: firstMessage(
      error?.message,
      itemsResult.error?.message,
      mediaResult.error?.message,
    ),
  };
}

export async function getHousePlaylistDetail(
  ownerId: string,
  playlistId: string,
): Promise<HousePlaylistDetail | null> {
  const supabase = await createClient();
  const { data: playlistData } = await supabase
    .from("playlists")
    .select("id, customer_id, name, created_at, updated_at")
    .eq("id", playlistId)
    .eq("customer_id", ownerId)
    .maybeSingle();

  if (!playlistData) {
    return null;
  }

  const [itemsResult, mediaResult, playlistsResult] = await Promise.all([
    supabase
      .from("playlist_items")
      .select(
        "id, playlist_id, media_id, position, duration, clip_start, created_at",
      )
      .eq("playlist_id", playlistId)
      .order("position", { ascending: true }),
    supabase
      .from("media")
      .select(
        "id, customer_id, name, type, file_path, file_size, duration, created_at",
      )
      .eq("customer_id", ownerId)
      .order("created_at", { ascending: false }),
    supabase
      .from("playlists")
      .select("id, customer_id, name, created_at, updated_at")
      .eq("customer_id", ownerId)
      .order("updated_at", { ascending: false }),
  ]);

  return {
    playlist: playlistData as unknown as Playlist,
    initialItems: (itemsResult.data ?? []) as unknown as PlaylistItem[],
    media: (mediaResult.data ?? []) as unknown as Media[],
    playlists: (playlistsResult.data ?? []) as unknown as Playlist[],
  };
}
