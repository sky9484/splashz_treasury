import { describe, it, expect } from "vitest";
import { fmtAmount, parseAmount, withSlippage, fmtPct, ago } from "./format";
import { summarizeChart, MARKETS } from "./yields";
import { parseStocks, parseAssets, STOCKS } from "./stocks";
import { decodeRound, reconcile, ATLAS_FEEDS } from "./atlas";

describe("format", () => {
  it("formats 18-decimal amounts without rounding up", () => {
    expect(fmtAmount(1234567890000000000000n)).toBe("1,234.56");
    expect(fmtAmount(undefined)).toBe("—");
  });
  it("parses only positive numbers", () => {
    expect(parseAmount("1,000.5")).toBe(1000500000000000000000n);
    expect(parseAmount("0")).toBeNull();
    expect(parseAmount("-1")).toBeNull();
    expect(parseAmount("abc")).toBeNull();
    expect(parseAmount("1.0000000000000000001")).toBeNull();
  });
  it("applies a slippage buffer", () => {
    expect(withSlippage(10_000n)).toBe(9_950n);
  });
  it("handles missing percentages and ages", () => {
    expect(fmtPct(null)).toBe("—");
    expect(ago(100, 160)).toBe("1 min ago");
  });
});

describe("yields", () => {
  const src = MARKETS[0];
  it("summarizes the latest point and a 30-day average", () => {
    const body = { status: "success", data: [
      { timestamp: "2026-11-24T00:00:00Z", apy: 4.0, apyBase: 4.0, tvlUsd: 100 },
      { timestamp: "2026-11-25T00:00:00Z", apy: 5.0, apyBase: 4.5, tvlUsd: 200 },
    ] };
    const y = summarizeChart(src, body);
    expect(y.status).toBe("live");
    expect(y.apy).toBe(5);
    expect(y.apy30d).toBe(4.5);
    expect(y.tvlUsd).toBe(200);
  });
  it("marks a market unavailable instead of inventing a number", () => {
    expect(summarizeChart(src, { data: [] }).status).toBe("unavailable");
    expect(summarizeChart(src, null).apy).toBeNull();
    expect(summarizeChart(src, { data: [{ timestamp: "x", apy: null, tvlUsd: 1 }] }).status).toBe("unavailable");
  });
});

describe("stocks and assets", () => {
  it("maps CoinGecko rows to quotes and flags stale or missing ones", () => {
    const now = 1_800_000_000;
    const body = {
      [STOCKS[0].cg]: { usd: 356.07, usd_24h_change: 0.75, usd_market_cap: 13e6, last_updated_at: now - 24 },
      [STOCKS[1].cg]: { usd: 150.5, last_updated_at: now - 7200 },
      [STOCKS[2].cg]: { usd: "oops" },
    };
    const q = parseStocks(body, now);
    expect(q[0]).toMatchObject({ ticker: "AAPL", price: 356.07, change24h: 0.75, stale: false });
    expect(q[1].stale).toBe(true);
    expect(q[2].price).toBeNull();
    expect(q[3].price).toBeNull();
    expect(q).toHaveLength(STOCKS.length);
  });
  it("never invents a price when the body is empty", () => {
    expect(parseAssets(null, 1).every((a) => a.price === null && a.stale)).toBe(true);
  });
});

describe("atlas on-chain prices", () => {
  const now = 1_800_000_000;
  const e18 = (n: number) => BigInt(Math.round(n * 1e6)) * 10n ** 12n;
  it("decodes an 18-decimal round and flags staleness", () => {
    const fresh = decodeRound("AAPL", [1n, e18(355.66), 0n, BigInt(now - 600), 1n], now);
    expect(fresh.price).toBeCloseTo(355.66, 6);
    expect(fresh.stale).toBe(false);
    expect(decodeRound("AAPL", [1n, e18(355.66), 0n, BigInt(now - 7 * 3600), 1n], now).stale).toBe(true);
  });
  it("rejects non-positive answers and missing timestamps", () => {
    expect(decodeRound("AAPL", [1n, 0n, 0n, BigInt(now), 1n], now).price).toBeNull();
    expect(decodeRound("AAPL", [1n, -5n, 0n, BigInt(now), 1n], now).price).toBeNull();
    expect(decodeRound("AAPL", [1n, e18(1), 0n, 0n, 1n], now).price).toBeNull();
    expect(decodeRound("AAPL", null, now).price).toBeNull();
  });
  it("uses on-chain as price of record and off-chain as witness", () => {
    const on = decodeRound("AAPL", [1n, e18(100), 0n, BigInt(now - 60), 1n], now);
    expect(reconcile(on, 100.5).status).toBe("verified");
    expect(reconcile(on, 101.5).status).toBe("check");
    expect(reconcile(on, 103).status).toBe("disagree");
    expect(reconcile(on, null).status).toBe("onchain-only");
    expect(reconcile(undefined, 100).status).toBe("offchain-only");
    expect(reconcile(undefined, null).status).toBe("unavailable");
    const stale = decodeRound("AAPL", [1n, e18(100), 0n, BigInt(now - 7 * 3600), 1n], now);
    expect(reconcile(stale, 100).status).toBe("offchain-only");
  });
  it("covers every listed stock", () => {
    for (const s of STOCKS) expect(ATLAS_FEEDS[s.ticker]).toBeDefined();
  });
});
