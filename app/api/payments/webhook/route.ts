import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/server/supabase-admin";
import {
  capturePayment,
  verifyWebhookSignature,
} from "@/lib/server/razorpay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isMissingConfigError(error: unknown): boolean {
  return error instanceof Error && error.message === "Payments are not configured";
}

function isMissingAdminConfigError(error: unknown): boolean {
  return error instanceof Error && error.message === "Missing Supabase admin configuration";
}

type PaymentEntity = {
  id: string;
  order_id: string;
  amount: number;
  method: string | null;
  error_description: string | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

function parsePaymentEntity(value: unknown): PaymentEntity | null {
  const obj = asRecord(value);
  if (!obj) return null;
  const id = typeof obj.id === "string" ? obj.id : "";
  const orderId = typeof obj.order_id === "string" ? obj.order_id : "";
  const amount = typeof obj.amount === "number" && Number.isFinite(obj.amount) ? obj.amount : NaN;
  if (!id || !orderId || !Number.isFinite(amount)) return null;
  return {
    id,
    order_id: orderId,
    amount,
    method: typeof obj.method === "string" ? obj.method : null,
    error_description: typeof obj.error_description === "string" ? obj.error_description : null,
  };
}

function extractPaymentEntity(event: string, payload: unknown): PaymentEntity | null {
  const payloadObj = asRecord(payload);
  if (!payloadObj) return null;

  if (event === "payment.captured" || event === "payment.authorized" || event === "payment.failed") {
    const payment = asRecord(payloadObj.payment);
    return parsePaymentEntity(payment?.entity);
  }

  if (event === "order.paid") {
    const order = asRecord(payloadObj.order);
    const orderEntity = asRecord(order?.entity);
    const payments = asRecord(orderEntity?.payments);
    const items = Array.isArray(payments?.items) ? payments.items : [];
    for (const item of items) {
      const entity = parsePaymentEntity(asRecord(item)?.entity);
      if (entity) return entity;
    }
    const payment = asRecord(payloadObj.payment);
    return parsePaymentEntity(payment?.entity);
  }

  return null;
}

async function handleEvent(event: string, entity: PaymentEntity): Promise<void> {
  const admin = createAdminClient();

  if (event === "payment.captured" || event === "order.paid") {
    await admin.rpc("confirm_booking_payment", {
      p_order_id: entity.order_id,
      p_payment_id: entity.id,
      p_amount_paise: entity.amount,
      p_method: entity.method,
    });
    return;
  }

  if (event === "payment.authorized") {
    try {
      await capturePayment(entity.id, entity.amount);
    } catch {
      console.warn("Razorpay webhook capture failed");
      return;
    }
    await admin.rpc("confirm_booking_payment", {
      p_order_id: entity.order_id,
      p_payment_id: entity.id,
      p_amount_paise: entity.amount,
      p_method: entity.method,
    });
    return;
  }

  if (event === "payment.failed") {
    await admin.rpc("log_failed_payment", {
      p_order_id: entity.order_id,
      p_payment_id: entity.id,
      p_error: entity.error_description,
    });
  }
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-razorpay-signature");

    if (!signature || !verifyWebhookSignature(rawBody, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const obj = asRecord(parsed);
    const event = typeof obj?.event === "string" ? obj.event : "";
    const payload = obj?.payload;

    if (
      event === "payment.captured" ||
      event === "order.paid" ||
      event === "payment.authorized" ||
      event === "payment.failed"
    ) {
      const entity = extractPaymentEntity(event, payload);
      if (entity) {
        try {
          await handleEvent(event, entity);
        } catch {
          console.warn("Razorpay webhook processing failed");
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isMissingConfigError(error) || isMissingAdminConfigError(error)) {
      return NextResponse.json({ error: "Payments are not configured" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }
}
