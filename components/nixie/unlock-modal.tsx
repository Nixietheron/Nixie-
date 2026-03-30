"use client";

import { X, Lock, Wallet } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useState } from "react";
import { Artwork } from "@/lib/types";

export type UnlockType = "nsfw" | "animated";

/** Payment network for x402: Base (EVM) or Solana. */
export type PaymentNetwork = "base" | "solana";

interface UnlockModalProps {
  artwork: Artwork;
  unlockType: UnlockType;
  onClose: () => void;
  onUnlock: (paymentNetwork: PaymentNetwork) => void;
  isLoading?: boolean;
  error?: string | null;
  /** Whether a Solana wallet is connected (so we can offer Pay with Solana). */
  solanaWalletConnected?: boolean;
  /** When user clicks "Connect Solana wallet", call this to open the Solana wallet modal. */
  onConnectSolanaClick?: () => void;
  /** Whether Base (EVM) wallet is connected and on Base network (ready for x402). */
  baseWalletReady?: boolean;
  /** Whether an EVM wallet is connected (so we can show "switch network" vs "connect"). */
  baseWalletConnected?: boolean;
}

const PAYMENT_NETWORKS: { key: PaymentNetwork; label: string }[] = [
  { key: "base", label: "Base" },
  { key: "solana", label: "Solana" },
];

export function UnlockModal({
  artwork,
  unlockType,
  onClose,
  onUnlock,
  isLoading,
  error,
  solanaWalletConnected = false,
  onConnectSolanaClick,
  baseWalletReady = false,
  baseWalletConnected = false,
}: UnlockModalProps) {
  const [paymentNetwork, setPaymentNetwork] = useState<PaymentNetwork>("base");
  const priceUsdc = unlockType === "nsfw" ? artwork.price : (artwork.animatedPrice ?? 0);
  const label = unlockType === "nsfw" ? "NSFW" : "Animated";
  const isSolana = paymentNetwork === "solana";
  const isBase = paymentNetwork === "base";
  const canPaySolana = isSolana && solanaWalletConnected;
  const canPayBase = isBase && baseWalletReady;
  const baseNeedSwitch = isBase && !baseWalletReady && baseWalletConnected;
  const baseNeedConnect = isBase && !baseWalletReady && !baseWalletConnected;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 max-sm:pb-[calc(3.5rem+env(safe-area-inset-bottom,0px))]">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 z-0"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
        />

        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ type: "spring", damping: 28, stiffness: 300 }}
          className="relative z-10 w-full sm:max-w-[360px] max-h-[min(92vh,calc(100dvh-4rem))] sm:max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-3xl overflow-x-hidden"
          style={{
            background: "#131115",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 24px 48px rgba(0,0,0,0.5)",
          }}
        >
          <button
            onClick={onClose}
            className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full transition-colors hover:bg-white/10"
            style={{ background: "rgba(255,255,255,0.06)" }}
          >
            <X className="w-4 h-4 text-white/60" />
          </button>

          {/* Locked: no image URL exposed until paid — placeholder only */}
          <div
            className="relative aspect-[4/3] overflow-hidden flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.04)" }}
          >
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{
                background: "linear-gradient(to top, rgba(10,8,12,0.6) 0%, rgba(10,8,12,0.2) 50%, transparent 100%)",
              }}
            >
              <div className="flex flex-col items-center gap-3 mt-auto mb-6">
                <Lock className="w-10 h-10 text-[#D27A92]/70" />
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: "rgba(210,122,146,0.2)", border: "1px solid rgba(210,122,146,0.35)" }}>
                  <span className="text-white/90 text-xs font-medium">Unlock {label}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Details — minimal */}
          <div className="p-4 sm:p-5 space-y-4">
            <div className="flex justify-between items-baseline">
              <span className="text-white/40 text-sm">Price</span>
              <span className="text-white font-semibold text-lg">${priceUsdc} USDC</span>
            </div>

            <div>
              <span className="text-white/40 text-xs block mb-1.5">Pay with</span>
              <div className="flex gap-1.5 flex-wrap">
                {PAYMENT_NETWORKS.map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setPaymentNetwork(key)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      paymentNetwork === key
                        ? "bg-anime-pink text-white"
                        : "bg-white/[0.06] text-white/60 hover:text-white/80"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {baseNeedSwitch && (
              <div className="flex flex-col gap-2 rounded-xl py-2.5 px-3 bg-amber-500/10 border border-amber-500/20">
                <div className="flex items-start gap-2">
                  <Wallet className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-amber-200/90 text-xs">
                    Wallet is connected. Switch your wallet&apos;s network to <strong>Base</strong> to pay with USDC.
                  </p>
                </div>
              </div>
            )}
            {baseNeedConnect && (
              <div className="flex flex-col gap-2 rounded-xl py-2.5 px-3 bg-amber-500/10 border border-amber-500/20">
                <div className="flex items-start gap-2">
                  <Wallet className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-amber-200/90 text-xs">
                    Connect your wallet and switch to <strong>Base</strong> network to pay with USDC.
                  </p>
                </div>
              </div>
            )}

            {isSolana && !solanaWalletConnected && (
              <div className="flex flex-col gap-2 rounded-xl py-2.5 px-3 bg-amber-500/10 border border-amber-500/20">
                <div className="flex items-start gap-2">
                  <Wallet className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-amber-200/90 text-xs">
                    Connect your Solana wallet (e.g. Phantom) to pay with USDC on Solana.
                  </p>
                </div>
                {onConnectSolanaClick && (
                  <button
                    type="button"
                    onClick={onConnectSolanaClick}
                    className="text-xs font-medium text-amber-200 hover:text-amber-100 underline"
                  >
                    Connect Solana wallet
                  </button>
                )}
              </div>
            )}

            <div className="flex justify-between items-center text-sm">
              <span className="text-white/40">Creator</span>
              <span className="text-white/70">{artwork.creator}</span>
            </div>

            {error && (
              <p className="text-red-400 text-sm">{error}</p>
            )}

            <div className="flex gap-2 pt-1">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors text-white/60 hover:text-white/80 hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                onClick={() => onUnlock(paymentNetwork)}
                disabled={isLoading || (isSolana && !solanaWalletConnected)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
                style={{
                  background: "linear-gradient(135deg, #D27A92 0%, #c96b84 100%)",
                  color: "#fff",
                  boxShadow: "0 4px 14px rgba(210,122,146,0.35)",
                }}
              >
                {isLoading ? "Processing…" : isSolana && !solanaWalletConnected ? "Connect Solana wallet" : "Pay with USDC"}
              </button>
            </div>

            <p className="text-center text-white/25 text-[11px]">
              Payment via x402 · {paymentNetwork === "base" ? "Base" : "Solana"} · USDC
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
