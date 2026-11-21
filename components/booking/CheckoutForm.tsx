"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Lock,
  ShieldCheck,
} from "lucide-react";
import {
  GST_STATES,
  gstinChecksumOk,
  isValidEmail,
  isValidGstinFormat,
  isValidPan,
  isValidPhone,
  isValidPin,
  normalizeId,
  panFromGstin,
  stateFromGstin,
} from "@/lib/gst";
import { formatINR } from "@/lib/ads";
import { loadRazorpay, openRazorpay } from "@/lib/razorpay-client";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type CustomerType = "business" | "individual";

export type CheckoutBooking = {
  id: string;
  status: string;
  paymentStatus: string;
  total: number;
  gstPct: number;
  cityName: string | null;
  startDate: string | null;
  endDate: string | null;
  days: number;
  tier: string | null;
  standardTotal: number;
  discountAmount: number;
  promoCode: string | null;
  promoDiscount: number;
  gstAmount: number;
  roundingAmount: number;
  items: {
    id: string;
    name: string;
    type: "package" | "property" | null;
    quantity: number;
  }[];
};

export type CheckoutBillingPrefill = {
  customerType: CustomerType;
  legalName: string;
  contactName: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  stateCode: string;
  pincode: string;
  gstin: string;
  pan: string;
};

type QuoteTotals = {
  total: number;
  standardTotal: number;
  onlineDiscount: number;
  promoDiscount: number;
  gstPct: number;
  gstAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  gstType: "cgst_sgst" | "igst" | null;
  rounding: number;
  changed: boolean;
};

type FieldErrors = Partial<Record<string, string>>;

const inputClass =
  "h-11 w-full rounded-2xl border border-[#dbe3ef] bg-white px-4 text-sm font-medium text-[#0f172a] outline-none transition placeholder:text-[#94a3b8] focus:border-[#1d6fff] focus:ring-4 focus:ring-[#dbeafe] disabled:bg-[#f8fafc]";

function toStringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function toNumberValue(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function normalizePhoneInput(value: string): string {
  let digits = value.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) {
    digits = digits.slice(2);
  }
  return digits.slice(0, 10);
}

function formatDateLabel(value: string | null): string {
  if (!value) return "Date pending";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!m) return value;
  const date = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  })
    .format(date)
    .replace(/,/g, "");
}

function Stepper() {
  const steps = [
    { n: 1, label: "Plan", done: true },
    { n: 2, label: "Checkout", active: true },
    { n: 3, label: "Done", done: false },
  ];
  return (
    <ol className="mx-auto flex w-full max-w-md items-start">
      {steps.map((step, index) => (
        <li
          key={step.n}
          className={cn(
            "relative flex flex-1 flex-col items-center",
            index < steps.length - 1 &&
              "after:absolute after:left-1/2 after:top-4 after:h-px after:w-full after:bg-[#dbe3ef] after:content-['']",
          )}
        >
          <span
            className={cn(
              "relative z-10 flex h-8 w-8 items-center justify-center rounded-full border text-xs font-bold",
              step.done && "border-[#1d6fff] bg-[#1d6fff] text-white",
              step.active &&
                "border-[#1d6fff] bg-white text-[#1d6fff] ring-4 ring-[#dbeafe]",
              !step.done &&
                !step.active &&
                "border-[#dbe3ef] bg-white text-[#94a3b8]",
            )}
          >
            {step.done ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : step.n}
          </span>
          <span
            className={cn(
              "relative z-10 mt-2 bg-[#f8fafc] px-2 text-[11px] font-semibold uppercase tracking-[0.12em]",
              step.done || step.active ? "text-[#0f172a]" : "text-[#94a3b8]",
            )}
          >
            {step.label}
          </span>
        </li>
      ))}
    </ol>
  );
}

