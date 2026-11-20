import { notFound } from "next/navigation";
import PanelPageHeader from "@/components/admin/PanelPageHeader";
import PlaylistEditor from "@/components/dashboard/PlaylistEditor";
import { getHouseContext, getHousePlaylistDetail } from "@/lib/house";

export const dynamic = "force-dynamic";

export default async function SalesHousePlaylistDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { ownerId } = await getHouseContext();

  if (ownerId === null) {
    return (
      <div
        role="status"
        className="rounded-3xl border border-white/10 bg-surface px-6 py-10 text-center text-sm text-body"
      >
        No company account found. Make sure an admin account exists.
      </div>
    );
  }

  const detail = await getHousePlaylistDetail(ownerId, id);

  if (!detail) {
    notFound();
  }

  const backHref = "/sales/house/playlists";

  return (
    <div className="space-y-8">
      <PanelPageHeader
        eyebrow="Company playlist"
        title={detail.playlist.name}
        description="Edit the slots in this company playlist and choose where it plays from the Where it plays tab."
      />
      <PlaylistEditor
        key={detail.playlist.id}
        playlist={detail.playlist}
        initialItems={detail.initialItems}
        media={detail.media}
        screens={[]}
        screenPlaylists={[]}
        playlists={detail.playlists}
        canEdit={true}
        backHref={backHref}
        hideScreenAssign={true}
        assignHint="Choose where this playlist plays from the Where it plays tab."
      />
    </div>
  );
}
