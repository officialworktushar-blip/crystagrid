import CmPanelLoading from "@/components/cm/CmPanelLoading";

export default function CmCustomersLoading() {
  return (
    <CmPanelLoading label="Customer Manager customers" cards={4} rows={6} />
  );
}
