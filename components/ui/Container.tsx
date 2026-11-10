import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type ContainerProps = HTMLAttributes<HTMLDivElement>;

export default function Container({ className, ...props }: ContainerProps) {
  return (
    <div
      className={cn("mx-auto w-full max-w-7xl px-6", className)}
      {...props}
    />
  );
}
