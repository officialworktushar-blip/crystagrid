import { createHmac, timingSafeEqual } from "node:crypto";

export interface RazorpayOrder {
  id: string;
  status: string;
  amount: number;
  currency: string;
}

export interface RazorpayPayment {
  id: string;
  status: string;
  amount: number;
  currency: string;
  order_id: string;
  method?: string | null;
  error_description?: string | null;
}

export interface RazorpayRequestError extends Error {
  status?: number;
}

function getCredentials(): { keyId: string; keySecret: string } {
  const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new Error("Payments are not configured");
  }
  return { keyId, keySecret };
}

function getWebhookSecret(): string {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("Payments are not configured");
  }
  return secret;
}

function authHeader(): string {
  const { keyId, keySecret } = getCredentials();
  const encoded = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  return `Basic ${encoded}`;
}

function makeRequestError(status: number): RazorpayRequestError {
  const error: RazorpayRequestError = new Error("Razorpay request failed");
  error.status = status;
  return error;
}

async function razorpayFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`https://api.razorpay.com/v1${path}`, {
      ...init,
      headers: {
        Authorization: authHeader(),
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
    });
  } catch {
    throw new Error("Razorpay request failed");
  }

  if (!response.ok) {
    throw makeRequestError(response.status);
  }

  return (await response.json()) as T;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function asNullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function parseOrder(data: unknown): RazorpayOrder {
  const obj = typeof data === "object" && data !== null ? (data as Record<string, unknown>) : {};
  return {
    id: asString(obj.id),
    status: asString(obj.status),
    amount: asNumber(obj.amount),
    currency: asString(obj.currency),
  };
}

function parsePayment(data: unknown): RazorpayPayment {
  const obj = typeof data === "object" && data !== null ? (data as Record<string, unknown>) : {};
  return {
    id: asString(obj.id),
    status: asString(obj.status),
    amount: asNumber(obj.amount),
    currency: asString(obj.currency),
    order_id: asString(obj.order_id),
    method: asNullableString(obj.method),
    error_description: asNullableString(obj.error_description),
  };
}

export async function createOrder(input: {
  amountPaise: number;
  receipt: string;
  notes: Record<string, string>;
}): Promise<RazorpayOrder> {
  const data = await razorpayFetch<unknown>("/orders", {
    method: "POST",
    body: JSON.stringify({
      amount: input.amountPaise,
      currency: "INR",
      receipt: input.receipt,
      notes: input.notes,
    }),
  });
  return parseOrder(data);
}

export async function getPayment(id: string): Promise<RazorpayPayment> {
  const data = await razorpayFetch<unknown>(`/payments/${encodeURIComponent(id)}`);
  return parsePayment(data);
}

export async function capturePayment(
  id: string,
  amountPaise: number,
): Promise<RazorpayPayment> {
  const data = await razorpayFetch<unknown>(
    `/payments/${encodeURIComponent(id)}/capture`,
    {
      method: "POST",
      body: JSON.stringify({
        amount: amountPaise,
        currency: "INR",
      }),
    },
  );
  return parsePayment(data);
}

function safeHexEqual(expectedHex: string, receivedHex: string): boolean {
  const expected = Buffer.from(expectedHex, "hex");
  const received = Buffer.from(receivedHex, "hex");
  if (expected.length === 0 || received.length === 0) {
    return false;
  }
  if (expected.length !== received.length) {
    return false;
  }
  return timingSafeEqual(expected, received);
}

export function verifyCheckoutSignature(
  orderId: string,
  paymentId: string,
  signature: string,
): boolean {
  const { keySecret } = getCredentials();
  const payload = `${orderId}|${paymentId}`;
  const expected = createHmac("sha256", keySecret).update(payload).digest("hex");
  return safeHexEqual(expected, signature);
}

export function verifyWebhookSignature(
  rawBody: string,
  signature: string,
): boolean {
  const secret = getWebhookSecret();
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeHexEqual(expected, signature);
}
