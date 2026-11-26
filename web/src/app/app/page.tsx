"use client";
import Link from "next/link";
import { useAccount, useReadContracts } from "wagmi";
import { FaucetButton } from "@/components/FaucetButton";
import { VaultPanel } from "@/components/VaultPanel";
import { LiveMarkets } from "@/components/LiveMarkets";
import { useFunds } from "@/lib/useFunds";
import { deployment, isDeployed } from "@/lib/deployment";
import { erc20Abi, vaultAbi } from "@/lib/abi";
import { ago, fmtAmount } from "@/lib/format";

export default function EarnPage() {
  const { address } = useAccount();
  const { funds } = useFunds();
  const user = address ?? "0x0000000000000000000000000000000000000000";
  const bal = useReadContracts({
    contracts: [
      { address: deployment.stable, abi: erc20Abi, functionName: "balanceOf", args: [user] },
      { address: deployment.vault, abi: vaultAbi, functionName: "balanceOf", args: [user] },
    ],
    query: { enabled: isDeployed && !!address, refetchInterval: 20_000 },
  });
  const wallet = bal.data?.[0]?.result as bigint | undefined;
  const vaultShares = bal.data?.[1]?.result as bigint | undefined;
  const vaultVal = useReadContracts({
    contracts: [{ address: deployment.vault, abi: vaultAbi, functionName: "convertToAssets", args: [vaultShares ?? 0n] }],
    query: { enabled: isDeployed && vaultShares !== undefined },
  }).data?.[0]?.result as bigint | undefined;
  const inFunds = address ? funds.reduce((s, f) => s + (f.units && f.nav ? (f.units * f.nav) / 10n ** 18n : 0n), 0n) : undefined;

  return (
    <>
      <div className="top">
        <div>
          <h1>Dashboard</h1>
          <p className="muted" style={{ margin: "8px 0 0" }}>Licensed funds and bonds, and live stablecoin vaults. Your assets stay in your wallet.</p>
        </div>
      </div>

      <div className="grid3 cells">
        <div className="stat dark" style={{ background: "var(--ink)", color: "#fff" }}>
          <div className="label">Test USDT in your wallet</div>
          <div className="value">{address ? fmtAmount(wallet) : "—"}</div>
          <div style={{ marginTop: 14 }}><FaucetButton onDone={() => bal.refetch()} /></div>
        </div>
        <div className="stat">
          <div className="label">In funds and bonds</div>
          <div className="value">{fmtAmount(inFunds)}</div>
          <div className="xs" style={{ color: "var(--green)", marginTop: 10 }}>Units in your wallet, valued at signed NAV</div>
        </div>
        <div className="stat">
          <div className="label">In stablecoin vault</div>
          <div className="value">{address ? fmtAmount(vaultVal) : "—"}</div>
          <div className="xs" style={{ color: "var(--amber)", marginTop: 10 }}>Vault shares in your wallet</div>
        </div>
      </div>

      <section className="panel">
        <div className="sechead">
          <div>
            <h2>Funds and bonds</h2>
            <p>From licensed fund managers in Malaysia, Indonesia and more. You subscribe in your own name; money goes straight to the fund trustee.</p>
          </div>
        </div>
        <div className="table">
          <div className="row head" style={{ gridTemplateColumns: "2.4fr 1fr 1fr 1fr 1fr 1fr" }}>
            <span>Product</span><span>Market</span><span>NAV per unit</span><span>NAV struck</span><span>Platform fee</span><span />
          </div>
          {deployment.funds.length === 0 && <div className="muted small" style={{ padding: "16px 0" }}>Funds appear here once the testnet contracts are deployed.</div>}
          {deployment.funds.map((f) => {
            const s = funds.find((x) => x.key === f.key);
            return (
              <div key={f.key} className="row" style={{ gridTemplateColumns: "2.4fr 1fr 1fr 1fr 1fr 1fr" }}>
                <div>
                  <div className="name">{f.name}</div>
                  <div className="xs muted" style={{ marginTop: 3 }}>Licensed fund manager · {f.ccy}</div>
                </div>
                <span>{f.market}</span>
                <span className="num">{s?.nav ? fmtAmount(s.nav, 18, 4) : <span className="skeleton" />}</span>
                <span>{s?.asOf ? (s.stale ? <span className="tag red">Stale · paused</span> : ago(s.asOf)) : "—"}</span>
                <span>{s?.feeBps !== undefined ? `${(s.feeBps / 100).toFixed(2)}%` : "—"}</span>
                <Link className="btn primary" href={`/app/funds/${f.key}`} style={{ justifySelf: "end" }}>Subscribe</Link>
              </div>
            );
          })}
        </div>
      </section>

      <section className="panel">
        <div className="sechead">
          <div>
            <h2>Stablecoin vault</h2>
            <p>Leading protocols on BNB Chain and Ethereum. Rates move daily, and smart contract risk applies.</p>
          </div>
        </div>
        <VaultPanel />
        <LiveMarkets />
      </section>

      <section className="panel blue" style={{ display: "flex", flexWrap: "wrap", gap: 20, alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ maxWidth: 640 }}>
          <h2 style={{ color: "#fff" }}>Tokenized stocks</h2>
          <p style={{ margin: "6px 0 0", color: "rgba(255,255,255,0.78)", lineHeight: 1.6 }}>Live 24/7 prices for tokenized US stocks, ready to buy with USDT once a licensed tokenizer partner is connected.</p>
        </div>
        <Link href="/app/stocks" className="btn" style={{ background: "#fff", color: "var(--primary)" }}>Open Stocks</Link>
      </section>
    </>
  );
}
