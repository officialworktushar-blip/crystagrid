import PanelPageHeader from "@/components/admin/PanelPageHeader";
import CmCustomerBookingsClient, {
  type PackageProperty,
} from "@/components/cm/CmCustomerBookingsClient";
import { normalizeCmBookings } from "@/lib/cm";
import { createClient } from "@/lib/supabase/server";
import type { Media, Playlist, PlaylistItem } from "@/lib/types";

export const dynamic = "force-dynamic";

type PackagePropertyRow = {
  package_id: string;
  property_id: string;
};

type PropertyRow = {
  id: string;
  name: string;
};

export default async function CmCustomerBookingsPage({
  params,
}: {
  params: Promise<{ customerId: string }>;
}) {
  const { customerId } = await params;
  const supabase = await createClient();

  const bookingsResult = await supabase
    .from("ad_bookings")
    .select("*, profiles(full_name, company_name), ad_booking_items(*)")
    .eq("customer_id", customerId)
    .neq("status", "draft")
    .order("start_date", { ascending: false })
    .order("created_at", { ascending: false });

  const bookings = normalizeCmBookings(bookingsResult.data);

  const playlistsResult = await supabase
    .from("playlists")
    .select("*")
    .eq("customer_id", customerId)
    .order("updated_at", { ascending: false });

  const playlists = (playlistsResult.data ?? []) as Playlist[];
  const playlistIds = playlists.map((playlist) => playlist.id);

  let playlistItems: PlaylistItem[] = [];
  let media: Media[] = [];
  let relatedError: string | null = null;

  if (playlistIds.length > 0) {
    const itemsResult = await supabase
      .from("playlist_items")
      .select("*")
      .in("playlist_id", playlistIds);

    playlistItems = (itemsResult.data ?? []) as PlaylistItem[];
    relatedError = itemsResult.error?.message ?? null;

    const mediaIds = [...new Set(playlistItems.map((item) => item.media_id))];

    if (mediaIds.length > 0) {
      const mediaResult = await supabase
        .from("media")
        .select("*")
        .in("id", mediaIds);

      media = (mediaResult.data ?? []) as Media[];
      relatedError = relatedError ?? mediaResult.error?.message ?? null;
    }
  }

  const packageIds = [
    ...new Set(
      bookings
        .flatMap((booking) =>
          booking.items.map((item) => item.packageId),
        )
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  let packageProperties: PackageProperty[] = [];

  if (packageIds.length > 0) {
    const mappingResult = await supabase
      .from("ad_package_properties")
      .select("package_id, property_id")
      .in("package_id", packageIds);

    const rows = (mappingResult.data ?? []) as PackagePropertyRow[];
    const propertyIds = [
      ...new Set(
        rows
          .map((row) => row.property_id)
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    let propertyNames = new Map<string, string>();

    if (propertyIds.length > 0) {
      const propertyResult = await supabase
        .from("ad_properties")
        .select("id, name")
        .in("id", propertyIds);

      propertyNames = new Map(
        ((propertyResult.data ?? []) as PropertyRow[]).map((row) => [
          row.id,
          row.name,
        ]),
      );
      relatedError = relatedError ?? propertyResult.error?.message ?? null;
    }

    packageProperties = rows.map((row) => ({
      package_id: row.package_id,
      property_id: row.property_id,
      property_name:
        propertyNames.get(row.property_id) ??
        `Property ${row.property_id.slice(0, 8)}`,
    }));
    relatedError = relatedError ?? mappingResult.error?.message ?? null;
  }

  const loadError =
    bookingsResult.error?.message ??
    playlistsResult.error?.message ??
    relatedError;

  return (
    <div className="space-y-8">
      <PanelPageHeader
        eyebrow="Customer"
        title="Bookings"
        description="Review campaign bookings, assigned content, and screens for this customer."
      />
      <CmCustomerBookingsClient
        bookings={bookings}
        playlists={playlists}
        playlistItems={playlistItems}
        media={media}
        packageProperties={packageProperties}
        loadError={loadError}
      />
    </div>
  );
}
