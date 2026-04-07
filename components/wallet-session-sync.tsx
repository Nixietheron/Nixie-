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
 * The ONLY time we automatically prompt for a SIWE signature is when
 * the wallet status goes through the full cycle:
 *
 *   disconnected → connecting → connected   (user explicitly connected)
 *
 * This covers both regular browsers AND Base App / miniapp WebViews,
 * which both start with "connecting" but never show "disconnected" unless
 * the user actually disconnected first.
 *
 * On page refresh in a browser:    reconnecting → connected (no "disconnected")
 * On page load in Base App:        connecting   → connected (no "disconnected")
 *
 * In both cases, wasDisconnectedRef stays false, so we only check the
 * existing session cookie and never pop up a signature request.
 *
 * If the session is valid → dispatch update event.
 * If the session is missing/expired → silently skip.
 *   The user will be prompted next time they genuinely reconnect.
 */
export function WalletSessionSync() {
  const { address, isConnected, status } = useAccount();
  const chainId = useChainId();
  const { signMessageAsync } = useSignMessage();
  const solanaWallet = useWallet();

  // EVM: becomes true when we see status === "disconnected", reset when sign completes
  const evmWasDisconnectedRef = useRef<boolean>(status === "disconnected");
  const prevEvmStatusRef = useRef<string>(status);
  const prevEvmAddressRef = useRef<string | undefined>(address);

  // Solana: track key transitions
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

    // Track when EVM wallet is explicitly disconnected by the user.
    if (status === "disconnected") {
      evmWasDisconnectedRef.current = true;
    }

    // Wait for transitions to settle.
    if (status === "connecting" || status === "reconnecting") return;
    if (solanaWallet.connecting) return;

    const evmConnected = !!(address && isConnected && status === "connected");
    const svmConnected = !!(solanaWallet.publicKey && solanaWallet.connected);

    if (!evmConnected && !svmConnected) return;

    // ── EVM transition classification ─────────────────────────────────────
    // SIGN if: user explicitly disconnected before this connection
    //          OR user switched to a different wallet address
    const evmAddressSwitched =
      evmConnected &&
      prevEvmAddress !== undefined &&
      prevEvmAddress !== address &&
      prevEvmStatus === "connected";

    const evmShouldSign =
      (evmConnected && evmWasDisconnectedRef.current) || evmAddressSwitched;

    // ── Solana transition classification ──────────────────────────────────
    // Solana: sign if the key/connected state actually changed.
    // Session check will guard against signing when session is already valid.
    const svmJustConnected =
      !prevSvmConnected && solanaWallet.connected && currentSvmKey !== null;
    const svmKeyChanged = currentSvmKey !== prevSvmKey && currentSvmKey !== null;
    const svmStateChanged = svmJustConnected || svmKeyChanged;

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

        // ── EVM ───────────────────────────────────────────────────────────
        if (evmConnected) {
          if (evmSessionOk) {
            // Session valid, no action needed.
          } else if (evmShouldSign) {
            // User explicitly connected → request SIWE.
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
            // Reset the "was disconnected" flag now that we've successfully signed.
            evmWasDisconnectedRef.current = false;
          }
          // else: page refresh / Base App auto-connect without prior disconnect → skip
        }

        // ── Solana ────────────────────────────────────────────────────────
        if (svmConnected && svmStateChanged) {
          if (svmSessionOk) {
            // Session valid, no action needed.
          } else if (solanaWallet.signMessage) {
            // For Solana: always sign when state changes and session is missing,
            // because Solana wallet adapter has no "reconnecting" concept — the
            // session cookie is the only reliable gate (7-day TTL prevents spam).
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
        }

        // Notify feed/profile to refetch content with updated session.
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
