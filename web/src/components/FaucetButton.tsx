"use client";
import { useAccount, useReadContract } from "wagmi";
import { deployment, isDeployed } from "@/lib/deployment";
import { mockUsdtAbi } from "@/lib/abi";
import { useTx } from "@/lib/useTx";
import { TxNote } from "./TxNote";

export function FaucetButton({ onDone }: { onDone?: () => void }) {
  const { address, isConnected } = useAccount();
  const last = useReadContract({ address: deployment.stable, abi: mockUsdtAbi, functionName: "lastFaucetAt", args: [address ?? "0x0000000000000000000000000000000000000000"], query: { enabled: isDeployed && !!address } });
  const tx = useTx();
  const next = last.data && last.data > 0n ? Number(last.data) + 86_400 : 0;
  const waitH = Math.max(0, Math.ceil((next - Date.now() / 1000) / 3600));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <button
        className="btn primary"
        disabled={!isConnected || !isDeployed || waitH > 0 || tx.state.status === "pending" || tx.state.status === "signing"}
        onClick={async () => {
          const ok = await tx.run({ address: deployment.stable, abi: mockUsdtAbi, functionName: "faucet" });
          if (ok) { await last.refetch(); onDone?.(); }
        }}
      >
        {waitH > 0 ? `Next 10,000 tUSDT in ${waitH} h` : "Get 10,000 test USDT"}
      </button>
      <TxNote state={tx.state} success="10,000 tUSDT added." />
    </div>
  );
}
