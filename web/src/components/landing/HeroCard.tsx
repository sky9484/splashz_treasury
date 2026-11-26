"use client";
import { useEffect, useState } from "react";
import { useMarkets } from "../LiveMarkets";
import { fmtPct } from "@/lib/format";
import { deployment } from "@/lib/deployment";

const FLOW = ["Deposit signed in your wallet", "Units minted to your wallet", "Receipt written on BNB Chain"];

/** A working miniature of the dashboard. Vault rates are live; fund rows are testnet products. */
export function HeroCard() {
  const { data } = useMarkets();
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setStep(3);
      return;
    }
    const t = setInterval(() => setStep((s) => (s + 1) % 4), 1400);
    return () => clearInterval(t);
  }, []);
  const vaults = data?.markets ?? [];
  const funds = deployment.funds.length
    ? deployment.funds.map((f) => ({ name: f.name, market: f.market }))
    : [
        { name: "Shariah Income Fund", market: "Malaysia" },
        { name: "Money Market Fund", market: "Malaysia" },
        { name: "Government Bond Fund", market: "Indonesia" },
      ];

  return (
    <div className="rise" style={{ background: "var(--panel)", border: "1px solid var(--line)", boxShadow: "var(--lift)", marginTop: 56 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 22px", borderBottom: "1px solid var(--line)" }}>
        <span className="eyebrow grey">Splashz · Dashboard</span>
        <span className="chainpill"><i />BNB Smart Chain</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)" }}>
        <div style={{ padding: "22px 22px 26px", borderRight: "1px solid var(--line)" }}>
          <div className="eyebrow grey" style={{ marginBottom: 6 }}>Funds and bonds · licensed fund manager</div>
          {funds.slice(0, 3).map((f) => (
            <div key={f.name} className="kv">
              <span style={{ color: "var(--ink)" }}>{f.name}</span>
              <span className="tag grey">{f.market}</span>
            </div>
          ))}
          <p className="xs muted" style={{ margin: "12px 0 0" }}>NAV signed by the manager, checked on-chain before every order.</p>
        </div>
        <div style={{ padding: "22px 22px 26px" }}>
          <div className="eyebrow grey" style={{ marginBottom: 6 }}>Stablecoin vaults · live supply APY</div>
          {(vaults.length ? vaults.slice(0, 4) : [null, null, null, null]).map((m, i) => (
            <div key={m?.id ?? i} className="kv">
              <span style={{ color: "var(--ink)" }}>{m ? `${m.protocol} ${m.asset}` : <span className="skeleton" />}</span>
              <span className="num">{m ? (m.status === "live" ? fmtPct(m.apy) : "—") : <span className="skeleton" style={{ width: 40 }} />}</span>
            </div>
          ))}
          <p className="xs muted" style={{ margin: "12px 0 0" }}>Source: DefiLlama. Rates move daily.</p>
        </div>
      </div>
      <ol style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", margin: 0, padding: 0, listStyle: "none", borderTop: "1px solid var(--line)" }}>
        {FLOW.map((label, i) => {
          const done = step > i;
          return (
            <li key={label} style={{ padding: "16px 22px", borderRight: i < 2 ? "1px solid var(--line)" : 0, display: "flex", gap: 10, alignItems: "center", background: done ? "var(--primary-soft)" : "transparent", transition: "background 0.4s" }}>
              <span style={{ width: 18, height: 18, borderRadius: 99, border: `1.5px solid ${done ? "var(--primary)" : "var(--line-strong)"}`, background: done ? "var(--primary)" : "transparent", display: "inline-grid", placeItems: "center", flex: "none", transition: "all 0.3s" }}>
                {done && (
                  <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
                    <path d="M2 5.2l2 2 4-4.4" fill="none" stroke="#fff" strokeWidth="1.6" />
                  </svg>
                )}
              </span>
              <span className="xs" style={{ letterSpacing: 1.1, textTransform: "uppercase", color: done ? "var(--primary)" : "var(--muted)" }}>{label}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
