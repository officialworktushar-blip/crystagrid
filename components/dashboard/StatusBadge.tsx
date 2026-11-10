import type { ScreenStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const statusStyles: Record<
  ScreenStatus,
  { badge: string; dot: string; label: string }
> = {
  online: {
    badge: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
    dot: "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]",
    label: "Online",
  },
  offline: {
    badge: "border-white/10 bg-white/5 text-white/50",
    dot: "bg-white/40",
    label: "Offline",
  },
  pending: {
    badge: "border-amber-400/20 bg-amber-400/10 text-amber-300",
    dot: "bg-amber-400",
    label: "Pending",
  },
};

export default function StatusBadge({ status }: { status: ScreenStatus }) {
  const style = statusStyles[status] ?? statusStyles.offline;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        style.badge,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", style.dot)} />
      {style.label}
    </span>
  );
}
