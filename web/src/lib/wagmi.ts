import { http, createConfig, cookieStorage, createStorage } from "wagmi";
import { bscTestnet } from "wagmi/chains";

/**
 * MetaMask-only by design. EIP-6963 discovery finds every injected wallet; the UI offers only
 * the one announcing rdns "io.metamask", so wallets that spoof window.ethereum.isMetaMask are not offered.
 */
export const METAMASK_RDNS = "io.metamask";

export const wagmiConfig = createConfig({
  chains: [bscTestnet],
  multiInjectedProviderDiscovery: true,
  connectors: [],
  ssr: true,
  storage: createStorage({ storage: cookieStorage }),
  transports: { [bscTestnet.id]: http(process.env.NEXT_PUBLIC_BSC_TESTNET_RPC) },
});

export const CHAIN = bscTestnet;
