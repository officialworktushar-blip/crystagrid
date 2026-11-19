"use client";

import { useState } from "react";
import { CalendarDays, Filter, Search } from "lucide-react";
import PanelSelect from "@/components/ui/PanelSelect";
import { cn } from "@/lib/utils";

type SelectOption = { value: string; label: string };

type SelectFilter = {
  key: string;
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  allLabel?: string;
};

type ToggleFilter = {
  key: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

type DateRangeFilter = {
  label?: string;
  from: string;
  to: string;
  onChange: (range: { from: string; to: string }) => void;
};

const pillClass =
  "inline-flex h-10 items-center gap-2 rounded-full border border-white/[0.12] bg-surface-2 px-3.5 text-sm text-[#e2e8f0] transition duration-200 focus-within:border-sky-400/50 focus-within:ring-2 focus-within:ring-sky-400/30";

export default function FilterBar({
  search,
  selects,
  toggles,
  dateRange,
  resultCount,
  total,
  onClear,
}: {
  search: { value: string; onChange: (value: string) => void; placeholder: string };
  selects: SelectFilter[];
  toggles: ToggleFilter[];
  dateRange?: DateRangeFilter;
  resultCount: number;
  total: number;
  onClear: () => void;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const activeCount =
    (search.value.trim() ? 1 : 0) +
    selects.filter((item) => item.value && item.value !== "all").length +
    toggles.filter((item) => item.checked).length +
    (dateRange?.from || dateRange?.to ? 1 : 0);

  const controls = (
    <>
      <label className={pillClass}>
        <Search aria-hidden="true" className="h-4 w-4 shrink-0 text-[#94a3b8]" />
        <input
          type="search"
          value={search.value}
          onChange={(event) => search.onChange(event.target.value)}
          placeholder={search.placeholder}
          aria-label={search.placeholder}
          className="w-36 bg-transparent text-sm text-[#e2e8f0] outline-none placeholder:text-[#64748b] sm:w-44"
        />
      </label>

      {selects.map((item) => (
        <div key={item.key} className="inline-flex items-center gap-2">
          <span className="shrink-0 text-xs text-[#94a3b8]">{item.label}</span>
          <PanelSelect
            value={item.value}
            onChange={item.onChange}
            label={item.label}
            options={[
              { value: "", label: item.allLabel ?? "All" },
              ...item.options.filter((option) => option.value !== ""),
            ]}
            className="max-w-[9rem]"
          />
        </div>
      ))}

      {toggles.map((item) => (
        <button
          key={item.key}
          type="button"
          aria-pressed={item.checked}
          onClick={() => item.onChange(!item.checked)}
          className={cn(
            pillClass,
            "cursor-pointer",
            item.checked
              ? "border-sky-400/40 bg-sky-400/10 text-[#e2e8f0]"
              : "hover:border-white/20 hover:text-[#e2e8f0]",
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              "h-2 w-2 shrink-0 rounded-full",
              item.checked ? "bg-brand-sky shadow-brand" : "bg-[#64748b]",
            )}
          />
          {item.label}
        </button>
      ))}

      {dateRange ? (
        <div className={pillClass}>
          <CalendarDays
            aria-hidden="true"
            className="h-4 w-4 shrink-0 text-[#94a3b8]"
          />
          <span className="shrink-0 text-xs text-[#94a3b8]">
            {dateRange.label ?? "Date range"}
          </span>
          <input
            type="date"
            value={dateRange.from}
            onChange={(event) =>
              dateRange.onChange({ from: event.target.value, to: dateRange.to })
            }
            aria-label={`${dateRange.label ?? "Date range"} from`}
            className="bg-transparent text-xs text-[#e2e8f0] outline-none"
          />
          <span className="text-xs text-[#64748b]">–</span>
          <input
            type="date"
            value={dateRange.to}
            onChange={(event) =>
              dateRange.onChange({ from: dateRange.from, to: event.target.value })
            }
            aria-label={`${dateRange.label ?? "Date range"} to`}
            className="bg-transparent text-xs text-[#e2e8f0] outline-none"
          />
        </div>
      ) : null}
    </>
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="hidden flex-1 flex-wrap items-center gap-2 sm:flex">
          {controls}
        </div>

        <button
          type="button"
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((current) => !current)}
          className="inline-flex h-10 items-center gap-2 rounded-full border border-white/[0.12] bg-surface-2 px-3.5 text-sm font-semibold text-[#e2e8f0] transition duration-200 hover:border-white/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 sm:hidden"
        >
          <Filter aria-hidden="true" className="h-4 w-4" />
          Filters
          {activeCount > 0 ? (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-sky px-1.5 text-[10px] font-bold text-white">
              {activeCount}
            </span>
          ) : null}
        </button>

        <button
          type="button"
          onClick={onClear}
          className="rounded-full px-3 py-2 text-xs font-semibold text-[#94a3b8] transition duration-200 hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60"
        >
          Clear filters
        </button>

        <p className="ml-auto text-xs text-[#94a3b8]">
          Showing <span className="font-semibold text-[#e2e8f0]">{resultCount}</span>{" "}
          of {total}
        </p>
      </div>

      {mobileOpen ? (
        <div className="flex flex-wrap items-center gap-2 sm:hidden">
          {controls}
        </div>
      ) : null}
    </div>
  );
}
