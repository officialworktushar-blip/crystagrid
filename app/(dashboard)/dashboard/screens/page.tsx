import { redirect } from "next/navigation";
import CustomerScreensView, {
  type CustomerBookedScreens,
} from "@/components/dashboard/CustomerScreensView";
import {
  normalizeAdBookings,
  normalizeAdBookingScreens,
} from "@/lib/ad-bookings";
import { groupCmBookingScreens, type CmBooking } from "@/lib/cm";
import { createClient } from "@/lib/supabase/server";
import type { Screen } from "@/lib/types";

export default async function ScreensPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const bookingsResult = await supabase
    .from("ad_bookings")
    .select("*, ad_booking_items(*)")
    .eq("customer_id", user.id)
    .in("status", ["pending", "confirmed", "running"])
    .order("start_date", { ascending: true })
    .order("created_at", { ascending: false });

  const bookings: CmBooking[] = normalizeAdBookings(bookingsResult.data).map(
    (booking) => ({ ...booking, customerId: user.id }),
  );

  const screenResults = await Promise.all(
    bookings.map((booking) =>
      supabase.rpc("booking_screens", { p_booking: booking.id }),
    ),
  );

  let loadError = bookingsResult.error?.message ?? null;

  const bookedScreens: CustomerBookedScreens[] = bookings.map(
    (booking, index) => {
      const screenResult = screenResults[index];
      const rpcError = screenResult?.error?.message ?? null;

      loadError = loadError ?? rpcError;

      return {
        booking,
        groups: groupCmBookingScreens(
          normalizeAdBookingScreens(screenResult?.data),
        ),
      };
    },
  );

  const legacyResult = await supabase
    .from("screens")
    .select("id, customer_id, name, status, location, last_seen, created_at")
    .eq("customer_id", user.id)
    .order("created_at", { ascending: false });

  loadError = loadError ?? legacyResult.error?.message ?? null;

  const legacyScreens = (legacyResult.data ?? []) as Screen[];

  return (
    <CustomerScreensView
      bookedScreens={bookedScreens}
      legacyScreens={legacyScreens}
      loadError={loadError}
    />
  );
}
