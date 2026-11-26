import { NextResponse } from "next/server";
import { STOCKS, cgSimplePrice, parseStocks } from "@/lib/stocks";
import { coingecko } from "@/lib/coingecko";

export const dynamic = "force-dynamic";

export async function GET() {
  const r = await coingecko(cgSimplePrice(STOCKS.map((s) => s.cg)));
  const now = Date.now() / 1000;
  if (!r.ok) return NextResponse.json({ status: "unavailable", via: null, error: r.error, quotes: parseStocks(null, now) });
  return NextResponse.json({ status: "live", via: "server", source: "CoinGecko · xStocks", quotes: parseStocks(r.body, now) });
}
