"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { getMediaUrl } from "@/lib/media";

const TOKEN_KEY = "crystagrid_device_token";
const CODE_KEY = "crystagrid_player_code";
const EXPIRES_KEY = "crystagrid_player_expires_at";

type PlayerView = "connecting" | "waiting" | "paired";
type PlayerStatus = "waiting" | "expired" | "invalid" | "paired";
type MediaType = "image" | "video";

interface PlayerItem {
  id: string;
  type: MediaType;
  file_path: string;
  duration: number | null;
}

interface PollResponse {
  status: PlayerStatus;
  expires_at: string | null;
  screen_name: string | null;
  playlist_id: string | null;
  items: PlayerItem[];
}

interface CodeResponse {
  code: string;
  device_token: string;
  expires_at: string;
}

function readStorage(key: string): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    return;
  }
}

function removeStorage(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    return;
  }
}

function firstRow(data: unknown): Record<string, unknown> | null {
  const row = Array.isArray(data) ? data[0] : data;

  if (!row || typeof row !== "object") {
    return null;
  }

  return row as Record<string, unknown>;
}

function parseCodeResponse(data: unknown): CodeResponse | null {
  const row = firstRow(data);

  if (!row) {
    return null;
  }

  const code =
    typeof row.code === "string"
      ? row.code.trim()
      : typeof row.code === "number"
        ? String(row.code).padStart(6, "0")
        : null;
  const deviceToken =
    typeof row.device_token === "string" ? row.device_token : null;
  const expiresAt =
    typeof row.expires_at === "string" ? row.expires_at : null;

  if (!code || !deviceToken || !expiresAt) {
    return null;
  }

  return {
    code,
    device_token: deviceToken,
    expires_at: expiresAt,
  };
}

function parseItem(value: unknown): PlayerItem | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const item = value as Record<string, unknown>;
  const type = item.type === "image" || item.type === "video" ? item.type : null;
  const id =
    typeof item.id === "string"
      ? item.id
      : typeof item.id === "number"
        ? String(item.id)
        : null;
  const filePath = typeof item.file_path === "string" ? item.file_path : null;

  if (!type || !id || !filePath) {
    return null;
  }

  const duration =
    typeof item.duration === "number" && Number.isFinite(item.duration)
      ? item.duration
      : typeof item.duration === "string" && item.duration.trim() !== ""
        ? Number(item.duration)
        : null;

  return {
    id,
    type,
    file_path: filePath,
    duration: duration !== null && Number.isFinite(duration) ? duration : null,
  };
}

function parsePollResponse(data: unknown): PollResponse | null {
  const row = firstRow(data);

  if (!row) {
    return null;
  }

  const status =
    row.status === "waiting" ||
    row.status === "expired" ||
    row.status === "invalid" ||
    row.status === "paired"
      ? row.status
      : null;

  if (!status) {
    return null;
  }

  const items = Array.isArray(row.items)
    ? row.items
        .map((item) => parseItem(item))
        .filter((item): item is PlayerItem => item !== null)
    : [];

  return {
    status,
    expires_at: typeof row.expires_at === "string" ? row.expires_at : null,
    screen_name: typeof row.screen_name === "string" ? row.screen_name : null,
    playlist_id: typeof row.playlist_id === "string" ? row.playlist_id : null,
    items,
  };
}

function makeSignature(items: PlayerItem[]): string {
  return JSON.stringify(
    items.map((item) => ({
      id: item.id,
      file_path: item.file_path,
      duration: item.duration,
    })),
  );
}

