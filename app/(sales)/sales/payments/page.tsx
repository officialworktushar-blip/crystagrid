import PanelPageHeader from "@/components/admin/PanelPageHeader";
import PaymentsClient, { type PaymentRow } from "@/components/admin/PaymentsClient";
import { createClient } from "@/lib/supabase/server";

type PaymentRecord = {
  id: string;
  booking_id: string | null;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  amount_paise: number;
  status: string;
  method: string | null;
  error_description: string | null;
  created_at: string | null;
};

type BookingRecord = {
  id: string;
  customer_id: string | null;
};

type ProfileRecord = {
  id: string;
  full_name: string | null;
  company_name: string | null;
};

export default async function SalesPaymentsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ad_payments")
    .select(
      "id, booking_id, razorpay_order_id, razorpay_payment_id, amount_paise, status, method, error_description, created_at",
    )
    .order("created_at", { ascending: false });

  const payments = (data ?? []) as unknown as PaymentRecord[];
  const bookingIds = [...new Set(payments.map((p) => p.booking_id).filter((v): v is string => Boolean(v)))];

  let clientByBooking = new Map<string, string>();
  let lookupError: string | null = null;

  if (bookingIds.length > 0) {
    const bookingsResult = await supabase
      .from("ad_bookings")
      .select("id, customer_id")
      .in("id", bookingIds);
    const bookings = (bookingsResult.data ?? []) as unknown as BookingRecord[];
    lookupError = bookingsResult.error?.message ?? null;
    const customerIds = [...new Set(bookings.map((b) => b.customer_id).filter((v): v is string => Boolean(v)))];
    const profileById = new Map<string, string>();

    if (customerIds.length > 0) {
      const profilesResult = await supabase
        .from("profiles")
        .select("id, full_name, company_name")
        .in("id", customerIds);
      const profiles = (profilesResult.data ?? []) as unknown as ProfileRecord[];
      lookupError = lookupError ?? profilesResult.error?.message ?? null;
      for (const profile of profiles) {
        profileById.set(profile.id, profile.full_name || profile.company_name || "Unknown client");
      }
    }

    clientByBooking = new Map(
      bookings.map((booking) => [
        booking.id,
        booking.customer_id ? profileById.get(booking.customer_id) ?? "Unknown client" : "Unknown client",
      ]),
    );
  }

  const rows: PaymentRow[] = payments.map((payment) => ({
    id: payment.id,
    bookingId: payment.booking_id,
    razorpayOrderId: payment.razorpay_order_id,
    razorpayPaymentId: payment.razorpay_payment_id,
    amountPaise: payment.amount_paise,
    status: payment.status,
    method: payment.method,
    errorDescription: payment.error_description,
    createdAt: payment.created_at,
    clientName: payment.booking_id ? clientByBooking.get(payment.booking_id) ?? "Unknown client" : "Unmatched",
  }));

  return (
    <div className="space-y-8">
      <PanelPageHeader
        eyebrow="Sales"
        title="Payments"
        description="Review captured, failed, refunded, and unmatched payment records."
      />
      <PaymentsClient
        payments={rows}
        bookingsHref="/sales/bookings"
        loadError={error?.message ?? lookupError}
      />
    </div>
  );
}
