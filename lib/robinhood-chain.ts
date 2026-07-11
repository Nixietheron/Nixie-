import { defineChain } from "viem";

/**
 * Robinhood Mainnet has a fixed public chain ID.  Keeping it out of deployment
 * configuration prevents an old testnet value from being compiled into the
 * wallet client and rejected by wallets while a SIWE signature is displayed.
 */
export const ROBINHOOD_CHAIN_ID = 4663;
export const ROBINHOOD_RPC_URL =
  process.env.NEXT_PUBLIC_ROBINHOOD_RPC_URL || process.env.ROBINHOOD_RPC_URL || "https://rpc.mainnet.chain.robinhood.com";
export const ROBINHOOD_RPC_CONFIGURED = true;

export const robinhoodMainnet = defineChain({
  id: ROBINHOOD_CHAIN_ID,
  name: "Robinhood Mainnet",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: [ROBINHOOD_RPC_URL] },
    public: { http: [ROBINHOOD_RPC_URL] },
  },
  blockExplorers: {
    default: { name: "Robinhood Explorer", url: process.env.NEXT_PUBLIC_ROBINHOOD_EXPLORER_URL || "https://robinhoodchain.blockscout.com" },
  },
});
