/** Base mainnet (eip155:8453). x402 payments use this chain. */
export const BASE_CHAIN_ID = 8453;
export const IPFS_GATEWAY = "https://gateway.pinata.cloud/ipfs";

/** USDC on Base mainnet (Circle). Used for x402 unlock payments. */
export const USDC_ON_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as const;
export const USDC_DECIMALS = 6;

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
