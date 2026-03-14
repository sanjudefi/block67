// wagmi + viem client config
import { http, createConfig } from "wagmi";
import { mainnet, base, polygon, optimism, arbitrum, sepolia, baseSepolia } from "wagmi/chains";
import { injected, walletConnect } from "wagmi/connectors";
import type { CreateConnectorFn } from "wagmi";

// WalletConnect is optional — only added if project ID is configured
const connectors: CreateConnectorFn[] = [injected()];
if (process.env.NEXT_PUBLIC_WC_PROJECT_ID) {
  connectors.push(walletConnect({ projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID }));
}

export const wagmiConfig = createConfig({
  chains: [mainnet, base, polygon, optimism, arbitrum, sepolia, baseSepolia],
  connectors,
  transports: {
    [mainnet.id]:     http(process.env.NEXT_PUBLIC_ETH_RPC_URL),
    [base.id]:        http(process.env.NEXT_PUBLIC_BASE_RPC_URL),
    [polygon.id]:     http(process.env.NEXT_PUBLIC_POLYGON_RPC_URL),
    [optimism.id]:    http(process.env.NEXT_PUBLIC_OP_RPC_URL),
    [arbitrum.id]:    http(process.env.NEXT_PUBLIC_ARB_RPC_URL),
    [sepolia.id]:     http(process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL),
    [baseSepolia.id]: http(process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL),
  },
});
