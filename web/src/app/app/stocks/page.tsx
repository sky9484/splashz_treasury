"use client";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import type { Quote } from "@/lib/stocks";
import { ago } from "@/lib/format";

type StocksResponse = { status: "live" | "no_key" | "error"; message?: string; quotes: Quote[] };

export default function StocksPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["stocks"],
    queryFn: async () => (await (await fetch("/api/stocks")).json()) as StocksResponse,
    refetchInterval: 15_000,
  });
  const [pick, setPick] = useState("AAPL");
  const [usdt, setUsdt] = useState("");
  const q = data?.quotes.find((x) => x.ticker === pick);
  const amt = Number(usdt);
  const est = q?.price && amt > 0 ? amt / q.price : null;

  return (
    <>
      <div className="top">
        <div>
          <h1>Tokenized stocks</h1>
          <p className="muted" style={{ margin: "6px 0 0" }}>US stocks, priced live by Pyth. Buying opens once a licensed tokenizer partner is connected.</p>
        </div>
      </div>
      {data && data.status !== "live" && <div className="notice warn">{data.message} Prices show as unavailable instead of made-up numbers.</div>}
      <div className="split">
        <section className="panel wide">
          <div className="table">
            <div className="row head" style={{ gridTemplateColumns: "1fr 2fr 1.2fr 1fr 1.2fr", minWidth: 560 }}><span>Ticker</span><span>Company</span><span>Price (USD)</span><span>± conf</span><span>Updated</span></div>
            {(data?.quotes ?? []).map((s) => (
              <button
                key={s.ticker}
                className="row"
                onClick={() => setPick(s.ticker)}
                aria-pressed={pick === s.ticker}
                style={{ gridTemplateColumns: "1fr 2fr 1.2fr 1fr 1.2fr", minWidth: 560, width: "100%", background: pick === s.ticker ? "var(--chip)" : "transparent", border: 0, borderBottom: "1px solid var(--line-soft)", textAlign: "left", padding: "14px 8px", borderRadius: 8 }}
              >
                <span className="name">{s.ticker}</span>
                <span>{s.name}</span>
                <span className="num">{s.price !== null ? s.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—"}</span>
                <span className="num xs muted">{s.conf !== null ? s.conf.toFixed(2) : "—"}</span>
                <span>{s.publishTime ? (s.stale ? <span className="tag amber">Market closed · {ago(s.publishTime)}</span> : ago(s.publishTime)) : "—"}</span>
              </button>
            ))}
            {isLoading && <div style={{ padding: 16 }}><span className="skeleton" style={{ width: "50%" }} /></div>}
          </div>
        </section>
        <section className="panel narrow" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <h2>Buy {pick}</h2>
          <label className="xs muted" htmlFor="usdt">You pay</label>
          <div className="field">
            <input id="usdt" inputMode="decimal" placeholder="0.00" value={usdt} onChange={(e) => setUsdt(e.target.value)} />
            <span style={{ fontWeight: 600 }}>USDT</span>
          </div>
          <div className="kv"><span>Price</span><span className="num">{q?.price ? `$${q.price.toFixed(2)}` : "—"}</span></div>
          <div className="kv"><span>Estimated shares</span><span className="num" style={{ fontWeight: 700 }}>{est !== null ? est.toFixed(6) : "—"}</span></div>
          <div className="kv" style={{ borderBottom: 0 }}><span>Issued by</span><span>Licensed tokenizer partner</span></div>
          <button className="btn primary block" disabled>Review order · partner pending</button>
          <div className="notice ok xs">Tokenized stocks are securities. Splashz shows live prices and the order preview only; the order is placed with a licensed tokenizer once that partnership is live.</div>
        </section>
      </div>
    </>
  );
}
