import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import BookingPlanClient from "@/components/booking/BookingPlanClient";

function PlanFallback() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center py-24 text-center">
      <Loader2
        aria-hidden="true"
        className="h-7 w-7 animate-spin text-[#1d6fff]"
      />
      <p className="mt-4 text-sm font-semibold text-[#64748b]">
        Loading your plan...
      </p>
    </div>
  );
}

export default function BookPlanPage() {
  return (
    <Suspense fallback={<PlanFallback />}>
      <BookingPlanClient />
    </Suspense>
  );
}
