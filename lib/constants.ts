export const IPFS_GATEWAY = "https://gateway.pinata.cloud/ipfs";

export function ipfsUrl(cid: string | null | undefined): string {
  if (!cid) return "";
  return `${IPFS_GATEWAY}/${cid}`;
}

/** Normalize an IPFS gateway URL without proxying arbitrary CIDs through our origin. */
export function ipfsProxyUrl(gatewayUrl: string | null | undefined): string {
  if (!gatewayUrl || typeof gatewayUrl !== "string") return "";
  const match = gatewayUrl.match(/\/ipfs\/([^/?#]+)/);
  const cid = match?.[1];
  if (!cid || !/^[a-zA-Z0-9]{32,128}$/.test(cid)) return "";
  return `${IPFS_GATEWAY}/${cid}`;
}
