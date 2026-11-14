import AdminLeadsClient from "@/components/admin/AdminLeadsClient";
import { createClient } from "@/lib/supabase/server";
import type { Lead } from "@/lib/types";

export default async function AdminLeadsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads")
    .select("id, name, email, phone, company, message, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-sky">
          Admin
        </p>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
          Leads
        </h1>
        <p className="mt-2 text-sm text-body">
          Review messages submitted through the contact form.
        </p>
      </div>

      <AdminLeadsClient
        leads={(data ?? []) as Lead[]}
        loadError={error?.message ?? null}
      />
    </div>
  );
}
