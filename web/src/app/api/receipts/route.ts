import { NextResponse } from "next/server";
import { createPublicClient, fallback, http, isAddress, parseAbiItem, type Address } from "viem";
import { bscTestnet } from "viem/chains";
import { deployment, isDeployed } from "@/lib/deployment";
import { BSC_TESTNET_RPCS } from "@/lib/wagmi";

export const dynamic = "force-dynamic";

const EVENTS = {
  Subscribed: parseAbiItem("event Subscribed(bytes32 indexed orderId, address indexed investor, uint256 amount, uint256 fee, uint256 shares, uint256 nav, address trustee)"),
  RedemptionRequested: parseAbiItem("event RedemptionRequested(bytes32 indexed orderId, address indexed investor, uint256 shares)"),
  RedemptionSettled: parseAbiItem("event RedemptionSettled(bytes32 indexed orderId, address indexed investor, uint256 shares, uint256 payout, uint256 nav)"),
  RedemptionCancelled: parseAbiItem("event RedemptionCancelled(bytes32 indexed orderId, address indexed investor, uint256 shares)"),
  Deposit: parseAbiItem("event Deposit(address indexed sender, address indexed owner, uint256 assets, uint256 shares)"),
  Withdraw: parseAbiItem("event Withdraw(address indexed sender, address indexed receiver, address indexed owner, uint256 assets, uint256 shares)"),
};

export type Receipt = { kind: string; product: string; txHash: string; blockNumber: string; amount: string; detail: string };

const client = createPublicClient({ chain: bscTestnet, transport: fallback(BSC_TESTNET_RPCS.map((u) => http(u))) });
const CHUNK = 5_000n; // public BSC testnet RPCs cap eth_getLogs ranges
const MAX_CHUNKS = 40n; // ~200k blocks, about a day at 0.45s blocks

/** Receipts are read straight from contract events. No database: the chain is the record. */
export async function GET(req: Request) {
  const address = new URL(req.url).searchParams.get("address");
  if (!address || !isAddress(address)) return NextResponse.json({ error: "address required" }, { status: 400 });
  if (!isDeployed) return NextResponse.json({ receipts: [], note: "Contracts not deployed yet." });
  const investor = address as Address;

  try {
    const latest = await client.getBlockNumber();
    const floor = BigInt(deployment.deployBlock || 0);
    const start = latest - CHUNK * MAX_CHUNKS > floor ? latest - CHUNK * MAX_CHUNKS : floor;
    const receipts: Receipt[] = [];

    for (let from = start; from <= latest; from += CHUNK) {
      const to = from + CHUNK - 1n > latest ? latest : from + CHUNK - 1n;
      const jobs = deployment.funds.flatMap((f) => [
        client.getLogs({ address: f.router, event: EVENTS.Subscribed, args: { investor }, fromBlock: from, toBlock: to }).then((ls) =>
          ls.map((l) => ({ kind: "Subscribed", product: f.name, txHash: l.transactionHash, blockNumber: String(l.blockNumber), amount: String(l.args.amount), detail: `${String(l.args.shares)} units at NAV ${String(l.args.nav)}` }))),
        client.getLogs({ address: f.router, event: EVENTS.RedemptionRequested, args: { investor }, fromBlock: from, toBlock: to }).then((ls) =>
          ls.map((l) => ({ kind: "Redemption requested", product: f.name, txHash: l.transactionHash, blockNumber: String(l.blockNumber), amount: "0", detail: `${String(l.args.shares)} units escrowed` }))),
        client.getLogs({ address: f.router, event: EVENTS.RedemptionSettled, args: { investor }, fromBlock: from, toBlock: to }).then((ls) =>
          ls.map((l) => ({ kind: "Redemption paid", product: f.name, txHash: l.transactionHash, blockNumber: String(l.blockNumber), amount: String(l.args.payout), detail: `paid from trustee at NAV ${String(l.args.nav)}` }))),
        client.getLogs({ address: f.router, event: EVENTS.RedemptionCancelled, args: { investor }, fromBlock: from, toBlock: to }).then((ls) =>
          ls.map((l) => ({ kind: "Redemption cancelled", product: f.name, txHash: l.transactionHash, blockNumber: String(l.blockNumber), amount: "0", detail: `${String(l.args.shares)} units returned` }))),
      ]);
      jobs.push(
        client.getLogs({ address: deployment.vault, event: EVENTS.Deposit, args: { owner: investor }, fromBlock: from, toBlock: to }).then((ls) =>
          ls.map((l) => ({ kind: "Vault deposit", product: "Splashz USDT Vault", txHash: l.transactionHash, blockNumber: String(l.blockNumber), amount: String(l.args.assets), detail: "shares to your wallet" }))),
        client.getLogs({ address: deployment.vault, event: EVENTS.Withdraw, args: { owner: investor }, fromBlock: from, toBlock: to }).then((ls) =>
          ls.map((l) => ({ kind: "Vault withdrawal", product: "Splashz USDT Vault", txHash: l.transactionHash, blockNumber: String(l.blockNumber), amount: String(l.args.assets), detail: "assets to your wallet" }))),
      );
      for (const batch of await Promise.all(jobs)) receipts.push(...batch);
    }
    receipts.sort((a, b) => Number(BigInt(b.blockNumber) - BigInt(a.blockNumber)));
    return NextResponse.json({ receipts, scannedFrom: String(start), scannedTo: String(latest) });
  } catch (e) {
    console.warn("[receipts] RPC failed", e);
    return NextResponse.json({ receipts: [], error: "Could not read receipts from the chain. Try again." }, { status: 502 });
  }
}
