import { describe, it, expect } from "vitest";
import { fmtAmount, parseAmount, withSlippage, fmtPct, ago } from "./format";
import { summarizeChart, MARKETS } from "./yields";
import { parseHermes, EQUITIES } from "./stocks";

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

describe("stocks", () => {
  it("scales Pyth prices by exponent and flags stale quotes", () => {
    const now = 1_800_000_000;
    const body = { parsed: [{ id: EQUITIES[0].id.slice(2), price: { price: "23012345", conf: "1200", expo: -5, publish_time: now - 10 } }] };
    const q = parseHermes(body, now);
    expect(q[0].price).toBeCloseTo(230.12345);
    expect(q[0].stale).toBe(false);
    expect(q[1].price).toBeNull();
    expect(q[1].stale).toBe(true);
  });
});
