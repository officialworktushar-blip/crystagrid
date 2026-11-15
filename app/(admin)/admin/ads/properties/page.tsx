import AdminAdPropertiesClient from "@/components/admin/AdminAdPropertiesClient";
import type { AdCity, AdPlace, AdProperty, AdPropertyType } from "@/lib/ads";
import { createClient } from "@/lib/supabase/server";

export default async function AdminAdPropertiesPage() {
  const supabase = await createClient();

  const [citiesResult, placesResult, typesResult, propertiesResult] =
    await Promise.all([
      supabase
        .from("ad_cities")
        .select("id, name, state, is_active, sort")
        .order("sort", { ascending: true })
        .order("name", { ascending: true }),
      supabase
        .from("ad_places")
        .select("id, city_id, name, is_active, sort")
        .order("sort", { ascending: true })
        .order("name", { ascending: true }),
      supabase
        .from("ad_property_types")
        .select("id, name, sort")
        .order("sort", { ascending: true })
        .order("name", { ascending: true }),
      supabase
        .from("ad_properties")
        .select(
          "id, city_id, place_id, type_id, name, description, image_path, screens_count, monthly_reach, rate, rate_unit, is_active, sort",
        )
        .order("sort", { ascending: true })
        .order("name", { ascending: true }),
    ]);

  const loadError =
    citiesResult.error?.message ??
    placesResult.error?.message ??
    typesResult.error?.message ??
    propertiesResult.error?.message ??
    null;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-sky">
          Admin
        </p>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
          Properties
        </h1>
        <p className="mt-2 text-sm text-body">
          Manage ad properties, placement, pricing, and reach.
        </p>
      </div>

      <AdminAdPropertiesClient
        cities={(citiesResult.data ?? []) as unknown as AdCity[]}
        places={(placesResult.data ?? []) as unknown as AdPlace[]}
        propertyTypes={
          (typesResult.data ?? []) as unknown as AdPropertyType[]
        }
        properties={
          (propertiesResult.data ?? []) as unknown as AdProperty[]
        }
        loadError={loadError}
      />
    </div>
  );
}
