// Deployment engine — client-side contract deployment via MetaMask (wagmi/viem)

import { createWalletClient, custom, encodeDeployData } from "viem";
import type { Abi } from "viem";
import type { ConstructorArg } from "@/types";

export interface DeployParams {
  abi: Abi;
  bytecode: `0x${string}`;
  args: ConstructorArg[];
  chainId: number;
}

export interface DeployResult {
  txHash: `0x${string}`;
  contractAddress?: `0x${string}`;
}

/**
 * Sends a contract deployment transaction through the user's injected wallet.
 * Call this from a React component that has access to window.ethereum.
 */
export async function deployContract(params: DeployParams): Promise<DeployResult> {
  if (!window.ethereum) throw new Error("No wallet found. Please install MetaMask.");

  const walletClient = createWalletClient({
    transport: custom(window.ethereum),
  });

  const [account] = await walletClient.getAddresses();

  const deployData = encodeDeployData({
    abi: params.abi,
    bytecode: params.bytecode,
    args: params.args.map((a) => a.value),
  });

  const txHash = await walletClient.sendTransaction({
    account,
    data: deployData,
    chain: { id: params.chainId } as never,
  });

  return { txHash };
}
