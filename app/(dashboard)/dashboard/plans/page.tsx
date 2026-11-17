import { redirect } from "next/navigation";
import MyPlansClient from "@/components/dashboard/MyPlansClient";
import { normalizeAdBookings } from "@/lib/ad-bookings";
import { createClient } from "@/lib/supabase/server";

export default async function MyPlansPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data, error } = await supabase
    .from("ad_bookings")
    .select("*, ad_booking_items(*)")
    .eq("customer_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-sky">
          Ads
        </p>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
          My Plans
        </h1>
        <p className="mt-2 text-sm text-body">
          Review your campaign requests and track booking status in one place.
        </p>
      </div>

      <MyPlansClient
        bookings={normalizeAdBookings(data)}
        loadError={error?.message ?? null}
      />
    </div>
  );
}
