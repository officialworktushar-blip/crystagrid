import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export type RealtimeEvent = "refresh" | "restart" | "paired";

const SUBSCRIBE_TIMEOUT_MS = 3000;

let realtimeClient: ReturnType<typeof createClient> | null = null;

function getRealtimeClient(): ReturnType<typeof createClient> {
  realtimeClient ??= createClient();
  return realtimeClient;
}

function waitForSubscribed(channel: RealtimeChannel): Promise<void> {
  return new Promise((resolve) => {
    let settled = false;
    const timeout = globalThis.setTimeout(() => {
      if (settled) {
        return;
      }

      settled = true;
      resolve();
    }, SUBSCRIBE_TIMEOUT_MS);

    channel.subscribe((status) => {
      if (status !== "SUBSCRIBED" || settled) {
        return;
      }

      settled = true;
      globalThis.clearTimeout(timeout);
      resolve();
    });
  });
}

export async function notifyChannel(
  topic: string,
  event: RealtimeEvent,
): Promise<void> {
  try {
    const supabase = getRealtimeClient();
    const channel = supabase.channel(topic);

    await waitForSubscribed(channel).catch(() => undefined);
    await channel
      .send({ type: "broadcast", event, payload: {} })
      .catch(() => undefined);
    await supabase.removeChannel(channel).catch(() => undefined);
  } catch {
    return;
  }
}

export async function notifyScreens(
  screenIds: string[],
  event: RealtimeEvent,
): Promise<void> {
  await Promise.allSettled(
    screenIds.map((id) => notifyChannel(`screen:${id}`, event)),
  );
}
