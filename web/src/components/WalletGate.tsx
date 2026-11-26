"use client";
import { useEffect, useState, type ReactNode } from "react";
import { useAccount } from "wagmi";
import { useMounted } from "@/lib/useMounted";
import { WalletButton } from "./WalletButton";
import { LiveMarkets } from "./LiveMarkets";

/** The app is read-and-write with your own wallet. Until one is connected we show what is live, and nothing else. */
export function WalletGate({ children }: { children: ReactNode }) {
  const { status } = useAccount();
  const mounted = useMounted();
  // Give a returning wallet a moment to reconnect, but never hang on a skeleton: a locked MetaMask can stall.
  const [patience, setPatience] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setPatience(false), 1500);
    return () => clearTimeout(t);
  }, []);
  if (mounted && status === "connected") return <>{children}</>;
  if (!mounted || (status === "reconnecting" && patience)) {
    return (
      <div className="panel" aria-busy="true">
        <span className="skeleton" style={{ width: "30%", height: 28 }} />
        <div style={{ height: 14 }} />
        <span className="skeleton" style={{ width: "60%" }} />
      </div>
    );
  }
  return (
    <>
      <section className="panel" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.3fr) minmax(0, 1fr)", gap: 40, alignItems: "center", padding: 40 }}>
        <div>
          <div className="eyebrow">Connect to continue</div>
          <h1 style={{ marginTop: 14 }}>Your wallet is your account.</h1>
          <p className="muted" style={{ lineHeight: 1.65, margin: "16px 0 0", maxWidth: 520 }}>
            Splashz has no sign-up and no custody. Connect MetaMask to see your balances, subscribe to funds, use the vault and read your receipts. Everything you do is a transaction you sign on BNB Smart Chain.
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, borderLeft: "1px solid var(--line)", paddingLeft: 32 }}>
          <div className="kv"><span>Wallet</span><span>MetaMask</span></div>
          <div className="kv"><span>Network</span><span>BNB Smart Chain Testnet · 97</span></div>
          <div className="kv" style={{ borderBottom: 0 }}><span>Gas</span><span>tBNB from the BNB Chain faucet</span></div>
          <WalletButton big />
        </div>
      </section>
      <section className="panel flat">
        <LiveMarkets title="Live right now" />
      </section>
    </>
  );
}
