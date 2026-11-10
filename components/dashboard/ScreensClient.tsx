"use client";

import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from "react";
import {
  Check,
  Copy,
  Loader2,
  Monitor,
  Plus,
  RefreshCw,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import StatusBadge from "@/components/dashboard/StatusBadge";
import Button from "@/components/ui/Button";
import { notifyScreens } from "@/lib/realtime";
import { createClient } from "@/lib/supabase/client";
import type { PairingResult, Screen } from "@/lib/types";
import { cn } from "@/lib/utils";

const lastSeenFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

function formatLastSeen(value: string | null) {
  if (!value) {
    return "Never";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return lastSeenFormatter.format(date);
}

function formatCountdown(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200"
    >
      {message}
    </p>
  );
}

export default function ScreensClient({
  screens,
  loadError,
}: {
  screens: Screen[];
  loadError: string | null;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [screenName, setScreenName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pairing, setPairing] = useState<PairingResult | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const [copied, setCopied] = useState(false);
  const [sent, setSent] = useState<{
    id: string;
    event: "refresh" | "restart";
  } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const closeModal = useCallback(() => {
    setIsOpen(false);
    setScreenName("");
    setLoading(false);
    setError(null);
    setPairing(null);
    setSecondsRemaining(0);
    setCopied(false);
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
    if (!pairing) {
      return;
    }

    const expiresAt = Date.parse(pairing.expires_at);

    if (Number.isNaN(expiresAt)) {
      setSecondsRemaining(0);
      return;
    }

    const updateCountdown = () => {
      setSecondsRemaining(
        Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000)),
      );
    };

    updateCountdown();
    const interval = window.setInterval(updateCountdown, 1000);

    return () => window.clearInterval(interval);
  }, [pairing]);

  useEffect(() => {
    if (!copied) {
      return;
    }

    const timeout = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  useEffect(() => {
    if (!sent) {
      return;
    }

    const timeout = window.setTimeout(() => setSent(null), 2000);
    return () => window.clearTimeout(timeout);
  }, [sent]);

  async function handleScreenSignal(
    screenId: string,
    event: "refresh" | "restart",
  ) {
    setActionError(null);
    await notifyScreens([screenId], event);
    setSent({ id: screenId, event });
  }

  async function handleDelete(screen: Screen) {
    const confirmed = window.confirm(
      `Delete "${screen.name}"? This cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(screen.id);
    setActionError(null);

    try {
      await notifyScreens([screen.id], "refresh");

      const supabase = createClient();
      const { error: deleteError } = await supabase
        .from("screens")
        .delete()
        .eq("id", screen.id);

      if (deleteError) {
        setActionError(deleteError.message);
        return;
      }

      router.refresh();
    } catch {
      setActionError("Could not delete this screen. Please try again.");
    } finally {
      setDeletingId(null);
    }
  }

  function openModal() {
    setScreenName("");
    setError(null);
    setPairing(null);
    setSecondsRemaining(0);
    setCopied(false);
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
          p_screen_name: trimmedName,
        },
      );

      if (rpcError) {
        setError(rpcError.message);
        return;
      }

      const result = data as PairingResult | null;

      if (!result?.code || !result.screen_id || !result.expires_at) {
        setError("The pairing code could not be generated.");
        return;
      }

      const expiresAt = Date.parse(result.expires_at);
      setSecondsRemaining(
        Number.isNaN(expiresAt)
          ? 0
          : Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000)),
      );
      setPairing(result);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!pairing) {
      return;
    }

    try {
      await navigator.clipboard.writeText(pairing.code);
      setError(null);
      setCopied(true);
    } catch {
      setError("Could not copy the code. Select it manually.");
    }
  }

  const expired = secondsRemaining <= 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-body">
          {screens.length} {screens.length === 1 ? "screen" : "screens"}
        </p>

        <Button onClick={openModal} className="shrink-0 px-5">
          <Plus aria-hidden="true" className="h-4 w-4" />
          Add Screen
        </Button>
      </div>

      {loadError ? <ErrorMessage message={loadError} /> : null}
      {actionError ? <ErrorMessage message={actionError} /> : null}

      <div className="overflow-hidden rounded-3xl border border-white/10 bg-surface">
        <div className="hidden grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)] gap-4 border-b border-white/5 px-6 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted md:grid">
          <span>Screen</span>
          <span>Status</span>
          <span>Last seen</span>
          <span>Location</span>
        </div>

        {screens.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-brand-sky">
              <Monitor aria-hidden="true" className="h-6 w-6" />
            </span>
            <h2 className="mt-4 text-base font-semibold text-white">
              No screens yet
            </h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-body">
              Use Add Screen to generate a pairing code and connect your first
              display.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-white/5">
            {screens.map((screen) => (
              <li
                key={screen.id}
                className="grid gap-3 px-5 py-4 sm:px-6 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)] md:items-center md:gap-4"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-brand-sky">
                    <Monitor aria-hidden="true" className="h-5 w-5" />
                  </span>
                  <p className="truncate text-sm font-medium text-white">
                    {screen.name}
                  </p>
                </div>

                <div className="flex items-center justify-between gap-3 md:block">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted md:hidden">
                    Status
                  </span>
                  <StatusBadge status={screen.status} />
                </div>

                <div className="flex items-center justify-between gap-3 md:block">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted md:hidden">
                    Last seen
                  </span>
                  <span className="text-sm text-body">
                    {formatLastSeen(screen.last_seen)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3 md:block">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted md:hidden">
                    Location
                  </span>
                  <span className="truncate text-sm text-body">
                    {screen.location ?? "—"}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 md:col-span-4">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => void handleScreenSignal(screen.id, "refresh")}
                    className="gap-2"
                  >
                    <RefreshCw aria-hidden="true" className="h-3.5 w-3.5" />
                    Refresh
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => void handleScreenSignal(screen.id, "restart")}
                    className="gap-2"
                  >
                    <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" />
                    Restart player
                  </Button>
                  {sent?.id === screen.id ? (
                    <span className="text-xs font-medium text-emerald-300">
                      Sent
                    </span>
                  ) : null}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void handleDelete(screen)}
                    disabled={deletingId === screen.id}
                    className="ml-auto gap-2 text-red-300 hover:bg-red-400/10 hover:text-red-200"
                  >
                    {deletingId === screen.id ? (
                      <Loader2
                        aria-hidden="true"
                        className="h-3.5 w-3.5 animate-spin"
                      />
                    ) : (
                      <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                    )}
                    {deletingId === screen.id ? "Deleting..." : "Delete"}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

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
            aria-labelledby={pairing ? "pairing-code-title" : "add-screen-title"}
            className="relative max-h-[calc(100vh-2rem)] w-full max-w-md overflow-y-auto rounded-3xl border border-white/10 bg-surface p-6 shadow-card"
          >
            <button
              type="button"
              onClick={closeModal}
              aria-label="Close"
              className="absolute right-4 top-4 rounded-full p-1.5 text-white/40 transition duration-200 hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60"
            >
              <X className="h-5 w-5" />
            </button>

            {pairing ? (
              <div className="text-center">
                <h2
                  id="pairing-code-title"
                  className="text-lg font-semibold tracking-tight text-white"
                >
                  Screen pairing code
                </h2>
                <p className="mt-2 text-sm leading-6 text-body">
                  Enter this code on{" "}
                  <span className="font-medium text-white">{screenName}</span> to
                  finish pairing.
                </p>

                <div
                  role="group"
                  aria-label={`Pairing code ${pairing.code}`}
                  className="mt-6 flex justify-center gap-1.5 sm:gap-2"
                >
                  {pairing.code.split("").map((digit, index) => (
                    <span
                      key={`${digit}-${index}`}
                      aria-hidden="true"
                      className="flex h-14 w-10 items-center justify-center rounded-2xl border border-sky-400/30 bg-sky-400/10 text-2xl font-extrabold text-sky-100 sm:w-11"
                    >
                      {digit}
                    </span>
                  ))}
                </div>

                <div className="mt-4 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <p
                    aria-live="polite"
                    className={cn(
                      "text-sm font-medium",
                      expired ? "text-amber-300" : "text-body",
                    )}
                  >
                    {expired
                      ? "This code has expired."
                      : `Expires in ${formatCountdown(secondsRemaining)}`}
                  </p>

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleCopy}
                    className="gap-2"
                  >
                    {copied ? (
                      <Check aria-hidden="true" className="h-4 w-4" />
                    ) : (
                      <Copy aria-hidden="true" className="h-4 w-4" />
                    )}
                    {copied ? "Copied" : "Copy code"}
                  </Button>
                </div>

                {error ? (
                  <div className="mt-4">
                    <ErrorMessage message={error} />
                  </div>
                ) : null}

                <Button onClick={closeModal} className="mt-6 w-full">
                  Done
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <h2
                  id="add-screen-title"
                  className="text-lg font-semibold tracking-tight text-white"
                >
                  Add a screen
                </h2>
                <p className="mt-2 text-sm leading-6 text-body">
                  Give the screen a name so you can recognise it later. We will
                  generate a 6-digit code to pair it.
                </p>

                <div className="mt-5">
                  <label
                    htmlFor="screen-name"
                    className="mb-2 block text-sm font-medium text-white"
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
                    disabled={loading}
                    placeholder="Lobby display"
                    className="h-12 w-full rounded-full border border-white/10 bg-white/5 px-5 text-sm text-white outline-none transition placeholder:text-muted focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/40 disabled:opacity-60"
                  />
                </div>

                {error ? (
                  <div className="mt-4">
                    <ErrorMessage message={error} />
                  </div>
                ) : null}

                <div className="mt-6 flex gap-3">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={closeModal}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="flex-1 gap-2"
                  >
                    {loading ? (
                      <Loader2
                        aria-hidden="true"
                        className="h-4 w-4 animate-spin"
                      />
                    ) : null}
                    {loading ? "Generating..." : "Generate code"}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
