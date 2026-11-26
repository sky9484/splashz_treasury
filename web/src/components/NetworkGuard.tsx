"use client";
import { useAccount, useSwitchChain } from "wagmi";
import { CHAIN } from "@/lib/wagmi";
import { useMounted } from "@/lib/useMounted";

export function NetworkGuard() {
  const { isConnected, chainId } = useAccount();
  const { switchChain, isPending, error } = useSwitchChain();
  const mounted = useMounted();
  if (!mounted || !isConnected || chainId === CHAIN.id) return null;
  return (
    <div className="notice warn" style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
      <span>Your wallet is on another network. Splashz runs on BNB Smart Chain Testnet.{error ? ` (${error.message.split("\n")[0]})` : ""}</span>
      <button className="btn ink" disabled={isPending} onClick={() => switchChain({ chainId: CHAIN.id })}>
        {isPending ? "Confirm in MetaMask…" : "Switch network"}
      </button>
    </div>
  );
}
