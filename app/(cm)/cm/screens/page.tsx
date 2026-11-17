import PanelPageHeader from "@/components/admin/PanelPageHeader";
import CmScreensClient from "@/components/cm/CmScreensClient";
import { createClient } from "@/lib/supabase/server";
import { normalizeStaffScreens } from "@/lib/staff-screens";

export const dynamic = "force-dynamic";

export default async function CmScreensPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("staff_screens_overview");

  return (
    <div className="space-y-8">
      <PanelPageHeader
        eyebrow="Customer Manager"
        title="Screens"
        description="Screens across your active campaigns."
      />
      <CmScreensClient
        rows={normalizeStaffScreens(data)}
        loadError={error?.message ?? null}
      />
    </div>
  );
}
