import { createPublicClient, http } from "viem";
import { base, baseSepolia, mainnet } from "viem/chains";

/**
 * RPC client for SIWE signature verification (EOA + EIP-1271 + ERC-6492).
 * Must match the chain encoded in the signed message (chainId field).
 */
export function publicClientForSiweChain(chainId: number) {
  switch (chainId) {
    case 1:
      return createPublicClient({ chain: mainnet, transport: http() });
    case 84532:
      return createPublicClient({ chain: baseSepolia, transport: http() });
    case 8453:
    default:
      return createPublicClient({ chain: base, transport: http() });
  }
}
