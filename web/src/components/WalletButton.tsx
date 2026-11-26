"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { METAMASK_RDNS } from "@/lib/wagmi";
import { shortAddr } from "@/lib/format";
import { Arrow } from "./Arrow";

export function WalletButton({ big = false }: { big?: boolean }) {
  const { address, isConnected } = useAccount();
  const { connectors, connect, isPending, error, reset } = useConnect();
  const { disconnect } = useDisconnect();
  const [open, setOpen] = useState(false);
  const metamask = connectors.find((c) => c.id === METAMASK_RDNS);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (mounted && isConnected && address) {
    return (
      <button className="btn outline" onClick={() => disconnect()} title="Disconnect wallet">
        <span style={{ width: 8, height: 8, borderRadius: 99, background: "var(--green)", display: "inline-block" }} />
        {shortAddr(address)}
      </button>
    );
  }

  return (
    <>
      <button className={`btn primary${big ? " block" : ""}`} onClick={() => { reset(); setOpen(true); }}>
        <span className="ico"><Arrow /></span>Connect wallet
      </button>
      {open && mounted && createPortal(
        <div className="scrim" onClick={() => setOpen(false)}>
          <div className="dialog sm" role="dialog" aria-modal="true" aria-labelledby="w-title" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 id="w-title" style={{ fontSize: 20 }}>Connect wallet</h2>
              <button className="btn ghost" aria-label="Close" onClick={() => setOpen(false)} style={{ minHeight: 36, padding: "6px 12px" }}>×</button>
            </div>
            {metamask ? (
              <button
                className="walletopt"
                disabled={isPending}
                onClick={() => connect({ connector: metamask }, { onSuccess: () => setOpen(false) })}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {metamask.icon ? <img src={metamask.icon} alt="" width={32} height={32} /> : null}
                <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ fontWeight: 600 }}>{isPending ? "Check MetaMask…" : "MetaMask"}</span>
                  <span className="xs muted">Browser extension</span>
                </span>
              </button>
            ) : (
              <div className="notice warn">
                MetaMask was not found in this browser. <a href="https://metamask.io/download/" target="_blank" rel="noreferrer" style={{ textDecoration: "underline" }}>Install MetaMask</a>, then reload.
              </div>
            )}
            {error && <div className="notice err">{error.message.includes("rejected") ? "You declined the request in MetaMask." : error.message}</div>}
            <div className="notice ok xs">Only MetaMask is supported. Splashz will ask MetaMask to switch to BNB Smart Chain Testnet (chain ID 97).</div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
