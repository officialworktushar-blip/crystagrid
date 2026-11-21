import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/server/supabase-admin";
import {
  capturePayment,
  getPayment,
  verifyCheckoutSignature,
} from "@/lib/server/razorpay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isMissingConfigError(error: unknown): boolean {
  return error instanceof Error && error.message === "Payments are not configured";
}

function isMissingAdminConfigError(error: unknown): boolean {
  return error instanceof Error && error.message === "Missing Supabase admin configuration";
}

type VerifyBody = {
  razorpay_order_id?: unknown;
  razorpay_payment_id?: unknown;
  razorpay_signature?: unknown;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as VerifyBody | null;
    const orderId =
      typeof body?.razorpay_order_id === "string" ? body.razorpay_order_id.trim() : "";
    const paymentId =
      typeof body?.razorpay_payment_id === "string" ? body.razorpay_payment_id.trim() : "";
    const signature =
      typeof body?.razorpay_signature === "string" ? body.razorpay_signature.trim() : "";

    if (!orderId || !paymentId || !signature) {
      return NextResponse.json({ error: "Invalid payment data" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!verifyCheckoutSignature(orderId, paymentId, signature)) {
      return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: booking, error: bookingError } = await admin
      .from("ad_bookings")
      .select("id, customer_id, razorpay_amount_paise")
      .eq("razorpay_order_id", orderId)
      .maybeSingle();

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: "We could not match this payment. Please contact support with your payment id." },
        { status: 409 },
      );
    }

    if (booking.customer_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const expectedAmount =
      typeof booking.razorpay_amount_paise === "number"
        ? booking.razorpay_amount_paise
        : Number(booking.razorpay_amount_paise);
    if (!Number.isFinite(expectedAmount) || expectedAmount <= 0) {
      return NextResponse.json(
        { error: "We could not match this payment. Please contact support with your payment id." },
        { status: 409 },
      );
    }

    let payment = await getPayment(paymentId);
    if (
      payment.order_id !== orderId ||
      payment.amount !== expectedAmount ||
      payment.currency !== "INR"
    ) {
      return NextResponse.json(
        { error: "We could not match this payment. Please contact support with your payment id." },
        { status: 409 },
      );
    }

    if (payment.status === "authorized") {
      payment = await capturePayment(paymentId, expectedAmount);
    }

    if (payment.status !== "captured") {
      return NextResponse.json({ error: "Payment is not completed" }, { status: 402 });
    }

    const { data: confirmResult, error: confirmError } = await admin.rpc(
      "confirm_booking_payment",
      {
        p_order_id: orderId,
        p_payment_id: paymentId,
        p_amount_paise: expectedAmount,
        p_method: payment.method ?? null,
      },
    );

    if (confirmError) {
      return NextResponse.json(
        { error: "We could not match this payment. Please contact support with your payment id." },
        { status: 409 },
      );
    }

    if (confirmResult === "confirmed" || confirmResult === "already_confirmed") {
      return NextResponse.json({ ok: true, bookingId: booking.id });
    }

    return NextResponse.json(
      { error: "We could not match this payment. Please contact support with your payment id." },
      { status: 409 },
    );
  } catch (error) {
    if (isMissingConfigError(error) || isMissingAdminConfigError(error)) {
      return NextResponse.json({ error: "Payments are not configured" }, { status: 500 });
    }
    return NextResponse.json({ error: "Could not verify payment" }, { status: 502 });
  }
}
