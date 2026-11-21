"use client";

import { useMemo, useState, type FormEvent } from "react";
import {
  BadgePercent,
  Loader2,
  Plus,
  Tag,
  Trash2,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import type { AdPromoCode, AdSettings } from "@/lib/ads";
import { DEFAULT_AD_SETTINGS } from "@/lib/ads";
import { formatAdminDate } from "@/lib/admin";
import { GST_STATES } from "@/lib/gst";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type Notice = {
  type: "success" | "error";
  message: string;
};

type SettingsDraft = {
  online_discount_pct: string;
  gst_pct: string;
  platinum_multiplier: string;
  max_total_discount_pct: string;
  company_state_code: string;
};

type PromoDraft = {
  code: string;
  discount_pct: string;
  expires_at: string;
  note: string;
};

const inputClass =
  "h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white outline-none transition placeholder:text-muted focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/40 disabled:opacity-50";

function settingsDraft(settings: AdSettings | null): SettingsDraft {
  const value = settings ?? DEFAULT_AD_SETTINGS;

  return {
    online_discount_pct: String(value.online_discount_pct),
    gst_pct: String(value.gst_pct),
    platinum_multiplier: String(value.platinum_multiplier),
    max_total_discount_pct: String(value.max_total_discount_pct),
    company_state_code: value.company_state_code ?? "",
  };
}

function parseRangedNumber(
  value: string,
  minimum: number,
  maximum: number,
): number | null {
  if (!value.trim()) {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) &&
    parsed >= minimum &&
    parsed <= maximum
    ? parsed
    : null;
}

function sanitizePromoCode(value: string) {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 30);
}

function comparePromoCodes(a: AdPromoCode, b: AdPromoCode) {
  return (
    Number(b.is_active) - Number(a.is_active) ||
    a.code.localeCompare(b.code)
  );
}

function ActiveToggle({
  active,
  label,
  disabled,
  onChange,
}: {
  active: boolean;
  label: string;
  disabled?: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      aria-label={label}
      title={active ? "Active" : "Inactive"}
      disabled={disabled}
      onClick={onChange}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 disabled:pointer-events-none disabled:opacity-50",
        active
          ? "brand-gradient border-transparent"
          : "border-white/10 bg-white/10",
      )}
    >
      <span
        className={cn(
          "inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200",
          active ? "translate-x-6" : "translate-x-1",
        )}
      />
    </button>
  );
}

