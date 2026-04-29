import { createHmac } from "node:crypto";

import { env } from "@/config/env";

export class PaymentError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "PaymentError";
  }
}

export type CreateOrderInput = {
  amountInr: number;
  bookingId: string;
  receipt?: string;
};

export type CreateOrderResult = {
  orderId: string;
  keyId: string;
  amountPaise: number;
  currency: "INR";
  stub: boolean;
};

export type VerifySignatureInput = {
  orderId: string;
  paymentId: string;
  signature: string;
};

const RZP_BASE = "https://api.razorpay.com/v1";

function isStubMode(): boolean {
  if (env.NODE_ENV === "production") return false;
  return !env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET;
}

function basicAuthHeader(): string {
  const token = Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString("base64");
  return `Basic ${token}`;
}

export async function createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  const amountPaise = Math.round(input.amountInr * 100);
  if (amountPaise <= 0) throw new PaymentError(400, "amount must be > 0");

  if (isStubMode()) {
    console.log(`[payment-stub] createOrder bookingId=${input.bookingId} amount=${input.amountInr}`);
    return {
      orderId: `rzp_stub_${input.bookingId}`,
      keyId: env.RAZORPAY_KEY_ID ?? "rzp_stub_key",
      amountPaise,
      currency: "INR",
      stub: true,
    };
  }

  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
    throw new PaymentError(500, "razorpay not configured");
  }

  const res = await fetch(`${RZP_BASE}/orders`, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: amountPaise,
      currency: "INR",
      receipt: input.receipt ?? input.bookingId,
      notes: { bookingId: input.bookingId },
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new PaymentError(502, `razorpay createOrder failed: ${res.status} ${text}`);
  }
  const data = (await res.json()) as { id: string };
  return {
    orderId: data.id,
    keyId: env.RAZORPAY_KEY_ID,
    amountPaise,
    currency: "INR",
    stub: false,
  };
}

export function verifyPaymentSignature(input: VerifySignatureInput): boolean {
  if (isStubMode()) {
    console.log(`[payment-stub] verifyPaymentSignature orderId=${input.orderId} -> true`);
    return true;
  }
  if (!env.RAZORPAY_KEY_SECRET) {
    throw new PaymentError(500, "razorpay not configured");
  }
  const expected = createHmac("sha256", env.RAZORPAY_KEY_SECRET)
    .update(`${input.orderId}|${input.paymentId}`)
    .digest("hex");
  return timingSafeEqual(expected, input.signature);
}

export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  if (isStubMode()) {
    console.log("[payment-stub] verifyWebhookSignature -> true");
    return true;
  }
  if (!env.RAZORPAY_WEBHOOK_SECRET) {
    throw new PaymentError(500, "razorpay webhook secret not configured");
  }
  const expected = createHmac("sha256", env.RAZORPAY_WEBHOOK_SECRET).update(rawBody).digest("hex");
  return timingSafeEqual(expected, signature);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function refund(paymentId: string, amountInr?: number): Promise<{ id: string; stub: boolean }> {
  if (isStubMode()) {
    console.log(`[payment-stub] refund paymentId=${paymentId} amount=${amountInr ?? "full"}`);
    return { id: `rfnd_stub_${paymentId}`, stub: true };
  }
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
    throw new PaymentError(500, "razorpay not configured");
  }
  const body: Record<string, unknown> = {};
  if (amountInr) body.amount = Math.round(amountInr * 100);

  const res = await fetch(`${RZP_BASE}/payments/${paymentId}/refund`, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new PaymentError(502, `razorpay refund failed: ${res.status} ${text}`);
  }
  const data = (await res.json()) as { id: string };
  return { id: data.id, stub: false };
}
