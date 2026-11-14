"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import {
  managerDisplayName,
  type AdminTeamMember,
} from "@/lib/admin";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type SaveState = "idle" | "saving" | "saved" | "error";

const selectClass =
  "h-9 w-full rounded-full border border-white/10 bg-[#050b1f] px-3 text-xs text-white outline-none transition focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/40 disabled:cursor-wait disabled:opacity-60 sm:text-sm";

export default function AdminManagerSelect({
  customerId,
  managerId,
  managers,
  className,
}: {
  customerId: string;
  managerId: string | null;
  managers: AdminTeamMember[];
  className?: string;
}) {
  const router = useRouter();
  const id = useId();
  const [selected, setSelected] = useState(managerId ?? "");
  const [state, setState] = useState<SaveState>("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleChange(value: string) {
    const previous = selected;
    const nextManagerId = value || null;

    setSelected(value);
    setState("saving");
    setMessage(null);

    const supabase = createClient();
    const { error } = await supabase.rpc("admin_assign_manager", {
      p_customer: customerId,
      p_manager: nextManagerId,
    });

    if (error) {
      setSelected(previous);
      setState("error");
      setMessage(error.message);
      return;
    }

    setState("saved");
    router.refresh();
  }

  return (
    <div className={cn("min-w-0", className)}>
      <label htmlFor={id} className="sr-only">
        Assign account manager
      </label>
      <select
        id={id}
        value={selected}
        onChange={(event) => void handleChange(event.target.value)}
        disabled={state === "saving"}
        aria-describedby={state !== "idle" ? `${id}-status` : undefined}
        className={selectClass}
      >
        <option value="">Unassigned</option>
        {managers.map((manager) => (
          <option key={manager.id} value={manager.id}>
            {managerDisplayName(manager)}
          </option>
        ))}
      </select>

      {state !== "idle" ? (
        <p
          id={`${id}-status`}
          role={state === "error" ? "alert" : "status"}
          className={cn(
            "mt-1 text-[11px] leading-4",
            state === "error"
              ? "text-red-300"
              : state === "saved"
                ? "text-emerald-300"
                : "text-muted",
          )}
        >
          {state === "saving"
            ? "Saving..."
            : state === "error"
              ? message
              : "Saved"}
        </p>
      ) : null}
    </div>
  );
}