function formatRemaining(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function remainingFromExpiry(expiresAt: string | null): number {
  if (!expiresAt) {
    return 0;
  }

  const target = new Date(expiresAt).getTime();

  return Number.isFinite(target) ? Math.max(0, target - Date.now()) : 0;
}

function BrandLogo() {
  return (
    <div className="flex items-center gap-3">
      <span className="brand-gradient flex h-12 w-12 items-center justify-center rounded-2xl shadow-brand">
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="h-6 w-6 text-white"
        >
          <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" />
        </svg>
      </span>
      <span className="text-2xl font-bold tracking-tight text-white">
        Crystagrid
      </span>
    </div>
  );
}

function RadialGlow({ strong = false }: { strong?: boolean }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 ${
        strong
          ? "bg-[radial-gradient(ellipse_75%_65%_at_50%_0%,rgba(29,111,255,0.32),transparent_68%)]"
          : "bg-[radial-gradient(ellipse_70%_55%_at_50%_10%,rgba(29,111,255,0.16),transparent_70%)]"
      }`}
    />
  );
}

export default function PlayerPage() {
  const supabase = useMemo(() => createClient(), []);
  const [view, setView] = useState<PlayerView>("connecting");
  const [code, setCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [remainingMs, setRemainingMs] = useState(0);
  const [screenName, setScreenName] = useState<string | null>(null);
  const [items, setItems] = useState<PlayerItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playlistVersion, setPlaylistVersion] = useState(0);
  const [failedItemId, setFailedItemId] = useState<string | null>(null);
  const [cursorHidden, setCursorHidden] = useState(false);
  const [fullscreenCueVisible, setFullscreenCueVisible] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const bootstrappedRef = useRef(false);
  const tokenRef = useRef<string | null>(null);
  const codeRef = useRef<string | null>(null);
  const signatureRef = useRef("");
  const codeRequestInFlightRef = useRef(false);
  const cueTimerRef = useRef<number | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const pollOnce = useCallback(
    async (token: string): Promise<PollResponse | null> => {
      try {
        const { data, error } = await supabase.rpc("player_poll", {
          p_token: token,
        });

        if (error) {
          return null;
        }

        return parsePollResponse(data);
      } catch {
        return null;
      }
    },
    [supabase],
  );

  const startFreshCode = useCallback(async (): Promise<boolean> => {
    if (codeRequestInFlightRef.current) {
      return false;
    }

    codeRequestInFlightRef.current = true;

    try {
      const { data, error } = await supabase.rpc("player_request_code");

      if (error) {
        return false;
      }

      const payload = parseCodeResponse(data);

      if (!payload) {
        return false;
      }

      tokenRef.current = payload.device_token;
      codeRef.current = payload.code;
      signatureRef.current = "";

      writeStorage(TOKEN_KEY, payload.device_token);
      writeStorage(CODE_KEY, payload.code);
      writeStorage(EXPIRES_KEY, payload.expires_at);

      setCode(payload.code);
      setExpiresAt(payload.expires_at);
      setRemainingMs(remainingFromExpiry(payload.expires_at));
      setScreenName(null);
      setItems([]);
      setCurrentIndex(0);
      setFailedItemId(null);
      setPlaylistVersion((version) => version + 1);
      setView("waiting");

      return true;
    } catch {
      return false;
    } finally {
      codeRequestInFlightRef.current = false;
    }
  }, [supabase]);

  const resetToNewCode = useCallback(() => {
    tokenRef.current = null;
    codeRef.current = null;
    signatureRef.current = "";

    removeStorage(TOKEN_KEY);
    removeStorage(CODE_KEY);
    removeStorage(EXPIRES_KEY);

    setCode(null);
    setExpiresAt(null);
    setRemainingMs(0);
    setScreenName(null);
    setItems([]);
    setCurrentIndex(0);
    setFailedItemId(null);
    setPlaylistVersion((version) => version + 1);
    setView("connecting");

    void startFreshCode();
  }, [startFreshCode]);

  const handlePollResponse = useCallback(
    (response: PollResponse) => {
      if (response.status === "paired") {
        const nextSignature = makeSignature(response.items);

        setScreenName(response.screen_name);
        setRemainingMs(0);
        setView("paired");

        if (signatureRef.current !== nextSignature) {
          signatureRef.current = nextSignature;
          setItems(response.items);
          setCurrentIndex(0);
          setFailedItemId(null);
          setPlaylistVersion((version) => version + 1);
        }

        codeRef.current = null;
        removeStorage(CODE_KEY);
        removeStorage(EXPIRES_KEY);
        return;
      }

      if (response.status === "waiting") {
        const nextCode = codeRef.current ?? readStorage(CODE_KEY);
        const nextExpires = response.expires_at ?? readStorage(EXPIRES_KEY);

        if (nextExpires) {
          setExpiresAt(nextExpires);
          setRemainingMs(remainingFromExpiry(nextExpires));
          writeStorage(EXPIRES_KEY, nextExpires);
        }

        if (nextCode) {
          codeRef.current = nextCode;
          setCode(nextCode);
          setView("waiting");
          return;
        }

        void startFreshCode();
        return;
      }

      resetToNewCode();
    },
    [resetToNewCode, startFreshCode],
  );

  useEffect(() => {
    if (bootstrappedRef.current) {
      return;
    }

    bootstrappedRef.current = true;

    const storedToken = readStorage(TOKEN_KEY);
    const storedCode = readStorage(CODE_KEY);

    if (!storedToken) {
      removeStorage(CODE_KEY);
      removeStorage(EXPIRES_KEY);
      return;
    }

    tokenRef.current = storedToken;

    if (storedCode) {
      codeRef.current = storedCode;
    }
  }, []);

  useEffect(() => {
    if (view !== "connecting") {
      return;
    }

    let cancelled = false;
    let inFlight = false;

    async function attempt() {
      if (cancelled || inFlight) {
        return;
      }

      inFlight = true;

      try {
        const token = tokenRef.current;

        if (!token) {
          await startFreshCode();
          return;
        }

        const response = await pollOnce(token);

        if (!cancelled && response) {
          handlePollResponse(response);
        }
      } finally {
        inFlight = false;
      }
    }

    void attempt();
    const interval = window.setInterval(() => {
      void attempt();
    }, 3000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [view, pollOnce, startFreshCode, handlePollResponse]);

  useEffect(() => {
    if (view !== "waiting") {
      return;
    }

    let cancelled = false;
    let inFlight = false;

    async function poll() {
      if (cancelled || inFlight) {
        return;
      }

      const token = tokenRef.current;

      if (!token) {
        return;
      }

      inFlight = true;

      try {
        const response = await pollOnce(token);

        if (!cancelled && response) {
          handlePollResponse(response);
        }
      } finally {
        inFlight = false;
      }
    }

    const interval = window.setInterval(() => {
      void poll();
    }, 3000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [view, pollOnce, handlePollResponse]);

  useEffect(() => {
    if (view !== "paired") {
      return;
    }

    let cancelled = false;
    let inFlight = false;

    async function heartbeat() {
      if (cancelled || inFlight) {
        return;
      }

      const token = tokenRef.current;

      if (!token) {
        return;
      }

      inFlight = true;

      try {
        const response = await pollOnce(token);

        if (!cancelled && response) {
          handlePollResponse(response);
        }
      } finally {
        inFlight = false;
      }
    }

    const interval = window.setInterval(() => {
      void heartbeat();
    }, 20000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [view, pollOnce, handlePollResponse]);

  useEffect(() => {
    if (view !== "waiting" || !expiresAt) {
      return;
    }

    const interval = window.setInterval(() => {
      setRemainingMs(remainingFromExpiry(expiresAt));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [view, expiresAt]);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const previousHtmlOverflow = html.style.overflow;
    const previousBodyOverflow = body.style.overflow;
    const previousBodyBackground = body.style.backgroundColor;
    const previousBodyBackgroundImage = body.style.backgroundImage;

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.backgroundColor = "#000000";
    body.style.backgroundImage = "none";

    return () => {
      html.style.overflow = previousHtmlOverflow;
      body.style.overflow = previousBodyOverflow;
      body.style.backgroundColor = previousBodyBackground;
      body.style.backgroundImage = previousBodyBackgroundImage;
    };
  }, []);

  useEffect(() => {
    function handleFullscreenChange() {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const showFullscreenCue = useCallback(() => {
    setFullscreenCueVisible(true);

    if (cueTimerRef.current) {
      window.clearTimeout(cueTimerRef.current);
    }

    cueTimerRef.current = window.setTimeout(() => {
      setFullscreenCueVisible(false);
      cueTimerRef.current = null;
    }, 3000);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      return;
    } finally {
      setFullscreenCueVisible(false);
    }
  }, []);

  useEffect(() => {
    let idleTimer: number | null = null;

    function scheduleIdle() {
      if (idleTimer) {
        window.clearTimeout(idleTimer);
      }

      idleTimer = window.setTimeout(() => {
        setCursorHidden(true);
      }, 3000);
    }

    function markActive() {
      setCursorHidden(false);
      scheduleIdle();
    }

    function handlePointerDown() {
      markActive();
      showFullscreenCue();
    }

    function handleKeyDown(event: KeyboardEvent) {
      markActive();

      if (event.key.toLowerCase() === "f") {
        event.preventDefault();
        void toggleFullscreen();
      }
    }

    window.addEventListener("pointermove", markActive, { passive: true });
    window.addEventListener("pointerdown", handlePointerDown, { passive: true });
    window.addEventListener("wheel", markActive, { passive: true });
    window.addEventListener("keydown", handleKeyDown);

    scheduleIdle();

    return () => {
      window.removeEventListener("pointermove", markActive);
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("wheel", markActive);
      window.removeEventListener("keydown", handleKeyDown);

      if (idleTimer) {
        window.clearTimeout(idleTimer);
      }
    };
  }, [showFullscreenCue, toggleFullscreen]);

  useEffect(() => {
    return () => {
      if (cueTimerRef.current) {
        window.clearTimeout(cueTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let disposed = false;

    async function requestWakeLock() {
      if (wakeLockRef.current && !wakeLockRef.current.released) {
        return;
      }

      try {
        if (!navigator.wakeLock) {
          return;
        }

        const sentinel = await navigator.wakeLock.request("screen");

        if (disposed) {
          await sentinel.release();
          return;
        }

        wakeLockRef.current = sentinel;
        sentinel.addEventListener("release", () => {
          if (wakeLockRef.current === sentinel) {
            wakeLockRef.current = null;
          }
        });
      } catch {
        return;
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        void requestWakeLock();
      }
    }

    void requestWakeLock();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", handleVisibilityChange);

      const sentinel = wakeLockRef.current;

      if (sentinel && !sentinel.released) {
        void sentinel.release().catch(() => undefined);
      }

      wakeLockRef.current = null;
    };
  }, []);

  const currentItem =
    items.length > 0 ? items[currentIndex % items.length] : null;
  const currentKey = currentItem
    ? `${playlistVersion}-${currentItem.id}`
    : "empty";
  const nextItem =
    items.length > 1 && currentItem
      ? items[(currentIndex + 1) % items.length]
      : null;
  const nextImagePath = nextItem?.type === "image" ? nextItem.file_path : null;
  const nextVideoPath = nextItem?.type === "video" ? nextItem.file_path : null;

  const advance = useCallback(
    (fromId: string) => {
      setFailedItemId(null);

      if (items.length === 1) {
        if (items[0]?.id === fromId) {
          setPlaylistVersion((version) => version + 1);
        }

        return;
      }

      setCurrentIndex((index) => {
        if (items.length === 0) {
          return 0;
        }

        const activeItem = items[index % items.length];

        if (!activeItem || activeItem.id !== fromId) {
          return index;
        }

        return (index + 1) % items.length;
      });
    },
    [items],
  );

  useEffect(() => {
    if (!currentItem || failedItemId !== currentItem.id) {
      return;
    }

    const timeout = window.setTimeout(() => {
      advance(currentItem.id);
    }, 2000);

    return () => window.clearTimeout(timeout);
  }, [advance, currentItem, failedItemId]);

  useEffect(() => {
    if (!currentItem || currentItem.type !== "image" || items.length <= 1) {
      return;
    }

    const seconds =
      currentItem.duration && currentItem.duration > 0
        ? currentItem.duration
        : 10;
    const timeout = window.setTimeout(() => {
      advance(currentItem.id);
    }, seconds * 1000);

    return () => window.clearTimeout(timeout);
  }, [advance, currentItem, items.length]);

  useEffect(() => {
    if (!nextImagePath) {
      return;
    }

    const image = new Image();
    image.src = getMediaUrl(nextImagePath);
  }, [nextImagePath]);

  return (
    <div
      className={`fixed inset-0 z-[100] overflow-hidden bg-black text-white ${
        cursorHidden ? "cursor-none" : "cursor-auto"
      }`}
    >
      {view === "paired" && items.length > 0 && currentItem ? (
        <>
          <AnimatePresence initial={false} mode="sync">
            <motion.div
              key={currentKey}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: "easeInOut" }}
              className="absolute inset-0 flex items-center justify-center bg-black"
            >
              {currentItem.type === "image" ? (
                <img
                  src={getMediaUrl(currentItem.file_path)}
                  alt=""
                  aria-hidden="true"
                  draggable={false}
                  onError={() => setFailedItemId(currentItem.id)}
                  className="h-full w-full object-contain"
                />
              ) : (
                <video
                  src={getMediaUrl(currentItem.file_path)}
                  autoPlay
                  muted
                  playsInline
                  preload="auto"
                  loop={items.length === 1}
                  aria-hidden="true"
                  onEnded={() => advance(currentItem.id)}
                  onError={() => setFailedItemId(currentItem.id)}
                  className="h-full w-full object-contain"
                />
              )}
            </motion.div>
          </AnimatePresence>

          {nextVideoPath ? (
            <video
              key={nextVideoPath}
              src={getMediaUrl(nextVideoPath)}
              muted
              playsInline
              preload="auto"
              aria-hidden="true"
              className="pointer-events-none absolute h-px w-px opacity-0"
            />
          ) : null}
        </>
      ) : view === "paired" ? (
        <div className="relative flex h-full flex-col items-center justify-center overflow-hidden bg-black px-6 text-center">
          <RadialGlow />
          <div className="relative z-10">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/35">
              Now showing
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-6xl">
              {screenName ?? "Crystagrid screen"}
            </h1>
            <p className="mt-6 text-lg text-white/45">
              No playlist assigned yet
            </p>
          </div>
        </div>
      ) : view === "waiting" ? (
        <div className="relative flex h-full flex-col items-center justify-center overflow-hidden bg-black px-6 py-12 text-center">
          <RadialGlow strong />
          <div className="relative z-10 flex w-full max-w-3xl flex-col items-center">
            <BrandLogo />

            <h1 className="mt-12 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              Pair this screen
            </h1>

            <div
              role="status"
              aria-live="polite"
              className="mt-8 flex items-center justify-center gap-4 font-mono text-8xl font-bold tracking-[0.16em] text-white"
            >
              <span>{code ? code.slice(0, 3) : "---"}</span>
              <span>{code ? code.slice(3, 6) : "---"}</span>
            </div>

            <p className="mt-8 text-sm font-medium uppercase tracking-[0.3em] text-white/40">
              Expires in{" "}
              <span className="font-mono tabular-nums text-white/75">
                {formatRemaining(remainingMs)}
              </span>
            </p>

            <p className="mt-10 max-w-xl text-base leading-7 text-white/55">
              Open your Crystagrid dashboard, go to Screens, click Pair Screen
              and enter this code.
            </p>
          </div>
        </div>
      ) : (
        <div className="relative flex h-full flex-col items-center justify-center overflow-hidden bg-black px-6 text-center">
          <RadialGlow strong />
          <div className="relative z-10 flex flex-col items-center">
            <BrandLogo />
            <p className="mt-10 animate-pulse text-sm font-medium uppercase tracking-[0.35em] text-white/40">
              Connecting screen
            </p>
          </div>
        </div>
      )}

      {fullscreenCueVisible && !isFullscreen ? (
        <button
          type="button"
          onClick={() => {
            void toggleFullscreen();
          }}
          className="fixed bottom-6 right-6 z-50 cursor-pointer rounded-full border border-white/20 bg-black/75 px-5 py-3 text-sm font-semibold text-white shadow-2xl backdrop-blur transition hover:border-white/40 hover:bg-black/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70"
        >
          Enter fullscreen
        </button>
      ) : null}
    </div>
  );
}
