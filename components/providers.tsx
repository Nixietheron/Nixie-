"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import { config } from "@/lib/wagmi-config";
import { SolanaWalletProviderWrapper } from "@/components/solana-wallet-provider";
import { SwitchToBaseEffect } from "@/components/switch-to-base-effect";
import { AutoConnectBaseApp } from "@/components/auto-connect-baseapp";
import "@solana/wallet-adapter-react-ui/styles.css";

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  // In Base App we avoid RainbowKit UI and use Base Account connector directly.
  const isBaseAppLike =
    typeof window !== "undefined" &&
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || "") &&
    (window as unknown as { ethereum?: unknown }).ethereum == null;

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {isBaseAppLike ? (
          <>
            <SwitchToBaseEffect />
            <AutoConnectBaseApp />
            <SolanaWalletProviderWrapper>{children}</SolanaWalletProviderWrapper>
          </>
        ) : (
          <RainbowKitProvider initialChain={8453}>
            <SwitchToBaseEffect />
            <AutoConnectBaseApp />
            <SolanaWalletProviderWrapper>{children}</SolanaWalletProviderWrapper>
          </RainbowKitProvider>
        )}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
