"use client";
import { useMarkets } from "../LiveMarkets";
import { fmtPct } from "@/lib/format";

/** Real supply APYs, straight from /api/yields. If a source is down we say so. */
export function LiveTicker() {
  const { data, isError } = useMarkets();
  const rows = data?.markets ?? [];
  return (
    <div className="ticker" aria-live="polite">
      {(rows.length ? rows : [null, null, null]).map((m, i) => (
        <div key={m?.id ?? i}>
          <span className="small">
            {m ? <>{m.protocol} <span className="muted">· {m.asset} · {m.chain}</span></> : <span className="skeleton" style={{ width: 160 }} />}
          </span>
          <span className="num" style={{ fontSize: 20 }}>
            {isError ? <span className="xs muted">unavailable</span> : m ? (m.status === "live" ? fmtPct(m.apy) : <span className="xs muted">unavailable</span>) : <span className="skeleton" style={{ width: 54 }} />}
          </span>
        </div>
      ))}
    </div>
  );
}
