"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { keccak256, maxUint256, toHex, type Hex } from "viem";
import { useAccount, useReadContract, useReadContracts } from "wagmi";
import { TxNote } from "@/components/TxNote";
import { fundByKey, deployment, isDeployed, explorer } from "@/lib/deployment";
import { erc20Abi, registryAbi, routerAbi } from "@/lib/abi";
import { ago, fmtAmount, parseAmount, shortAddr, withSlippage } from "@/lib/format";
import { useFunds } from "@/lib/useFunds";
import { useTx } from "@/lib/useTx";

const ZERO = "0x0000000000000000000000000000000000000000" as const;

/** A fresh order id per attempt, kept in sessionStorage so a refresh mid-flight cannot send the same order twice. */
function useOrderId(scope: string) {
  const key = `splashz.order.${scope}`;
  const make = () => keccak256(toHex(`${scope}:${Date.now()}:${Math.random()}`));
  const [id, setId] = useState<Hex>(ZERO);
  useEffect(() => {
    let v: string | null = null;
    try { v = sessionStorage.getItem(key); } catch {}
    const next = (v as Hex) || make();
    try { sessionStorage.setItem(key, next); } catch {}
    setId(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const rotate = () => {
    const n = make();
    try { sessionStorage.setItem(key, n); } catch {}
    setId(n);
  };
  return { id, rotate };
}

export default function FundPage() {
  const { key } = useParams<{ key: string }>();
  const fund = fundByKey(key);
  const { address, isConnected } = useAccount();
  const { funds, refetch: refetchFunds } = useFunds();
  const state = funds.find((f) => f.key === key);
  const [tab, setTab] = useState<"subscribe" | "redeem">("subscribe");
  const [input, setInput] = useState("");
  const tx = useTx();
  const subOrder = useOrderId(`${key}:sub:${address ?? "anon"}`);
  const redOrder = useOrderId(`${key}:red:${address ?? "anon"}`);
  const user = address ?? ZERO;

  const reads = useReadContracts({
    contracts: [
      { address: deployment.registry, abi: registryAbi, functionName: "isEligible", args: [user] },
      { address: deployment.registry, abi: registryAbi, functionName: "selfCertifyEnabled" },
      { address: deployment.stable, abi: erc20Abi, functionName: "balanceOf", args: [user] },
      { address: deployment.stable, abi: erc20Abi, functionName: "allowance", args: [user, fund?.router ?? ZERO] },
    ],
    query: { enabled: isDeployed && !!fund && !!address, refetchInterval: 20_000 },
  });
  const [eligible, selfCertOpen, wallet, allowance] = (reads.data ?? []).map((r) => r.result) as [boolean?, boolean?, bigint?, bigint?];

  const amount = parseAmount(input);
  const quote = useReadContract({
    address: fund?.router,
    abi: routerAbi,
    functionName: "quote",
    args: [amount ?? 0n],
    query: { enabled: isDeployed && !!fund && tab === "subscribe" && !!amount && !state?.stale },
  });
  const [qShares, qFee, qNav] = (quote.data ?? []) as readonly bigint[];

  const pending = useReadContract({
    address: fund?.router,
    abi: routerAbi,
    functionName: "redemptions",
    args: [redOrder.id],
    query: { enabled: isDeployed && !!fund && redOrder.id !== ZERO, refetchInterval: 15_000 },
  });
  const pendingShares = pending.data && pending.data[3] === 1 && pending.data[0] === address ? pending.data[1] : 0n;

  const step: "eligibility" | "approve" | "confirm" = !eligible ? "eligibility" : tab === "subscribe" && amount && (allowance ?? 0n) < amount ? "approve" : "confirm";
  const over = amount !== null && (tab === "subscribe" ? amount > (wallet ?? 0n) : amount > (state?.units ?? 0n));
  const busy = tx.state.status === "signing" || tx.state.status === "pending";

  const refreshAll = async () => { await Promise.all([reads.refetch(), refetchFunds(), pending.refetch()]); };

  const act = async () => {
    if (!fund || !address) return;
    if (step === "eligibility") {
      if (await tx.run({ address: deployment.registry, abi: registryAbi, functionName: "selfCertify" })) await reads.refetch();
      return;
    }
    if (!amount) return;
    if (tab === "subscribe") {
      if (step === "approve") {
        if (await tx.run({ address: deployment.stable, abi: erc20Abi, functionName: "approve", args: [fund.router, maxUint256] })) await reads.refetch();
        return;
      }
      if (!qShares) return;
      const ok = await tx.run({ address: fund.router, abi: routerAbi, functionName: "subscribe", args: [amount, withSlippage(qShares), subOrder.id] });
      if (ok) { subOrder.rotate(); setInput(""); await refreshAll(); }
    } else {
      const ok = await tx.run({ address: fund.router, abi: routerAbi, functionName: "requestRedeem", args: [amount, redOrder.id] });
      if (ok) { setInput(""); await refreshAll(); }
    }
  };

  const cancel = async () => {
    if (!fund) return;
    if (await tx.run({ address: fund.router, abi: routerAbi, functionName: "cancelRedemption", args: [redOrder.id] })) { redOrder.rotate(); await refreshAll(); }
  };

  const label = useMemo(() => {
    if (!isConnected) return "Connect wallet first";
    if (step === "eligibility") return selfCertOpen ? "Confirm eligibility (testnet)" : "Eligibility set by compliance";
    if (state?.stale) return "Orders paused: NAV is stale";
    if (!amount) return "Enter an amount";
    if (over) return "Amount is more than you have";
    if (tab === "redeem" && pendingShares > 0n) return "One redemption at a time";
    if (step === "approve") return "Approve tUSDT";
    return tab === "subscribe" ? "Confirm subscription" : "Request redemption";
  }, [isConnected, step, selfCertOpen, state?.stale, amount, over, tab, pendingShares]);

  const disabled =
    busy || !isConnected || !isDeployed ||
    (step === "eligibility" ? !selfCertOpen : !!state?.stale || !amount || over || (tab === "redeem" && pendingShares > 0n) || (tab === "subscribe" && step === "confirm" && !qShares));

  if (!fund) {
    return (
      <div className="panel">
        <h2>Fund not found</h2>
        <p className="muted">{isDeployed ? "This fund is not part of the current deployment." : "Contracts are not deployed yet."}</p>
        <Link className="btn outline" href="/app">Back to dashboard</Link>
      </div>
    );
  }

  const navPerUnit = state?.nav;
  const estValue = tab === "redeem" && amount && navPerUnit ? (amount * navPerUnit) / 10n ** 18n : undefined;

  return (
    <>
      <div className="top">
        <div>
          <Link href="/app" className="small muted">← Dashboard</Link>
          <h1 style={{ marginTop: 6 }}>{fund.name}</h1>
          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            <span className="tag grey">Licensed fund manager</span>
            <span className="tag grey">{fund.market}</span>
            <span className="tag amber">{fund.symbol} · testnet units</span>
          </div>
        </div>
      </div>

      <div className="split">
        <section className="panel wide">
          <div className="grid3">
            <div className="stat"><div className="label">NAV per unit</div><div className="value">{navPerUnit ? fmtAmount(navPerUnit, 18, 4) : "—"}</div></div>
            <div className="stat"><div className="label">NAV struck</div><div className="value" style={{ fontSize: 22 }}>{state?.asOf ? ago(state.asOf) : "—"}</div>{state?.stale && <span className="tag red">Stale · orders paused</span>}</div>
            <div className="stat"><div className="label">Your units</div><div className="value">{fmtAmount(state?.units, 18, 4)}</div></div>
          </div>
          <h3 style={{ fontSize: 17, marginTop: 28 }}>How your money moves</h3>
          <ol className="small" style={{ lineHeight: 1.8, paddingLeft: 18, color: "var(--ink-2)" }}>
            <li>You confirm eligibility once. A real fund does KYC here; testnet lets you self-certify.</li>
            <li>Your tUSDT goes straight from your wallet to the fund trustee. Splashz contracts never hold it.</li>
            <li>Units are minted to your wallet at the NAV the fund manager signed. Units only move between eligible investors.</li>
            <li>Redemptions lock your units, then the trustee pays out at the latest NAV. Until then the request shows as pending, and you can cancel.</li>
          </ol>
          <div className="kv"><span>Router</span><a className="mono" href={`${explorer}/address/${fund.router}`} target="_blank" rel="noreferrer">{shortAddr(fund.router)} ↗</a></div>
          <div className="kv"><span>NAV oracle (EIP-712 signed)</span><a className="mono" href={`${explorer}/address/${fund.oracle}`} target="_blank" rel="noreferrer">{shortAddr(fund.oracle)} ↗</a></div>
          <div className="kv" style={{ borderBottom: 0 }}><span>Fund units</span><a className="mono" href={`${explorer}/address/${fund.share}`} target="_blank" rel="noreferrer">{shortAddr(fund.share)} ↗</a></div>
        </section>

        <section className="panel narrow" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="steps" role="tablist">
            {(["subscribe", "redeem"] as const).map((t) => (
              <button key={t} role="tab" aria-selected={tab === t} className={`btn ${tab === t ? "ink" : "ghost"}`} onClick={() => { setTab(t); setInput(""); tx.reset(); }}>
                {t === "subscribe" ? "Subscribe" : "Redeem"}
              </button>
            ))}
          </div>
          <div className="steps" aria-label="Progress">
            <span className={`step ${eligible ? "done" : "now"}`}>1 Eligible</span>
            {tab === "subscribe" && <span className={`step ${!eligible ? "" : step === "approve" ? "now" : "done"}`}>2 Approve</span>}
            <span className={`step ${eligible && step === "confirm" ? "now" : ""}`}>{tab === "subscribe" ? "3 Subscribe" : "2 Request"}</span>
          </div>

          <label className="xs muted" htmlFor="amt">
            {tab === "subscribe" ? `You pay · wallet ${fmtAmount(wallet)} tUSDT` : `Units to redeem · you hold ${fmtAmount(state?.units, 18, 4)}`}
          </label>
          <div className="field">
            <input id="amt" inputMode="decimal" placeholder="0.00" value={input} onChange={(e) => { setInput(e.target.value); if (tx.state.status !== "pending") tx.reset(); }} />
            <span style={{ fontWeight: 600 }}>{tab === "subscribe" ? "tUSDT" : "units"}</span>
          </div>

          {tab === "subscribe" ? (
            <div>
              <div className="kv"><span>Platform fee ({state?.feeBps !== undefined ? (state.feeBps / 100).toFixed(2) : "—"}%)</span><span className="num">{qFee !== undefined ? fmtAmount(qFee, 18, 4) : "—"}</span></div>
              <div className="kv"><span>NAV used</span><span className="num">{qNav ? fmtAmount(qNav, 18, 4) : "—"}</span></div>
              <div className="kv"><span>You receive</span><span className="num" style={{ fontWeight: 700 }}>{qShares !== undefined ? `${fmtAmount(qShares, 18, 4)} units` : "—"}</span></div>
              <div className="kv" style={{ borderBottom: 0 }}><span>Minimum (0.5% slippage)</span><span className="num">{qShares ? fmtAmount(withSlippage(qShares), 18, 4) : "—"}</span></div>
            </div>
          ) : (
            <div>
              <div className="kv"><span>Estimated payout at today&apos;s NAV</span><span className="num" style={{ fontWeight: 700 }}>{estValue !== undefined ? `${fmtAmount(estValue)} tUSDT` : "—"}</span></div>
              <div className="kv" style={{ borderBottom: 0 }}><span>Paid by</span><span>Fund trustee, at NAV on settlement</span></div>
            </div>
          )}

          {pendingShares > 0n && (
            <div className="notice warn" style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <span>Redemption pending: {fmtAmount(pendingShares, 18, 4)} units locked, waiting for the trustee.</span>
              <button className="btn outline" disabled={busy} onClick={cancel}>Cancel</button>
            </div>
          )}

          <button className="btn primary block" disabled={disabled} onClick={act}>{busy ? "Working…" : label}</button>
          <TxNote state={tx.state} success={tab === "subscribe" ? "Done. Units are in your wallet." : "Request sent. It stays pending until the trustee pays."} />
          <p className="xs muted" style={{ margin: 0, lineHeight: 1.5 }}>Testnet. The NAV is posted by the deploy team for demonstration; it is not real fund data.</p>
        </section>
      </div>
    </>
  );
}
