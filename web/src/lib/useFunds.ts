"use client";
import { useAccount, useReadContracts } from "wagmi";
import { deployment, isDeployed } from "./deployment";
import { erc20Abi, oracleAbi, routerAbi } from "./abi";

export type FundState = {
  key: string;
  nav?: bigint;
  asOf?: number;
  maxAge?: number;
  feeBps?: number;
  units?: bigint;
  stale: boolean;
};

/** One multicall for every fund's NAV, NAV age, fee and the user's units. */
export function useFunds() {
  const { address } = useAccount();
  const calls = deployment.funds.flatMap((f) => [
    { address: f.oracle, abi: oracleAbi, functionName: "nav" } as const,
    { address: f.oracle, abi: oracleAbi, functionName: "asOf" } as const,
    { address: f.oracle, abi: oracleAbi, functionName: "maxAge" } as const,
    { address: f.router, abi: routerAbi, functionName: "feeBps" } as const,
    { address: f.share, abi: erc20Abi, functionName: "balanceOf", args: [address ?? "0x0000000000000000000000000000000000000000"] } as const,
  ]);
  const q = useReadContracts({ contracts: calls, query: { enabled: isDeployed, refetchInterval: 30_000 } });
  const now = Math.floor(Date.now() / 1000);
  const funds: FundState[] = deployment.funds.map((f, i) => {
    const r = q.data?.slice(i * 5, i * 5 + 5);
    const nav = r?.[0]?.result as bigint | undefined;
    const asOf = r?.[1]?.result !== undefined ? Number(r[1].result) : undefined;
    const maxAge = r?.[2]?.result !== undefined ? Number(r[2].result) : undefined;
    return {
      key: f.key,
      nav,
      asOf,
      maxAge,
      feeBps: r?.[3]?.result !== undefined ? Number(r[3].result) : undefined,
      units: address ? (r?.[4]?.result as bigint | undefined) : undefined,
      stale: !nav || asOf === undefined || maxAge === undefined || now > asOf + maxAge,
    };
  });
  return { funds, isLoading: q.isLoading, isError: q.isError, refetch: q.refetch };
}
