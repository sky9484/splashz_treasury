"use client";
import { useState } from "react";
import { maxUint256 } from "viem";
import { useAccount, useReadContracts } from "wagmi";
import { deployment, isDeployed } from "@/lib/deployment";
import { erc20Abi, vaultAbi } from "@/lib/abi";
import { fmtAmount, fmtPct, parseAmount } from "@/lib/format";
import { useTx } from "@/lib/useTx";
import { TxNote } from "./TxNote";
import { useMarkets } from "./LiveMarkets";

export function VaultPanel() {
  const { address, isConnected } = useAccount();
  const [mode, setMode] = useState<"deposit" | "withdraw">("deposit");
  const [input, setInput] = useState("");
  const tx = useTx();
  const markets = useMarkets();
  const venus = markets.data?.markets.find((m) => m.id === "venus-usdt-bsc");
  const user = address ?? "0x0000000000000000000000000000000000000000";

  const q = useReadContracts({
    contracts: [
      { address: deployment.vault, abi: vaultAbi, functionName: "totalAssets" },
      { address: deployment.vault, abi: vaultAbi, functionName: "balanceOf", args: [user] },
      { address: deployment.vault, abi: vaultAbi, functionName: "referenceApyBps" },
      { address: deployment.stable, abi: erc20Abi, functionName: "balanceOf", args: [user] },
      { address: deployment.stable, abi: erc20Abi, functionName: "allowance", args: [user, deployment.vault] },
    ],
    query: { enabled: isDeployed, refetchInterval: 20_000 },
  });
  const [tvl, shares, refBps, wallet, allowance] = (q.data ?? []).map((r) => r.result) as (bigint | undefined)[];
  const posQ = useReadContracts({
    contracts: [{ address: deployment.vault, abi: vaultAbi, functionName: "convertToAssets", args: [shares ?? 0n] }],
    query: { enabled: isDeployed && shares !== undefined },
  });
  const position = posQ.data?.[0]?.result as bigint | undefined;

  const amount = parseAmount(input);
  const needsApprove = mode === "deposit" && amount !== null && (allowance ?? 0n) < amount;
  const tooMuch = amount !== null && (mode === "deposit" ? amount > (wallet ?? 0n) : amount > (position ?? 0n));

  const submit = async () => {
    if (!amount || !address) return;
    if (needsApprove) {
      const ok = await tx.run({ address: deployment.stable, abi: erc20Abi, functionName: "approve", args: [deployment.vault, maxUint256] });
      if (ok) await q.refetch();
      return;
    }
    const ok =
      mode === "deposit"
        ? await tx.run({ address: deployment.vault, abi: vaultAbi, functionName: "deposit", args: [amount, address] })
        : await tx.run({
            address: deployment.vault,
            abi: vaultAbi,
            functionName: "redeem",
            // withdraw all if the user typed their full position, else convert assets → shares proportionally
            args: [amount >= (position ?? 0n) ? (shares ?? 0n) : ((shares ?? 0n) * amount) / (position || 1n), address, address],
          });
    if (ok) {
      setInput("");
      await q.refetch();
      await posQ.refetch();
    }
  };

  const liveApy = venus?.status === "live" ? venus.apy : null;
  const label = !isConnected ? "Connect wallet first" : !amount ? "Enter an amount" : tooMuch ? "Amount is more than you have" : needsApprove ? "Approve tUSDT" : mode === "deposit" ? "Deposit" : "Withdraw";

  return (
    <div className="split">
      <div className="wide" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span className="tag amber">BNB Chain testnet</span>
          <span className="tag grey">ERC-4626</span>
          <span className="tag green">Shares stay in your wallet</span>
        </div>
        <h3 style={{ fontSize: 24 }}>Splashz USDT Vault</h3>
        <p className="small muted" style={{ margin: 0, lineHeight: 1.6, maxWidth: 560 }}>
          Deposit test USDT and earn at the live Venus Core Pool USDT rate. A keeper reads the rate from DefiLlama every hour, records it on-chain and pays the matching yield into the vault.
        </p>
        <div className="grid3">
          <div><div className="xs muted">Live reference APY</div><div className="apy">{fmtPct(liveApy)}</div><div className="xs muted">Venus USDT, mainnet</div></div>
          <div><div className="xs muted">Last rate on-chain</div><div className="apy">{refBps !== undefined && refBps > 0n ? fmtPct(Number(refBps) / 100) : "—"}</div><div className="xs muted">set by keeper</div></div>
          <div><div className="xs muted">Vault TVL</div><div className="apy">{fmtAmount(tvl, 18, 0)}</div><div className="xs muted">tUSDT</div></div>
        </div>
      </div>
      <div className="narrow" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div className="steps" role="tablist">
          <button role="tab" aria-selected={mode === "deposit"} className={`btn ${mode === "deposit" ? "ink" : "ghost"}`} onClick={() => { setMode("deposit"); tx.reset(); }}>Deposit</button>
          <button role="tab" aria-selected={mode === "withdraw"} className={`btn ${mode === "withdraw" ? "ink" : "ghost"}`} onClick={() => { setMode("withdraw"); tx.reset(); }}>Withdraw</button>
        </div>
        <label className="xs muted" htmlFor="vault-amt">{mode === "deposit" ? `Wallet: ${fmtAmount(wallet)} tUSDT` : `Your position: ${fmtAmount(position)} tUSDT`}</label>
        <div className="field">
          <input id="vault-amt" inputMode="decimal" placeholder="0.00" value={input} onChange={(e) => setInput(e.target.value)} />
          <button className="btn ghost" onClick={() => setInput(((mode === "deposit" ? wallet : position) ?? 0n) > 0n ? fmtAmount(mode === "deposit" ? wallet : position, 18, 6).replace(/,/g, "") : "")}>Max</button>
        </div>
        <button className="btn primary block" disabled={!isConnected || !amount || tooMuch || tx.state.status === "signing" || tx.state.status === "pending" || !isDeployed} onClick={submit}>
          {tx.state.status === "signing" || tx.state.status === "pending" ? "Working…" : label}
        </button>
        <TxNote state={tx.state} success={needsApprove ? "Approved. Now deposit." : "Done. Receipt is in Portfolio."} />
      </div>
    </div>
  );
}
