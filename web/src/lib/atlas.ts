/**
 * Atlas Oracle (CoinMarketCap-backed successor to Binance Oracle) — on-chain prices for bStocks on
 * BNB Chain MAINNET. SingleFeed contracts are Chainlink AggregatorV3-compatible, 18 decimals.
 * Addresses: lista-dao/lista-new-contracts script/oracle/deployAtlasOracleAdaptors.sol.
 * Verified live by browser eth_call on 26 Nov 2026 (AAPLb $355.66 vs CoinGecko $356.07).
 *
 * IMPORTANT: most feeds are in whitelist mode. Plain eth_calls (EOA-style, no contract in between)
 * are allowed; calls routed through a contract — Multicall3 or any of our testnet contracts — are not.
 * So we read each feed with its own eth_call (JSON-RPC batched), never via multicall.
 */
import type { Address } from "viem";

export const ATLAS_DECIMALS = 18;
export const ATLAS_MAX_AGE_SEC = 6 * 60 * 60; // feeds update on deviation + heartbeat; > 6 h = treat as stale

export const ATLAS_FEEDS: Record<string, { symbol: string; feed: Address }> = {
  AAPL: { symbol: "AAPLB/USD", feed: "0xD96eB519e205cEA68522E6639B6464249948294c" },
  NVDA: { symbol: "NVDAB/USD", feed: "0x67d168bF5d7851a7b361bFFcf794696858F9697A" },
  TSLA: { symbol: "TSLAB/USD", feed: "0xC64bF44C23586aE5eab37775662Dc1E0c56469fe" },
  MSFT: { symbol: "MSFTB/USD", feed: "0xe39fC955A9b926d5ce0242505006611678180307" },
  AMZN: { symbol: "AMZNB/USD", feed: "0x7fCB7E7731B4D31eCc5603EC080827094A595eD5" },
  GOOGL: { symbol: "GOOGLB/USD", feed: "0x2FcEafD81a4dBDa2409B6fe5ce2afFe3cD46eDbC" },
  META: { symbol: "METAB/USD", feed: "0xD53300F42830552D826244fc17a6A0a4a95980A6" },
  CRCL: { symbol: "CRCLB/USD", feed: "0x3Fe4Ad1BBb3ad138AA7d8a63a9A2984eC9641064" },
  COIN: { symbol: "COINB/USD", feed: "0x758aB25F2Db37AAE2CC09D5542B2C69b5fC70E61" },
  SPY: { symbol: "SPYB/USD", feed: "0xCda6d5cE036AC0D6A387A377062EBd18Dd531177" },
  QQQ: { symbol: "QQQB/USD", feed: "0x7D2f703D2A188f32310dC9707E86acE503207027" },
};

export const BSC_MAINNET_RPCS = [
  process.env.NEXT_PUBLIC_BSC_MAINNET_RPC,
  "https://bsc-rpc.publicnode.com",
  "https://bsc.drpc.org",
].filter((u): u is string => !!u);

export const aggregatorV3Abi = [
  {
    type: "function",
    name: "latestRoundData",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "roundId", type: "uint80" },
      { name: "answer", type: "int256" },
      { name: "startedAt", type: "uint256" },
      { name: "updatedAt", type: "uint256" },
      { name: "answeredInRound", type: "uint80" },
    ],
  },
] as const;

export type OnchainPrice = { ticker: string; price: number | null; updatedAt: number | null; stale: boolean; feed: Address; symbol: string };

/** Pure: raw latestRoundData → price. Non-positive answers and zero timestamps are rejected, not shown. */
export function decodeRound(ticker: string, raw: readonly [bigint, bigint, bigint, bigint, bigint] | null, nowSec: number): OnchainPrice {
  const meta = ATLAS_FEEDS[ticker];
  if (!raw || raw[1] <= 0n || raw[3] === 0n) return { ticker, price: null, updatedAt: null, stale: true, ...meta };
  const updatedAt = Number(raw[3]);
  // two-step scaling keeps precision for prices < 2^53 / 1e6
  const price = Number(raw[1] / 10n ** BigInt(ATLAS_DECIMALS - 6)) / 1e6;
  return { ticker, price, updatedAt, stale: nowSec - updatedAt > ATLAS_MAX_AGE_SEC, ...meta };
}

export type PriceCheck = "verified" | "check" | "disagree" | "onchain-only" | "offchain-only" | "unavailable";

/**
 * Pure: the on-chain price is the price of record; the off-chain price is a witness.
 *   ≤ 1%  → verified   (both sources agree)
 *   ≤ 2%  → check      (shown, flagged)
 *   > 2%  → disagree   (order preview paused)
 * A stale on-chain price never counts as verified.
 */
export function reconcile(onchain: OnchainPrice | undefined, offchain: number | null): { status: PriceCheck; deviationPct: number | null } {
  const on = onchain && !onchain.stale ? onchain.price : null;
  if (on === null && offchain === null) return { status: "unavailable", deviationPct: null };
  if (on === null) return { status: "offchain-only", deviationPct: null };
  if (offchain === null) return { status: "onchain-only", deviationPct: null };
  const dev = (Math.abs(on - offchain) / on) * 100;
  return { status: dev <= 1 ? "verified" : dev <= 2 ? "check" : "disagree", deviationPct: dev };
}
