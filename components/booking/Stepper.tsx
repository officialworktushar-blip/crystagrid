import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const steps = [
  { number: 1, label: "City" },
  { number: 2, label: "Package" },
  { number: 3, label: "Dates" },
] as const;

export default function Stepper({ current }: { current: 1 | 2 | 3 }) {
  return (
    <ol className="mx-auto flex w-full max-w-md items-start">
      {steps.map((step, index) => {
        const complete = step.number < current;
        const active = step.number === current;

        return (
          <li
            key={step.number}
            className={cn(
              "relative flex flex-1 flex-col items-center",
              index < steps.length - 1 &&
                "after:absolute after:left-1/2 after:top-4 after:h-px after:w-full after:bg-[#dbe3ef] after:content-['']",
            )}
          >
            <span
              className={cn(
                "relative z-10 flex h-8 w-8 items-center justify-center rounded-full border text-xs font-bold transition",
                complete &&
                  "border-[#1d6fff] bg-[#1d6fff] text-white shadow-[0_6px_18px_-8px_rgba(29,111,255,0.9)]",
                active &&
                  "border-[#1d6fff] bg-white text-[#1d6fff] ring-4 ring-[#dbeafe]",
                !active &&
                  !complete &&
                  "border-[#dbe3ef] bg-white text-[#94a3b8]",
              )}
            >
              {complete ? (
                <Check aria-hidden="true" className="h-4 w-4" />
              ) : (
                step.number
              )}
            </span>
            <span
              className={cn(
                "relative z-10 mt-2 bg-[#f8fafc] px-2 text-[11px] font-semibold uppercase tracking-[0.12em]",
                active || complete ? "text-[#0f172a]" : "text-[#94a3b8]",
              )}
            >
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
