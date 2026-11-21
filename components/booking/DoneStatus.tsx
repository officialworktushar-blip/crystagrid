"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { clearBookingDraft } from "@/lib/booking-draft";

export default function DoneStatus({
  bookingId,
  paidQuery,
  paymentStatus,
}: {
  bookingId: string;
  paidQuery: boolean;
  paymentStatus: string;
}) {
  const router = useRouter();

  useEffect(() => {
    if (paymentStatus === "paid") {
      try {
        clearBookingDraft();
      } catch {
        // ignore storage errors
      }
    }
  }, [paymentStatus]);

  useEffect(() => {
    if (!paidQuery || paymentStatus === "paid") return;
    let attempts = 0;
    const interval = window.setInterval(() => {
      attempts += 1;
      router.refresh();
      if (attempts >= 10) {
        window.clearInterval(interval);
      }
    }, 3000);
    return () => window.clearInterval(interval);
  }, [paidQuery, paymentStatus, router, bookingId]);

  if (paidQuery && paymentStatus !== "paid") {
    return (
      <div className="rounded-2xl border border-[#bfdbfe] bg-[#eff6ff] px-4 py-3 text-sm font-medium text-[#1d4ed8]" role="status" aria-live="polite">
        Confirming your payment... If it takes longer, refresh this page in a moment.
      </div>
    );
  }

  return null;
}
