"use client";
import { useBlockNumber, useGasPrice } from "wagmi";
import { formatGwei } from "viem";
import { useAssets } from "@/lib/live";
import { CHAIN } from "@/lib/wagmi";
import { Flash } from "./motion";

/** One line of live context: market prices from CoinGecko, chain state straight from BSC testnet. */
export function LiveStrip() {
  const assets = useAssets();
  const block = useBlockNumber({ chainId: CHAIN.id, watch: true, query: { refetchInterval: 6_000 } });
  const gas = useGasPrice({ chainId: CHAIN.id, query: { refetchInterval: 30_000 } });
  const q = (t: string) => assets.data?.quotes.find((x) => x.ticker === t);
  const bnb = q("BNB");
  const cell = (label: string, value: React.ReactNode, sub?: React.ReactNode) => (
    <div className="strip-cell">
      <span className="eyebrow grey">{label}</span>
      <span className="num">{value}</span>
      {sub}
    </div>
  );
  const price = (t: string, d = 2) => {
    const x = q(t);
    if (assets.isLoading) return <span className="skeleton" style={{ width: 50 }} />;
    return x?.price != null ? <Flash value={x.price}>{`$${x.price.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d })}`}</Flash> : "unavailable";
  };
  return (
    <div className="strip" aria-label="Live market and network data">
      <span className="live-dot" aria-hidden="true" />
      {cell(
        "BNB",
        price("BNB"),
        bnb?.change24h != null ? <span className={`xs ${bnb.change24h >= 0 ? "up" : "down"}`}>{bnb.change24h >= 0 ? "+" : ""}{bnb.change24h.toFixed(2)}%</span> : null,
      )}
      {cell("USDT", price("USDT", 4))}
      {cell("USDC", price("USDC", 4))}
      {cell("Testnet block", block.data ? `#${block.data.toLocaleString("en-US")}` : block.isError ? "unavailable" : <span className="skeleton" style={{ width: 80 }} />)}
      {cell("Gas", gas.data !== undefined ? `${Number(formatGwei(gas.data)).toFixed(2)} gwei` : gas.isError ? "unavailable" : <span className="skeleton" style={{ width: 40 }} />)}
    </div>
  );
}
