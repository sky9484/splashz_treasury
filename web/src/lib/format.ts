import { formatUnits, parseUnits } from "viem";

/** Format an 18-decimal amount for display, e.g. 1234.5 -> "1,234.50". Never rounds up dust into money. */
export function fmtAmount(value: bigint | undefined, decimals = 18, maxFraction = 2): string {
  if (value === undefined) return "—";
  const s = formatUnits(value, decimals);
  const [int, frac = ""] = s.split(".");
  const intFmt = BigInt(int).toLocaleString("en-US");
  const fracCut = frac.slice(0, maxFraction).padEnd(maxFraction, "0");
  return maxFraction > 0 ? `${intFmt}.${fracCut}` : intFmt;
}

/** Parse user input like "1,000.5" into wei. Returns null for anything that is not a positive number. */
export function parseAmount(input: string, decimals = 18): bigint | null {
  const clean = input.replace(/,/g, "").trim();
  if (!/^\d+(\.\d+)?$/.test(clean)) return null;
  const [, frac = ""] = clean.split(".");
  if (frac.length > decimals) return null;
  const v = parseUnits(clean, decimals);
  return v > 0n ? v : null;
}

export function fmtPct(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return `${value.toFixed(digits)}%`;
}

export function fmtUsdCompact(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export function ago(unixSeconds: number, now = Date.now() / 1000): string {
  const d = Math.max(0, Math.floor(now - unixSeconds));
  if (d < 60) return `${d}s ago`;
  if (d < 3600) return `${Math.floor(d / 60)} min ago`;
  if (d < 86400) return `${Math.floor(d / 3600)} h ago`;
  return `${Math.floor(d / 86400)} d ago`;
}

export function shortAddr(a?: string): string {
  return a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "";
}

/** minShares with a slippage buffer in basis points (default 0.5%). */
export function withSlippage(shares: bigint, bps = 50n): bigint {
  return (shares * (10_000n - bps)) / 10_000n;
}
