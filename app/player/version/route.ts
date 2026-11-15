import { getPlayerVersion } from "@/lib/player-version";

export const dynamic = "force-dynamic";

export function GET() {
  return new Response(JSON.stringify({ v: getPlayerVersion() }), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
