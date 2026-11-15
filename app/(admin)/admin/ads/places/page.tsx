import AdminAdPlacesClient from "@/components/admin/AdminAdPlacesClient";
import type {
  AdCity,
  AdPlace,
  AdPropertyDependency,
  AdPropertyType,
} from "@/lib/ads";
import { createClient } from "@/lib/supabase/server";

export default async function AdminAdPlacesPage() {
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
        .select("id, city_id, place_id, type_id"),
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
          Places
        </h1>
        <p className="mt-2 text-sm text-body">
          Manage the cities, localities, and property types used across ad
          inventory.
        </p>
      </div>

      <AdminAdPlacesClient
        cities={(citiesResult.data ?? []) as unknown as AdCity[]}
        places={(placesResult.data ?? []) as unknown as AdPlace[]}
        propertyTypes={
          (typesResult.data ?? []) as unknown as AdPropertyType[]
        }
        propertyDependencies={
          (propertiesResult.data ?? []) as unknown as AdPropertyDependency[]
        }
        loadError={loadError}
      />
    </div>
  );
}
