import { createConfig, createStorage, http } from "wagmi";
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
 * Storage that reads/writes localStorage at call time (not at config creation).
 * Config is created on server (window undefined); when client runs reconnect/persist,
 * getItem/setItem are called in the browser so connection is persisted.
 */
const lazyLocalStorage = {
  getItem(key: string): string | null {
    if (typeof window !== "undefined" && window.localStorage)
      return window.localStorage.getItem(key);
    return null;
  },
  setItem(key: string, value: string): void {
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        window.localStorage.setItem(key, value);
      } catch {
        // QuotaExceededError, etc.
      }
    }
  },
  removeItem(key: string): void {
    if (typeof window !== "undefined" && window.localStorage)
      window.localStorage.removeItem(key);
  },
};
const clientStorage = createStorage({ storage: lazyLocalStorage });

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
