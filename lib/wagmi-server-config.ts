import { createConfig, createStorage, cookieStorage, http } from "wagmi";
import { coinbaseWallet, injected } from "wagmi/connectors";
import { robinhoodMainnet, ROBINHOOD_RPC_URL } from "@/lib/robinhood-chain";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://nixiepink.com";

const serverStorage = createStorage({ storage: cookieStorage });

export const serverConfig = createConfig({
  chains: [robinhoodMainnet],
  multiInjectedProviderDiscovery: false,
  ssr: true,
  storage: serverStorage,
  transports: {
    [robinhoodMainnet.id]: http(ROBINHOOD_RPC_URL),
  },
  connectors: [
    injected({ target: "braveWallet" }),
    injected({ target: "metaMask" }),
    coinbaseWallet({
      appName: "Nixie",
      appLogoUrl: `${APP_URL}/nixie.webp`,
    }),
  ],
});
