"use client";
import { useMemo, useState } from "react";
import { useOnchainStocks, useStocks } from "@/lib/live";
import { reconcile, type PriceCheck } from "@/lib/atlas";
import { ago } from "@/lib/format";
import { Flash, Reveal } from "@/components/motion";

const CHECK: Record<PriceCheck, { label: string; tag: string; hint: string }> = {
  verified: { label: "Verified", tag: "green", hint: "On-chain and off-chain prices agree within 1%." },
  check: { label: "Check", tag: "amber", hint: "Sources differ by 1–2%. Shown, but flagged." },
  disagree: { label: "Disagree", tag: "red", hint: "Sources differ by more than 2%. Orders paused." },
  "onchain-only": { label: "On-chain only", tag: "blue", hint: "Off-chain witness unavailable." },
  "offchain-only": { label: "No on-chain", tag: "amber", hint: "On-chain feed missing or stale. Orders paused." },
  unavailable: { label: "Unavailable", tag: "grey", hint: "No source is answering." },
};
const usd = (n: number | null | undefined) => (n == null ? "—" : `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);

export default function StocksPage() {
  const atlas = useOnchainStocks();
  const cg = useStocks();
  const [pick, setPick] = useState("AAPL");
  const [usdt, setUsdt] = useState("");

  const rows = useMemo(
    () =>
      (cg.data?.quotes ?? []).map((q) => {
        const on = atlas.data?.find((a) => a.ticker === q.ticker);
        return { ...q, on, ...reconcile(on, q.price) };
      }),
    [cg.data, atlas.data],
  );
  const r = rows.find((x) => x.ticker === pick);
  const recordPrice = r?.on && !r.on.stale ? r.on.price : null;
  const amt = Number(usdt);
  const est = recordPrice && amt > 0 ? amt / recordPrice : null;
  const cols = "1.3fr 1fr 1fr 0.6fr 0.9fr 0.7fr";

  return (
    <>
      <Reveal className="top">
        <div>
          <div className="eyebrow">Tokenized stocks</div>
          <h1 style={{ marginTop: 10 }}>Priced on-chain, checked off-chain.</h1>
          <p className="muted" style={{ margin: "10px 0 0", maxWidth: 720, lineHeight: 1.6 }}>
            The price of record is read straight from Atlas oracle contracts on BNB Chain. CoinGecko is an independent witness. If the two disagree, ordering pauses.
          </p>
        </div>
        <span className="xs muted">{atlas.dataUpdatedAt ? `On-chain read ${ago(atlas.dataUpdatedAt / 1000)}` : "Reading chain…"}</span>
      </Reveal>

      <Reveal i={1} className="pricesteps" as="ol">
        <li><span className="n">01</span><b>Read on-chain</b><span>Atlas SingleFeed · BNB Chain mainnet · direct eth_call</span></li>
        <li><span className="n">02</span><b>Check freshness</b><span>Rejected if older than 6 h, zero or negative</span></li>
        <li><span className="n">03</span><b>Cross-check off-chain</b><span>CoinGecko xStocks · within 1% = verified</span></li>
        <li><span className="n">04</span><b>Quote</b><span>Order preview uses the on-chain price only</span></li>
      </Reveal>

      <div className="split">
        <Reveal i={2} className="panel wide" style={{ padding: "8px 28px" }}>
          <div className="table">
            <div className="row head" style={{ gridTemplateColumns: cols, minWidth: 520 }}>
              <span>Stock</span><span>On-chain</span><span>CoinGecko</span><span>Diff</span><span>Check</span><span>Age</span>
            </div>
            {rows.map((s) => (
              <button
                key={s.ticker}
                className={`row selectable${pick === s.ticker ? " on" : ""}`}
                onClick={() => setPick(s.ticker)}
                aria-pressed={pick === s.ticker}
                style={{ gridTemplateColumns: cols, minWidth: 520 }}
              >
                <span><span className="name">{s.ticker}<span className="xs muted">b</span></span><br /><span className="xs muted">{s.name}</span></span>
                <span className="num"><Flash value={s.on?.price}>{atlas.isLoading ? <span className="skeleton" style={{ width: 60 }} /> : usd(s.on?.price)}</Flash></span>
                <span className="num muted"><Flash value={s.price}>{usd(s.price)}</Flash></span>
                <span className="num small">{s.deviationPct != null ? `${s.deviationPct.toFixed(2)}%` : "—"}</span>
                <span><span className={`tag ${CHECK[s.status].tag}`} title={CHECK[s.status].hint}>{CHECK[s.status].label}</span></span>
                <span className="small muted">{s.on?.updatedAt ? ago(s.on.updatedAt) : "—"}</span>
              </button>
            ))}
            {cg.isLoading && Array.from({ length: 6 }, (_, i) => <div key={i} style={{ padding: "16px 8px" }}><span className="skeleton" style={{ width: "60%" }} /></div>)}
          </div>
        </Reveal>

        <Reveal i={3} className="panel narrow" style={{ display: "flex", flexDirection: "column", gap: 14, position: "sticky", top: 92 }}>
          <div className="eyebrow">Order preview</div>
          <h2>Buy {pick}b</h2>
          <label className="xs muted" htmlFor="usdt">You pay</label>
          <div className="field">
            <input id="usdt" inputMode="decimal" placeholder="0.00" value={usdt} onChange={(e) => setUsdt(e.target.value)} />
            <span style={{ fontWeight: 500 }}>USDT</span>
          </div>
          <div className="kv"><span>Price of record (on-chain)</span><span className="num">{usd(recordPrice)}</span></div>
          <div className="kv"><span>Price check</span><span>{r ? <span className={`tag ${CHECK[r.status].tag}`}>{CHECK[r.status].label}</span> : "—"}</span></div>
          <div className="kv"><span>Estimated tokens</span><span className="num" style={{ fontWeight: 700 }}>{est !== null ? est.toFixed(6) : "—"}</span></div>
          {r?.on && (
            <div className="kv"><span>Oracle feed</span><a className="mono" href={`https://bscscan.com/address/${r.on.feed}`} target="_blank" rel="noreferrer" style={{ textDecoration: "underline" }}>{r.on.symbol} ↗</a></div>
          )}
          <button className="btn primary block" disabled>Review order · partner pending</button>
          <div className="notice ok xs">
            Tokenized stocks are securities. Orders open with a licensed tokenizer partner. Even then, an order can only be quoted while the price check is Verified or Check.
          </div>
        </Reveal>
      </div>
    </>
  );
}
