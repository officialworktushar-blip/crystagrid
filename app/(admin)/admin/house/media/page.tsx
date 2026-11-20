import PanelPageHeader from "@/components/admin/PanelPageHeader";
import MediaClient from "@/components/dashboard/MediaClient";
import HouseTabs from "@/components/house/HouseTabs";
import { getHouseContext, getHouseMedia } from "@/lib/house";

export const dynamic = "force-dynamic";

const basePath = "/admin/house";

export default async function AdminHouseMediaPage() {
  const { ownerId } = await getHouseContext();

  if (ownerId === null) {
    return (
      <div className="space-y-8">
        <PanelPageHeader
          eyebrow="Admin"
          title="Company media"
          description="Images and videos used by the company's own playlists."
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

  const { media, error } = await getHouseMedia(ownerId);

  return (
    <div className="space-y-8">
      <PanelPageHeader
        eyebrow="Admin"
        title="Company media"
        description="Upload and manage images and videos for the company's own playlists."
      />
      <HouseTabs basePath={basePath} />
      <MediaClient
        initialMedia={media}
        customerId={ownerId}
        canEdit={true}
        loadError={error}
      />
    </div>
  );
}
