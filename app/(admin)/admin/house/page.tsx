import { Suspense } from "react";
import PanelPageHeader from "@/components/admin/PanelPageHeader";
import HouseAssignments from "@/components/house/HouseAssignments";
import HouseTabs from "@/components/house/HouseTabs";
import { getHouseContext } from "@/lib/house";

export const dynamic = "force-dynamic";

const basePath = "/admin/house";

export default async function AdminHousePage() {
  const { ownerId, playlists, error } = await getHouseContext();

  return (
    <div className="space-y-8">
      <PanelPageHeader
        eyebrow="Admin"
        title="Company content"
        description="Choose where the company's own content plays when no client campaign is active."
      />

      <HouseTabs basePath={basePath} />

      {error ? (
        <p
          role="alert"
          className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200"
        >
          {error}
        </p>
      ) : null}

      {ownerId === null ? (
        <div
          role="status"
          className="rounded-3xl border border-white/10 bg-surface px-6 py-10 text-center text-sm text-body"
        >
          No company account found. Make sure an admin account exists.
        </div>
      ) : (
        <Suspense
          fallback={
            <div className="rounded-3xl border border-white/10 bg-surface px-6 py-16 text-center text-sm text-muted">
              Loading company content settings...
            </div>
          }
        >
          <HouseAssignments ownerId={ownerId} playlists={playlists} />
        </Suspense>
      )}
    </div>
  );
}
