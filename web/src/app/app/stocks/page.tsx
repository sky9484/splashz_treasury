"use client";
import { useState } from "react";
import { useStocks } from "@/lib/live";
import { ago, fmtUsdCompact } from "@/lib/format";

export default function StocksPage() {
  const { data, isLoading, dataUpdatedAt } = useStocks();
  const [pick, setPick] = useState("AAPL");
  const [usdt, setUsdt] = useState("");
  const q = data?.quotes.find((x) => x.ticker === pick);
  const amt = Number(usdt);
  const est = q?.price && amt > 0 ? amt / q.price : null;
  const cols = "0.8fr 1.3fr 1fr 0.8fr 0.9fr 0.6fr";

  return (
    <>
      <div className="top">
        <div>
          <h1>Tokenized stocks</h1>
          <p className="muted" style={{ margin: "8px 0 0", maxWidth: 680, lineHeight: 1.6 }}>
            Live on-chain prices for tokenized US stocks (xStocks), which trade 24/7. Buying opens once a licensed tokenizer partner is connected.
          </p>
        </div>
        <span className="xs muted">
          Source: CoinGecko{data?.via === "browser" ? " (direct)" : ""} · {dataUpdatedAt ? `refreshed ${ago(dataUpdatedAt / 1000)}` : "loading"}
        </span>
      </div>
      {data?.status === "unavailable" && <div className="notice warn">Live prices are unavailable right now. We show dashes rather than old or made-up numbers.</div>}
      <div className="split">
        <section className="panel wide" style={{ padding: "8px 28px" }}>
          <div className="table">
            <div className="row head" style={{ gridTemplateColumns: cols, minWidth: 540 }}>
              <span>Ticker</span><span>Company</span><span>Price</span><span>24h</span><span>Token mcap</span><span>Updated</span>
            </div>
            {(data?.quotes ?? []).map((s) => (
              <button
                key={s.ticker}
                className="row"
                onClick={() => setPick(s.ticker)}
                aria-pressed={pick === s.ticker}
                style={{ gridTemplateColumns: cols, minWidth: 540, width: "100%", background: pick === s.ticker ? "var(--ground)" : "transparent", border: 0, borderBottom: "1px solid var(--line)", textAlign: "left", padding: "14px 8px", boxShadow: pick === s.ticker ? "inset 2px 0 0 var(--primary)" : undefined }}
              >
                <span className="name">{s.ticker}<span className="xs muted">x</span></span>
                <span>{s.name}</span>
                <span className="num">{s.price !== null ? `$${s.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"}</span>
                <span className={`num small ${s.change24h === null ? "muted" : s.change24h >= 0 ? "up" : "down"}`}>
                  {s.change24h !== null ? `${s.change24h >= 0 ? "+" : ""}${s.change24h.toFixed(2)}%` : "—"}
                </span>
                <span className="small muted">{fmtUsdCompact(s.marketCap)}</span>
                <span className="small">{s.updatedAt ? (s.stale ? <span className="tag amber">{ago(s.updatedAt)}</span> : ago(s.updatedAt)) : "—"}</span>
              </button>
            ))}
            {isLoading && Array.from({ length: 6 }, (_, i) => <div key={i} style={{ padding: "16px 8px" }}><span className="skeleton" style={{ width: "60%" }} /></div>)}
          </div>
        </section>
        <section className="panel narrow" style={{ display: "flex", flexDirection: "column", gap: 14, position: "sticky", top: 92 }}>
          <div className="eyebrow">Order preview</div>
          <h2>Buy {pick}x</h2>
          <label className="xs muted" htmlFor="usdt">You pay</label>
          <div className="field">
            <input id="usdt" inputMode="decimal" placeholder="0.00" value={usdt} onChange={(e) => setUsdt(e.target.value)} />
            <span style={{ fontWeight: 500 }}>USDT</span>
          </div>
          <div className="kv"><span>Live price</span><span className="num">{q?.price ? `$${q.price.toFixed(2)}` : "—"}</span></div>
          <div className="kv"><span>Estimated tokens</span><span className="num" style={{ fontWeight: 700 }}>{est !== null ? est.toFixed(6) : "—"}</span></div>
          <div className="kv" style={{ borderBottom: 0 }}><span>Issued by</span><span>Licensed tokenizer partner</span></div>
          <button className="btn primary block" disabled>Review order · partner pending</button>
          <div className="notice ok xs">Tokenized stocks are securities. Splashz shows live prices and an order preview; the order is placed with a licensed tokenizer once that partnership is live.</div>
        </section>
      </div>
    </>
  );
}
