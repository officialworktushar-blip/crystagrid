import { PropertiesSection } from "@/components/admin/PanelSections";

export default async function SalesPropertiesPage({
  searchParams,
}: {
  searchParams: Promise<{ withoutScreens?: string | string[] }>;
}) {
  const params = await searchParams;
  const raw = params.withoutScreens;
  const value = Array.isArray(raw) ? raw[0] : raw;

  return (
    <PropertiesSection
      eyebrow="Sales"
      withoutScreens={value === "1" || value === "true"}
    />
  );
}
