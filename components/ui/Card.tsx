import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type CardProps = HTMLAttributes<HTMLDivElement>;

export default function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-white/10 bg-surface p-6 transition duration-200 hover:border-sky-500/40 hover:shadow-card",
        className,
      )}
      {...props}
    />
  );
}
