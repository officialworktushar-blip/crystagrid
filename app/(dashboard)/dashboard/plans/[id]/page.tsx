import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import CustomerPlanDetails, {
  type CustomerPlanProperty,
  type CustomerPlaylist,
  type CustomerPlaylistSlot,
} from "@/components/dashboard/CustomerPlanDetails";
import Button from "@/components/ui/Button";
import {
  formatBookingId,
  normalizeAdBookings,
  normalizeAdBookingScreens,
} from "@/lib/ad-bookings";
import {
  normalizeAdPackageStats,
  normalizeAdPropertyStats,
  type AdPackageStats,
  type AdPropertyStats,
} from "@/lib/ads";
import type { CmBooking } from "@/lib/cm";
import { getMediaUrl } from "@/lib/media";
import { createClient } from "@/lib/supabase/server";
import type { Media, Playlist, PlaylistItem } from "@/lib/types";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

type PackagePropertyRow = {
  package_id: string;
  property_id: string;
};

type PropertyNameRow = {
  id: string;
  name: string;
};

function isPackageItem(
  item: CmBooking["items"][number],
): boolean {
  return item.type === "package" || (!item.propertyId && Boolean(item.packageId));
}

function clampDuration(value: number | null | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null;
  }

  return Math.max(1, Math.min(10, Math.round(value)));
}

function clampClipStart(value: number | null | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(10, Math.round(value)));
}

async function loadCampaignPlaylist(
  supabase: SupabaseClient,
  playlistId: string,
  customerId: string,
): Promise<CustomerPlaylist | null> {
  const { data: playlistData } = await supabase
    .from("playlists")
    .select("id, customer_id, name, created_at, updated_at")
    .eq("id", playlistId)
    .eq("customer_id", customerId)
    .maybeSingle();

  if (!playlistData) {
    return null;
  }

  const playlist = playlistData as Playlist;
  const { data: itemRows } = await supabase
    .from("playlist_items")
    .select("id, playlist_id, media_id, position, duration, clip_start, created_at")
    .eq("playlist_id", playlist.id)
    .order("position", { ascending: true });

  const items = (itemRows ?? []) as PlaylistItem[];
  const mediaIds = [...new Set(items.map((item) => item.media_id))];

  let mediaQuery = supabase
    .from("media")
    .select("id, customer_id, name, type, file_path, file_size, duration, created_at");

  if (mediaIds.length > 0) {
    mediaQuery = mediaQuery.in("id", mediaIds);
  } else {
    mediaQuery = mediaQuery.eq("customer_id", customerId);
  }

  const { data: mediaRows } = await mediaQuery;
  const media = (mediaRows ?? []) as Media[];
  const mediaById = new Map(media.map((item) => [item.id, item] as const));

  const slots: CustomerPlaylistSlot[] = [...items]
    .sort((left, right) => left.position - right.position)
    .slice(0, 10)
    .map((item) => {
      const itemMedia = mediaById.get(item.media_id);
      const duration =
        clampDuration(item.duration) ??
        clampDuration(itemMedia?.duration) ??
        10;
      const clipStart = clampClipStart(item.clip_start);

      return {
        id: item.id,
        position: item.position,
        name: itemMedia?.name ?? "Media unavailable",
        duration,
        clipStart,
        thumbnailUrl: itemMedia?.file_path
          ? getMediaUrl(itemMedia.file_path)
          : null,
      };
    });

  return {
    id: playlist.id,
    name: playlist.name,
    slotCount: slots.length,
    loopSeconds: slots.reduce(
      (total, slot) => total + Math.max(1, slot.duration - slot.clipStart),
      0,
    ),
    slots,
  };
}

export default async function CustomerPlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { id } = await params;
  const { data } = await supabase
    .from("ad_bookings")
    .select("*, ad_booking_items(*)")
    .eq("id", id)
    .eq("customer_id", user.id)
    .maybeSingle();

  if (!data) {
    notFound();
  }

  const normalizedBooking = normalizeAdBookings([data])[0];

  if (!normalizedBooking) {
    notFound();
  }

  const booking: CmBooking = { ...normalizedBooking, customerId: user.id };

  const { data: screensData } = await supabase.rpc("booking_screens", {
    p_booking: id,
  });
  const screens = normalizeAdBookingScreens(screensData);

  const packageIds = [
    ...new Set(
      booking.items
        .filter(isPackageItem)
        .map((item) => item.packageId)
        .filter((value): value is string => Boolean(value)),
    ),
  ];
  const directPropertyIds = [
    ...new Set(
      booking.items
        .map((item) => item.propertyId)
        .filter((value): value is string => Boolean(value)),
    ),
  ];

  let mappingRows: PackagePropertyRow[] = [];

  if (packageIds.length > 0) {
    const { data: mappingData } = await supabase
      .from("ad_package_properties")
      .select("package_id, property_id")
      .in("package_id", packageIds);

    mappingRows = (mappingData ?? []) as PackagePropertyRow[];
  }

  const mappedPropertyIds = [
    ...new Set(
      mappingRows
        .map((row) => row.property_id)
        .filter((value): value is string => Boolean(value)),
    ),
  ];

  let propertyNames = new Map<string, string>();

  if (mappedPropertyIds.length > 0) {
    const { data: propertyRows } = await supabase
      .from("ad_properties")
      .select("id, name")
      .in("id", mappedPropertyIds);

    propertyNames = new Map(
      ((propertyRows ?? []) as PropertyNameRow[]).map((row) => [
        row.id,
        row.name,
      ]),
    );
  }

  const statsPropertyIds = [
    ...new Set([...mappedPropertyIds, ...directPropertyIds]),
  ];

  let propertyStats: AdPropertyStats[] = [];

  if (statsPropertyIds.length > 0) {
    const { data: propertyStatsData } = await supabase
      .from("ad_property_stats")
      .select("property_id, screens_count, online_count")
      .in("property_id", statsPropertyIds);

    propertyStats = normalizeAdPropertyStats(propertyStatsData);
  }

  let packageStats: AdPackageStats[] = [];

  if (packageIds.length > 0) {
    const { data: packageStatsData } = await supabase
      .from("ad_package_stats")
      .select("package_id, properties_count, screens_count, online_count")
      .in("package_id", packageIds);

    packageStats = normalizeAdPackageStats(packageStatsData);
  }

  const propertyStatsById = new Map(
    propertyStats.map((stat) => [stat.property_id, stat] as const),
  );
  const packageProperties: CustomerPlanProperty[] = mappingRows.map((row) => {
    const stat = propertyStatsById.get(row.property_id);

    return {
      package_id: row.package_id,
      property_id: row.property_id,
      property_name:
        propertyNames.get(row.property_id) ??
        `Property ${row.property_id.slice(0, 8)}`,
      screens_count: stat?.screens_count ?? 0,
      online_count: stat?.online_count ?? 0,
    };
  });

  const playlist = booking.playlistId
    ? await loadCampaignPlaylist(supabase, booking.playlistId, user.id)
    : null;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-sky">
            My Plans
          </p>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            Booking {formatBookingId(id)}
          </h1>
        </div>
        <Button asChild variant="secondary" size="sm">
          <Link href="/dashboard/plans">Back to plans</Link>
        </Button>
      </div>

      <CustomerPlanDetails
        booking={booking}
        screens={screens}
        packageProperties={packageProperties}
        propertyStats={propertyStats}
        packageStats={packageStats}
        playlist={playlist}
      />
    </div>
  );
}
