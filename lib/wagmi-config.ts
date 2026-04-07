import { createConfig, createStorage, cookieStorage, http } from "wagmi";
import { base } from "wagmi/chains";
import {
  baseAccount,
  coinbaseWallet,
  injected,
  walletConnect,
} from "wagmi/connectors";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://nixiepink.com";
const WALLETCONNECT_PROJECT_ID =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "";

/**
 * cookieStorage persists wagmi connection state in HTTP cookies.
 * This is the recommended approach for Next.js SSR apps and works
 * correctly in Base App's in-app browser (unlike localStorage which
 * may not survive WebView restarts, causing "connecting" instead of
 * "reconnecting" on every page load and triggering repeated SIWE prompts).
 */
const clientStorage = createStorage({ storage: cookieStorage });

/**
 * Web: injected + Coinbase + WalletConnect (RainbowKit modal lists these).
 * Base App: baseAccount (+ injected when host injects).
 * WalletConnect needs NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID (cloud.walletconnect.com).
 */
const connectors = [
  injected(),
  coinbaseWallet({
    appName: "Nixie",
    appLogoUrl: `${APP_URL}/icon.jpg`,
  }),
  ...(WALLETCONNECT_PROJECT_ID
    ? [
        walletConnect({
          projectId: WALLETCONNECT_PROJECT_ID,
          metadata: {
            name: "Nixie",
            description: "Nixie",
            url: APP_URL,
            icons: [`${APP_URL}/icon.jpg`],
          },
        }),
      ]
    : []),
  baseAccount({
    appName: "Nixie",
    appLogoUrl: `${APP_URL}/icon.jpg`,
  }),
];

export const config = createConfig({
  chains: [base],
  ssr: true,
  storage: clientStorage,
  transports: {
    [base.id]: http(),
  },
  connectors,
});

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}
