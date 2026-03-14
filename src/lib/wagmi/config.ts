// wagmi + viem client config
// Chains supported at launch: Ethereum, Base, Polygon, Optimism, Arbitrum

import { http, createConfig } from "wagmi";
import { mainnet, base, polygon, optimism, arbitrum, sepolia, baseSepolia } from "wagmi/chains";
import { injected, walletConnect } from "wagmi/connectors";

export const wagmiConfig = createConfig({
  chains: [mainnet, base, polygon, optimism, arbitrum, sepolia, baseSepolia],
  connectors: [
    injected(), // MetaMask + browser wallets
    walletConnect({ projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID! }),
  ],
  transports: {
    [mainnet.id]:   http(process.env.NEXT_PUBLIC_ETH_RPC_URL),
    [base.id]:      http(process.env.NEXT_PUBLIC_BASE_RPC_URL),
    [polygon.id]:   http(process.env.NEXT_PUBLIC_POLYGON_RPC_URL),
    [optimism.id]:  http(process.env.NEXT_PUBLIC_OP_RPC_URL),
    [arbitrum.id]:  http(process.env.NEXT_PUBLIC_ARB_RPC_URL),
    [sepolia.id]:   http(process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL),
    [baseSepolia.id]: http(process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL),
  },
});
