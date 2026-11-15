import AdminAdPricingClient from "@/components/admin/AdminAdPricingClient";
import type { AdPromoCode, AdSettings } from "@/lib/ads";
import { createClient } from "@/lib/supabase/server";

export default async function AdminAdPricingPage() {
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

  const loadError =
    settingsResult.error?.message ?? promosResult.error?.message ?? null;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-sky">
          Admin
        </p>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
          Pricing
        </h1>
        <p className="mt-2 text-sm text-body">
          Control booking discounts, tax, tier multipliers, and promo
          codes.
        </p>
      </div>

      <AdminAdPricingClient
        settings={(settingsResult.data as AdSettings | null) ?? null}
        promoCodes={
          (promosResult.data ?? []) as unknown as AdPromoCode[]
        }
        loadError={loadError}
      />
    </div>
  );
}
