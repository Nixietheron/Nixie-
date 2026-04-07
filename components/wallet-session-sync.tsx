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
 * EVM (wagmi) exposes two distinct status transitions:
 *   "connecting"   → "connected"  = user freshly connected  → sign
 *   "reconnecting" → "connected"  = page refresh restore    → verify only, no sign
 *
 * Solana wallet adapter has no "reconnecting" state, so we use a different
 * heuristic: if the session already contains this SVM key, it was a page
 * refresh restore → no sign. If the session does NOT contain it → fresh
 * connect → sign.
 */
export function WalletSessionSync() {
  const { address, isConnected, status } = useAccount();
  const chainId = useChainId();
  const { signMessageAsync } = useSignMessage();
  const solanaWallet = useWallet();

  // EVM transition tracking
  const prevEvmStatusRef = useRef<string>(status);
  const prevEvmAddressRef = useRef<string | undefined>(address);

  // Solana transition tracking
  const prevSvmKeyRef = useRef<string | null>(
    solanaWallet.publicKey?.toBase58() ?? null
  );
  const prevSvmConnectedRef = useRef<boolean>(solanaWallet.connected);

  const busy = useRef(false);

  useEffect(() => {
    const prevEvmStatus = prevEvmStatusRef.current;
    const prevEvmAddress = prevEvmAddressRef.current;
    prevEvmStatusRef.current = status;
    prevEvmAddressRef.current = address;

    const prevSvmKey = prevSvmKeyRef.current;
    const prevSvmConnected = prevSvmConnectedRef.current;
    const currentSvmKey = solanaWallet.publicKey?.toBase58() ?? null;
    prevSvmKeyRef.current = currentSvmKey;
    prevSvmConnectedRef.current = solanaWallet.connected;

    // Wait for transitions to settle
    if (status === "connecting" || status === "reconnecting") return;
    if (solanaWallet.connecting) return;

    const evmConnected = !!(address && isConnected && status === "connected");
    const svmConnected = !!(solanaWallet.publicKey && solanaWallet.connected);

    if (!evmConnected && !svmConnected) return;

    // ── EVM transition detection ──────────────────────────────────────────
    // "connecting → connected"       = fresh connect  → should sign
    // "reconnecting → connected"     = page refresh   → should NOT sign
    // address changed while connected = wallet switch  → should sign
    const evmWasFreshConnecting = prevEvmStatus === "connecting";
    const evmWasReconnecting = prevEvmStatus === "reconnecting";
    const evmAddressSwitched =
      evmConnected &&
      prevEvmAddress !== undefined &&
      prevEvmAddress !== address &&
      prevEvmStatus === "connected";

    const evmIsReconnect = evmWasReconnecting && !evmAddressSwitched;
    const evmNeedsSign = evmWasFreshConnecting || evmAddressSwitched;

    // ── Solana transition detection ───────────────────────────────────────
    // Solana has no "reconnecting" state. We use session presence instead:
    // if session already has this SVM key → it's a restore, no sign needed.
    // If not → fresh connect, sign.
    // We only re-check when the key or connected state actually changed.
    const svmKeyChanged = currentSvmKey !== prevSvmKey;
    const svmJustConnected = !prevSvmConnected && solanaWallet.connected && currentSvmKey !== null;
    const svmStateChanged = svmKeyChanged || svmJustConnected;

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

        // ── EVM ──
        if (evmConnected) {
          if (evmSessionOk) {
            // valid, nothing to do for EVM
          } else if (evmIsReconnect) {
            // page refresh + no valid session → silently skip, no popup
          } else if (evmNeedsSign) {
            const nonceRes = await fetch("/api/auth/nonce", { credentials: "include" });
            if (!nonceRes.ok) return;
            const { nonce } = await nonceRes.json();
            const { SiweMessage } = await import("siwe");
            const msg = new SiweMessage({
              domain: window.location.host,
              address,
              statement: "Sign in to Nixie to verify wallet ownership.",
              uri: window.location.origin,
              version: "1",
              chainId,
              nonce,
            });
            const messageToSign = msg.prepareMessage();
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
        }

        // ── Solana ──
        if (svmConnected && svmStateChanged) {
          if (svmSessionOk) {
            // valid, nothing to do for SVM
          } else {
            // Session missing for this SVM key.
            // Since we have no "reconnecting" state for Solana, sign once.
            // The session cookie (7 days TTL) will prevent re-signing on next refresh.
            const nonceRes = await fetch("/api/auth/nonce", { credentials: "include" });
            if (!nonceRes.ok) return;
            const { nonce } = await nonceRes.json();
            const message = `Nixie\nSign in to verify wallet ownership.\nNonce: ${nonce}`;
            const encoded = new TextEncoder().encode(message);
            const sig = await solanaWallet.signMessage!(encoded);
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
        }

        // Dispatch session update so feed/profile refetch content.
        dispatchWalletSessionEvent();
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
