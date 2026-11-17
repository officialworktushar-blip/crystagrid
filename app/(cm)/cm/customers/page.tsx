import PanelPageHeader from "@/components/admin/PanelPageHeader";
import CmCustomersClient from "@/components/cm/CmCustomersClient";
import { getSessionProfile } from "@/lib/auth";
import { withCmBookingCounts } from "@/lib/cm";
import { loadCmBookings, loadCmCustomers } from "@/lib/cm-data";

export default async function CmCustomersPage() {
  const session = await getSessionProfile();
  const { customers, error: customersError } = await loadCmCustomers();
  const { bookings, error: bookingsError } = await loadCmBookings(
    customers.map((customer) => customer.customer_id),
  );

  const loadError = [customersError, bookingsError]
    .filter((message): message is string => Boolean(message?.trim()))
    .join(" ");

  return (
    <div className="space-y-8">
      <PanelPageHeader
        eyebrow="Customer Manager"
        title="Customers"
        description="Customer accounts assigned to you."
      />

      <CmCustomersClient
        customers={withCmBookingCounts(customers, bookings)}
        isAdmin={session?.profile?.role === "admin"}
        loadError={loadError || null}
      />
    </div>
  );
}
