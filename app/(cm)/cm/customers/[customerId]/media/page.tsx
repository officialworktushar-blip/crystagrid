import PanelPageHeader from "@/components/admin/PanelPageHeader";
import MediaClient from "@/components/dashboard/MediaClient";
import { createClient } from "@/lib/supabase/server";
import type { Media } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function CmCustomerMediaPage({
  params,
}: {
  params: Promise<{ customerId: string }>;
}) {
  const { customerId } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("media")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });

  const media = (data ?? []) as Media[];

  return (
    <div className="space-y-8">
      <PanelPageHeader
        eyebrow="Customer"
        title="Media"
        description="Upload and manage images and videos for this customer."
      />
      <MediaClient
        initialMedia={media}
        customerId={customerId}
        canEdit={true}
        loadError={error?.message ?? null}
      />
    </div>
  );
}
