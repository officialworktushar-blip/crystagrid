export interface RazorpayPaymentResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name?: string;
  description?: string;
  order_id: string;
  handler?: (response: RazorpayPaymentResponse) => void;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
  theme?: {
    color?: string;
  };
  modal?: {
    ondismiss?: () => void;
  };
}

interface RazorpayInstance {
  open: () => void;
  on: (event: string, handler: (response: unknown) => void) => void;
}

interface RazorpayConstructor {
  new (options: RazorpayOptions): RazorpayInstance;
}

type RazorpayWindow = Window & {
  Razorpay?: RazorpayConstructor;
};

let loadPromise: Promise<boolean> | null = null;

function getRazorpayWindow(): RazorpayWindow {
  return window as unknown as RazorpayWindow;
}

export function loadRazorpay(): Promise<boolean> {
  if (typeof window === "undefined") {
    return Promise.resolve(false);
  }

  const razorpayWindow = getRazorpayWindow();
  if (typeof razorpayWindow.Razorpay !== "undefined") {
    return Promise.resolve(true);
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = new Promise<boolean>((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]',
    );

    if (existing) {
      if (typeof razorpayWindow.Razorpay !== "undefined") {
        resolve(true);
        return;
      }
      existing.addEventListener("load", () => resolve(true), { once: true });
      existing.addEventListener("error", () => resolve(false), { once: true });
      window.setTimeout(() => resolve(typeof razorpayWindow.Razorpay !== "undefined"), 10000);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(typeof razorpayWindow.Razorpay !== "undefined");
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
    window.setTimeout(() => resolve(typeof razorpayWindow.Razorpay !== "undefined"), 10000);
  }).then((loaded) => {
    if (!loaded) {
      loadPromise = null;
    }
    return loaded;
  });

  return loadPromise;
}

export function openRazorpay(options: RazorpayOptions): {
  on: (event: string, handler: (response: unknown) => void) => void;
} {
  const razorpayWindow = getRazorpayWindow();
  const RazorpayCtor = razorpayWindow.Razorpay;
  if (typeof RazorpayCtor === "undefined") {
    throw new Error("Razorpay checkout is not available");
  }

  const instance = new RazorpayCtor(options);
  instance.open();

  return {
    on: (event: string, handler: (response: unknown) => void) => {
      instance.on(event, handler);
    },
  };
}
