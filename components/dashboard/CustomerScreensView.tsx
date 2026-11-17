import Link from "next/link";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import StatusBadge from "@/components/dashboard/StatusBadge";
import {
  formatBookingId,
  formatBookingStatus,
  type AdBookingScreen,
} from "@/lib/ad-bookings";
import {
  cmBookingDateState,
  cmBookingScreenLocation,
  formatCmBookingDateRange,
  isCmBookingLive,
  type CmBooking,
  type CmBookingScreenGroup,
} from "@/lib/cm";
import { formatRelativeTime } from "@/lib/screens";
import type { Screen } from "@/lib/types";
import { cn } from "@/lib/utils";

export type CustomerBookedScreens = {
  booking: CmBooking;
  groups: CmBookingScreenGroup[];
};

type CustomerScreensViewProps = {
  bookedScreens: CustomerBookedScreens[];
  legacyScreens: Screen[];
  loadError: string | null;
};

const STATUS_STYLES: Record<string, string> = {
  draft: "border-white/10 bg-white/5 text-white/50",
  pending: "border-amber-400/20 bg-amber-400/10 text-amber-300",
  confirmed: "border-sky-400/20 bg-sky-400/10 text-sky-300",
  running: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
  completed: "border-violet-400/20 bg-violet-400/10 text-violet-300",
  cancelled: "border-red-400/20 bg-red-400/10 text-red-300",
};

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

function countLabel(screens: AdBookingScreen[]): string {
  const online = screens.filter((screen) => screen.online).length;

  return `${screens.length} screens (${online} online)`;
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

export default function CustomerScreensView({
  bookedScreens,
  legacyScreens,
  loadError,
}: CustomerScreensViewProps) {
  const hasBookedScreens = bookedScreens.some((entry) =>
    entry.groups.some((group) => group.screens.length > 0),
  );

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-sky">
          Screens
        </p>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
          Where my ads run
        </h1>
        <p className="mt-2 text-sm text-body">
          A read-only view of the screens assigned to your campaigns.
        </p>
      </div>

      {loadError ? (
        <p
          role="alert"
          className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200"
        >
          {loadError}
        </p>
      ) : null}

      {hasBookedScreens ? (
        <div className="space-y-6">
          {bookedScreens.map(({ booking, groups }) => {
            const screens = groups.flatMap((group) => group.screens);
            const dateState = cmBookingDateState(booking);
            const live = isCmBookingLive(booking);

            return (
              <Card key={booking.id} className="p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-extrabold tracking-tight text-white">
                        Booking {formatBookingId(booking.id)}
                      </h2>
                      <StatusChip status={booking.status} />
                      {live ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-xs font-medium text-emerald-300">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
                          Live now
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-white/60">
                          {dateState.label}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-xs text-muted">
                      {formatCmBookingDateRange(booking)}
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
                      Total screens
                    </p>
                    <p className="mt-1 text-lg font-bold tabular-nums text-white">
                      {screens.length}
                    </p>
                  </div>
                </div>

                {groups.length === 0 ? (
                  <p className="pt-5 text-sm text-body">
                    No screens assigned yet.
                  </p>
                ) : (
                  <div className="space-y-6 pt-5">
                    {groups.map((group) => (
                      <div key={group.key} className="space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h3 className="text-sm font-semibold text-white">
                            {group.propertyName}
                          </h3>
                          <span className="text-xs tabular-nums text-muted">
                            {countLabel(group.screens)}
                          </span>
                        </div>
                        <ul className="grid gap-2 lg:grid-cols-2">
                          {group.screens.map((screen) => (
                            <ScreenRow key={screen.screen_id} screen={screen} />
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="flex flex-col items-center justify-center px-6 py-16 text-center">
          <h2 className="text-base font-semibold text-white">
            No booked screens yet
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-body">
            Book a campaign to see where your ads run.
          </p>
          <Button asChild className="mt-6">
            <Link href="/book">Book a campaign</Link>
          </Button>
        </Card>
      )}

      {legacyScreens.length > 0 ? (
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-extrabold tracking-tight text-white">
              Other screens
            </h2>
            <p className="mt-1 text-sm text-body">
              Screens previously added to your account.
            </p>
          </div>
          <Card className="divide-y divide-white/10 p-0">
            {legacyScreens.map((screen) => (
              <div
                key={screen.id}
                className="flex flex-wrap items-center justify-between gap-3 px-6 py-4"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">
                    {screen.name}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {screen.location || "Location not set"}
                  </p>
                </div>
                <StatusBadge status={screen.status} />
              </div>
            ))}
          </Card>
        </section>
      ) : null}
    </div>
  );
}
