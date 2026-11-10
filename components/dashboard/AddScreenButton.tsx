"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

const PAIRING_TTL_SECONDS = 10 * 60;

function extractPairingCode(payload: unknown): string | null {
  if (typeof payload === "string") {
    return payload;
  }

  if (Array.isArray(payload)) {
    return extractPairingCode(payload[0]);
  }

  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    const candidate =
      record.code ?? record.pairing_code ?? record.generated_code ?? record.p_code;

    if (typeof candidate === "string") {
      return candidate;
    }

    if (typeof candidate === "number") {
      return String(candidate);
    }
  }

  return null;
}

function formatCountdown(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

export default function AddScreenButton({
  customerId,
}: {
  customerId: string;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [screenName, setScreenName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [secondsRemaining, setSecondsRemaining] =
    useState(PAIRING_TTL_SECONDS);

  const closeModal = useCallback(() => {
    setIsOpen(false);
    setScreenName("");
    setLoading(false);
    setError(null);
    setPairingCode(null);
    setSecondsRemaining(PAIRING_TTL_SECONDS);
    router.refresh();
  }, [router]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeModal();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, closeModal]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!pairingCode) {
      return;
    }

    setSecondsRemaining(PAIRING_TTL_SECONDS);
    const expiresAt = Date.now() + PAIRING_TTL_SECONDS * 1000;

    const interval = window.setInterval(() => {
      const remaining = Math.max(
        0,
        Math.ceil((expiresAt - Date.now()) / 1000),
      );
      setSecondsRemaining(remaining);

      if (remaining === 0) {
        window.clearInterval(interval);
      }
    }, 1000);

    return () => window.clearInterval(interval);
  }, [pairingCode]);

  function openModal() {
    setScreenName("");
    setError(null);
    setPairingCode(null);
    setSecondsRemaining(PAIRING_TTL_SECONDS);
    setIsOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = screenName.trim();

    if (!trimmedName) {
      setError("Enter a name for this screen.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { data, error: rpcError } = await supabase.rpc(
        "generate_pairing_code",
        {
          p_customer_id: customerId,
          p_screen_name: trimmedName,
        },
      );

      if (rpcError) {
        setError(rpcError.message);
        return;
      }

      const code = extractPairingCode(data);

      if (!code) {
        setError("The pairing code could not be generated.");
        return;
      }

      setPairingCode(code);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const expired = secondsRemaining <= 0;

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#05060a]"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          className="h-4 w-4"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
        Add Screen
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close modal"
            onClick={closeModal}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-screen-title"
            className="relative max-h-[calc(100vh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl border border-white/10 bg-[#080b12] p-6 shadow-2xl shadow-black/50"
          >
            <button
              type="button"
              onClick={closeModal}
              aria-label="Close"
              className="absolute right-4 top-4 rounded-lg p-1.5 text-white/40 transition hover:bg-white/5 hover:text-white"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                strokeLinecap="round"
                className="h-5 w-5"
              >
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>

            {pairingCode ? (
              <div className="text-center">
                <h2
                  id="add-screen-title"
                  className="text-lg font-semibold text-white"
                >
                  Screen pairing code
                </h2>
                <p className="mt-2 text-sm leading-6 text-white/50">
                  Enter this code on{" "}
                  <span className="font-medium text-white/80">{screenName}</span>{" "}
                  to finish pairing.
                </p>

                <div className="mt-6 flex justify-center gap-2">
                  {Array.from(pairingCode).map((character, index) => (
                    <span
                      key={`${character}-${index}`}
                      className="flex h-14 w-11 items-center justify-center rounded-xl border border-cyan-400/30 bg-cyan-400/10 text-2xl font-semibold text-cyan-200"
                    >
                      {character}
                    </span>
                  ))}
                </div>

                <p
                  aria-live="polite"
                  className={
                    expired
                      ? "mt-4 text-sm font-medium text-amber-300"
                      : "mt-4 text-sm text-white/50"
                  }
                >
                  {expired
                    ? "This code has expired."
                    : `Expires in ${formatCountdown(secondsRemaining)}`}
                </p>

                <button
                  type="button"
                  onClick={closeModal}
                  className="mt-6 w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition hover:brightness-110"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <h2
                  id="add-screen-title"
                  className="text-lg font-semibold text-white"
                >
                  Add a screen
                </h2>
                <p className="mt-2 text-sm leading-6 text-white/50">
                  Give the screen a name so you can recognise it later. We will
                  generate a 6-digit code to pair it.
                </p>

                <div className="mt-5 space-y-2">
                  <label
                    htmlFor="screen-name"
                    className="text-sm font-medium text-white/80"
                  >
                    Screen name
                  </label>
                  <input
                    id="screen-name"
                    name="screenName"
                    type="text"
                    autoFocus
                    required
                    maxLength={80}
                    value={screenName}
                    onChange={(event) => setScreenName(event.target.value)}
                    placeholder="Lobby display"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-cyan-400/60 focus:bg-white/[0.06] focus:ring-2 focus:ring-cyan-400/20"
                  />
                </div>

                {error ? (
                  <p
                    role="alert"
                    className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300"
                  >
                    {error}
                  </p>
                ) : null}

                <div className="mt-6 flex gap-3">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-white/70 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? (
                      <span
                        aria-hidden="true"
                        className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
                      />
                    ) : null}
                    {loading ? "Generating..." : "Generate code"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
