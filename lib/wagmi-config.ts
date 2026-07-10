import { createConfig, createStorage, cookieStorage, http } from "wagmi";
import { robinhoodMainnet } from "@/lib/robinhood-chain";
import {
  coinbaseWallet,
  injected,
} from "wagmi/connectors";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://nixiepink.com";

/**
 * cookieStorage persists wagmi connection state in HTTP cookies.
 * This is the recommended approach for Next.js SSR apps and works
 * correctly after a browser refresh.
 */
const clientStorage = createStorage({ storage: cookieStorage });

/**
 * Injected and Coinbase Wallet are offered on Robinhood Mainnet.
 * WalletConnect needs NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID (cloud.walletconnect.com).
 */
const connectors = [
  injected(),
  coinbaseWallet({
    appName: "Nixie",
    appLogoUrl: `${APP_URL}/nixie.webp`,
  }),
];

export const config = createConfig({
  chains: [robinhoodMainnet],
  ssr: true,
  storage: clientStorage,
  transports: {
    [robinhoodMainnet.id]: http(),
  },
  connectors,
});

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}
