import { ScreensSection } from "@/components/admin/PanelSections";

export default function SalesScreensPage() {
  return (
    <ScreensSection eyebrow="Sales" canEdit={false} role="sales_manager" />
  );
}
