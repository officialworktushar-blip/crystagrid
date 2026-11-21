"use client";

import { Printer } from "lucide-react";

export default function PrintReceiptButton() {
  return (
    <button
      type="button"
      onClick={() => {
        if (typeof window !== "undefined") {
          window.print();
        }
      }}
      className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full border border-[#dbe3ef] bg-white px-5 text-sm font-bold text-[#0f172a] transition hover:border-[#b8c6da] hover:bg-[#f8fafc]"
    >
      <Printer className="h-4 w-4" aria-hidden="true" />
      Print receipt
    </button>
  );
}
