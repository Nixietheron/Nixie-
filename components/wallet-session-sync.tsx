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
 * How this works:
 *
 * wagmi exposes two distinct status transitions:
 *   "connecting"    → "connected"  = user just freshly connected a wallet
 *   "reconnecting"  → "connected"  = page refresh, previous wallet restored automatically
 *
 * We ONLY prompt for SIWE signature on a FRESH connect or wallet switch.
 * On page refresh (reconnect), we just verify the existing session cookie.
 * If the cookie is still valid for the current wallet → done, no popup.
 * If the cookie is missing/expired on reconnect → we silently skip (no popup).
 *   The user will be re-prompted next time they explicitly reconnect.
 */
export function WalletSessionSync() {
  const { address, isConnected, status } = useAccount();
  const chainId = useChainId();
  const { signMessageAsync } = useSignMessage();
  const solanaWallet = useWallet();

  const prevStatusRef = useRef<string>(status);
  const prevAddressRef = useRef<string | undefined>(address);
  const busy = useRef(false);

  useEffect(() => {
    const prevStatus = prevStatusRef.current;
    const prevAddress = prevAddressRef.current;
    prevStatusRef.current = status;
    prevAddressRef.current = address;

    // Still in transitional states, wait.
    if (status === "connecting" || status === "reconnecting") return;
    if (solanaWallet.connecting) return;

    const evmConnected = !!(address && isConnected && status === "connected");
    const svmConnected = !!(solanaWallet.publicKey && solanaWallet.connected);

    if (!evmConnected && !svmConnected) return;

    // Determine intent:
    // - "reconnect"  = page refresh, wallet auto-restored (reconnecting → connected)
    // - "fresh"      = user explicitly connected for the first time (connecting → connected)
    // - "switch"     = wallet address changed while connected
    const wasReconnecting = prevStatus === "reconnecting";
    const wasFreshConnecting = prevStatus === "connecting";
    const addressSwitched =
      evmConnected &&
      prevAddress !== undefined &&
      prevAddress !== address &&
      prevStatus === "connected";
    const isReconnect = wasReconnecting && !addressSwitched;
    const needsSign = wasFreshConnecting || addressSwitched;

    const run = async () => {
      if (busy.current) return;
      busy.current = true;
      try {
        // Always read the current session first.
        const session = await fetch("/api/auth/session", { credentials: "include" })
          .then((r) => r.json())
          .catch(() => ({ authenticated: false, evm: null, svm: null }));

        const evmSessionOk =
          evmConnected &&
          session.authenticated &&
          session.evm &&
          session.evm.toLowerCase() === address!.toLowerCase();

        const svmSessionOk =
          svmConnected &&
          session.authenticated &&
          session.svm === solanaWallet.publicKey!.toBase58();

        const allOk =
          (!evmConnected || evmSessionOk) && (!svmConnected || svmSessionOk);

        if (allOk) {
          // Session valid — no signature needed, just notify the app.
          dispatchWalletSessionEvent();
          return;
        }

        // Session invalid/missing.
        if (isReconnect) {
          // Page refresh: do NOT bother the user with a popup.
          // They'll need to explicitly reconnect to get a fresh session.
          return;
        }

        if (!needsSign) {
          // Unknown transition, don't prompt.
          return;
        }

        // === Fresh connect or wallet switch: request SIWE signature ===
        if (evmConnected && address && !evmSessionOk) {
          const nonceRes = await fetch("/api/auth/nonce", { credentials: "include" });
          if (!nonceRes.ok) return;
          const { nonce } = await nonceRes.json();
          const { SiweMessage } = await import("siwe");
          const message = new SiweMessage({
            domain: window.location.host,
            address,
            statement: "Sign in to Nixie to verify wallet ownership.",
            uri: window.location.origin,
            version: "1",
            chainId,
            nonce,
          });
          const messageToSign = message.prepareMessage();
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
          dispatchWalletSessionEvent();
        }

        if (svmConnected && solanaWallet.publicKey && solanaWallet.signMessage && !svmSessionOk) {
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
              publicKey: solanaWallet.publicKey.toBase58(),
              message,
              signature: bs58.encode(sig),
            }),
          });
          if (!authRes.ok) {
            console.warn("[wallet-session] svm auth failed", await authRes.text().catch(() => ""));
            return;
          }
          dispatchWalletSessionEvent();
        }
      } catch (e) {
        console.warn("[wallet-session]", e);
      } finally {
        busy.current = false;
      }
    };

    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, isConnected, status, solanaWallet.publicKey, solanaWallet.connected, solanaWallet.connecting]);

  return null;
}
