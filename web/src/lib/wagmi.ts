import { http, fallback, createConfig, cookieStorage, createStorage } from "wagmi";
import { bscTestnet } from "wagmi/chains";

/**
 * MetaMask-only by design. EIP-6963 discovery finds every injected wallet; the UI offers only
 * the one announcing rdns "io.metamask", so wallets that spoof window.ethereum.isMetaMask are not offered.
 */
export const METAMASK_RDNS = "io.metamask";

/**
 * Browser-safe BSC testnet RPCs. The official data-seed endpoints (viem's default) reject browser
 * requests (no CORS), so reads would silently fail. These two were verified from a browser on 26 Nov 2026.
 */
export const BSC_TESTNET_RPCS = [
  process.env.NEXT_PUBLIC_BSC_TESTNET_RPC,
  "https://bsc-testnet-rpc.publicnode.com",
  "https://bsc-testnet.drpc.org",
].filter((u): u is string => !!u);

export const wagmiConfig = createConfig({
  chains: [bscTestnet],
  multiInjectedProviderDiscovery: true,
  connectors: [],
  ssr: true,
  storage: createStorage({ storage: cookieStorage }),
  transports: { [bscTestnet.id]: fallback(BSC_TESTNET_RPCS.map((u) => http(u))) },
});

export const CHAIN = bscTestnet;
