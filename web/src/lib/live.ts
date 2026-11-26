"use client";
import { useQuery } from "@tanstack/react-query";
import { MARKETS, summarizeChart, unavailable, type MarketYield } from "./yields";
import { cgSimplePrice, parseAssets, parseStocks, STOCKS, ASSETS, type Quote } from "./stocks";
import { createPublicClient, fallback as viemFallback, http as viemHttp } from "viem";
import { bsc } from "viem/chains";
import { ATLAS_FEEDS, BSC_MAINNET_RPCS, aggregatorV3Abi, decodeRound, type OnchainPrice } from "./atlas";


/**
 * Every live feed tries our server route first (cached, keeps API keys server-side), then the
 * public API straight from the browser if the server can't reach it. Both DefiLlama and CoinGecko
 * allow browser calls. If both fail, the UI shows "unavailable" — never a made-up number.
 */
const LLAMA = "https://yields.llama.fi";
const CG = "https://api.coingecko.com";
const now = () => Date.now() / 1000;

async function json(url: string) {
  const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error(`${url} → ${r.status}`);
  return r.json();
}

export type YieldsResult = { fetchedAt: string; via: "server" | "browser" | "mixed"; markets: MarketYield[] };

export async function loadYields(): Promise<YieldsResult> {
  let markets: MarketYield[] = MARKETS.map((m) => unavailable(m, "not loaded"));
  try {
    markets = ((await json("/api/yields")) as { markets: MarketYield[] }).markets;
  } catch {
    /* fall through to browser */
  }
  const missing = markets.filter((m) => m.status !== "live").map((m) => m.id);
  if (missing.length) {
    const fixed = await Promise.all(
      MARKETS.filter((m) => missing.includes(m.id)).map(async (m) => {
        try {
          return summarizeChart(m, await json(`${LLAMA}/chart/${m.pool}`));
        } catch (e) {
          return unavailable(m, e instanceof Error ? e.message : "fetch failed");
        }
      }),
    );
    markets = markets.map((m) => fixed.find((f) => f.id === m.id) ?? m);
  }
  const via = missing.length === 0 ? "server" : missing.length === MARKETS.length ? "browser" : "mixed";
  return { fetchedAt: new Date().toISOString(), via, markets };
}

export type PricesResult = { status: "live" | "unavailable"; via: "server" | "browser" | null; quotes: Quote[] };

async function loadPrices(route: string, ids: readonly string[], parse: (b: unknown, n: number) => Quote[]): Promise<PricesResult> {
  try {
    const body = (await json(route)) as PricesResult;
    if (body.status === "live") return body;
  } catch {
    /* fall through */
  }
  try {
    return { status: "live", via: "browser", quotes: parse(await json(CG + cgSimplePrice(ids)), now()) };
  } catch {
    return { status: "unavailable", via: null, quotes: parse(null, now()) };
  }
}

export const useYields = () => useQuery({ queryKey: ["yields"], queryFn: loadYields, refetchInterval: 5 * 60_000, staleTime: 60_000 });
export const useStocks = () =>
  useQuery({ queryKey: ["stocks"], queryFn: () => loadPrices("/api/stocks", STOCKS.map((s) => s.cg), parseStocks), refetchInterval: 60_000 });
export const useAssets = () =>
  useQuery({ queryKey: ["assets"], queryFn: () => loadPrices("/api/market", ASSETS.map((a) => a.cg), parseAssets), refetchInterval: 60_000 });

/* ---------- On-chain stock prices: Atlas on BNB Chain mainnet, read directly by the browser ---------- */

// JSON-RPC batching groups the eth_calls into one HTTP request, but each stays a direct call to the feed.
// Do NOT enable `batch.multicall`: Atlas whitelist-mode feeds refuse reads that come through a contract.
const mainnet = createPublicClient({
  chain: bsc,
  transport: viemFallback(BSC_MAINNET_RPCS.map((u) => viemHttp(u, { batch: true, timeout: 8_000 }))),
});

export async function loadOnchainStocks(): Promise<OnchainPrice[]> {
  const t = now();
  return Promise.all(
    Object.entries(ATLAS_FEEDS).map(async ([ticker, f]) => {
      try {
        const raw = await mainnet.readContract({ address: f.feed, abi: aggregatorV3Abi, functionName: "latestRoundData" });
        return decodeRound(ticker, raw, t);
      } catch {
        return decodeRound(ticker, null, t);
      }
    }),
  );
}

export const useOnchainStocks = () => useQuery({ queryKey: ["atlas"], queryFn: loadOnchainStocks, refetchInterval: 30_000 });
