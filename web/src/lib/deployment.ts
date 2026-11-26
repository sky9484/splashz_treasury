import raw from "@/config/deployment.bscTestnet.json";
import type { Address } from "viem";

export type FundDeployment = {
  key: string;
  name: string;
  symbol: string;
  market: string;
  ccy: string;
  share: Address;
  oracle: Address;
  router: Address;
};

export type Deployment = {
  chainId: number;
  deployBlock: number;
  stable: Address;
  registry: Address;
  vault: Address;
  funds: FundDeployment[];
};

const ZERO = "0x0000000000000000000000000000000000000000";

export const deployment = raw as unknown as Deployment;
export const isDeployed = deployment.stable !== ZERO && deployment.funds.length > 0;
export const fundByKey = (key: string) => deployment.funds.find((f) => f.key === key);
export const explorer = process.env.NEXT_PUBLIC_EXPLORER || "https://testnet.bscscan.com";
