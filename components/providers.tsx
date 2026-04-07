"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, type State } from "wagmi";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import { config } from "@/lib/wagmi-config";
import { SolanaWalletProviderWrapper } from "@/components/solana-wallet-provider";
import { SwitchToBaseEffect } from "@/components/switch-to-base-effect";
import { WalletSessionSync } from "@/components/wallet-session-sync";
import "@solana/wallet-adapter-react-ui/styles.css";

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
        <RainbowKitProvider initialChain={8453}>
          <SwitchToBaseEffect />
          <SolanaWalletProviderWrapper>
            <WalletSessionSync />
            {children}
          </SolanaWalletProviderWrapper>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
