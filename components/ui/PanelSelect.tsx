"use client";

import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type PanelSelectOption = {
  value: string;
  label: string;
};

export type PanelSelectGroup = {
  label: string;
  options: PanelSelectOption[];
};

export default function PanelSelect({
  value,
  onChange,
  options,
  label,
  disabled = false,
  id,
  className,
  ariaLabel,
  ariaDescribedBy,
  groups,
}: {
  value: string;
  onChange: (value: string) => void;
  options?: PanelSelectOption[];
  label?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  groups?: PanelSelectGroup[];
}) {
  const selectOptions = options ?? [];
  const resolvedAriaLabel = ariaLabel ?? label;

  return (
    <div className={cn("relative inline-flex min-w-0 items-center", className)}>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        aria-label={resolvedAriaLabel}
        aria-describedby={ariaDescribedBy}
        className={cn(
          "panel-select h-10 w-full cursor-pointer appearance-none py-2 pl-3.5 pr-9 text-sm text-[#e2e8f0] outline-none transition focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/30 disabled:cursor-not-allowed disabled:opacity-60 [&>optgroup]:bg-surface-2 [&>optgroup]:text-[#e2e8f0] [&>option]:bg-surface-2 [&>option]:text-[#e2e8f0]",
          className,
        )}
      >
        {selectOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
        {groups?.map((group) => (
          <optgroup key={group.label} label={group.label}>
            {group.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute right-3 h-4 w-4 text-[#94a3b8]"
      />
    </div>
  );
}
