import { redirect } from "next/navigation";
import ScreensClient from "@/components/dashboard/ScreensClient";
import type { Playlist, Screen, ScreenPlaylist } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";

type AssignmentRow = Omit<ScreenPlaylist, "is_active"> & {
  is_active?: boolean | null;
};

export default async function ScreensPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [screensResult, playlistsResult] = await Promise.all([
    supabase
      .from("screens")
      .select("id, customer_id, name, status, location, last_seen, created_at")
      .eq("customer_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("playlists")
      .select("id, customer_id, name, created_at, updated_at")
      .eq("customer_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  const screens = (screensResult.data ?? []) as Screen[];
  const playlists = (playlistsResult.data ?? []) as Playlist[];
  const screenIds = screens.map((screen) => screen.id);

  let screenPlaylists: ScreenPlaylist[] = [];
  let assignmentError: string | null = null;

  if (screenIds.length > 0) {
    const { data, error } = await supabase
      .from("screen_playlists")
      .select("id, screen_id, playlist_id, is_active, created_at")
      .in("screen_id", screenIds);

    screenPlaylists = ((data ?? []) as AssignmentRow[])
      .filter((assignment) => assignment.is_active !== false)
      .map((assignment) => ({
        ...assignment,
        is_active: assignment.is_active ?? true,
      }));
    assignmentError = error?.message ?? null;
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-sky">
          Screens
        </p>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
          Your screens
        </h1>
        <p className="mt-2 text-sm text-body">
          Pair new displays and keep an eye on every screen.
        </p>
      </div>

      <ScreensClient
        screens={screens}
        playlists={playlists}
        screenPlaylists={screenPlaylists}
        loadError={
          screensResult.error?.message ??
          playlistsResult.error?.message ??
          assignmentError
        }
      />
    </div>
  );
}
