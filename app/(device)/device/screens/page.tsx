import { AddScreenButton } from "@/components/screens/AddScreenDialog";
import ScreensInventory from "@/components/screens/ScreensInventory";
import type { AdCity, AdPlace, AdProperty } from "@/lib/ads";
import { requireRole } from "@/lib/auth";
import { normalizeStaffScreens } from "@/lib/staff-screens";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DeviceScreensPage() {
  const { profile } = await requireRole(["device_manager", "admin"]);
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
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-sky">
            Device Manager
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">
            Screens
          </h1>
          <p className="mt-1 text-sm leading-6 text-body">
            Search, place, update, and unpair screens.
          </p>
        </div>
        <AddScreenButton
          cities={(citiesResult.data ?? []) as unknown as AdCity[]}
          places={(placesResult.data ?? []) as unknown as AdPlace[]}
          properties={(propertiesResult.data ?? []) as unknown as AdProperty[]}
        />
      </header>

      {loadError ? (
        <div
          role="alert"
          className="rounded-3xl border border-red-400/20 bg-red-400/10 px-6 py-5 text-sm leading-6 text-red-200"
        >
          {loadError.message}
        </div>
      ) : (
        <ScreensInventory
          rows={normalizeStaffScreens(overviewResult.data)}
          canEdit
          role={profile?.role ?? "device_manager"}
        />
      )}
    </div>
  );
}
