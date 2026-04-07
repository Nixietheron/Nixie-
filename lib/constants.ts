/** Base mainnet (eip155:8453). x402 payments use this chain. */
export const BASE_CHAIN_ID = 8453;

/** Solana mainnet RPC (public, no API key). Override with NEXT_PUBLIC_SOLANA_RPC in .env if needed. */
export const SOLANA_RPC =
  typeof process !== "undefined" && process.env?.NEXT_PUBLIC_SOLANA_RPC
    ? process.env.NEXT_PUBLIC_SOLANA_RPC
    : "https://solana-rpc.publicnode.com";

/** Chain IDs that support x402 USDC payments (Base only for EVM). */
export const X402_CHAIN_IDS = [BASE_CHAIN_ID] as const;

/** Solana mainnet CAIP-2 (CDP docs). Used so client can match v1 or v2 network format. */
export const SOLANA_MAINNET_CAIP2 = "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp" as const;

export const IPFS_GATEWAY = "https://gateway.pinata.cloud/ipfs";

/** USDC on Base mainnet (Circle). Used for x402 unlock payments. */
export const USDC_ON_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as const;
/** USDC SPL on Solana mainnet (Circle). Used for x402 unlock payments. */
export const USDC_SPL_SOLANA = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" as const;
export const USDC_DECIMALS = 6;
export const MEMBERSHIP_PRICE_USDC = 25;
export const MEMBERSHIP_DURATION_DAYS = 30;

export function ipfsUrl(cid: string | null | undefined): string {
  if (!cid) return "";
  return `${IPFS_GATEWAY}/${cid}`;
}

/** Use our API proxy so private Pinata pins work with PINATA_GATEWAY_TOKEN */
export function ipfsProxyUrl(gatewayUrl: string | null | undefined): string {
  if (!gatewayUrl || typeof gatewayUrl !== "string") return "";
  const match = gatewayUrl.match(/\/ipfs\/([^/?#]+)/);
  const cid = match?.[1];
  if (!cid) return gatewayUrl;
  return `/api/ipfs-image?cid=${encodeURIComponent(cid)}`;
}
