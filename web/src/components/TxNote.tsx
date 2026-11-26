"use client";
import type { TxState } from "@/lib/useTx";
import { explorer } from "@/lib/deployment";

export function TxNote({ state, success }: { state: TxState; success?: string }) {
  if (state.status === "idle") return null;
  const link = state.hash ? (
    <a className="mono" href={`${explorer}/tx/${state.hash}`} target="_blank" rel="noreferrer" style={{ textDecoration: "underline" }}>
      {state.hash.slice(0, 10)}…
    </a>
  ) : null;
  if (state.status === "signing") return <div className="notice ok">Confirm in MetaMask…</div>;
  if (state.status === "pending") return <div className="notice ok">Waiting for BNB Chain to confirm {link}</div>;
  if (state.status === "success") return <div className="notice ok">{success ?? "Confirmed."} {link}</div>;
  return <div className="notice err">{state.message} {link}</div>;
}
