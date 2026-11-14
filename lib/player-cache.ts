import { getMediaUrl } from "./media";

const CACHE_NAME = "crystagrid-media-v1";
const LAST_PLAYLIST_KEY = "crystagrid_last_playlist";
const MAX_FILE_BYTES = 250 * 1024 * 1024;
const MIN_FREE_BYTES = 300 * 1024 * 1024;

export type MediaType = "image" | "video";

export interface PlayerItem {
  id: string;
  type: MediaType;
  file_path: string;
  duration: number | null;
}

const objectUrls = new Map<string, string>();

let activeRun: Promise<void> | null = null;
let queuedItems: PlayerItem[] | null = null;

function hasCacheStorage(): boolean {
  return typeof caches !== "undefined";
}

async function openCache(): Promise<Cache | null> {
  if (!hasCacheStorage()) {
    return null;
  }

  try {
    return await caches.open(CACHE_NAME);
  } catch {
    return null;
  }
}

function parseContentLength(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const length = Number(value);

  return Number.isFinite(length) && length >= 0 ? length : null;
}

async function hasFreeSpace(): Promise<boolean> {
  try {
    const storage = navigator.storage;

    if (!storage || typeof storage.estimate !== "function") {
      return true;
    }

    const estimate = await storage.estimate();
    const quota = estimate.quota ?? 0;
    const usage = estimate.usage ?? 0;

    if (quota <= 0) {
      return true;
    }

    return quota - usage >= MIN_FREE_BYTES;
  } catch {
    return true;
  }
}

async function cancelBody(response: Response): Promise<void> {
  try {
    await response.body?.cancel();
  } catch {
    return;
  }
}

async function runCache(items: PlayerItem[]): Promise<void> {
  const cache = await openCache();

  if (!cache) {
    return;
  }

  for (const item of items) {
    try {
      const url = getMediaUrl(item.file_path);

      if (await cache.match(url, { ignoreVary: true })) {
        continue;
      }

      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        return;
      }

      if (!(await hasFreeSpace())) {
        return;
      }

      const response = await fetch(url);

      if (!response.ok) {
        continue;
      }

      const contentLength = parseContentLength(
        response.headers.get("content-length"),
      );

      if (contentLength !== null && contentLength > MAX_FILE_BYTES) {
        await cancelBody(response);
        continue;
      }

      await cache.put(url, response);
    } catch {
      continue;
    }
  }
}

export function cacheItems(items: PlayerItem[]): Promise<void> {
  if (activeRun) {
    queuedItems = items;
    return activeRun;
  }

  activeRun = runCache(items)
    .catch(() => undefined)
    .finally(() => {
      activeRun = null;

      const next = queuedItems;
      queuedItems = null;

      if (next) {
        void cacheItems(next);
      }
    });

  return activeRun;
}

export async function getPlayableUrl(url: string): Promise<string> {
  const cachedObjectUrl = objectUrls.get(url);

  if (cachedObjectUrl) {
    return cachedObjectUrl;
  }

  try {
    const cache = await openCache();

    if (!cache) {
      return url;
    }

    const response = await cache.match(url, { ignoreVary: true });

    if (!response) {
      return url;
    }

    const blob = await response.blob();
    const createdObjectUrl = URL.createObjectURL(blob);
    const existingObjectUrl = objectUrls.get(url);

    if (existingObjectUrl) {
      URL.revokeObjectURL(createdObjectUrl);
      return existingObjectUrl;
    }

    objectUrls.set(url, createdObjectUrl);

    return createdObjectUrl;
  } catch {
    return url;
  }
}

export async function pruneCache(items: PlayerItem[]): Promise<void> {
  const keep = new Set(items.map((item) => getMediaUrl(item.file_path)));

  try {
    const cache = await openCache();

    if (cache) {
      const requests = await cache.keys();

      await Promise.all(
        requests.map(async (request) => {
          if (keep.has(request.url)) {
            return;
          }

          try {
            await cache.delete(request, { ignoreVary: true });
          } catch {
            return;
          }
        }),
      );
    }
  } catch {
    return;
  } finally {
    for (const [url, objectUrl] of objectUrls) {
      if (!keep.has(url)) {
        URL.revokeObjectURL(objectUrl);
        objectUrls.delete(url);
      }
    }
  }
}

export function saveLastPlaylist(items: PlayerItem[]): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(LAST_PLAYLIST_KEY, JSON.stringify(items));
  } catch {
    return;
  }
}

function parseStoredItem(value: unknown): PlayerItem | null {
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
      : null;

  return {
    id,
    type,
    file_path: filePath,
    duration,
  };
}

export function loadLastPlaylist(): PlayerItem[] | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(LAST_PLAYLIST_KEY);

    if (!raw) {
      return null;
    }

    const parsed: unknown = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return null;
    }

    const items = parsed
      .map((item) => parseStoredItem(item))
      .filter((item): item is PlayerItem => item !== null);

    return items.length > 0 ? items : null;
  } catch {
    return null;
  }
}
