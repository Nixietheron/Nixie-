"use client";

import { useEffect, useRef } from "react";
import { useAccount, useChainId, useSignMessage } from "wagmi";
import { useWallet } from "@solana/wallet-adapter-react";
import bs58 from "bs58";

export function dispatchWalletSessionEvent() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("nixie-wallet-session"));
  }
}

/**
 * Keeps an HTTP-only session cookie in sync with the connected wallet(s).
 *
 * - **EVM:** If the wallet is connected but `/api/auth/session` has no valid
 *   EVM entry for this address → SIWE once. This covers Base App / WebView where
 *   the first transition is often `connecting → connected` without a prior
 *   `disconnected` (so we must not rely on “user disconnected first”).
 * - **Solana:** Same rule — connected + session missing for this pubkey → sign once.
 *
 * After a successful SIWE/SVM auth, the cookie is set; subsequent requests
 * (`fetch` with `credentials: 'include'`) see the session. Page refresh with a
 * valid cookie → session OK → no second signature.
 */
export function WalletSessionSync() {
  const { address, isConnected, status } = useAccount();
  const chainId = useChainId();
  const { signMessageAsync } = useSignMessage();
  const solanaWallet = useWallet();

  const busy = useRef(false);

  useEffect(() => {
    if (status === "connecting" || status === "reconnecting") return;
    if (solanaWallet.connecting) return;

    const evmConnected = !!(address && isConnected && status === "connected");
    const svmConnected = !!(solanaWallet.publicKey && solanaWallet.connected);
    const currentSvmKey = solanaWallet.publicKey?.toBase58() ?? null;

    if (!evmConnected && !svmConnected) return;

    const run = async () => {
      if (busy.current) return;
      busy.current = true;
      try {
        const session = await fetch("/api/auth/session", { credentials: "include" })
          .then((r) => r.json())
          .catch(() => ({ authenticated: false, evm: null, svm: null }));

        const evmSessionOk =
          evmConnected &&
          session.authenticated &&
          session.evm?.toLowerCase() === address!.toLowerCase();

        const svmSessionOk =
          svmConnected &&
          session.authenticated &&
          session.svm === currentSvmKey;

        if (evmConnected && !evmSessionOk) {
          const nonceRes = await fetch("/api/auth/nonce", { credentials: "include" });
          if (!nonceRes.ok) return;
          const { nonce } = await nonceRes.json();
          const { createSiweMessage } = await import("viem/siwe");
          const messageToSign = createSiweMessage({
            address: address!,
            chainId,
            domain: window.location.hostname,
            nonce,
            uri: window.location.origin,
            version: "1",
            statement: "Sign in to Nixie to verify wallet ownership.",
          });
          const signature = await signMessageAsync({ message: messageToSign });
          const authRes = await fetch("/api/auth/evm", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: messageToSign, signature }),
          });
          if (!authRes.ok) {
            console.warn("[wallet-session] evm auth failed", await authRes.text().catch(() => ""));
            return;
          }
        }

        if (svmConnected && solanaWallet.signMessage && !svmSessionOk) {
          const nonceRes = await fetch("/api/auth/nonce", { credentials: "include" });
          if (!nonceRes.ok) return;
          const { nonce } = await nonceRes.json();
          const message = `Nixie\nSign in to verify wallet ownership.\nNonce: ${nonce}`;
          const encoded = new TextEncoder().encode(message);
          const sig = await solanaWallet.signMessage(encoded);
          const authRes = await fetch("/api/auth/svm", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              publicKey: currentSvmKey,
              message,
              signature: bs58.encode(sig),
            }),
          });
          if (!authRes.ok) {
            console.warn("[wallet-session] svm auth failed", await authRes.text().catch(() => ""));
            return;
          }
        }

        dispatchWalletSessionEvent();
      } catch (e) {
        console.warn("[wallet-session]", e);
      } finally {
        busy.current = false;
      }
    };

    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    address,
    chainId,
    isConnected,
    status,
    solanaWallet.publicKey,
    solanaWallet.connected,
    solanaWallet.connecting,
  ]);

  return null;
}
