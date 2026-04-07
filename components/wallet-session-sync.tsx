"use client";

import { useEffect, useRef } from "react";
import { useAccount, useChainId, useSignMessage } from "wagmi";
import { useWallet } from "@solana/wallet-adapter-react";
import bs58 from "bs58";
import { isBaseAppLike } from "@/lib/base-app-detect";

export function dispatchWalletSessionEvent() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("nixie-wallet-session"));
  }
}

/**
 * Sign a SIWE message via Base Account `wallet_connect + signInWithEthereum` capability.
 * Returns { message, signature } on success, null if wallet doesn't support it or user rejects.
 *
 * Base App uses a smart contract wallet (ERC-6492); `personal_sign` may throw or produce an
 * ERC-6492-wrapped signature that requires a running RPC to verify. The `signInWithEthereum`
 * capability integrates SIWE into the wallet_connect handshake — no separate pop-up.
 */
async function siweViaWalletConnect(opts: {
  address: string;
  chainId: number;
  nonce: string;
}): Promise<{ message: string; signature: string } | null> {
  try {
    const win = window as unknown as {
      ethereum?: {
        request?: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
        isCoinbaseBrowser?: boolean;
        isCoinbaseWallet?: boolean;
        isBaseApp?: boolean;
      };
    };
    const provider = win.ethereum;
    if (!provider?.request) return null;

    const chainIdHex = `0x${opts.chainId.toString(16)}`;
    const result = (await provider.request({
      method: "wallet_connect",
      params: [
        {
          version: "1",
          capabilities: {
            signInWithEthereum: {
              nonce: opts.nonce,
              chainId: chainIdHex,
            },
          },
        },
      ],
    })) as {
      accounts?: Array<{
        address: string;
        capabilities?: {
          signInWithEthereum?: { message: string; signature: string };
        };
      }>;
    } | null;

    const siwe = result?.accounts?.[0]?.capabilities?.signInWithEthereum;
    if (!siwe?.message || !siwe?.signature) return null;
    return { message: siwe.message, signature: siwe.signature };
  } catch {
    return null;
  }
}

/**
 * Keeps an HTTP-only session cookie in sync with the connected wallet(s).
 *
 * EVM flow — tries these in order:
 *   1. **Base App / Coinbase Wallet UA**: `wallet_connect + signInWithEthereum` (SIWE inside
 *      the connect handshake, no extra pop-up, works with smart contract wallets).
 *   2. **Fallback (Base App)**: `personal_sign` via wagmi `signMessageAsync` — handles the
 *      ERC-6492 signature viem.`verifySiweMessage` already accepts.
 *   3. **All other browsers**: normal SIWE with `personal_sign`.
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

          let messageToSign: string;
          let signature: string;
          let usedWalletConnect = false;

          if (isBaseAppLike()) {
            // Try wallet_connect + signInWithEthereum (no separate sign pop-up)
            const wcResult = await siweViaWalletConnect({ address: address!, chainId, nonce });
            if (wcResult) {
              messageToSign = wcResult.message;
              signature = wcResult.signature;
              usedWalletConnect = true;
            } else {
              // wallet_connect not supported or failed — fall through to personal_sign
              usedWalletConnect = false;
            }
          }

          if (!usedWalletConnect) {
            // Standard path: createSiweMessage + personal_sign (works for all wallet types)
            const { createSiweMessage } = await import("viem/siwe");
            messageToSign = createSiweMessage({
              address: address!,
              chainId,
              domain: window.location.hostname,
              nonce,
              uri: window.location.origin,
              version: "1",
              statement: "Sign in to Nixie to verify wallet ownership.",
            });
            signature = await signMessageAsync({ message: messageToSign });
          }

          const authRes = await fetch("/api/auth/evm", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: messageToSign!, signature: signature! }),
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
