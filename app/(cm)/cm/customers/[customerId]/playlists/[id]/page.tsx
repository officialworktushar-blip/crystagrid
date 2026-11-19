import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import PanelPageHeader from "@/components/admin/PanelPageHeader";
import PlaylistEditor from "@/components/dashboard/PlaylistEditor";
import {
  bookingUsesPlaylist,
  normalizeCmBookings,
  type PlaylistBookingUsage,
} from "@/lib/cm";
import { createClient } from "@/lib/supabase/server";
import type { Media, Playlist, PlaylistItem } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function CmCustomerPlaylistDetailPage({
  params,
}: {
  params: Promise<{ customerId: string; id: string }>;
}) {
  const { customerId, id } = await params;
  const supabase = await createClient();
  const backHref = `/cm/customers/${customerId}/playlists`;

  const { data: playlistData } = await supabase
    .from("playlists")
    .select("id, customer_id, name, created_at, updated_at")
    .eq("id", id)
    .eq("customer_id", customerId)
    .maybeSingle();

  if (!playlistData) {
    notFound();
  }

  const [itemsResult, mediaResult, playlistsResult, bookingsResult] =
    await Promise.all([
      supabase
        .from("playlist_items")
        .select(
          "id, playlist_id, media_id, position, duration, clip_start, created_at",
        )
        .eq("playlist_id", id)
        .order("position", { ascending: true }),
      supabase
        .from("media")
        .select(
          "id, customer_id, name, type, file_path, file_size, duration, created_at",
        )
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false }),
      supabase
        .from("playlists")
        .select("id, customer_id, name, created_at, updated_at")
        .eq("customer_id", customerId)
        .order("updated_at", { ascending: false }),
      supabase
        .from("ad_bookings")
        .select("*, profiles(full_name, company_name), ad_booking_items(*)")
        .eq("customer_id", customerId)
        .neq("status", "draft"),
    ]);

  const items = (itemsResult.data ?? []) as PlaylistItem[];
  const media = (mediaResult.data ?? []) as Media[];
  const playlists = (playlistsResult.data ?? []) as Playlist[];
  const usages: PlaylistBookingUsage[] = normalizeCmBookings(
    bookingsResult.data,
  )
    .filter((booking) => bookingUsesPlaylist(booking, id))
    .map((booking) => ({
      id: booking.id,
      startDate: booking.startDate,
      endDate: booking.endDate,
      status: booking.status,
    }));

  return (
    <div className="space-y-8">
      <PanelPageHeader
        eyebrow="Customer playlist"
        title={playlistData.name}
        description="Edit slots and preview where this playlist is used."
        actions={
          <Link
            href={backHref}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white/80 transition duration-200 hover:border-sky-400/30 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60"
          >
            <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" />
            Back to playlists
          </Link>
        }
      />
      <PlaylistEditor
        key={playlistData.id}
        playlist={playlistData as Playlist}
        initialItems={items}
        media={media}
        screens={[]}
        screenPlaylists={[]}
        playlists={playlists}
        canEdit={true}
        backHref={backHref}
        hideScreenAssign={true}
        bookingUsages={usages}
      />
    </div>
  );
}
