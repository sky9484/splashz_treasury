"use client";
import { useQuery } from "@tanstack/react-query";
import type { MarketYield } from "@/lib/yields";
import { ago, fmtPct, fmtUsdCompact } from "@/lib/format";

export function useMarkets() {
  return useQuery({
    queryKey: ["markets"],
    queryFn: async () => {
      const r = await fetch("/api/yields");
      if (!r.ok) throw new Error(`yields ${r.status}`);
      return (await r.json()) as { fetchedAt: string; markets: MarketYield[] };
    },
    refetchInterval: 5 * 60_000,
  });
}

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
        {(data?.markets ?? Array.from({ length: 3 }, () => null)).map((m, i) =>
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
                    <div className="apy">{fmtPct(m.apy)}</div>
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
