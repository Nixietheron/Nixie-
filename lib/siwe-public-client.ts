import { createPublicClient, http } from "viem";
import { robinhoodMainnet } from "@/lib/robinhood-chain";

/**
 * RPC client for SIWE signature verification (EOA + EIP-1271 + ERC-6492).
 * Must match the chain encoded in the signed message (chainId field).
 */
export function publicClientForSiweChain(chainId: number) {
  if (chainId !== robinhoodMainnet.id) throw new Error("Robinhood Mainnet is required.");
  return createPublicClient({ chain: robinhoodMainnet, transport: http() });
}
