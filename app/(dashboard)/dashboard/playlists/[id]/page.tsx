import { notFound, redirect } from "next/navigation";
import PlaylistEditor from "@/components/dashboard/PlaylistEditor";
import type {
  Media,
  Playlist,
  PlaylistItem,
  Screen,
  ScreenPlaylist,
} from "@/lib/types";
import { createClient } from "@/lib/supabase/server";

type AssignmentRow = Omit<ScreenPlaylist, "is_active"> & {
  is_active?: boolean | null;
};

export default async function PlaylistDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: playlistData } = await supabase
    .from("playlists")
    .select("id, customer_id, name, created_at, updated_at")
    .eq("id", id)
    .eq("customer_id", user.id)
    .maybeSingle();

  if (!playlistData) {
    notFound();
  }

  const [itemsResult, mediaResult, screensResult, playlistsResult] =
    await Promise.all([
      supabase
        .from("playlist_items")
        .select("id, playlist_id, media_id, position, duration, created_at")
        .eq("playlist_id", id)
        .order("position", { ascending: true }),
      supabase
        .from("media")
        .select(
          "id, customer_id, name, type, file_path, file_size, duration, created_at",
        )
        .eq("customer_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("screens")
        .select("id, customer_id, name, status, last_seen, location, created_at")
        .eq("customer_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("playlists")
        .select("id, customer_id, name, created_at, updated_at")
        .eq("customer_id", user.id)
        .order("created_at", { ascending: false }),
    ]);

  const items = (itemsResult.data ?? []) as PlaylistItem[];
  const media = (mediaResult.data ?? []) as Media[];
  const screens = (screensResult.data ?? []) as Screen[];
  const playlists = (playlistsResult.data ?? []) as Playlist[];
  const screenIds = screens.map((screen) => screen.id);

  let screenPlaylists: ScreenPlaylist[] = [];

  if (screenIds.length > 0) {
    const { data } = await supabase
      .from("screen_playlists")
      .select("id, screen_id, playlist_id, is_active, created_at")
      .in("screen_id", screenIds);

    screenPlaylists = ((data ?? []) as AssignmentRow[])
      .filter((assignment) => assignment.is_active !== false)
      .map((assignment) => ({
        ...assignment,
        is_active: assignment.is_active ?? true,
      }));
  }

  return (
    <PlaylistEditor
      key={playlistData.id}
      playlist={playlistData as Playlist}
      initialItems={items}
      media={media}
      screens={screens}
      screenPlaylists={screenPlaylists}
      playlists={playlists}
    />
  );
}
