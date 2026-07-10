import { defineChain } from "viem";

/**
 * Robinhood's public RPC and chain id are deployment configuration so a launch
 * can move networks without another code change. The defaults keep local
 * development deterministic; production must set both public variables.
 */
export const ROBINHOOD_CHAIN_ID = Number(process.env.NEXT_PUBLIC_ROBINHOOD_CHAIN_ID || 46630);
export const ROBINHOOD_RPC_URL =
  process.env.NEXT_PUBLIC_ROBINHOOD_RPC_URL || process.env.ROBINHOOD_RPC_URL || "https://rpc.robinhoodchain.com";

export const robinhoodMainnet = defineChain({
  id: ROBINHOOD_CHAIN_ID,
  name: "Robinhood Mainnet",
  nativeCurrency: { name: "USDG", symbol: "USDG", decimals: 18 },
  rpcUrls: {
    default: { http: [ROBINHOOD_RPC_URL] },
    public: { http: [ROBINHOOD_RPC_URL] },
  },
  blockExplorers: {
    default: { name: "Robinhood Explorer", url: process.env.NEXT_PUBLIC_ROBINHOOD_EXPLORER_URL || "https://explorer.robinhoodchain.com" },
  },
});
