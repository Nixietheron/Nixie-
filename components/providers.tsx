"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, type State } from "wagmi";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import { config } from "@/lib/wagmi-config";
import { WalletSessionSync } from "@/components/wallet-session-sync";

const queryClient = new QueryClient();

export function Providers({
  children,
  initialState,
}: {
  children: React.ReactNode;
  /** Server-read wagmi cookie state — prevents hydration flash and ensures
   *  wagmi starts in "reconnecting" (not "connecting") on page refresh. */
  initialState?: State;
}) {
  return (
    <WagmiProvider config={config} initialState={initialState}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <WalletSessionSync />
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
