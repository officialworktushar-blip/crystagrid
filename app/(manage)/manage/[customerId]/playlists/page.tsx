import PlaylistsClient, {
  type PlaylistSummary,
} from "@/components/dashboard/PlaylistsClient";
import { createClient } from "@/lib/supabase/server";
import type { Media, Playlist } from "@/lib/types";

type PlaylistItemRow = {
  playlist_id: string;
  media_id: string;
  duration: number | null;
};

type MediaLookup = Pick<Media, "id" | "type" | "duration">;

export default async function ManageCustomerPlaylistsPage({
  params,
}: {
  params: Promise<{ customerId: string }>;
}) {
  const { customerId } = await params;
  const supabase = await createClient();
  const basePath = `/manage/${customerId}`;

  const { data, error } = await supabase
    .from("playlists")
    .select("id, customer_id, name, created_at, updated_at")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });

  const playlists = (data ?? []) as Playlist[];

  let items: PlaylistItemRow[] = [];
  let media: MediaLookup[] = [];
  let relatedError: string | null = null;

  if (playlists.length > 0) {
    const [itemsResult, mediaResult] = await Promise.all([
      supabase
        .from("playlist_items")
        .select("playlist_id, media_id, duration")
        .in(
          "playlist_id",
          playlists.map((playlist) => playlist.id),
        ),
      supabase
        .from("media")
        .select("id, type, duration")
        .eq("customer_id", customerId),
    ]);

    items = (itemsResult.data ?? []) as PlaylistItemRow[];
    media = (mediaResult.data ?? []) as MediaLookup[];
    relatedError = itemsResult.error?.message ?? mediaResult.error?.message ?? null;
  }

  const mediaById = new Map(media.map((entry) => [entry.id, entry] as const));
  const itemsByPlaylist = new Map<string, PlaylistItemRow[]>();

  for (const item of items) {
    const current = itemsByPlaylist.get(item.playlist_id) ?? [];
    current.push(item);
    itemsByPlaylist.set(item.playlist_id, current);
  }

  const summaries: PlaylistSummary[] = playlists.map((playlist) => {
    const playlistItems = itemsByPlaylist.get(playlist.id) ?? [];
    const loopSeconds = playlistItems.reduce((sum, item) => {
      if (typeof item.duration === "number" && Number.isFinite(item.duration)) {
        return sum + item.duration;
      }

      const mediaItem = mediaById.get(item.media_id);
      const mediaDuration = mediaItem?.duration ?? 0;

      return sum + Math.min(10, mediaDuration > 0 ? mediaDuration : 10);
    }, 0);

    return {
      ...playlist,
      slotCount: playlistItems.length,
      loopSeconds,
    };
  });

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-sky">
          Playlists
        </p>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
          Customer playlists
        </h1>
        <p className="mt-2 text-sm text-body">
          Build playlists from this customer&apos;s media and assign them to
          screens.
        </p>
      </div>

      <PlaylistsClient
        playlists={summaries}
        customerId={customerId}
        canEdit
        basePath={basePath}
        loadError={error?.message ?? relatedError}
      />
    </div>
  );
}
