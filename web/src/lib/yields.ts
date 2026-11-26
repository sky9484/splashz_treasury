/** Live stablecoin markets shown on Earn. Each maps to a DefiLlama yields pool id. */
export type MarketSource = {
  id: string;
  protocol: string;
  asset: string;
  chain: "BNB Chain" | "Ethereum";
  pool: string; // DefiLlama yields pool UUID
  note: string;
};

export const MARKETS: MarketSource[] = [
  { id: "venus-usdt-bsc", protocol: "Venus Core Pool", asset: "USDT", chain: "BNB Chain", pool: "9f3a6015-5045-4471-ba65-ad3dc7c38269", note: "Largest USDT lending market on BNB Chain. Variable rate, withdraw any time." },
  { id: "venus-usdc-bsc", protocol: "Venus Core Pool", asset: "USDC", chain: "BNB Chain", pool: "89eba1e5-1b1b-47b6-958b-38138a04c244", note: "USDC lending on Venus. Variable rate, withdraw any time." },
  { id: "aave-usdc-eth", protocol: "Aave V3", asset: "USDC", chain: "Ethereum", pool: "aa70268e-4b52-42bf-a116-608b370f9501", note: "Deepest USDC lending market on Ethereum. Variable rate." },
];

export type ChartPoint = { timestamp: string; apy: number | null; apyBase?: number | null; apyReward?: number | null; tvlUsd: number | null };

export type MarketYield = MarketSource & {
  status: "live" | "unavailable";
  apy: number | null;
  apyBase: number | null;
  apy30d: number | null;
  tvlUsd: number | null;
  asOf: string | null;
  url: string;
  error?: string;
};

/** Pure: turn a DefiLlama /chart/{pool} response into the numbers the UI shows. */
export function summarizeChart(source: MarketSource, body: unknown): MarketYield {
  const url = `https://defillama.com/yields/pool/${source.pool}`;
  const data = (body as { data?: ChartPoint[] } | null)?.data;
  const points = Array.isArray(data) ? data.filter((p) => typeof p.apy === "number" && Number.isFinite(p.apy)) : [];
  if (points.length === 0) {
    return { ...source, status: "unavailable", apy: null, apyBase: null, apy30d: null, tvlUsd: null, asOf: null, url, error: "No APY points in response" };
  }
  const last = points[points.length - 1];
  const window = points.slice(-30);
  const apy30d = window.reduce((s, p) => s + (p.apy as number), 0) / window.length;
  return {
    ...source,
    status: "live",
    apy: last.apy,
    apyBase: typeof last.apyBase === "number" ? last.apyBase : null,
    apy30d,
    tvlUsd: typeof last.tvlUsd === "number" ? last.tvlUsd : null,
    asOf: last.timestamp,
    url,
  };
}

export function unavailable(source: MarketSource, error: string): MarketYield {
  return { ...source, status: "unavailable", apy: null, apyBase: null, apy30d: null, tvlUsd: null, asOf: null, url: `https://defillama.com/yields/pool/${source.pool}`, error };
}