function Field({
  id,
  label,
  error,
  children,
  hint,
}: {
  id: string;
  label: ReactNode;
  error?: string;
  children: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-semibold text-[#0f172a]">
        {label}
      </label>
      {children}
      {hint ? <p className="mt-1.5 text-xs text-[#64748b]">{hint}</p> : null}
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-xs font-medium text-[#dc2626]">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function SummaryRow({
  label,
  value,
  tone = "default",
}: {
  label: ReactNode;
  value: ReactNode;
  tone?: "default" | "success" | "muted";
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-[#64748b]">{label}</span>
      <span
        className={cn(
          "font-semibold tabular-nums",
          tone === "success" && "text-[#16a34a]",
          tone === "muted" && "text-[#94a3b8]",
          tone === "default" && "text-[#0f172a]",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function parsePrepareCheckout(value: unknown): QuoteTotals | null {
  if (typeof value !== "object" || value === null) return null;
  const obj = value as Record<string, unknown>;
  const quote = obj.quote;
  const q = typeof quote === "object" && quote !== null ? (quote as Record<string, unknown>) : null;
  const gstTypeRaw = toStringValue(obj.gst_type);
  const gstType =
    gstTypeRaw === "cgst_sgst" || gstTypeRaw === "igst" ? gstTypeRaw : null;
  return {
    total: toNumberValue(q?.total ?? obj.total, 0),
    standardTotal: toNumberValue(q?.standard_total ?? q?.standardTotal, 0),
    onlineDiscount: toNumberValue(q?.online_discount ?? q?.onlineDiscount, 0),
    promoDiscount: toNumberValue(q?.promo_discount ?? q?.promoDiscount, 0),
    gstPct: toNumberValue(q?.gst_pct ?? q?.gstPct, 0),
    gstAmount: toNumberValue(q?.gst_amount ?? q?.gstAmount, 0),
    cgst: toNumberValue(obj.cgst, 0),
    sgst: toNumberValue(obj.sgst, 0),
    igst: toNumberValue(obj.igst, 0),
    gstType,
    rounding: toNumberValue(q?.rounding, 0),
    changed: Boolean(obj.changed),
  };
}

export default function CheckoutForm({
  booking,
  prefill,
  accountEmail,
  prefilledFromPrevious,
}: {
  booking: CheckoutBooking;
  prefill: CheckoutBillingPrefill;
  accountEmail: string;
  prefilledFromPrevious: boolean;
}) {
  const router = useRouter();
  const [customerType, setCustomerType] = useState<CustomerType>(prefill.customerType);
  const [legalName, setLegalName] = useState(prefill.legalName);
  const [contactName, setContactName] = useState(prefill.contactName);
  const [email, setEmail] = useState(prefill.email || accountEmail);
  const [phone, setPhone] = useState(normalizePhoneInput(prefill.phone));
  const [addressLine1, setAddressLine1] = useState(prefill.addressLine1);
  const [addressLine2, setAddressLine2] = useState(prefill.addressLine2);
  const [city, setCity] = useState(prefill.city);
  const [stateCode, setStateCode] = useState(prefill.stateCode);
  const [pincode, setPincode] = useState(prefill.pincode);
  const [hasGstin, setHasGstin] = useState(Boolean(prefill.gstin));
  const [gstin, setGstin] = useState(prefill.gstin);
  const [pan, setPan] = useState(prefill.pan);
  const [confirm, setConfirm] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<"idle" | "preparing" | "paying" | "verifying">("idle");
  const [banner, setBanner] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [quote, setQuote] = useState<QuoteTotals>({
    total: booking.total,
    standardTotal: booking.standardTotal,
    onlineDiscount: booking.discountAmount,
    promoDiscount: booking.promoDiscount,
    gstPct: booking.gstPct,
    gstAmount: booking.gstAmount,
    cgst: 0,
    sgst: 0,
    igst: 0,
    gstType: null,
    rounding: booking.roundingAmount,
    changed: false,
  });

  const fieldRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    if (!hasGstin) return;
    const g = normalizeId(gstin);
    if (g.length !== 15) return;
    if (!gstinChecksumOk(g) || !isValidGstinFormat(g)) return;
    const derivedPan = panFromGstin(g);
    if (!pan.trim()) {
      setPan(derivedPan);
    }
  }, [gstin, hasGstin, pan]);

  const gstinValue = normalizeId(gstin);
  const panValue = normalizeId(pan);
  const gstinFormatOk = gstinValue.length === 0 ? false : isValidGstinFormat(gstinValue);
  const gstinChecksum = gstinFormatOk ? gstinChecksumOk(gstinValue) : false;
  const gstinState = gstinValue.length >= 2 ? stateFromGstin(gstinValue) : "";
  const gstinStateMatches = !stateCode || !gstinState ? true : gstinState === stateCode;
  const gstinValid = hasGstin && gstinFormatOk && gstinChecksum && gstinStateMatches;
  const panFromGstinValue = gstinValid ? panFromGstin(gstinValue) : "";
  const panMatchesGstin = !gstinValid || !panValue ? true : panValue === panFromGstinValue;

  const busy = status !== "idle";

  const validate = (): FieldErrors => {
    const next: FieldErrors = {};
    if (!legalName.trim()) next.legalName = customerType === "business" ? "Company name is required." : "Full name is required.";
    if (!isValidEmail(email)) next.email = "Enter a valid email address.";
    if (!isValidPhone(phone)) next.phone = "Enter a valid 10-digit mobile number.";
    if (!addressLine1.trim()) next.addressLine1 = "Address line 1 is required.";
    if (!city.trim()) next.city = "City is required.";
    if (!stateCode) next.stateCode = "Select a state.";
    if (!isValidPin(pincode.trim())) next.pincode = "Enter a valid 6-digit PIN code.";
    if (hasGstin) {
      const g = normalizeId(gstin);
      if (!g) next.gstin = "Enter your GSTIN or untick this option.";
      else if (!isValidGstinFormat(g)) next.gstin = "Enter a valid GSTIN.";
      else if (!gstinChecksumOk(g)) next.gstin = "GSTIN checksum is invalid.";
      else if (stateCode && stateFromGstin(g) !== stateCode) next.gstin = `GSTIN state code ${stateFromGstin(g)} does not match the selected state.`;
    }
    const p = normalizeId(pan);
    if (customerType === "business" && !p) next.pan = "PAN is required for business bookings.";
    if (p && !isValidPan(p)) next.pan = "Enter a valid PAN.";
    if (hasGstin && gstinValid && p && isValidPan(p) && p !== panFromGstin(gstinValue)) {
      next.pan = "PAN does not match the GSTIN.";
    }
    if (!confirm) next.confirm = "Please confirm the details before paying.";
    return next;
  };

  const focusFirstError = (nextErrors: FieldErrors) => {
    const keys = ["legalName", "email", "phone", "addressLine1", "city", "stateCode", "pincode", "gstin", "pan", "confirm"];
    for (const key of keys) {
      if (nextErrors[key]) {
        const el = fieldRefs.current[key];
        if (el) {
          el.focus();
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        break;
      }
    }
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    setBanner(null);
    setActionError(null);
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      focusFirstError(nextErrors);
      return;
    }

    setStatus("preparing");
    try {
      const supabase = createClient();
      const normalizedGstin = hasGstin ? normalizeId(gstin) : "";
      const normalizedPan = normalizeId(pan);
      const billing = {
        customer_type: customerType,
        legal_name: legalName.trim(),
        contact_name: contactName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        address_line1: addressLine1.trim(),
        address_line2: addressLine2.trim(),
        city: city.trim(),
        state_code: stateCode,
        pincode: pincode.trim(),
        gstin: normalizedGstin ? normalizedGstin : null,
        pan: normalizedPan ? normalizedPan : null,
      };

      const { data: prepData, error: prepError } = await supabase.rpc("prepare_checkout", {
        p_booking: booking.id,
        p_billing: billing,
      });
      if (prepError) {
        setActionError(prepError.message || "Could not prepare checkout.");
        setStatus("idle");
        return;
      }

      const prepared = parsePrepareCheckout(prepData);
      if (prepared) {
        setQuote(prepared);
        if (prepared.changed) {
          setBanner(`Prices were updated. The new total is ${formatINR(prepared.total)}. Please review and click Pay again.`);
          setStatus("idle");
          return;
        }
      }

      const createRes = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: booking.id }),
      });
      const createJson = (await createRes.json().catch(() => null)) as
        | { orderId?: string; amount?: number; currency?: string; keyId?: string; error?: string }
        | null;
      if (!createRes.ok || !createJson?.orderId || !createJson.keyId || !createJson.amount) {
        setActionError(createJson?.error || "Could not start the payment. Please try again.");
        setStatus("idle");
        return;
      }

      const loaded = await loadRazorpay();
      if (!loaded) {
        setActionError("Could not load the payment window. Check your internet connection.");
        setStatus("idle");
        return;
      }

      setStatus("paying");
      openRazorpay({
        key: createJson.keyId,
        amount: createJson.amount,
        currency: createJson.currency ?? "INR",
        order_id: createJson.orderId,
        name: "Crystagrid",
        description: `Ad campaign in ${booking.cityName ?? "Dehradun"}`,
        prefill: {
          name: contactName.trim() || legalName.trim(),
          email: email.trim(),
          contact: `+91${phone.trim()}`,
        },
        notes: { booking_id: booking.id },
        theme: { color: "#1d6fff" },
        modal: {
          ondismiss: () => {
            setStatus("idle");
            setActionError("Payment window closed. You can try again.");
          },
        },
        handler: async (response) => {
          setStatus("verifying");
          try {
            const verifyRes = await fetch("/api/payments/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });
            const verifyJson = (await verifyRes.json().catch(() => null)) as
              | { ok?: boolean; bookingId?: string; error?: string }
              | null;
            if (verifyRes.ok && verifyJson?.ok) {
              router.replace(`/book/done/${booking.id}?paid=1`);
              return;
            }
            setActionError(
              verifyJson?.error ||
                "We could not confirm your payment. If money was deducted, it will be matched automatically. You can also contact us with your payment id.",
            );
            setStatus("idle");
          } catch {
            setActionError(
              "We could not confirm your payment. If money was deducted, it will be matched automatically. You can also contact us with your payment id.",
            );
            setStatus("idle");
          }
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not start payment.";
      setActionError(message);
      setStatus("idle");
    }
  };

  const gstLabel = useMemo(() => {
    if (!stateCode) return null;
    if (quote.gstType === "cgst_sgst") {
      return `CGST ${formatINR(quote.cgst)} + SGST ${formatINR(quote.sgst)}`;
    }
    if (quote.gstType === "igst") {
      return `IGST ${formatINR(quote.igst)}`;
    }
    return null;
  }, [quote.cgst, quote.gstType, quote.igst, quote.sgst, stateCode]);

  const payLabel = status === "preparing" ? "Preparing..." : status === "paying" ? "Opening payment..." : status === "verifying" ? "Confirming..." : `Pay ${formatINR(quote.total)} securely`;

  return (
    <div className="flex flex-1 flex-col">
      {status === "verifying" ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f172a]/50 px-4" aria-live="polite" role="status">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#eff6ff] text-[#1d6fff]">
              <ShieldCheck className="h-6 w-6" aria-hidden="true" />
            </div>
            <h2 className="mt-4 text-lg font-extrabold text-[#0f172a]">Confirming your payment...</h2>
            <p className="mt-2 text-sm text-[#64748b]">Please do not close this page.</p>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href={`/book/plan?draft=${booking.id}`} className="inline-flex items-center gap-2 text-sm font-semibold text-[#64748b] transition hover:text-[#0f172a]">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to plan
        </Link>
        {prefilledFromPrevious ? (
          <span className="rounded-full bg-[#eff6ff] px-3 py-1 text-xs font-bold text-[#1d6fff]">Filled from your previous booking</span>
        ) : null}
      </div>

      <div className="mt-6">
        <Stepper />
      </div>

      <form onSubmit={onSubmit} className="mt-8 grid items-start gap-6 lg:grid-cols-12" noValidate>
        <div className="space-y-5 lg:col-span-7">
          {banner ? (
            <div className="rounded-2xl border border-[#bfdbfe] bg-[#eff6ff] px-4 py-3 text-sm font-medium text-[#1d4ed8]" role="status" aria-live="polite">
              {banner}
            </div>
          ) : null}
          {actionError ? (
            <div className="rounded-2xl border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-sm font-medium text-[#b91c1c]" role="alert" aria-live="polite">
              {actionError}
            </div>
          ) : null}

          <section className="rounded-3xl border border-[#e5e7eb] bg-white p-5 shadow-[0_24px_70px_-60px_rgba(15,23,42,0.4)] sm:p-6">
            <h2 className="text-base font-extrabold text-[#0f172a]">Who is booking?</h2>
            <div className="mt-4 inline-flex rounded-full border border-[#dbe3ef] bg-[#f8fafc] p-1">
              {(["business", "individual"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setCustomerType(type)}
                  className={cn(
                    "rounded-full px-4 py-2 text-sm font-bold transition",
                    customerType === type ? "bg-white text-[#0f172a] shadow-sm" : "text-[#64748b]",
                  )}
                >
                  {type === "business" ? "Business" : "Individual"}
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-[#e5e7eb] bg-white p-5 shadow-[0_24px_70px_-60px_rgba(15,23,42,0.4)] sm:p-6">
            <h2 className="text-base font-extrabold text-[#0f172a]">Billing details</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field id="legalName" label={customerType === "business" ? "Company name" : "Full name"} error={errors.legalName}>
                <input
                  ref={(el) => { fieldRefs.current.legalName = el; }}
                  id="legalName"
                  className={inputClass}
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  autoComplete={customerType === "business" ? "organization" : "name"}
                  aria-invalid={Boolean(errors.legalName)}
                  aria-describedby={errors.legalName ? "legalName-error" : undefined}
                  disabled={busy}
                />
              </Field>
              <Field id="contactName" label="Contact person (optional)">
                <input
                  id="contactName"
                  className={inputClass}
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  autoComplete="name"
                  disabled={busy}
                />
              </Field>
              <Field id="email" label="Email" error={errors.email}>
                <input
                  ref={(el) => { fieldRefs.current.email = el; }}
                  id="email"
                  type="email"
                  className={inputClass}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? "email-error" : undefined}
                  disabled={busy}
                />
              </Field>
              <Field id="phone" label="Mobile number" error={errors.phone}>
                <div className="flex">
                  <span className="inline-flex h-11 items-center rounded-l-2xl border border-r-0 border-[#dbe3ef] bg-[#f8fafc] px-3 text-sm font-semibold text-[#64748b]">+91</span>
                  <input
                    ref={(el) => { fieldRefs.current.phone = el; }}
                    id="phone"
                    inputMode="numeric"
                    className={cn(inputClass, "rounded-l-none")}
                    value={phone}
                    onChange={(e) => setPhone(normalizePhoneInput(e.target.value))}
                    autoComplete="tel-national"
                    maxLength={10}
                    aria-invalid={Boolean(errors.phone)}
                    aria-describedby={errors.phone ? "phone-error" : undefined}
                    disabled={busy}
                  />
                </div>
              </Field>
              <div className="sm:col-span-2">
                <Field id="addressLine1" label="Address line 1" error={errors.addressLine1}>
                  <input
                    ref={(el) => { fieldRefs.current.addressLine1 = el; }}
                    id="addressLine1"
                    className={inputClass}
                    value={addressLine1}
                    onChange={(e) => setAddressLine1(e.target.value)}
                    autoComplete="address-line1"
                    aria-invalid={Boolean(errors.addressLine1)}
                    aria-describedby={errors.addressLine1 ? "addressLine1-error" : undefined}
                    disabled={busy}
                  />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field id="addressLine2" label="Address line 2 (optional)">
                  <input
                    id="addressLine2"
                    className={inputClass}
                    value={addressLine2}
                    onChange={(e) => setAddressLine2(e.target.value)}
                    autoComplete="address-line2"
                    disabled={busy}
                  />
                </Field>
              </div>
              <Field id="city" label="City" error={errors.city}>
                <input
                  ref={(el) => { fieldRefs.current.city = el; }}
                  id="city"
                  className={inputClass}
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  autoComplete="address-level2"
                  aria-invalid={Boolean(errors.city)}
                  aria-describedby={errors.city ? "city-error" : undefined}
                  disabled={busy}
                />
              </Field>
              <Field id="stateCode" label="State" error={errors.stateCode}>
                <select
                  ref={(el) => { fieldRefs.current.stateCode = el; }}
                  id="stateCode"
                  className={inputClass}
                  value={stateCode}
                  onChange={(e) => setStateCode(e.target.value)}
                  autoComplete="address-level1"
                  aria-invalid={Boolean(errors.stateCode)}
                  aria-describedby={errors.stateCode ? "stateCode-error" : undefined}
                  disabled={busy}
                >
                  <option value="">Select state</option>
                  {GST_STATES.map((s) => (
                    <option key={s.code} value={s.code}>{s.name} ({s.code})</option>
                  ))}
                </select>
              </Field>
              <Field id="pincode" label="PIN code" error={errors.pincode}>
                <input
                  ref={(el) => { fieldRefs.current.pincode = el; }}
                  id="pincode"
                  inputMode="numeric"
                  className={inputClass}
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  autoComplete="postal-code"
                  maxLength={6}
                  aria-invalid={Boolean(errors.pincode)}
                  aria-describedby={errors.pincode ? "pincode-error" : undefined}
                  disabled={busy}
                />
              </Field>
            </div>
          </section>

          <section className="rounded-3xl border border-[#e5e7eb] bg-white p-5 shadow-[0_24px_70px_-60px_rgba(15,23,42,0.4)] sm:p-6">
            <h2 className="text-base font-extrabold text-[#0f172a]">GST and PAN</h2>
            <label className="mt-4 flex items-start gap-3 text-sm text-[#334155]">
              <input
                type="checkbox"
                checked={hasGstin}
                onChange={(e) => {
                  setHasGstin(e.target.checked);
                  if (!e.target.checked) setGstin("");
                }}
                className="mt-0.5 h-4 w-4 rounded border-[#cbd5e1] text-[#1d6fff]"
                disabled={busy}
              />
              <span>I have a GST number (GSTIN)</span>
            </label>

            {hasGstin ? (
              <div className="mt-4 space-y-4">
                <Field
                  id="gstin"
                  label="GSTIN"
                  error={errors.gstin}
                  hint={
                    gstinValid ? (
                      <span className="text-[#16a34a]">GSTIN looks valid.</span>
                    ) : !stateCode && gstinFormatOk && gstinChecksum ? (
                      <button
                        type="button"
                        className="font-semibold text-[#1d6fff]"
                        onClick={() => setStateCode(stateFromGstin(gstinValue))}
                        disabled={busy}
                      >
                        Use state from GSTIN
                      </button>
                    ) : undefined
                  }
                >
                  <input
                    ref={(el) => { fieldRefs.current.gstin = el; }}
                    id="gstin"
                    className={cn(inputClass, "font-mono uppercase tracking-wide")}
                    value={gstin}
                    onChange={(e) => setGstin(normalizeId(e.target.value).slice(0, 15))}
                    maxLength={15}
                    autoComplete="off"
                    aria-invalid={Boolean(errors.gstin)}
                    aria-describedby={errors.gstin ? "gstin-error" : undefined}
                    disabled={busy}
                  />
                </Field>
              </div>
            ) : null}

            <div className="mt-4">
              <Field
                id="pan"
                label={customerType === "business" ? "PAN" : "PAN (optional)"}
                error={errors.pan}
                hint={
                  gstinValid && panFromGstinValue && panValue === panFromGstinValue
                    ? "Taken from your GSTIN."
                    : "Used for your tax invoice. We never show these details on your campaign."
                }
              >
                <input
                  ref={(el) => { fieldRefs.current.pan = el; }}
                  id="pan"
                  className={cn(inputClass, "font-mono uppercase tracking-wide")}
                  value={pan}
                  onChange={(e) => setPan(normalizeId(e.target.value).slice(0, 10))}
                  maxLength={10}
                  autoComplete="off"
                  aria-invalid={Boolean(errors.pan)}
                  aria-describedby={errors.pan ? "pan-error" : undefined}
                  disabled={busy}
                />
              </Field>
            </div>
          </section>

          <section className="rounded-3xl border border-[#e5e7eb] bg-white p-5 shadow-[0_24px_70px_-60px_rgba(15,23,42,0.4)] sm:p-6">
            <h2 className="text-base font-extrabold text-[#0f172a]">Your campaign</h2>
            <div className="mt-4 grid gap-3 text-sm text-[#334155] sm:grid-cols-2">
              <div className="rounded-2xl bg-[#f8fafc] p-3"><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#94a3b8]">City</p><p className="mt-1 font-semibold text-[#0f172a]">{booking.cityName ?? "Selected city"}</p></div>
              <div className="rounded-2xl bg-[#f8fafc] p-3"><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#94a3b8]">Dates</p><p className="mt-1 font-semibold text-[#0f172a]">{formatDateLabel(booking.startDate)} - {formatDateLabel(booking.endDate)} ({booking.days} {booking.days === 1 ? "day" : "days"})</p></div>
              <div className="rounded-2xl bg-[#f8fafc] p-3"><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#94a3b8]">Tier</p><p className="mt-1 font-semibold capitalize text-[#0f172a]">{booking.tier ?? "Gold"}</p></div>
              <div className="rounded-2xl bg-[#f8fafc] p-3"><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#94a3b8]">Items</p><p className="mt-1 font-semibold text-[#0f172a]">{booking.items.length} selected</p></div>
            </div>
            <ul className="mt-4 space-y-2">
              {booking.items.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3 rounded-2xl border border-[#e5e7eb] px-3 py-2 text-sm">
                  <span className="truncate font-medium text-[#0f172a]">{item.name}</span>
                  <span className="shrink-0 text-xs font-semibold text-[#64748b]">{item.type === "package" ? `${item.quantity} properties` : "Property"}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-3xl border border-[#e5e7eb] bg-white p-5 shadow-[0_24px_70px_-60px_rgba(15,23,42,0.4)] sm:p-6">
            <label className="flex items-start gap-3 text-sm text-[#334155]">
              <input
                ref={(el) => { fieldRefs.current.confirm = el; }}
                type="checkbox"
                checked={confirm}
                onChange={(e) => setConfirm(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-[#cbd5e1] text-[#1d6fff]"
                aria-invalid={Boolean(errors.confirm)}
                aria-describedby={errors.confirm ? "confirm-error" : undefined}
                disabled={busy}
              />
              <span>I confirm the details above are correct and I want to pay the amount shown.</span>
            </label>
            {errors.confirm ? <p id="confirm-error" className="mt-2 text-xs font-medium text-[#dc2626]">{errors.confirm}</p> : null}

            <button
              type="submit"
              disabled={busy}
              className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#1d6fff] px-6 text-sm font-extrabold text-white shadow-[0_14px_30px_-14px_rgba(29,111,255,0.9)] transition hover:bg-[#155ee7] disabled:cursor-not-allowed disabled:bg-[#cbd5e1] disabled:shadow-none"
            >
              <Lock className="h-4 w-4" aria-hidden="true" />
              {payLabel}
            </button>
            <p className="mt-3 flex items-center justify-center gap-2 text-xs text-[#64748b]">
              <CreditCard className="h-3.5 w-3.5" aria-hidden="true" />
              Payments are processed securely by Razorpay.
            </p>
          </section>
        </div>

        <aside className="space-y-4 lg:col-span-5 lg:sticky lg:top-24">
          <section className="rounded-3xl border border-[#e5e7eb] bg-white p-5 shadow-[0_24px_70px_-40px_rgba(15,23,42,0.35)] sm:p-6">
            <h2 className="text-base font-extrabold text-[#0f172a]">Order summary</h2>
            <div className="mt-4 space-y-3">
              {booking.items.map((item) => (
                <div key={item.id} className="flex items-start justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-[#0f172a]">{item.name}</p>
                    <p className="text-xs text-[#64748b]">{item.type === "package" ? `${item.quantity} properties` : "Property"}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-2xl bg-[#f8fafc] p-3 text-xs text-[#64748b]">
              <p><span className="font-semibold text-[#334155]">Dates:</span> {formatDateLabel(booking.startDate)} - {formatDateLabel(booking.endDate)}</p>
              <p className="mt-1"><span className="font-semibold text-[#334155]">Tier:</span> <span className="capitalize">{booking.tier ?? "Gold"}</span></p>
            </div>

            <div className="mt-4 space-y-2.5">
              <SummaryRow label="Standard rate total" value={<span className="text-[#94a3b8] line-through">{formatINR(quote.standardTotal)}</span>} />
              <SummaryRow label="Online discount" tone="success" value={`- ${formatINR(quote.onlineDiscount)}`} />
              {booking.promoCode ? <SummaryRow label={`Promo (${booking.promoCode})`} tone="success" value={`- ${formatINR(quote.promoDiscount)}`} /> : null}
              <SummaryRow label={`GST (${quote.gstPct || booking.gstPct}%)`} value={formatINR(quote.gstAmount)} />
              {gstLabel ? <p className="text-xs text-[#64748b]">{gstLabel}</p> : null}
              <SummaryRow label="Rounding" value={formatINR(quote.rounding)} />
            </div>

            <div className="mt-4 flex items-end justify-between gap-3 border-t border-[#e5e7eb] pt-4">
              <span className="text-sm font-bold text-[#0f172a]">Total</span>
              <span className="text-2xl font-extrabold tracking-tight text-[#0f172a]">{formatINR(quote.total)}</span>
            </div>
            <p className="mt-2 text-xs text-[#64748b]">You will pay in Indian rupees.</p>
          </section>

          <div className="rounded-2xl border border-[#e5e7eb] bg-white px-4 py-3 text-sm text-[#64748b]">
            Need help? <Link href="/contact" className="font-semibold text-[#1d6fff] hover:text-[#155ee7]">Talk to us</Link>
          </div>
        </aside>

        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[#e5e7eb] bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#94a3b8]">Total</p>
              <p className="text-lg font-extrabold text-[#0f172a]">{formatINR(quote.total)}</p>
            </div>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex h-11 items-center justify-center rounded-full bg-[#1d6fff] px-5 text-sm font-extrabold text-white disabled:bg-[#cbd5e1]"
            >
              {busy ? "Please wait..." : "Pay securely"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
