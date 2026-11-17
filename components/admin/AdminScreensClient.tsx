"use client";

import ScreensInventory from "@/components/screens/ScreensInventory";
import type { StaffScreenRow } from "@/lib/staff-screens";

export default function AdminScreensClient({
  rows,
  loadError,
}: {
  rows: StaffScreenRow[];
  loadError: string | null;
}) {
  return (
    <div className="space-y-4">
      {loadError ? (
        <p
          role="alert"
          className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200"
        >
          Screens could not be loaded. {loadError}
        </p>
      ) : null}
      <ScreensInventory rows={rows} canEdit role="admin" />
    </div>
  );
}
