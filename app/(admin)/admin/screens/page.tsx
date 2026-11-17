import { ScreensSection } from "@/components/admin/PanelSections";

export const dynamic = "force-dynamic";

export default function AdminScreensPage() {
  return (
    <ScreensSection eyebrow="Admin" canEdit role="admin" />
  );
}
