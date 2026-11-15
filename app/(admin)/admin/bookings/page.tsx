import AdminAdBookingsClient from "@/components/admin/AdminAdBookingsClient";
import { normalizeAdBookings } from "@/lib/ad-bookings";
import { createClient } from "@/lib/supabase/server";

export default async function AdminBookingsPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("ad_bookings")
    .select("*, profiles(full_name, company_name), ad_booking_items(*)")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-sky">
          Admin
        </p>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
          Bookings
        </h1>
        <p className="mt-2 text-sm text-body">
          Review campaign requests, pricing breakdowns, and booking
          status.
        </p>
      </div>

      <AdminAdBookingsClient
        bookings={normalizeAdBookings(data)}
        loadError={error?.message ?? null}
      />
    </div>
  );
}
