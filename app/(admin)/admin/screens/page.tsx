import AdminScreensClient from "@/components/admin/AdminScreensClient";
import { AddScreenButton } from "@/components/screens/AddScreenDialog";
import type { AdCity, AdPlace, AdProperty } from "@/lib/ads";
import { requireRole } from "@/lib/auth";
import { normalizeStaffScreens } from "@/lib/staff-screens";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminScreensPage() {
  await requireRole(["admin"]);

  const supabase = await createClient();
  const [overviewResult, citiesResult, placesResult, propertiesResult] =
    await Promise.all([
      supabase.rpc("staff_screens_overview"),
      supabase
        .from("ad_cities")
        .select("id, name, state, is_active, sort")
        .order("sort")
        .order("name"),
      supabase
        .from("ad_places")
        .select("id, city_id, name, is_active, sort")
        .order("sort")
        .order("name"),
      supabase
        .from("ad_properties")
        .select("id, city_id, place_id, type_id, name, is_active, sort")
        .order("sort")
        .order("name"),
    ]);

  const loadError =
    overviewResult.error ??
    citiesResult.error ??
    placesResult.error ??
    propertiesResult.error;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-sky">
            Admin
          </p>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            Screens
          </h1>
          <p className="mt-2 text-sm text-body">
            Review every screen across customer accounts.
          </p>
        </div>
        <AddScreenButton
          cities={(citiesResult.data ?? []) as unknown as AdCity[]}
          places={(placesResult.data ?? []) as unknown as AdPlace[]}
          properties={(propertiesResult.data ?? []) as unknown as AdProperty[]}
        />
      </div>

      <AdminScreensClient
        rows={normalizeStaffScreens(overviewResult.data)}
        loadError={loadError?.message ?? null}
      />
    </div>
  );
}
