import { redirect } from "next/navigation";
import ScreensClient, {
  type ScreenContentItem,
  type ScreenContentMap,
} from "@/components/dashboard/ScreensClient";
import type {
  MediaType,
  Playlist,
  Screen,
  ScreenPlaylist,
} from "@/lib/types";
import { createClient } from "@/lib/supabase/server";

type ContentMediaRow = {
  id: string;
  name: string;
  type: MediaType;
  file_path: string;
  duration: number | null;
};

type ContentItemRow = {
  id: string;
  position: number;
  duration: number | null;
  clip_start: number | null;
  media: ContentMediaRow | ContentMediaRow[] | null;
};

type ContentPlaylistRow = {
  id: string;
  name: string;
  playlist_items: ContentItemRow[] | null;
};

type AssignmentContentRow = {
  id: string;
  screen_id: string;
  playlist_id: string;
  is_active: boolean | null;
  created_at: string;
  playlists: ContentPlaylistRow | ContentPlaylistRow[] | null;
};

export default async function ScreensPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const customerId = user.id;
  const canEdit = false;

  const [screensResult, playlistsResult] = await Promise.all([
    supabase
      .from("screens")
      .select(
        "id, customer_id, name, status, location, last_seen, created_at, display_fit, display_rotation, display_flip_h, display_flip_v, display_width, display_height, display_left, display_top",
      )
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false }),
    supabase
      .from("playlists")
      .select("id, customer_id, name, created_at, updated_at")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false }),
  ]);

  const screens = (screensResult.data ?? []) as Screen[];
  const playlists = (playlistsResult.data ?? []) as Playlist[];
  const screenIds = screens.map((screen) => screen.id);

  let screenPlaylists: ScreenPlaylist[] = [];
  let contentByScreen: ScreenContentMap = {};
  let assignmentError: string | null = null;

  if (screenIds.length > 0) {
    const { data, error } = await supabase
      .from("screen_playlists")
      .select(
        `
          id,
          screen_id,
          playlist_id,
          is_active,
          created_at,
          playlists (
            id,
            name,
            playlist_items (
              id,
              position,
              duration,
              clip_start,
              media (
                id,
                name,
                type,
                file_path,
                duration
              )
            )
          )
        `,
      )
      .in("screen_id", screenIds);

    const activeRows = ((data ?? []) as unknown as AssignmentContentRow[]).filter(
      (assignment) => assignment.is_active !== false,
    );

    screenPlaylists = activeRows.map((assignment) => ({
      id: assignment.id,
      screen_id: assignment.screen_id,
      playlist_id: assignment.playlist_id,
      is_active: true,
      created_at: assignment.created_at,
    }));

    contentByScreen = activeRows.reduce<ScreenContentMap>(
      (result, assignment) => {
        const playlist = Array.isArray(assignment.playlists)
          ? (assignment.playlists[0] ?? null)
          : assignment.playlists;
        const items = [...(playlist?.playlist_items ?? [])].sort(
          (a, b) => a.position - b.position,
        );
        const content: ScreenContentItem[] = [];

        for (const item of items) {
          const media = Array.isArray(item.media)
            ? (item.media[0] ?? null)
            : item.media;

          if (!media) {
            continue;
          }

          content.push({
            id: item.id,
            name: media.name,
            type: media.type,
            file_path: media.file_path,
            duration:
              item.duration ??
              (media.type === "video"
                ? Math.min(
                    10,
                    media.duration && media.duration > 0 ? media.duration : 10,
                  )
                : 10),
            clip_start: item.clip_start ?? 0,
            mediaDuration: media.duration,
            position: item.position,
          });
        }

        result[assignment.screen_id] = content;
        return result;
      },
      {},
    );

    assignmentError = error?.message ?? null;
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-sky">
          Screens
        </p>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
          My Screens
        </h1>
        <p className="mt-2 text-sm text-body">
          See where your screens are and what is playing on them.
        </p>
      </div>

      <ScreensClient
        screens={screens}
        playlists={playlists}
        screenPlaylists={screenPlaylists}
        contentByScreen={contentByScreen}
        customerId={customerId}
        canEdit={canEdit}
        loadError={
          screensResult.error?.message ??
          playlistsResult.error?.message ??
          assignmentError
        }
      />
    </div>
  );
}
