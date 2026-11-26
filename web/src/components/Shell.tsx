"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useAccount } from "wagmi";
import { Wordmark } from "./Logo";
import { DisclaimerGate } from "./DisclaimerGate";
import { NetworkGuard } from "./NetworkGuard";
import { WalletButton } from "./WalletButton";
import { WalletGate } from "./WalletGate";
import { LiveStrip } from "./LiveStrip";
import { isDeployed } from "@/lib/deployment";
import { useMounted } from "@/lib/useMounted";

const NAV = [
  { href: "/app", label: "Dashboard", match: (p: string) => p === "/app" || p.startsWith("/app/funds") },
  { href: "/app/portfolio", label: "Portfolio", match: (p: string) => p.startsWith("/app/portfolio") },
  { href: "/app/stocks", label: "Stocks", match: (p: string) => p.startsWith("/app/stocks") },
];

export function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const { isConnected: rawConnected } = useAccount();
  const isConnected = useMounted() && rawConnected;
  const here = NAV.find((n) => n.match(path));
  return (
    <div className="app">
      <aside className="rail">
        <Link href="/" className="brand" aria-label="Splashz home"><Wordmark /></Link>
        <div className="eyebrow grey navlabel">Earn</div>
        {NAV.map((n) => {
          const on = n.match(path);
          return (
            <Link key={n.href} href={n.href} className={`navlink${on ? " on" : ""}${!isConnected && !on ? " off" : ""}`} aria-current={on ? "page" : undefined}>
              {n.label}
            </Link>
          );
        })}
        <div className="railnote">
          <div className="chainpill" style={{ marginBottom: 8 }}><i />BNB Smart Chain testnet</div>
          Testnet demo. Nothing here is an offer, and test tokens have no value.
        </div>
      </aside>
      <div className="content">
        <header className="topbar">
          <div className="eyebrow grey">{here?.label ?? "Fund"}</div>
          <WalletButton />
        </header>
        <main className="main">
          {!isDeployed && (
            <div className="notice warn">
              Contracts are not deployed yet. Run <span className="mono">npm run deploy:testnet</span> in <span className="mono">contracts/</span>. Live market data still works.
            </div>
          )}
          <LiveStrip />
          <NetworkGuard />
          <WalletGate>{children}</WalletGate>
        </main>
      </div>
      <DisclaimerGate />
    </div>
  );
}
