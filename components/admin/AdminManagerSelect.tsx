"use client";

"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import {
  managerDisplayName,
  type AdminTeamMember,
} from "@/lib/admin";
import PanelSelect from "@/components/ui/PanelSelect";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type SaveState = "idle" | "saving" | "saved" | "error";

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
      <PanelSelect
        id={id}
        value={selected}
        onChange={(value) => void handleChange(value)}
        disabled={state === "saving"}
        ariaDescribedBy={state !== "idle" ? `${id}-status` : undefined}
        label="Assign account manager"
        className="w-full text-xs sm:text-sm"
        options={[
          { value: "", label: "Unassigned" },
          ...managers.map((manager) => ({
            value: manager.id,
            label: `${managerDisplayName(manager)}${manager.role === "admin" ? " (Admin)" : ""}`,
          })),
        ]}
      />

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
