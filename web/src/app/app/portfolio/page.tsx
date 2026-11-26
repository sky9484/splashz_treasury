"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useAccount, useReadContracts } from "wagmi";
import { useFunds } from "@/lib/useFunds";
import { deployment, explorer, isDeployed } from "@/lib/deployment";
import { vaultAbi } from "@/lib/abi";
import { fmtAmount } from "@/lib/format";

type Receipt = { kind: string; product: string; txHash: string; blockNumber: string; amount: string; detail: string };

export default function PortfolioPage() {
  const { address } = useAccount();
  const { funds } = useFunds();
  const shares = useReadContracts({
    contracts: [{ address: deployment.vault, abi: vaultAbi, functionName: "balanceOf", args: [address ?? "0x0000000000000000000000000000000000000000"] }],
    query: { enabled: isDeployed && !!address },
  }).data?.[0]?.result as bigint | undefined;
  const vaultVal = useReadContracts({
    contracts: [{ address: deployment.vault, abi: vaultAbi, functionName: "convertToAssets", args: [shares ?? 0n] }],
    query: { enabled: isDeployed && shares !== undefined },
  }).data?.[0]?.result as bigint | undefined;

  const receipts = useQuery({
    queryKey: ["receipts", address],
    enabled: !!address,
    queryFn: async () => {
      const r = await fetch(`/api/receipts?address=${address}`);
      const body = (await r.json()) as { receipts: Receipt[]; error?: string; note?: string };
      if (!r.ok) throw new Error(body.error ?? `HTTP ${r.status}`);
      return body;
    },
    refetchInterval: 60_000,
  });

  const rows = deployment.funds
    .map((f) => {
      const s = funds.find((x) => x.key === f.key);
      return { name: f.name, units: s?.units, value: s?.units && s?.nav ? (s.units * s.nav) / 10n ** 18n : undefined, nav: s?.nav, href: `/app/funds/${f.key}` };
    })
    .filter((r) => r.units && r.units > 0n);

  return (
    <>
      <div className="top">
        <div>
          <h1>Portfolio</h1>
          <p className="muted" style={{ margin: "6px 0 0" }}>Everything here is read from BNB Chain. No database, no Splashz-held balances.</p>
        </div>
      </div>
      {!address ? (
        <div className="panel"><p className="muted" style={{ margin: 0 }}>Connect your wallet to see holdings and receipts.</p></div>
      ) : (
        <>
          <section className="panel">
            <h2 style={{ marginBottom: 14 }}>Holdings</h2>
            <div className="table">
              <div className="row head" style={{ gridTemplateColumns: "2.4fr 1fr 1fr 1fr 1fr" }}><span>Product</span><span>Units</span><span>NAV</span><span>Value (tUSDT)</span><span /></div>
              {rows.map((r) => (
                <div key={r.name} className="row" style={{ gridTemplateColumns: "2.4fr 1fr 1fr 1fr 1fr" }}>
                  <span className="name">{r.name}</span>
                  <span className="num">{fmtAmount(r.units, 18, 4)}</span>
                  <span className="num">{fmtAmount(r.nav, 18, 4)}</span>
                  <span className="num">{fmtAmount(r.value)}</span>
                  <Link href={r.href} className="btn outline" style={{ justifySelf: "end" }}>Manage</Link>
                </div>
              ))}
              {vaultVal !== undefined && vaultVal > 0n && (
                <div className="row" style={{ gridTemplateColumns: "2.4fr 1fr 1fr 1fr 1fr" }}>
                  <span className="name">Splashz USDT Vault</span><span className="num">{fmtAmount(shares, 24, 2)}</span><span className="muted">ERC-4626</span>
                  <span className="num">{fmtAmount(vaultVal)}</span>
                  <Link href="/app" className="btn outline" style={{ justifySelf: "end" }}>Manage</Link>
                </div>
              )}
              {rows.length === 0 && !(vaultVal && vaultVal > 0n) && <div className="muted small" style={{ padding: "16px 0" }}>No holdings yet. <Link href="/app" style={{ textDecoration: "underline" }}>Start on Earn</Link>.</div>}
            </div>
          </section>
          <section className="panel">
            <div className="sechead">
              <div><h2>Receipts</h2><p>Each line is a contract event. Open the transaction to verify it yourself.</p></div>
              <button className="btn ghost" onClick={() => receipts.refetch()} disabled={receipts.isFetching}>{receipts.isFetching ? "Reading chain…" : "Refresh"}</button>
            </div>
            {receipts.isError && <div className="notice err">{(receipts.error as Error).message}</div>}
            {receipts.data?.note && <div className="notice warn">{receipts.data.note}</div>}
            <div className="table">
              <div className="row head" style={{ gridTemplateColumns: "1.4fr 1.8fr 1fr 2fr 1fr" }}><span>Event</span><span>Product</span><span>Amount</span><span>Detail</span><span>Tx</span></div>
              {receipts.isLoading && <div style={{ padding: 16 }}><span className="skeleton" style={{ width: "40%" }} /></div>}
              {receipts.data?.receipts.map((r) => (
                <div key={r.txHash + r.kind} className="row" style={{ gridTemplateColumns: "1.4fr 1.8fr 1fr 2fr 1fr" }}>
                  <span><span className={`tag ${r.kind.includes("pending") || r.kind.includes("requested") ? "amber" : r.kind.includes("cancel") ? "grey" : "green"}`}>{r.kind}</span></span>
                  <span>{r.product}</span>
                  <span className="num">{r.amount !== "0" ? fmtAmount(BigInt(r.amount)) : "—"}</span>
                  <span className="xs muted">{r.detail}</span>
                  <a className="mono" href={`${explorer}/tx/${r.txHash}`} target="_blank" rel="noreferrer" style={{ textDecoration: "underline" }}>{r.txHash.slice(0, 10)}…</a>
                </div>
              ))}
              {receipts.data && receipts.data.receipts.length === 0 && !receipts.data.note && <div className="muted small" style={{ padding: "16px 0" }}>No receipts in the last ~day of blocks.</div>}
            </div>
          </section>
        </>
      )}
    </>
  );
}
