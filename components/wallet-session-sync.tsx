"use client";

import { useEffect, useRef } from "react";
import { useAccount, useChainId, useSignMessage } from "wagmi";
import { ROBINHOOD_CHAIN_ID } from "@/lib/robinhood-chain";

export function dispatchWalletSessionEvent() {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("nixie-wallet-session"));
}

/** Keeps a signed, HTTP-only session tied to the Robinhood Mainnet wallet. */
export function WalletSessionSync() {
  const { address, isConnected, status } = useAccount();
  const chainId = useChainId();
  const { signMessageAsync } = useSignMessage();
  const busy = useRef(false);

  useEffect(() => {
    if (!address || !isConnected || status !== "connected" || chainId !== ROBINHOOD_CHAIN_ID || busy.current) return;
    const authenticate = async () => {
      busy.current = true;
      try {
        const session = await fetch("/api/auth/session", { credentials: "include" }).then((r) => r.json());
        if (session.authenticated && session.evm?.toLowerCase() === address.toLowerCase()) {
          dispatchWalletSessionEvent();
          return;
        }
        const nonceRes = await fetch("/api/auth/nonce", { credentials: "include" });
        if (!nonceRes.ok) return;
        const { nonce } = await nonceRes.json();
        const { createSiweMessage } = await import("viem/siwe");
        const message = createSiweMessage({
          address,
          chainId,
          domain: window.location.hostname,
          nonce,
          uri: window.location.origin,
          version: "1",
          statement: "Sign in to Nixie Museum to verify wallet ownership.",
        });
        const signature = await signMessageAsync({ message });
        const response = await fetch("/api/auth/evm", {
          method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message, signature }),
        });
        if (response.ok) dispatchWalletSessionEvent();
      } catch (error) {
        console.warn("[wallet-session]", error);
      } finally {
        busy.current = false;
      }
    };
    void authenticate();
  }, [address, chainId, isConnected, signMessageAsync, status]);
  return null;
}
