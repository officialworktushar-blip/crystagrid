import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/server/supabase-admin";
import { createOrder } from "@/lib/server/razorpay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isMissingConfigError(error: unknown): boolean {
  return error instanceof Error && error.message === "Payments are not configured";
}

function isMissingAdminConfigError(error: unknown): boolean {
  return error instanceof Error && error.message === "Missing Supabase admin configuration";
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as
      | { bookingId?: unknown }
      | null;
    const bookingId = typeof body?.bookingId === "string" ? body.bookingId.trim() : "";

    if (!bookingId) {
      return NextResponse.json({ error: "Booking id is required" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: booking, error: bookingError } = await supabase
      .from("ad_bookings")
      .select("id, customer_id, status, payment_status, total")
      .eq("id", bookingId)
      .maybeSingle();

    if (bookingError || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (booking.status !== "draft") {
      return NextResponse.json({ error: "Booking is not ready for payment" }, { status: 400 });
    }

    if (booking.payment_status !== "unpaid") {
      return NextResponse.json({ error: "Booking is not payable" }, { status: 400 });
    }

    const total = typeof booking.total === "number" ? booking.total : Number(booking.total);
    if (!Number.isFinite(total) || total <= 0) {
      return NextResponse.json({ error: "Booking total is invalid" }, { status: 400 });
    }

    const { data: billing, error: billingError } = await supabase
      .from("ad_booking_billing")
      .select("booking_id")
      .eq("booking_id", bookingId)
      .maybeSingle();

    if (billingError || !billing) {
      return NextResponse.json(
        { error: "Please complete your billing details first" },
        { status: 400 },
      );
    }

    const amountPaise = Math.round(total * 100);
    const receipt = `CG${bookingId.replace(/-/g, "").slice(0, 8)}${Date.now().toString(36)}`.slice(
      0,
      40,
    );

    const order = await createOrder({
      amountPaise,
      receipt,
      notes: {
        booking_id: bookingId,
        customer_id: user.id,
      },
    });

    if (!order.id) {
      return NextResponse.json(
        { error: "Could not start the payment. Please try again." },
        { status: 502 },
      );
    }

    const admin = createAdminClient();
    const { error: updateError } = await admin
      .from("ad_bookings")
      .update({
        razorpay_order_id: order.id,
        razorpay_amount_paise: amountPaise,
      })
      .eq("id", bookingId)
      .eq("payment_status", "unpaid");

    if (updateError) {
      return NextResponse.json(
        { error: "Could not start the payment. Please try again." },
        { status: 502 },
      );
    }

    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    if (!keyId) {
      return NextResponse.json({ error: "Payments are not configured" }, { status: 500 });
    }

    return NextResponse.json({
      orderId: order.id,
      amount: amountPaise,
      currency: "INR",
      keyId,
    });
  } catch (error) {
    if (isMissingConfigError(error) || isMissingAdminConfigError(error)) {
      return NextResponse.json({ error: "Payments are not configured" }, { status: 500 });
    }
    return NextResponse.json(
      { error: "Could not start the payment. Please try again." },
      { status: 502 },
    );
  }
}
