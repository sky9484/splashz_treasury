import { NextResponse } from "next/server";
import { EQUITIES, parseHermes } from "@/lib/stocks";

export const dynamic = "force-dynamic";

const HERMES = process.env.PYTH_HERMES_URL || "https://pyth.dourolabs.app/hermes";

export async function GET() {
  const key = process.env.PYTH_API_KEY;
  const empty = parseHermes(null, Date.now() / 1000);
  if (!key) {
    return NextResponse.json({ status: "no_key", message: "Live prices need PYTH_API_KEY on the server.", quotes: empty });
  }
  const qs = EQUITIES.map((e) => `ids[]=${e.id}`).join("&");
  try {
    const res = await fetch(`${HERMES}/v2/updates/price/latest?${qs}&parsed=true&ignore_invalid_price_ids=true`, {
      headers: { Authorization: `Bearer ${key}` },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.warn("[stocks] Hermes HTTP", res.status);
      return NextResponse.json({ status: "error", message: `Price service returned ${res.status}.`, quotes: empty });
    }
    return NextResponse.json({ status: "live", source: "Pyth", quotes: parseHermes(await res.json(), Date.now() / 1000) });
  } catch (e) {
    console.warn("[stocks] Hermes fetch failed", e);
    return NextResponse.json({ status: "error", message: "Price service unreachable.", quotes: empty });
  }
}
