import MediaClient from "@/components/dashboard/MediaClient";
import { createClient } from "@/lib/supabase/server";
import type { Media } from "@/lib/types";

export default async function ManageCustomerMediaPage({
  params,
}: {
  params: Promise<{ customerId: string }>;
}) {
  const { customerId } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("media")
    .select(
      "id, customer_id, name, type, file_path, file_size, duration, created_at",
    )
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });

  const media = (data ?? []) as Media[];

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-sky">
          Media
        </p>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
          Customer media
        </h1>
        <p className="mt-2 text-sm text-body">
          Upload and manage images and videos for this customer.
        </p>
      </div>

      <MediaClient
        initialMedia={media}
        customerId={customerId}
        canEdit
        loadError={error?.message ?? null}
      />
    </div>
  );
}
