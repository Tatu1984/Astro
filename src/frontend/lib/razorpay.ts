import type { RazorpayCheckoutOptions, RazorpayCheckoutResponse } from "@/shared/types/payment";

declare global {
  interface Window {
    Razorpay?: new (opts: RazorpayInternalOptions) => { open: () => void };
  }
}

type RazorpayInternalOptions = RazorpayCheckoutOptions & {
  handler: (response: RazorpayCheckoutResponse) => void;
  modal?: { ondismiss?: () => void };
};

let scriptPromise: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("not in browser"));
  if (window.Razorpay) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      scriptPromise = null;
      reject(new Error("failed to load razorpay script"));
    };
    document.head.appendChild(s);
  });
  return scriptPromise;
}

const DEFAULT_THEME = { color: "#7C5CFF" };

export async function openRazorpayCheckout(
  options: RazorpayCheckoutOptions,
): Promise<RazorpayCheckoutResponse> {
  await loadScript();
  if (!window.Razorpay) throw new Error("razorpay unavailable");
  return new Promise<RazorpayCheckoutResponse>((resolve, reject) => {
    const rzp = new window.Razorpay!({
      theme: DEFAULT_THEME,
      ...options,
      handler: (response) => resolve(response),
      modal: { ondismiss: () => reject(new Error("payment cancelled")) },
    });
    rzp.open();
  });
}

export type { RazorpayCheckoutOptions, RazorpayCheckoutResponse };
