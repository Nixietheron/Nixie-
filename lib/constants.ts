export const IPFS_GATEWAY = "https://gateway.pinata.cloud/ipfs";

export function ipfsUrl(cid: string | null | undefined): string {
  if (!cid) return "";
  const normalized = cid.trim();
  if (!normalized) return "";
  if (normalized.startsWith("ipfs://")) {
    return `${IPFS_GATEWAY}/${normalized.replace(/^ipfs:\/\//, "").replace(/^ipfs\//, "")}`;
  }
  if (/^https?:\/\//i.test(normalized)) {
    return ipfsProxyUrl(normalized) || normalized;
  }
  return `${IPFS_GATEWAY}/${normalized.replace(/^\/+/, "").replace(/^ipfs\//, "")}`;
}

/** Normalize an IPFS gateway URL without proxying arbitrary CIDs through our origin. */
export function ipfsProxyUrl(gatewayUrl: string | null | undefined): string {
  if (!gatewayUrl || typeof gatewayUrl !== "string") return "";
  const normalized = gatewayUrl.trim();
  const cid = normalized.startsWith("ipfs://")
    ? normalized.replace(/^ipfs:\/\//, "").replace(/^ipfs\//, "").split(/[/?#]/, 1)[0]
    : normalized.match(/\/ipfs\/([^/?#]+)/)?.[1];
  if (!cid || !/^[a-zA-Z0-9]{32,128}$/.test(cid)) return "";
  return `${IPFS_GATEWAY}/${cid}`;
}
