export const IPFS_GATEWAY = "https://gateway.pinata.cloud/ipfs";

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
