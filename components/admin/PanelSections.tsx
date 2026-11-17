import AdminAdBookingsClient from "@/components/admin/AdminAdBookingsClient";
import AdminAdPackagesClient from "@/components/admin/AdminAdPackagesClient";
import AdminAdPlacesClient from "@/components/admin/AdminAdPlacesClient";
import AdminAdPricingClient from "@/components/admin/AdminAdPricingClient";
import AdminAdPropertiesClient from "@/components/admin/AdminAdPropertiesClient";
import AdminLeadsClient from "@/components/admin/AdminLeadsClient";
import AdminScreensClient from "@/components/admin/AdminScreensClient";
import PanelPageHeader from "@/components/admin/PanelPageHeader";
import { AddScreenButton } from "@/components/screens/AddScreenDialog";
import {
  normalizeAdPackageStats,
  normalizeAdPropertyStats,
  type AdCity,
  type AdPackage,
  type AdPackageProperty,
  type AdPlace,
  type AdPromoCode,
  type AdProperty,
  type AdPropertyDependency,
  type AdPropertyType,
  type AdSettings,
} from "@/lib/ads";
import { normalizeAdBookings } from "@/lib/ad-bookings";
import type { Role } from "@/lib/roles";
import { normalizeStaffScreens } from "@/lib/staff-screens";
import type { Lead } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";

function firstError(...errors: ({ message?: string } | null | undefined)[]) {
  for (const error of errors) {
    if (error?.message) {
      return error.message;
    }
  }

  return null;
}

export async function PlacesSection({ eyebrow = "Admin" }: { eyebrow?: string }) {
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
      supabase.from("ad_properties").select("id, city_id, place_id, type_id"),
    ]);

  return (
    <div className="space-y-8">
      <PanelPageHeader
        eyebrow={eyebrow}
        title="Places"
        description="Manage the cities, localities, and property types used across ad inventory."
      />
      <AdminAdPlacesClient
        cities={(citiesResult.data ?? []) as unknown as AdCity[]}
        places={(placesResult.data ?? []) as unknown as AdPlace[]}
        propertyTypes={
          (typesResult.data ?? []) as unknown as AdPropertyType[]
        }
        propertyDependencies={
          (propertiesResult.data ?? []) as unknown as AdPropertyDependency[]
        }
        loadError={firstError(
          citiesResult.error,
          placesResult.error,
          typesResult.error,
          propertiesResult.error,
        )}
      />
    </div>
  );
}

export async function PropertiesSection({
  eyebrow = "Admin",
  withoutScreens = false,
}: {
  eyebrow?: string;
  withoutScreens?: boolean;
}) {
  const supabase = await createClient();
  const [citiesResult, placesResult, typesResult, propertiesResult, statsResult] =
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
      supabase
        .from("ad_property_stats")
        .select("property_id, screens_count, online_count"),
    ]);

  return (
    <div className="space-y-8">
      <PanelPageHeader
        eyebrow={eyebrow}
        title="Properties"
        description="Manage ad properties, placement, pricing, and reach."
      />
      <AdminAdPropertiesClient
        key={withoutScreens ? "without-screens" : "all-screens"}
        cities={(citiesResult.data ?? []) as unknown as AdCity[]}
        places={(placesResult.data ?? []) as unknown as AdPlace[]}
        propertyTypes={
          (typesResult.data ?? []) as unknown as AdPropertyType[]
        }
        properties={(propertiesResult.data ?? []) as unknown as AdProperty[]}
        propertyStats={normalizeAdPropertyStats(statsResult.data)}
        withoutScreens={withoutScreens}
        loadError={firstError(
          citiesResult.error,
          placesResult.error,
          typesResult.error,
          propertiesResult.error,
          statsResult.error,
        )}
      />
    </div>
  );
}

