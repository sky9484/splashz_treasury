import { NextResponse } from "next/server";
import { ASSETS, cgSimplePrice, parseAssets } from "@/lib/stocks";
import { coingecko } from "@/lib/coingecko";

export const dynamic = "force-dynamic";

export async function GET() {
  const r = await coingecko(cgSimplePrice(ASSETS.map((a) => a.cg)));
  const now = Date.now() / 1000;
  if (!r.ok) return NextResponse.json({ status: "unavailable", via: null, error: r.error, quotes: parseAssets(null, now) });
  return NextResponse.json({ status: "live", via: "server", quotes: parseAssets(r.body, now) });
}
