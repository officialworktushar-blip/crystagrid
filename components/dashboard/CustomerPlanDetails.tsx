import { Film } from "lucide-react";
import Card from "@/components/ui/Card";
import { formatINR } from "@/lib/ads";
import type { AdPackageStats, AdPropertyStats } from "@/lib/ads";
import {
  formatBookingId,
  formatBookingStatus,
  type AdBookingItem,
  type AdBookingScreen,
} from "@/lib/ad-bookings";
import {
  cmBookingDateState,
  cmBookingScreenLocation,
  cmBookingScreenSummary,
  formatCmBookingDateRange,
  groupCmBookingScreens,
  isCmBookingLive,
  type CmBooking,
} from "@/lib/cm";
import { formatRelativeTime } from "@/lib/screens";
import { cn } from "@/lib/utils";

export type CustomerPlanProperty = {
  package_id: string;
  property_id: string;
  property_name: string;
  screens_count: number;
  online_count: number;
};

export type CustomerPlaylistSlot = {
  id: string;
  position: number;
  name: string;
  duration: number;
  clipStart: number;
  thumbnailUrl: string | null;
};

export type CustomerPlaylist = {
  id: string;
  name: string;
  slotCount: number;
  loopSeconds: number;
  slots: CustomerPlaylistSlot[];
};

type CustomerPlanDetailsProps = {
  booking: CmBooking;
  screens: AdBookingScreen[];
  packageProperties: CustomerPlanProperty[];
  propertyStats: AdPropertyStats[];
  packageStats: AdPackageStats[];
  playlist: CustomerPlaylist | null;
};

type StatsMap<T> = Map<string, T>;

const STATUS_STYLES: Record<string, string> = {
  draft: "border-white/10 bg-white/5 text-white/50",
  pending: "border-amber-400/20 bg-amber-400/10 text-amber-300",
  confirmed: "border-sky-400/20 bg-sky-400/10 text-sky-300",
  running: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
  completed: "border-violet-400/20 bg-violet-400/10 text-violet-300",
  cancelled: "border-red-400/20 bg-red-400/10 text-red-300",
};

function isPackageItem(item: AdBookingItem): boolean {
  return item.type === "package" || (!item.propertyId && Boolean(item.packageId));
}

function formatLoopTime(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));

  if (total <= 59) {
    return `${total}s`;
  }

  const minutes = Math.floor(total / 60);
  const remaining = total % 60;

  return `${minutes}:${remaining.toString().padStart(2, "0")}`;
}

function StatusChip({ status }: { status: string }) {
  const style =
    STATUS_STYLES[status.trim().toLowerCase()] ??
    "border-white/10 bg-white/5 text-white/50";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        style,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {formatBookingStatus(status)}
    </span>
  );
}

function PriceRow({
  label,
  value,
  emphasize = false,
}: {
  label: string;
  value: number;
  emphasize?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/5 bg-white/[0.02] px-3.5 py-3",
        emphasize && "border-brand-sky/20 bg-brand-sky/[0.06]",
      )}
    >
      <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
        {label}
      </dt>
      <dd
        className={cn(
          "mt-1 text-sm font-semibold tabular-nums",
          emphasize ? "text-white" : "text-body",
        )}
      >
        {formatINR(value)}
      </dd>
    </div>
  );
}

function PlanHeader({ booking }: { booking: CmBooking }) {
  const dateState = cmBookingDateState(booking);
  const live = isCmBookingLive(booking);

  return (
    <Card className="p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-sky">
            Booking {formatBookingId(booking.id)}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              Your campaign
            </h2>
            <StatusChip status={booking.status} />
            {live ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-xs font-medium text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
                Live now
              </span>
            ) : null}
          </div>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-body">
            <span>{formatCmBookingDateRange(booking)}</span>
            <span>{dateState.label}</span>
            <span>{booking.tier ? `${booking.tier} tier` : "Tier not set"}</span>
            <span className="font-semibold text-white">
              {formatINR(booking.total)}
            </span>
          </div>
        </div>

        <dl className="grid w-full gap-2 sm:w-auto sm:grid-cols-2 lg:grid-cols-3">
          <PriceRow label="Standard total" value={booking.standardTotal} />
          <PriceRow label="Discount" value={booking.discountAmount} />
          <PriceRow
            label={
              booking.promoCode
                ? `Promo discount (${booking.promoCode})`
                : "Promo discount"
            }
            value={booking.promoDiscount}
          />
          <PriceRow label="GST" value={booking.gstAmount} />
          <PriceRow label="Rounding" value={booking.roundingAmount} />
          <PriceRow label="Total" value={booking.total} emphasize />
        </dl>
      </div>
    </Card>
  );
}

