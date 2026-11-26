/**
 * Tokenized US stocks: xStocks by Backed, priced on CoinGecko. They trade on-chain 24/7, so the
 * price is live even when Nasdaq is closed. CoinGecko ids verified live on 26 Nov 2026.
 */
export const STOCKS = [
  { ticker: "AAPL", name: "Apple", cg: "apple-xstock" },
  { ticker: "NVDA", name: "NVIDIA", cg: "nvidia-xstock" },
  { ticker: "TSLA", name: "Tesla", cg: "tesla-xstock" },
  { ticker: "MSFT", name: "Microsoft", cg: "microsoft-xstock" },
  { ticker: "AMZN", name: "Amazon", cg: "amazon-xstock" },
  { ticker: "GOOGL", name: "Alphabet", cg: "alphabet-xstock" },
  { ticker: "META", name: "Meta", cg: "meta-xstock" },
  { ticker: "CRCL", name: "Circle", cg: "circle-xstock" },
  { ticker: "COIN", name: "Coinbase", cg: "coinbase-xstock" },
  { ticker: "SPY", name: "S&P 500 ETF", cg: "sp500-xstock" },
  { ticker: "QQQ", name: "Nasdaq 100 ETF", cg: "nasdaq-xstock" },
] as const;

export const ASSETS = [
  { symbol: "BNB", cg: "binancecoin" },
  { symbol: "USDT", cg: "tether" },
  { symbol: "USDC", cg: "usd-coin" },
] as const;

export type Quote = {
  ticker: string;
  name: string;
  price: number | null;
  change24h: number | null;
  marketCap: number | null;
  updatedAt: number | null;
  stale: boolean;
};

type CgRow = { usd?: number; usd_24h_change?: number; usd_market_cap?: number; last_updated_at?: number };

export const cgSimplePrice = (ids: readonly string[]) =>
  `/api/v3/simple/price?ids=${ids.join(",")}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true&include_last_updated_at=true`;

/** Pure: CoinGecko /simple/price body → quotes. Missing or non-numeric → null, never a guess. */
export function parseCoinGecko<T extends { cg: string }>(
  list: readonly T[],
  body: unknown,
  nowSec: number,
  label: (x: T) => { ticker: string; name: string },
  maxAgeSec = 30 * 60,
): Quote[] {
  const rows = (body && typeof body === "object" ? body : {}) as Record<string, CgRow>;
  return list.map((x) => {
    const r = rows[x.cg];
    const ok = r && typeof r.usd === "number" && Number.isFinite(r.usd);
    const updatedAt = ok && typeof r.last_updated_at === "number" ? r.last_updated_at : null;
    return {
      ...label(x),
      price: ok ? r.usd! : null,
      change24h: ok && typeof r.usd_24h_change === "number" ? r.usd_24h_change : null,
      marketCap: ok && typeof r.usd_market_cap === "number" ? r.usd_market_cap : null,
      updatedAt,
      stale: !ok || updatedAt === null || nowSec - updatedAt > maxAgeSec,
    };
  });
}

export const parseStocks = (body: unknown, nowSec: number) => parseCoinGecko(STOCKS, body, nowSec, (s) => ({ ticker: s.ticker, name: s.name }));
export const parseAssets = (body: unknown, nowSec: number) => parseCoinGecko(ASSETS, body, nowSec, (a) => ({ ticker: a.symbol, name: a.symbol }));
