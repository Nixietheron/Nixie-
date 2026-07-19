"use client";

import { createConfig, createStorage, cookieStorage, http } from "wagmi";
import { robinhoodMainnet, ROBINHOOD_RPC_URL } from "@/lib/robinhood-chain";
import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import {
  braveWallet,
  coinbaseWallet,
  injectedWallet,
  metaMaskWallet,
} from "@rainbow-me/rainbowkit/wallets";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://nixiepink.com";
const WALLETCONNECT_PROJECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "nixie-local";

/**
 * cookieStorage persists wagmi connection state in HTTP cookies.
 * This is the recommended approach for Next.js SSR apps and works
 * correctly after a browser refresh.
 */
const clientStorage = createStorage({ storage: cookieStorage });

const connectors = connectorsForWallets(
  [
    {
      groupName: "Recommended",
      wallets: [
        braveWallet,
        metaMaskWallet,
        injectedWallet,
        coinbaseWallet,
      ],
    },
  ],
  {
    appName: "Nixie",
    appDescription: "Nixie Genesis NFT mint and private museum.",
    appUrl: APP_URL,
    appIcon: `${APP_URL}/nixie.webp`,
    projectId: WALLETCONNECT_PROJECT_ID,
  },
);

export const config = createConfig({
  chains: [robinhoodMainnet],
  multiInjectedProviderDiscovery: true,
  ssr: true,
  storage: clientStorage,
  transports: {
    [robinhoodMainnet.id]: http(ROBINHOOD_RPC_URL),
  },
  connectors,
});

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}
