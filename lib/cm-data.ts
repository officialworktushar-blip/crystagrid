import { normalizeAdminCustomerStats, type AdminCustomerStats } from "@/lib/admin";
import { normalizeCmBookings, type CmBooking } from "@/lib/cm";
import { createClient } from "@/lib/supabase/server";

export async function loadCmCustomers(): Promise<{
  customers: AdminCustomerStats[];
  error: string | null;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_customer_stats");

  if (error) {
    return { customers: [], error: error.message };
  }

  return { customers: normalizeAdminCustomerStats(data), error: null };
}

export async function loadCmBookings(
  customerIds: string[],
): Promise<{
  bookings: CmBooking[];
  error: string | null;
}> {
  if (customerIds.length === 0) {
    return { bookings: [], error: null };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ad_bookings")
    .select("*, profiles(full_name, company_name), ad_booking_items(*)")
    .in("customer_id", customerIds)
    .order("created_at", { ascending: false });

  if (error) {
    return { bookings: [], error: error.message };
  }

  return { bookings: normalizeCmBookings(data), error: null };
}

export async function loadCmCities(): Promise<{
  cities: Array<{ id: string; name: string }>;
  error: string | null;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ad_cities")
    .select("id, name")
    .order("name", { ascending: true });

  if (error) {
    return { cities: [], error: error.message };
  }

  const cities: Array<{ id: string; name: string }> = [];

  for (const value of data ?? []) {
    const row = value as { id?: string | number; name?: string };

    if (row.id != null && typeof row.name === "string") {
      cities.push({ id: String(row.id), name: row.name });
    }
  }

  return { cities, error: null };
}
