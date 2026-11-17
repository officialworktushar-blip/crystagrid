import { redirect } from "next/navigation";

export default async function ManageCustomerPlaylistDetailPage({
  params,
}: {
  params: Promise<{ customerId: string; id: string }>;
}) {
  const { customerId } = await params;
  redirect(`/cm/customers/${customerId}`);
}
