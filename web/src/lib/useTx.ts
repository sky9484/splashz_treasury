"use client";
import { useCallback, useState } from "react";
import { BaseError, ContractFunctionRevertedError, type Hash } from "viem";
import { usePublicClient, useWriteContract } from "wagmi";

export type TxState = { status: "idle" | "signing" | "pending" | "success" | "error"; hash?: Hash; message?: string };

const FRIENDLY: Record<string, string> = {
  NotEligible: "Your wallet is not marked eligible yet. Confirm eligibility first.",
  OrderReused: "This order was already sent. Refresh to see it in Receipts.",
  Slippage: "The NAV moved while you were confirming. Review the new quote and try again.",
  StaleNav: "The fund's NAV is out of date, so new orders are paused until the manager posts a fresh one.",
  NoNav: "The fund has no NAV yet.",
  FaucetCooldown: "You already claimed test USDT in the last 24 hours.",
  ZeroAmount: "Enter an amount above zero.",
  NotPending: "This redemption is no longer pending.",
  SelfCertifyDisabled: "Self-certification is closed. Eligibility is set by the fund's compliance team.",
};

export function explain(e: unknown): string {
  if (e instanceof BaseError) {
    const revert = e.walk((x) => x instanceof ContractFunctionRevertedError);
    if (revert instanceof ContractFunctionRevertedError && revert.data?.errorName) {
      return FRIENDLY[revert.data.errorName] ?? `Transaction reverted: ${revert.data.errorName}`;
    }
    if (/rejected|denied/i.test(e.shortMessage)) return "You declined the request in MetaMask.";
    if (/insufficient funds/i.test(e.shortMessage)) return "Not enough tBNB for gas. Get some from the BNB Chain testnet faucet.";
    return e.shortMessage;
  }
  return e instanceof Error ? e.message : "Something went wrong.";
}

/** Sign → wait for one confirmation → report. Prevents double submits while in flight. */
export function useTx() {
  const { writeContractAsync } = useWriteContract();
  const client = usePublicClient();
  const [state, setState] = useState<TxState>({ status: "idle" });

  const run = useCallback(
    async (args: Parameters<typeof writeContractAsync>[0]) => {
      if (state.status === "signing" || state.status === "pending") return null;
      try {
        setState({ status: "signing" });
        const hash = await writeContractAsync(args);
        setState({ status: "pending", hash });
        const receipt = await client!.waitForTransactionReceipt({ hash });
        if (receipt.status !== "success") throw new Error("Transaction reverted on-chain.");
        setState({ status: "success", hash });
        return receipt;
      } catch (e) {
        setState((s) => ({ status: "error", hash: s.hash, message: explain(e) }));
        return null;
      }
    },
    [client, state.status, writeContractAsync],
  );

  return { state, run, reset: () => setState({ status: "idle" }) };
}
