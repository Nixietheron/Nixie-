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

export function WalletSessionSync() {
  const { address, isConnected, status } = useAccount();
  const chainId = useChainId();
  const { signMessageAsync } = useSignMessage();
  const solanaWallet = useWallet();
  const busy = useRef(false);
  const lastAttemptByKeyRef = useRef<Record<string, number>>({});

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (busy.current) return;
      busy.current = true;
      try {
        const evmConnected = !!(address && isConnected);
        const svmConnected = !!(solanaWallet.publicKey && solanaWallet.signMessage);
        const reconnecting =
          status === "connecting" ||
          status === "reconnecting" ||
          Boolean(solanaWallet.connecting);

        // On refresh, wallets may briefly appear disconnected while restoring.
        // Avoid clearing session during that transient state.
        if (reconnecting) {
          return;
        }

        // Never auto-logout on passive refresh/disconnect transitions.
        // Logout should happen only on explicit user action.
        if (!evmConnected && !svmConnected) {
          return;
        }

        let session = await fetch("/api/auth/session", { credentials: "include" }).then((r) => r.json());
        if (cancelled) return;

        // Do not auto-clear session just because one wallet type is currently disconnected.
        // Otherwise, users who previously connected both EVM and Solana are forced to re-sign
        // on every refresh when one adapter restores slower or remains disconnected.

        if (evmConnected && address) {
          const ok = session.evm && String(session.evm).toLowerCase() === address.toLowerCase();
          if (!ok) {
            const attemptKey = `evm:${address.toLowerCase()}`;
            const last = lastAttemptByKeyRef.current[attemptKey] ?? 0;
            if (Date.now() - last < 15000) return;
            lastAttemptByKeyRef.current[attemptKey] = Date.now();
            const nonceRes = await fetch("/api/auth/nonce", { credentials: "include" });
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
            if (cancelled) return;
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
            session = await fetch("/api/auth/session", { credentials: "include" }).then((r) => r.json());
          }
        }

        if (svmConnected && solanaWallet.publicKey && solanaWallet.signMessage) {
          const pk = solanaWallet.publicKey.toBase58();
          if (session.svm !== pk) {
            const attemptKey = `svm:${pk}`;
            const last = lastAttemptByKeyRef.current[attemptKey] ?? 0;
            if (Date.now() - last < 15000) return;
            lastAttemptByKeyRef.current[attemptKey] = Date.now();
            const nonceRes = await fetch("/api/auth/nonce", { credentials: "include" });
            const { nonce } = await nonceRes.json();
            const message = `Nixie\nSign in to verify wallet ownership.\nNonce: ${nonce}`;
            const encoded = new TextEncoder().encode(message);
            const sig = await solanaWallet.signMessage(encoded);
            if (cancelled) return;
            const authRes = await fetch("/api/auth/svm", {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                publicKey: pk,
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
        }
      } catch (e) {
        console.warn("[wallet-session]", e);
      } finally {
        busy.current = false;
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solanaWallet identity churns; we use publicKey + signMessage
  }, [address, isConnected, status, chainId, signMessageAsync, solanaWallet.publicKey, solanaWallet.signMessage, solanaWallet.connecting]);

  return null;
}
