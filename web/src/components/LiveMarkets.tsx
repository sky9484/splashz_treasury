"use client";
import { ago, fmtPct, fmtUsdCompact } from "@/lib/format";
import { useYields as useMarkets } from "@/lib/live";
import { Flash } from "./motion";

export { useYields as useMarkets } from "@/lib/live";

export function LiveMarkets({ title = "Live mainnet markets" }: { title?: string }) {
  const { data, isLoading, isError } = useMarkets();
  return (
    <div>
      <div className="sechead" style={{ marginTop: title === "Live mainnet markets" ? 32 : 0 }}>
        <div>
          <h3>{title}</h3>
          <p>Real supply rates from DefiLlama, refreshed every 5 minutes. The testnet vault mirrors the Venus USDT rate.</p>
        </div>
        {data && <span className="xs muted">Fetched {ago(Date.parse(data.fetchedAt) / 1000)}</span>}
      </div>
      {isError && <div className="notice err">Could not load live rates. They will retry automatically.</div>}
      <div className="cards">
        {(data?.markets ?? Array.from({ length: 6 }, () => null)).map((m, i) =>
          m ? (
            <a key={m.id} className="card" href={m.url} target="_blank" rel="noreferrer" aria-label={`${m.protocol} ${m.asset} on DefiLlama`}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className={`tag ${m.chain === "BNB Chain" ? "gold" : "grey"}`}>{m.chain}</span>
                <span className="xs muted">{m.asset}</span>
              </div>
              <div style={{ fontWeight: 600 }}>{m.protocol}</div>
              <div className="xs muted" style={{ lineHeight: 1.5 }}>{m.note}</div>
              {m.status === "live" ? (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                  <div>
                    <div className="xs muted">Supply APY now</div>
                    <div className="apy"><Flash value={m.apy}>{fmtPct(m.apy)}</Flash></div>
                  </div>
                  <div style={{ textAlign: "right" }} className="xs muted">
                    <div>30-day avg {fmtPct(m.apy30d)}</div>
                    <div>TVL {fmtUsdCompact(m.tvlUsd)}</div>
                  </div>
                </div>
              ) : (
                <div className="notice warn xs">Live rate unavailable right now. We show nothing rather than a guess.</div>
              )}
            </a>
          ) : (
            <div key={i} className="card" aria-busy={isLoading}>
              <span className="skeleton" /> <span className="skeleton" style={{ width: "60%" }} /> <span className="skeleton" style={{ height: 28 }} />
            </div>
          ),
        )}
      </div>
    </div>
  );
}
