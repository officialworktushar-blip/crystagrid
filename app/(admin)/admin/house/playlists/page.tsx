import PanelPageHeader from "@/components/admin/PanelPageHeader";
import PlaylistsClient from "@/components/dashboard/PlaylistsClient";
import HouseTabs from "@/components/house/HouseTabs";
import { getHouseContext, getHousePlaylists } from "@/lib/house";

export const dynamic = "force-dynamic";

const basePath = "/admin/house";

export default async function AdminHousePlaylistsPage() {
  const { ownerId } = await getHouseContext();

  if (ownerId === null) {
    return (
      <div className="space-y-8">
        <PanelPageHeader
          eyebrow="Admin"
          title="Company playlists"
          description="Build the playlists the company plays when no client campaign is active."
        />
        <HouseTabs basePath={basePath} />
        <div
          role="status"
          className="rounded-3xl border border-white/10 bg-surface px-6 py-10 text-center text-sm text-body"
        >
          No company account found. Make sure an admin account exists.
        </div>
      </div>
    );
  }

  const { playlists, error } = await getHousePlaylists(ownerId);

  return (
    <div className="space-y-8">
      <PanelPageHeader
        eyebrow="Admin"
        title="Company playlists"
        description="Build the playlists the company plays when no client campaign is active."
      />
      <HouseTabs basePath={basePath} />
      <PlaylistsClient
        playlists={playlists}
        customerId={ownerId}
        canEdit={true}
        basePath={basePath}
        loadError={error}
      />
    </div>
  );
}