export default function AdminAdPricingClient({
  settings,
  promoCodes: initialPromoCodes,
  loadError,
}: {
  settings: AdSettings | null;
  promoCodes: AdPromoCode[];
  loadError: string | null;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [draft, setDraft] = useState<SettingsDraft>(() =>
    settingsDraft(settings),
  );
  const [settingsError, setSettingsError] = useState<string | null>(
    null,
  );
  const [promoCodes, setPromoCodes] =
    useState<AdPromoCode[]>(initialPromoCodes);
  const [promoDraft, setPromoDraft] = useState<PromoDraft>({
    code: "",
    discount_pct: "",
    expires_at: "",
    note: "",
  });
  const [promoError, setPromoError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  const sortedPromoCodes = useMemo(
    () => [...promoCodes].sort(comparePromoCodes),
    [promoCodes],
  );

  const savingSettings = pending === "settings-save";
  const busy = pending !== null;
  const settingsRowMissing = !settings && !loadError;

  async function handleSaveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (busy) {
      return;
    }

    const onlineDiscount = parseRangedNumber(
      draft.online_discount_pct,
      0,
      90,
    );
    const gst = parseRangedNumber(draft.gst_pct, 0, 40);
    const platinumMultiplier = parseRangedNumber(
      draft.platinum_multiplier,
      1,
      10,
    );
    const maxTotalDiscount = parseRangedNumber(
      draft.max_total_discount_pct,
      0,
      95,
    );
    const companyStateCode = draft.company_state_code.trim();

    if (onlineDiscount === null) {
      setSettingsError(
        "Online discount must be between 0 and 90.",
      );
      return;
    }

    if (gst === null) {
      setSettingsError("GST must be between 0 and 40.");
      return;
    }

    if (platinumMultiplier === null) {
      setSettingsError(
        "Platinum multiplier must be between 1 and 10.",
      );
      return;
    }

    if (maxTotalDiscount === null) {
      setSettingsError(
        "Maximum total discount must be between 0 and 95.",
      );
      return;
    }

    if (companyStateCode && !/^\d{2}$/.test(companyStateCode)) {
      setSettingsError("Company GST state must be a valid 2-digit code.");
      return;
    }

    setPending("settings-save");
    setSettingsError(null);
    setNotice(null);

    const { data, error } = await supabase
      .from("ad_settings")
      .update({
        online_discount_pct: onlineDiscount,
        gst_pct: gst,
        platinum_multiplier: platinumMultiplier,
        max_total_discount_pct: maxTotalDiscount,
        company_state_code: companyStateCode || null,
      })
      .eq("id", 1)
      .select("id");

    setPending(null);

    if (error) {
      setSettingsError(error.message);
      return;
    }

    if (!data || data.length === 0) {
      setSettingsError(
        "The pricing settings row (id = 1) was not found, so nothing was updated.",
      );
      return;
    }

    setNotice({
      type: "success",
      message: "Pricing settings saved.",
    });
  }

  async function handleAddPromo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (busy) {
      return;
    }

    const code = sanitizePromoCode(promoDraft.code);
    const discount = parseRangedNumber(promoDraft.discount_pct, 1, 90);
    const expiresAt = promoDraft.expires_at.trim();
    const note = promoDraft.note.trim();

    if (!/^[A-Z0-9]{3,30}$/.test(code)) {
      setPromoError(
        "Promo code must be 3 to 30 letters or digits.",
      );
      return;
    }

    if (discount === null) {
      setPromoError("Promo discount must be between 1 and 90.");
      return;
    }

    if (
      expiresAt &&
      !Number.isFinite(Date.parse(`${expiresAt}T00:00:00Z`))
    ) {
      setPromoError("Choose a valid expiry date.");
      return;
    }

    setPending("promo-add");
    setPromoError(null);
    setNotice(null);

    const { data, error } = await supabase
      .from("ad_promo_codes")
      .insert({
        code,
        discount_pct: discount,
        is_active: true,
        expires_at: expiresAt || null,
        note: note || null,
      })
      .select("code, discount_pct, is_active, expires_at, note")
      .single();

    setPending(null);

    if (error || !data) {
      setPromoError(
        error?.message ?? "The promo code could not be added.",
      );
      return;
    }

    const saved = data as unknown as AdPromoCode;
    setPromoCodes((current) => [...current, saved]);
    setPromoDraft({
      code: "",
      discount_pct: "",
      expires_at: "",
      note: "",
    });
    setNotice({
      type: "success",
      message: `Added promo code ${saved.code}.`,
    });
  }

  async function handleTogglePromo(promo: AdPromoCode) {
    if (busy) {
      return;
    }

    const nextActive = !promo.is_active;

    setPromoCodes((current) =>
      current.map((item) =>
        item.code === promo.code
          ? { ...item, is_active: nextActive }
          : item,
      ),
    );
    setPending(`promo-toggle:${promo.code}`);
    setNotice(null);

    const { error } = await supabase
      .from("ad_promo_codes")
      .update({ is_active: nextActive })
      .eq("code", promo.code);

    setPending(null);

    if (error) {
      setPromoCodes((current) =>
        current.map((item) =>
          item.code === promo.code
            ? { ...item, is_active: promo.is_active }
            : item,
        ),
      );
      setNotice({ type: "error", message: error.message });
    }
  }

  async function handleDeletePromo(promo: AdPromoCode) {
    if (busy) {
      return;
    }

    if (
      !window.confirm(
        `Delete promo code "${promo.code}"? This cannot be undone.`,
      )
    ) {
      return;
    }

    const previous = promoCodes;

    setPromoCodes((current) =>
      current.filter((item) => item.code !== promo.code),
    );
    setPending(`promo-delete:${promo.code}`);
    setNotice(null);

    const { error } = await supabase
      .from("ad_promo_codes")
      .delete()
      .eq("code", promo.code);

    setPending(null);

    if (error) {
      setPromoCodes(previous);
      setNotice({ type: "error", message: error.message });
      return;
    }

    setNotice({
      type: "success",
      message: `Deleted promo code ${promo.code}.`,
    });
  }

  return (
    <div className="space-y-6">
      {notice ? (
        <p
          role={notice.type === "error" ? "alert" : "status"}
          className={cn(
            "rounded-2xl border px-4 py-3 text-sm",
            notice.type === "error"
              ? "border-red-400/20 bg-red-400/10 text-red-200"
              : "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
          )}
        >
          {notice.message}
        </p>
      ) : null}

      {loadError ? (
        <p
          role="alert"
          className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200"
        >
          Pricing could not be loaded. {loadError}
        </p>
      ) : null}

      <Card className="p-5 hover:border-white/10 hover:shadow-none sm:p-6">
        <div className="flex items-start gap-4">
          <span className="brand-gradient flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white shadow-brand">
            <Tag aria-hidden="true" className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-white">
              Booking settings
            </h2>
            <p className="mt-1 text-sm text-body">
              These values apply to new ad booking quotes.
            </p>
          </div>
        </div>

        {settingsRowMissing ? (
          <p className="mt-5 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
            The pricing settings row (id = 1) was not found. Saving
            will not create it.
          </p>
        ) : null}

        <form onSubmit={handleSaveSettings} className="mt-5 space-y-4">
          {settingsError ? (
            <p
              role="alert"
              className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200"
            >
              {settingsError}
            </p>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="online-discount"
                className="mb-1 block text-xs text-muted"
              >
                Online discount %
              </label>
              <input
                id="online-discount"
                type="number"
                min={0}
                max={90}
                step="0.01"
                value={draft.online_discount_pct}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    online_discount_pct: event.target.value,
                  }))
                }
                className={inputClass}
              />
              <p className="mt-1 text-xs text-muted">
                Automatic discount applied to online checkout
                bookings before GST.
              </p>
            </div>

            <div>
              <label
                htmlFor="gst-pct"
                className="mb-1 block text-xs text-muted"
              >
                GST %
              </label>
              <input
                id="gst-pct"
                type="number"
                min={0}
                max={40}
                step="0.01"
                value={draft.gst_pct}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    gst_pct: event.target.value,
                  }))
                }
                className={inputClass}
              />
              <p className="mt-1 text-xs text-muted">
                Tax added to the discounted booking subtotal.
              </p>
            </div>

            <div>
              <label
                htmlFor="platinum-multiplier"
                className="mb-1 block text-xs text-muted"
              >
                Platinum multiplier
              </label>
              <input
                id="platinum-multiplier"
                type="number"
                min={1}
                max={10}
                step="0.01"
                value={draft.platinum_multiplier}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    platinum_multiplier: event.target.value,
                  }))
                }
                className={inputClass}
              />
              <p className="mt-1 text-xs text-muted">
                Rate multiplier applied to Platinum-tier bookings.
              </p>
            </div>

            <div>
              <label
                htmlFor="max-total-discount"
                className="mb-1 block text-xs text-muted"
              >
                Maximum total discount %
              </label>
              <input
                id="max-total-discount"
                type="number"
                min={0}
                max={95}
                step="0.01"
                value={draft.max_total_discount_pct}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    max_total_discount_pct: event.target.value,
                  }))
                }
                className={inputClass}
              />
              <p className="mt-1 text-xs text-muted">
                Caps the combined online and promo discounts on a
                booking.
              </p>
            </div>

            <div>
              <label
                htmlFor="company-state-code"
                className="mb-1 block text-xs text-muted"
              >
                Company GST state
              </label>
              <select
                id="company-state-code"
                value={draft.company_state_code}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    company_state_code: event.target.value,
                  }))
                }
                className={inputClass}
              >
                <option value="">Select state</option>
                {Object.entries(GST_STATES).map(([code, name]) => (
                  <option key={code} value={code}>
                    {name} ({code})
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-muted">
                Decides whether customers see CGST + SGST (same state) or IGST.
                Use the state of your GST registration.
              </p>
            </div>
          </div>

          <div className="flex justify-end border-t border-white/5 pt-4">
            <Button type="submit" disabled={busy}>
              {savingSettings ? (
                <Loader2
                  aria-hidden="true"
                  className="h-4 w-4 animate-spin"
                />
              ) : null}
              {savingSettings ? "Saving..." : "Save settings"}
            </Button>
          </div>
        </form>
      </Card>

      <Card className="overflow-hidden p-0 hover:border-white/10 hover:shadow-none">
        <div className="border-b border-white/5 p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <span className="brand-gradient flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white shadow-brand">
              <BadgePercent aria-hidden="true" className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-white">
                Promo codes
              </h2>
              <p className="mt-1 text-sm text-body">
                Create limited-time discounts for ad bookings.
              </p>
            </div>
          </div>

          <form
            onSubmit={handleAddPromo}
            className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_8rem_10rem_auto]"
          >
            {promoError ? (
              <p
                role="alert"
                className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200 sm:col-span-4"
              >
                {promoError}
              </p>
            ) : null}

            <div>
              <label
                htmlFor="promo-code"
                className="mb-1 block text-xs text-muted"
              >
                Code
              </label>
              <input
                id="promo-code"
                value={promoDraft.code}
                onChange={(event) =>
                  setPromoDraft((current) => ({
                    ...current,
                    code: sanitizePromoCode(event.target.value),
                  }))
                }
                placeholder="LAUNCH25"
                maxLength={30}
                className={cn(
                  inputClass,
                  "font-mono uppercase tracking-wide",
                )}
              />
            </div>

            <div>
              <label
                htmlFor="promo-discount"
                className="mb-1 block text-xs text-muted"
              >
                Discount %
              </label>
              <input
                id="promo-discount"
                type="number"
                min={1}
                max={90}
                step="0.01"
                value={promoDraft.discount_pct}
                onChange={(event) =>
                  setPromoDraft((current) => ({
                    ...current,
                    discount_pct: event.target.value,
                  }))
                }
                placeholder="15"
                className={inputClass}
              />
            </div>

            <div>
              <label
                htmlFor="promo-expiry"
                className="mb-1 block text-xs text-muted"
              >
                Expiry
              </label>
              <input
                id="promo-expiry"
                type="date"
                value={promoDraft.expires_at}
                onChange={(event) =>
                  setPromoDraft((current) => ({
                    ...current,
                    expires_at: event.target.value,
                  }))
                }
                className={inputClass}
              />
            </div>

            <Button
              type="submit"
              disabled={busy}
              className="sm:self-end"
            >
              {pending === "promo-add" ? (
                <Loader2
                  aria-hidden="true"
                  className="h-4 w-4 animate-spin"
                />
              ) : (
                <Plus aria-hidden="true" className="h-4 w-4" />
              )}
              {pending === "promo-add" ? "Adding..." : "Add code"}
            </Button>

            <div className="sm:col-span-4">
              <label
                htmlFor="promo-note"
                className="mb-1 block text-xs text-muted"
              >
                Note
              </label>
              <input
                id="promo-note"
                value={promoDraft.note}
                onChange={(event) =>
                  setPromoDraft((current) => ({
                    ...current,
                    note: event.target.value,
                  }))
                }
                placeholder="Optional internal note"
                className={inputClass}
              />
              <p className="mt-1 text-xs text-muted">
                Codes use 3 to 30 letters or digits and are stored in
                upper case.
              </p>
            </div>
          </form>
        </div>

        {sortedPromoCodes.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm text-body">
              No promo codes yet. Add one above.
            </p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[62rem] text-left text-sm">
                <thead className="border-b border-white/5 bg-white/[0.02] text-xs uppercase tracking-[0.12em] text-muted">
                  <tr>
                    <th scope="col" className="px-5 py-3 font-semibold">
                      Code
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Discount
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Expiry
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Note
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Active
                    </th>
                    <th
                      scope="col"
                      className="px-5 py-3 text-right font-semibold"
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {sortedPromoCodes.map((promo) => {
                    const deleting =
                      pending === `promo-delete:${promo.code}`;

                    return (
                      <tr
                        key={promo.code}
                        className="transition duration-200 hover:bg-white/[0.03]"
                      >
                        <td className="px-5 py-3.5 font-mono font-semibold tracking-wide text-white">
                          {promo.code}
                        </td>
                        <td className="px-4 py-3.5 text-white/70 tabular-nums">
                          {promo.discount_pct}%
                        </td>
                        <td className="px-4 py-3.5 text-white/70">
                          {promo.expires_at
                            ? formatAdminDate(promo.expires_at)
                            : "No expiry"}
                        </td>
                        <td className="max-w-[18rem] px-4 py-3.5 text-white/60">
                          <span className="line-clamp-2">
                            {promo.note || "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <ActiveToggle
                            active={promo.is_active}
                            label={`${
                              promo.is_active ? "Deactivate" : "Activate"
                            } promo code ${promo.code}`}
                            disabled={busy}
                            onChange={() => void handleTogglePromo(promo)}
                          />
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => void handleDeletePromo(promo)}
                            disabled={busy}
                            className="h-8 px-3 text-xs text-red-300 hover:bg-red-400/10 hover:text-red-200"
                          >
                            <Trash2
                              aria-hidden="true"
                              className="h-3.5 w-3.5"
                            />
                            {deleting ? "Deleting..." : "Delete"}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-white/5 lg:hidden">
              {sortedPromoCodes.map((promo) => {
                const deleting =
                  pending === `promo-delete:${promo.code}`;

                return (
                  <div key={promo.code} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-mono text-sm font-semibold tracking-wide text-white">
                          {promo.code}
                        </p>
                        <p className="mt-0.5 text-xs text-body">
                          {promo.discount_pct}% off ·{" "}
                          {promo.expires_at
                            ? `expires ${formatAdminDate(
                                promo.expires_at,
                              )}`
                            : "no expiry"}
                        </p>
                        {promo.note ? (
                          <p className="mt-1 line-clamp-2 text-xs text-muted">
                            {promo.note}
                          </p>
                        ) : null}
                      </div>
                      <ActiveToggle
                        active={promo.is_active}
                        label={`${
                          promo.is_active ? "Deactivate" : "Activate"
                        } promo code ${promo.code}`}
                        disabled={busy}
                        onChange={() => void handleTogglePromo(promo)}
                      />
                    </div>

                    <div className="mt-3 flex justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => void handleDeletePromo(promo)}
                        disabled={busy}
                        className="h-8 px-3 text-xs text-red-300 hover:bg-red-400/10 hover:text-red-200"
                      >
                        <Trash2
                          aria-hidden="true"
                          className="h-3.5 w-3.5"
                        />
                        {deleting ? "Deleting..." : "Delete"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
