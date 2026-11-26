import { NextResponse } from "next/server";
import { MARKETS, summarizeChart, unavailable } from "@/lib/yields";

export const dynamic = "force-dynamic"; // never bake a build-time failure into a static page
const revalidate = 300; // per-fetch cache: DefiLlama refreshes pools roughly hourly

const BASE = process.env.DEFILLAMA_YIELDS_URL || "https://yields.llama.fi";

export async function GET() {
  const results = await Promise.all(
    MARKETS.map(async (m) => {
      try {
        const res = await fetch(`${BASE}/chart/${m.pool}`, { next: { revalidate }, signal: AbortSignal.timeout(8000) });
        if (!res.ok) return unavailable(m, `DefiLlama HTTP ${res.status}`);
        return summarizeChart(m, await res.json());
      } catch (e) {
        return unavailable(m, e instanceof Error ? e.message : "fetch failed");
      }
    }),
  );
  const failed = results.filter((r) => r.status !== "live").map((r) => `${r.id}: ${r.error}`);
  if (failed.length) console.warn("[yields] unavailable:", failed.join("; "));
  return NextResponse.json({ source: "DefiLlama Yields", fetchedAt: new Date().toISOString(), markets: results });
}
