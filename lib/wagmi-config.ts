import { createConfig, createStorage, http } from "wagmi";
import { base } from "wagmi/chains";
import { baseAccount, injected } from "wagmi/connectors";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://nixiepink.com";

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
 * Browser extension wallets only (MetaMask, Brave, etc.).
 * No WalletConnect, no MetaMask SDK — avoids relay/async-storage errors.
 * clientStorage persists connection across page refreshes.
 */
export const config = createConfig({
  chains: [base],
  ssr: true,
  storage: clientStorage,
  transports: {
    [base.id]: http(),
  },
  connectors: [
    injected(),
    baseAccount({
      appName: "Nixie",
      appLogoUrl: `${APP_URL}/icon.jpg`,
    }),
  ],
});

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}
