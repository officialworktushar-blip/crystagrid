import { buildPlayerHtml } from "@/lib/player-html";
import { getPlayerVersion } from "@/lib/player-version";

export const dynamic = "force-dynamic";

export function GET() {
  const html = buildPlayerHtml(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
    getPlayerVersion(),
  );

  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
