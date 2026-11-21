import { notFound, redirect } from "next/navigation";
import CheckoutForm, {
  type CheckoutBillingPrefill,
  type CheckoutBooking,
} from "@/components/booking/CheckoutForm";
import { normalizeAdBooking } from "@/lib/ad-bookings";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ booking?: string | string[] }>;

type BillingRow = Record<string, unknown>;

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function normalizeCustomerType(value: unknown): "business" | "individual" {
  return value === "individual" ? "individual" : "business";
}

function prefillFromRow(
  row: BillingRow | null,
  profile: { full_name: string | null; company_name: string | null; phone: string | null } | null,
  accountEmail: string,
): CheckoutBillingPrefill {
  if (row) {
    return {
      customerType: normalizeCustomerType(row.customer_type),
      legalName: asString(row.legal_name),
      contactName: asString(row.contact_name),
      email: asString(row.email) || accountEmail,
      phone: asString(row.phone),
      addressLine1: asString(row.address_line1),
      addressLine2: asString(row.address_line2),
      city: asString(row.city),
      stateCode: asString(row.state_code),
      pincode: asString(row.pincode),
      gstin: asString(row.gstin),
      pan: asString(row.pan),
    };
  }

  return {
    customerType: "business",
    legalName: profile?.company_name ?? profile?.full_name ?? "",
    contactName: profile?.full_name ?? "",
    email: accountEmail,
    phone: profile?.phone ?? "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    stateCode: "",
    pincode: "",
    gstin: "",
    pan: "",
  };
}

function mapBooking(value: unknown): CheckoutBooking | null {
  const normalized = normalizeAdBooking(value);
  if (!normalized) return null;

  const row =
    typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  const paymentStatus = asString(row.payment_status).toLowerCase() || "unpaid";
  const gstPctRaw = row.gst_pct;
  const gstPct =
    typeof gstPctRaw === "number" && Number.isFinite(gstPctRaw)
      ? gstPctRaw
      : typeof gstPctRaw === "string" && gstPctRaw.trim()
        ? Number(gstPctRaw)
        : 0;

  return {
    id: normalized.id,
    status: normalized.status,
    paymentStatus,
    total: normalized.total,
    gstPct: Number.isFinite(gstPct) ? gstPct : 0,
    cityName: normalized.city,
    startDate: normalized.startDate,
    endDate: normalized.endDate,
    days: normalized.days,
    tier: normalized.tier,
    standardTotal: normalized.standardTotal,
    discountAmount: normalized.discountAmount,
    promoCode: normalized.promoCode,
    promoDiscount: normalized.promoDiscount,
    gstAmount: normalized.gstAmount,
    roundingAmount: normalized.roundingAmount,
    items: normalized.items.map((item) => ({
      id: item.id,
      name: item.name,
      type: item.type,
      quantity: item.quantity,
    })),
  };
}

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const bookingParam = params.booking;
  const bookingId = Array.isArray(bookingParam) ? bookingParam[0] : bookingParam;

  if (!bookingId) {
    redirect("/book/plan");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/book/plan?draft=${bookingId}`)}`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, company_name, phone")
    .eq("id", user.id)
    .maybeSingle();

  const role = typeof profile?.role === "string" ? profile.role : null;
  if (role !== "customer") {
    return (
      <div className="mx-auto max-w-xl rounded-3xl border border-[#e5e7eb] bg-white p-8 text-center">
        <h1 className="text-xl font-extrabold text-[#0f172a]">Customer account required</h1>
        <p className="mt-2 text-sm text-[#64748b]">Only customer accounts can book ads.</p>
      </div>
    );
  }

  const { data: bookingRow } = await supabase
    .from("ad_bookings")
    .select("*, ad_booking_items(*)")
    .eq("id", bookingId)
    .maybeSingle();

  if (!bookingRow) {
    notFound();
  }

  const booking = mapBooking(bookingRow);
  if (!booking) {
    notFound();
  }

  if (booking.paymentStatus === "paid") {
    redirect(`/book/done/${booking.id}`);
  }

  if (booking.status !== "draft") {
    return (
      <div className="mx-auto max-w-xl rounded-3xl border border-[#e5e7eb] bg-white p-8 text-center">
        <h1 className="text-xl font-extrabold text-[#0f172a]">This booking is not ready for checkout</h1>
        <p className="mt-2 text-sm text-[#64748b]">Only draft bookings can be paid from here.</p>
        <div className="mt-5 flex justify-center gap-3">
          <a href="/dashboard/plans" className="inline-flex h-10 items-center rounded-full bg-[#1d6fff] px-4 text-sm font-bold text-white">My Plans</a>
          <a href={`/book/done/${booking.id}`} className="inline-flex h-10 items-center rounded-full border border-[#dbe3ef] px-4 text-sm font-bold text-[#0f172a]">View booking</a>
        </div>
      </div>
    );
  }

  const { data: billingRow } = await supabase
    .from("ad_booking_billing")
    .select("*")
    .eq("customer_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const prefill = prefillFromRow(
    (billingRow as BillingRow | null) ?? null,
    {
      full_name: typeof profile?.full_name === "string" ? profile.full_name : null,
      company_name: typeof profile?.company_name === "string" ? profile.company_name : null,
      phone: typeof profile?.phone === "string" ? profile.phone : null,
    },
    user.email ?? "",
  );

  return (
    <CheckoutForm
      booking={booking}
      prefill={prefill}
      accountEmail={user.email ?? ""}
      prefilledFromPrevious={Boolean(billingRow)}
    />
  );
}
