import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import BookWizard from "@/components/booking/BookWizard";

function BookingWizardFallback() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center py-24 text-center">
      <Loader2
        aria-hidden="true"
        className="h-7 w-7 animate-spin text-[#1d6fff]"
      />
      <p className="mt-4 text-sm font-semibold text-[#64748b]">
        Loading booking options...
      </p>
    </div>
  );
}

export default function BookPage() {
  return (
    <Suspense fallback={<BookingWizardFallback />}>
      <BookWizard />
    </Suspense>
  );
}
