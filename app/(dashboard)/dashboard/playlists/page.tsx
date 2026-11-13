import { redirect } from "next/navigation";
import PlaylistsClient, {
  type PlaylistSummary,
} from "@/components/dashboard/PlaylistsClient";
import type { Media, Playlist } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";

type PlaylistItemRow = {
  playlist_id: string;
  media_id: string;
  duration: number | null;
};

type MediaLookup = Pick<Media, "id" | "type" | "duration">;

export default async function PlaylistsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data, error } = await supabase
    .from("playlists")
    .select("id, customer_id, name, created_at, updated_at")
    .eq("customer_id", user.id)
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
        .eq("customer_id", user.id),
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
    const totalDuration = playlistItems.reduce((sum, item) => {
      const mediaItem = mediaById.get(item.media_id);

      if (mediaItem?.type === "video") {
        return sum + (mediaItem.duration ?? 0);
      }

      return sum + (item.duration ?? 10);
    }, 0);

    return {
      ...playlist,
      itemCount: playlistItems.length,
      totalDuration,
    };
  });

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-sky">
          Playlists
        </p>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
          Your playlists
        </h1>
        <p className="mt-2 text-sm text-body">
          Build playlists from your media and assign them to any screen.
        </p>
      </div>

      <PlaylistsClient
        playlists={summaries}
        userId={user.id}
        loadError={error?.message ?? relatedError}
      />
    </div>
  );
}
