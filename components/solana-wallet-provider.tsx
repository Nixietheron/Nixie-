"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ConnectionProvider,
  useWallet,
  WalletProvider as SolanaWalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { SolflareWalletAdapter } from "@solana/wallet-adapter-solflare";

import { SOLANA_RPC } from "@/lib/constants";

/**
 * Modal only calls select(walletName); it never calls connect().
 * After user picks a wallet we call connect(). Use a short delay so modal state is committed.
 */
function ConnectAfterSelect({ children }: { children: ReactNode }) {
  const { wallet, connected, connecting, connect } = useWallet();
  useEffect(() => {
    if (!wallet || connected || connecting) return;
    const t = setTimeout(() => {
      connect().catch(() => {});
    }, 100);
    return () => clearTimeout(t);
  }, [wallet, connected, connecting, connect]);
  return <>{children}</>;
}

function SolanaWalletProviderInner({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const wallets = useMemo(() => {
    if (!mounted || typeof window === "undefined") return [];
    return [new PhantomWalletAdapter(), new SolflareWalletAdapter()];
  }, [mounted]);
  return (
    <SolanaWalletProvider wallets={wallets} autoConnect={false}>
      <WalletModalProvider>
        <ConnectAfterSelect>{children}</ConnectAfterSelect>
      </WalletModalProvider>
    </SolanaWalletProvider>
  );
}

export function SolanaWalletProviderWrapper({ children }: { children: ReactNode }) {
  return (
    <ConnectionProvider endpoint={SOLANA_RPC}>
      <SolanaWalletProviderInner>{children}</SolanaWalletProviderInner>
    </ConnectionProvider>
  );
}
