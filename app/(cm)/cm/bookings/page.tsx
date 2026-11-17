import PanelPageHeader from "@/components/admin/PanelPageHeader";
import CmBookingsClient from "@/components/cm/CmBookingsClient";
import { loadCmBookings, loadCmCities, loadCmCustomers } from "@/lib/cm-data";

export default async function CmBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ needsContent?: string | string[] }>;
}) {
  const params = await searchParams;
  const needsContentParam = Array.isArray(params.needsContent)
    ? params.needsContent[0]
    : params.needsContent;
  const initialNeedsContent =
    needsContentParam === "1" || needsContentParam === "true";

  const { customers, error: customersError } = await loadCmCustomers();
  const customerIds = customers.map((customer) => customer.customer_id);

  const [{ bookings, error: bookingsError }, { cities, error: citiesError }] =
    await Promise.all([loadCmBookings(customerIds), loadCmCities()]);

  const visibleBookings = bookings.filter(
    (booking) => booking.status.toLowerCase() !== "draft",
  );

  const cityNames: Record<string, string> = {};

  for (const city of cities) {
    cityNames[city.id] = city.name;
  }

  return (
    <div className="space-y-8">
      <PanelPageHeader
        eyebrow="Customer Manager"
        title="Bookings"
        description="Review customer campaigns, content needs, and booking status."
      />
      <CmBookingsClient
        bookings={visibleBookings}
        cityNames={cityNames}
        initialNeedsContent={initialNeedsContent}
        loadError={customersError ?? bookingsError ?? citiesError ?? null}
      />
    </div>
  );
}