function BookingItemCard({
  item,
  packageProperties,
  propertyStats,
  packageStats,
}: {
  item: AdBookingItem;
  packageProperties: CustomerPlanProperty[];
  propertyStats: StatsMap<AdPropertyStats>;
  packageStats: StatsMap<AdPackageStats>;
}) {
  const packageItem = isPackageItem(item);
  const propertyStat = item.propertyId
    ? propertyStats.get(item.propertyId)
    : undefined;
  const packageStat = item.packageId
    ? packageStats.get(item.packageId)
    : undefined;

  return (
    <Card className="h-full p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-sky">
            {packageItem ? "Package" : "Property"}
          </p>
          <h3 className="mt-2 text-base font-bold tracking-tight text-white">
            {item.name}
          </h3>
          {item.detail ? (
            <p className="mt-1 text-xs text-muted">{item.detail}</p>
          ) : null}
        </div>
        {item.amount !== null ? (
          <p className="text-sm font-semibold tabular-nums text-white">
            {formatINR(item.amount)}
          </p>
        ) : null}
      </div>

      {packageItem ? (
        <div className="mt-4 space-y-3 border-t border-white/10 pt-4">
          {packageStat ? (
            <p className="text-xs text-muted">
              {packageStat.properties_count} properties ·{" "}
              {packageStat.screens_count} screens (
              {packageStat.online_count} online)
            </p>
          ) : null}
          {packageProperties.length === 0 ? (
            <p className="text-sm text-body">Included properties not available.</p>
          ) : (
            <ul className="space-y-2">
              {packageProperties.map((property) => {
                const stat = propertyStats.get(property.property_id);
                const screensCount = stat?.screens_count ?? property.screens_count;
                const onlineCount = stat?.online_count ?? property.online_count;

                return (
                  <li
                    key={property.property_id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-white/[0.02] px-3 py-2"
                  >
                    <span className="text-sm text-white">
                      {property.property_name}
                    </span>
                    <span className="text-xs tabular-nums text-muted">
                      {screensCount} screens ({onlineCount} online)
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : (
        <div className="mt-4 border-t border-white/10 pt-4">
          <p className="text-xs tabular-nums text-muted">
            {propertyStat
              ? `${propertyStat.screens_count} screens (${propertyStat.online_count} online)`
              : "Screen count unavailable"}
          </p>
        </div>
      )}
    </Card>
  );
}

function ScreenRow({ screen }: { screen: AdBookingScreen }) {
  return (
    <li className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-white">
            {screen.screen_name || screen.screen_id}
          </p>
          <p className="mt-1 text-xs text-body">
            {cmBookingScreenLocation(screen) || "Location not set"}
          </p>
          <p className="mt-1 text-[11px] text-muted">
            {screen.place_name || "Place not set"}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
              screen.online
                ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-200"
                : "border-white/10 bg-white/5 text-white/50",
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                screen.online
                  ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]"
                  : "bg-white/30",
              )}
            />
            {screen.online ? "Online" : "Offline"}
          </span>
          <span className="text-[11px] text-muted">
            Last seen {formatRelativeTime(screen.last_seen)}
          </span>
        </div>
      </div>
    </li>
  );
}

function PlaylistSlots({ playlist }: { playlist: CustomerPlaylist }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-sky">
            Campaign playlist
          </p>
          <h3 className="mt-1 text-base font-bold tracking-tight text-white">
            {playlist.name}
          </h3>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
          <span className="tabular-nums">{playlist.slotCount}/10 slots</span>
          <span>
            Loop time:{" "}
            <span className="font-semibold tabular-nums text-white">
              {formatLoopTime(playlist.loopSeconds)}
            </span>
          </span>
        </div>
      </div>

      {playlist.slots.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-white/10 px-4 py-5 text-sm text-body">
          This playlist has no slots yet.
        </p>
      ) : (
        <ol className="grid gap-2 sm:grid-cols-2">
          {playlist.slots.map((slot, index) => (
            <li
              key={slot.id}
              className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-2"
            >
              <div className="relative h-12 w-20 shrink-0 overflow-hidden rounded-xl bg-black/40">
                {slot.thumbnailUrl ? (
                  <img
                    src={slot.thumbnailUrl}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-muted">
                    <Film aria-hidden="true" className="h-4 w-4" />
                  </span>
                )}
                <span className="absolute left-1 top-1 rounded-full bg-black/70 px-1.5 text-[9px] font-semibold tabular-nums text-white/80">
                  {index + 1}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-white">
                  {slot.name}
                </p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-muted">
                  <span className="tabular-nums">{slot.duration}s</span>
                  {slot.clipStart > 0 ? (
                    <span className="tabular-nums text-sky-200/80">
                      Clip {slot.clipStart}s
                    </span>
                  ) : null}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export default function CustomerPlanDetails({
  booking,
  screens,
  packageProperties,
  propertyStats,
  packageStats,
  playlist,
}: CustomerPlanDetailsProps) {
  const propertyStatsById = new Map(
    propertyStats.map((stat) => [stat.property_id, stat] as const),
  );
  const packageStatsById = new Map(
    packageStats.map((stat) => [stat.package_id, stat] as const),
  );
  const propertiesByPackage = new Map<string, CustomerPlanProperty[]>();

  for (const property of packageProperties) {
    const current = propertiesByPackage.get(property.package_id) ?? [];
    current.push(property);
    propertiesByPackage.set(property.package_id, current);
  }

  const screenGroups = groupCmBookingScreens(screens);
  const onlineScreens = screens.filter((screen) => screen.online).length;

  return (
    <div className="space-y-8">
      <PlanHeader booking={booking} />

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-extrabold tracking-tight text-white">
            What you bought
          </h2>
          <p className="mt-1 text-sm text-body">
            Inventory included in this booking.
          </p>
        </div>
        {booking.items.length === 0 ? (
          <Card className="px-6 py-10 text-center text-sm text-body">
            No booking items are available for this campaign.
          </Card>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {booking.items.map((item) => (
              <BookingItemCard
                key={item.id}
                item={item}
                packageProperties={propertiesByPackage.get(item.packageId ?? "") ?? []}
                propertyStats={propertyStatsById}
                packageStats={packageStatsById}
              />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-extrabold tracking-tight text-white">
            Where your ad runs
          </h2>
          <p className="mt-1 text-sm text-body">
            Screens assigned to this booking.
          </p>
        </div>
        <Card className="p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
            <p className="text-sm text-body">
              {screens.length} screens ({onlineScreens} online)
            </p>
            <p className="text-xs text-muted">Read-only screen assignment</p>
          </div>
          {screenGroups.length === 0 ? (
            <p className="pt-5 text-sm text-body">No screens assigned yet.</p>
          ) : (
            <div className="space-y-6 pt-5">
              {screenGroups.map((group) => (
                <div key={group.key} className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-white">
                      {group.propertyName}
                    </h3>
                    <span className="text-xs tabular-nums text-muted">
                      {cmBookingScreenSummary(group.screens)}
                    </span>
                  </div>
                  <ul className="grid gap-2 md:grid-cols-2">
                    {group.screens.map((screen) => (
                      <ScreenRow key={screen.screen_id} screen={screen} />
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </Card>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-extrabold tracking-tight text-white">
            Your content
          </h2>
          <p className="mt-1 text-sm text-body">Campaign creative and timing.</p>
        </div>
        <Card className="p-5 sm:p-6">
          {playlist ? (
            <PlaylistSlots playlist={playlist} />
          ) : (
            <p className="rounded-2xl border border-dashed border-white/10 px-4 py-5 text-sm text-body">
              Your account manager is preparing your content.
            </p>
          )}
        </Card>
      </section>
    </div>
  );
}
