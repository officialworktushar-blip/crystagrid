"use client";

import Link from "next/link";
import { Plus } from "lucide-react";

export default function AddScreenButton() {
  return (
    <Link
      href="/dashboard/screens"
      className="inline-flex items-center justify-center gap-2 rounded-full brand-gradient px-4 py-2.5 text-sm font-semibold text-white shadow-brand transition duration-200 hover:-translate-y-0.5 hover:brightness-110"
    >
      <Plus aria-hidden="true" className="h-4 w-4" />
      Pair Screen
    </Link>
  );
}
