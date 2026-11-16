"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AdminCustomerDetailHeaderActions({
  customerId,
  managerId,
  currentAdminId,
}: {
  customerId: string;
  managerId: string | null;
  currentAdminId: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function assignToMe() {
    if (!currentAdminId) return;
    setBusy(true);
    setMsg(null);
    const supabase = createClient();
    const { error } = await supabase.rpc("admin_assign_manager", {
      p_customer: customerId,
      p_manager: currentAdminId,
    });
    setBusy(false);
    if (error) {
      setMsg(error.message);
      return;
    }
    router.refresh();
  }

  async function unassign() {
    setBusy(true);
    setMsg(null);
    const supabase = createClient();
    const { error } = await supabase.rpc("admin_assign_manager", {
      p_customer: customerId,
      p_manager: null,
    });
    setBusy(false);
    if (error) {
      setMsg(error.message);
      return;
    }
    router.refresh();
  }

  const isMine = currentAdminId && managerId === currentAdminId;

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      {isMine ? (
        <span className="inline-flex rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-200">
          Assigned to you
        </span>
      ) : currentAdminId ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => void assignToMe()}
          className="rounded-full border border-sky-400/30 bg-sky-400/10 px-3 py-1 text-[11px] font-semibold text-sky-200 transition hover:bg-sky-400/20 disabled:opacity-60"
        >
          Assign to me
        </button>
      ) : null}
      {managerId ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => void unassign()}
          className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-white/70 transition hover:bg-white/10 disabled:opacity-60"
        >
          Unassign
        </button>
      ) : null}
      {msg ? <span className="text-[11px] text-red-300">{msg}</span> : null}
    </div>
  );
}
