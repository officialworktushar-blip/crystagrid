import { redirect } from "next/navigation";
import ScreensClient from "@/components/dashboard/ScreensClient";
import type { Screen } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";

export default async function ScreensPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data, error } = await supabase
    .from("screens")
    .select("id, customer_id, name, status, location, last_seen, created_at")
    .eq("customer_id", user.id)
    .order("created_at", { ascending: false });

  const screens = (data ?? []) as Screen[];

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-sky">
          Screens
        </p>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
          Your screens
        </h1>
        <p className="mt-2 text-sm text-body">
          Pair new displays and keep an eye on every screen.
        </p>
      </div>

      <ScreensClient
        screens={screens}
        loadError={error?.message ?? null}
      />
    </div>
  );
}