export async function PackagesSection({ eyebrow = "Admin" }: { eyebrow?: string }) {
  const supabase = await createClient();
  const [
    citiesResult,
    placesResult,
    typesResult,
    propertiesResult,
    packagesResult,
    packagePropertiesResult,
    statsResult,
  ] = await Promise.all([
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
      supabase
        .from("ad_packages")
      .select(
        "id, city_id, type_id, name, description, monthly_reach, rate, rate_unit, is_active, sort",
      )
      .order("sort", { ascending: true })
      .order("name", { ascending: true }),
    supabase.from("ad_package_properties").select("package_id, property_id"),
    supabase
      .from("ad_package_stats")
      .select("package_id, properties_count, screens_count, online_count"),
  ]);

  return (
    <div className="space-y-8">
      <PanelPageHeader
        eyebrow={eyebrow}
        title="Packages"
        description="Bundle ad properties into ready-made campaign packages."
      />
      <AdminAdPackagesClient
        cities={(citiesResult.data ?? []) as unknown as AdCity[]}
        places={(placesResult.data ?? []) as unknown as AdPlace[]}
        propertyTypes={
          (typesResult.data ?? []) as unknown as AdPropertyType[]
        }
        properties={
          (propertiesResult.data ?? []) as unknown as AdProperty[]
        }
        packages={(packagesResult.data ?? []) as unknown as AdPackage[]}
        packageProperties={
          (packagePropertiesResult.data ?? []) as unknown as AdPackageProperty[]
        }
        packageStats={normalizeAdPackageStats(statsResult.data)}
        loadError={firstError(
          citiesResult.error,
          placesResult.error,
          typesResult.error,
          propertiesResult.error,
          packagesResult.error,
          packagePropertiesResult.error,
          statsResult.error,
        )}
      />
    </div>
  );
}

export async function PricingSection({ eyebrow = "Admin" }: { eyebrow?: string }) {
  const supabase = await createClient();
  const [settingsResult, promosResult] = await Promise.all([
    supabase
      .from("ad_settings")
      .select(
        "id, online_discount_pct, gst_pct, platinum_multiplier, max_total_discount_pct",
      )
      .eq("id", 1)
      .maybeSingle(),
    supabase
      .from("ad_promo_codes")
      .select("code, discount_pct, is_active, expires_at, note")
      .order("code", { ascending: true }),
  ]);

  return (
    <div className="space-y-8">
      <PanelPageHeader
        eyebrow={eyebrow}
        title="Pricing"
        description="Control booking discounts, tax, tier multipliers, and promo codes."
      />
      <AdminAdPricingClient
        settings={(settingsResult.data as AdSettings | null) ?? null}
        promoCodes={(promosResult.data ?? []) as unknown as AdPromoCode[]}
        loadError={firstError(settingsResult.error, promosResult.error)}
      />
    </div>
  );
}

export async function BookingsSection({ eyebrow = "Admin" }: { eyebrow?: string }) {
  const supabase = await createClient();
  const [bookingsResult, citiesResult] = await Promise.all([
    supabase
      .from("ad_bookings")
      .select("*, profiles(full_name, company_name), ad_booking_items(*)")
      .order("created_at", { ascending: false }),
    supabase
      .from("ad_cities")
      .select("id, name, state, is_active, sort")
      .order("sort", { ascending: true })
      .order("name", { ascending: true }),
  ]);

  return (
    <div className="space-y-8">
      <PanelPageHeader
        eyebrow={eyebrow}
        title="Bookings"
        description="Review campaign requests, pricing breakdowns, and booking status."
      />
      <AdminAdBookingsClient
        bookings={normalizeAdBookings(bookingsResult.data)}
        cities={(citiesResult.data ?? []) as unknown as AdCity[]}
        loadError={firstError(bookingsResult.error, citiesResult.error)}
      />
    </div>
  );
}

export async function LeadsSection({ eyebrow = "Admin" }: { eyebrow?: string }) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads")
    .select("id, name, email, phone, company, message, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-8">
      <PanelPageHeader
        eyebrow={eyebrow}
        title="Leads"
        description="Review messages submitted through the contact form."
      />
      <AdminLeadsClient
        leads={(data ?? []) as Lead[]}
        loadError={error?.message ?? null}
      />
    </div>
  );
}

export async function ScreensSection({
  eyebrow = "Admin",
  canEdit = true,
  role = "admin",
}: {
  eyebrow?: string;
  canEdit?: boolean;
  role?: Role;
}) {
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
        .select(
          "id, city_id, place_id, type_id, name, screens_count, is_active, sort",
        )
        .order("sort")
        .order("name"),
    ]);

  const loadError = firstError(
    overviewResult.error,
    citiesResult.error,
    placesResult.error,
    propertiesResult.error,
  );

  return (
    <div className="space-y-8">
      <PanelPageHeader
        eyebrow={eyebrow}
        title="Screens"
        description={
          canEdit
            ? "Review and organize every screen across customer accounts."
            : "Review every screen across customer accounts in read-only mode."
        }
        actions={
          canEdit ? (
            <AddScreenButton
              cities={(citiesResult.data ?? []) as unknown as AdCity[]}
              places={(placesResult.data ?? []) as unknown as AdPlace[]}
              properties={
                (propertiesResult.data ?? []) as unknown as AdProperty[]
              }
            />
          ) : undefined
        }
      />
      <AdminScreensClient
        rows={normalizeStaffScreens(overviewResult.data)}
        canEdit={canEdit}
        role={role}
        loadError={loadError}
      />
    </div>
  );
}
