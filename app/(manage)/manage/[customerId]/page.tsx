import { redirect } from "next/navigation";

export default async function ManageCustomerOverviewPage({
  params,
}: {
  params: Promise<{ customerId: string }>;
}) {
  const { customerId } = await params;
  redirect(`/cm/customers/${customerId}`);
}
