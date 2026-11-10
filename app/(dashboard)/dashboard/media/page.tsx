import { redirect } from "next/navigation";
import MediaClient from "@/components/dashboard/MediaClient";
import type { Media } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";

export default async function MediaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data, error } = await supabase
    .from("media")
    .select(
      "id, customer_id, name, type, file_path, file_size, duration, created_at",
    )
    .eq("customer_id", user.id)
    .order("created_at", { ascending: false });

  const media = (data ?? []) as Media[];

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-sky">
          Media
        </p>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
          Media library
        </h1>
        <p className="mt-2 text-sm text-body">
          Upload and manage the images and videos for your screens.
        </p>
      </div>

      <MediaClient
        initialMedia={media}
        userId={user.id}
        loadError={error?.message ?? null}
      />
    </div>
  );
}
