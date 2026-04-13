"use client";

import { motion, AnimatePresence } from "motion/react";
import { X, Lock, Eye, Heart, ArrowLeft, Keyboard, Wallet, Loader2, CheckCircle } from "lucide-react";
import Link from "next/link";
import type { Artwork } from "@/lib/types";
import { ImageWithFallback } from "@/components/nixie/image-with-fallback";

interface MuseumOverlayProps {
  selectedArtwork: Artwork | null;
  onCloseArtwork: () => void;
  onConnectWallet: () => void;
  onUnlockArtwork: (artwork: Artwork) => void;
  unlocking: boolean;
  unlockError: string | null;
  walletConnected: boolean;
  walletReady: boolean;
  isBaseNetwork: boolean;
}

export function MuseumOverlay({
  selectedArtwork,
  onCloseArtwork,
  onConnectWallet,
  onUnlockArtwork,
  unlocking,
  unlockError,
  walletConnected,
  walletReady,
  isBaseNetwork,
}: MuseumOverlayProps) {
  const isLocked = selectedArtwork?.hasNsfw && !selectedArtwork?.nsfwUnlocked;
  const isFree = selectedArtwork?.price === 0;

  return (
    <>
      {/* Top bar */}
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 pointer-events-none">
        <Link
          href="/feed"
          className="pointer-events-auto flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white/80 hover:text-white border border-white/15 bg-[#0f0d14]/80 backdrop-blur-md transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Feed
        </Link>

        <div className="flex items-center gap-3 pointer-events-auto">
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-white/50 bg-[#0f0d14]/80 backdrop-blur-md border border-white/10">
            <Keyboard className="w-3.5 h-3.5 shrink-0" />
            <span>WASD to move · Drag mouse to look · Scroll to zoom · ESC closes artwork</span>
          </div>

          {!walletConnected ? (
            <button
              onClick={onConnectWallet}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-[#D27A92] bg-[#D27A92]/10 border border-[#D27A92]/30 hover:bg-[#D27A92]/20 transition-colors"
            >
              <Wallet className="w-3.5 h-3.5" />
              Connect Wallet
            </button>
          ) : (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs border ${
              walletReady
                ? "text-emerald-400/80 bg-emerald-500/10 border-emerald-500/20"
                : "text-amber-400/80 bg-amber-500/10 border-amber-500/20"
            }`}>
              <div className={`w-2 h-2 rounded-full ${walletReady ? "bg-emerald-400" : "bg-amber-400"}`} />
              {walletReady ? "Base Connected" : !isBaseNetwork ? "Switch to Base" : "Connecting..."}
            </div>
          )}
        </div>
      </div>

      {/* Artwork detail panel */}
      <AnimatePresence>
        {selectedArtwork && (
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            transition={{ duration: 0.3 }}
            className="fixed top-20 right-6 z-50 w-[340px] max-h-[calc(100vh-120px)] overflow-y-auto rounded-2xl border border-white/15 bg-[#0f0d14]/95 backdrop-blur-xl shadow-2xl"
          >
            <div className="relative">
              <div className={`aspect-[3/4] overflow-hidden rounded-t-2xl bg-[#16131f] ${isLocked ? "relative" : ""}`}>
                <ImageWithFallback
                  src={selectedArtwork.sfwPreview}
                  alt={selectedArtwork.title || "Artwork"}
                  className={`w-full h-full object-cover ${isLocked ? "blur-xl scale-105 brightness-75" : ""}`}
                />
                {isLocked && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                    <Lock className="w-8 h-8 text-white/80" />
                    <span className="text-white/70 text-xs font-medium">NSFW Content Locked</span>
                  </div>
                )}
              </div>
              <button
                onClick={onCloseArtwork}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white/70 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <h3 className="text-white font-semibold text-base">
                {selectedArtwork.title || "Untitled"}
              </h3>
              <p className="text-white/40 text-xs">by {selectedArtwork.creator}</p>

              {selectedArtwork.description && (
                <p className="text-white/55 text-sm leading-relaxed">
                  {selectedArtwork.description}
                </p>
              )}

              <div className="flex items-center gap-4 pt-1 text-xs text-white/40">
                <span className="flex items-center gap-1">
                  <Heart className="w-3.5 h-3.5" />
                  {selectedArtwork.likes}
                </span>
                <span className="flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" />
                  {selectedArtwork.views}
                </span>
              </div>

              {/* Unlock / Purchase section */}
              {isLocked && (
                <div className="space-y-2.5 pt-1">
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#D27A92]/10 border border-[#D27A92]/25 text-sm text-[#D27A92]">
                    <Lock className="w-4 h-4 shrink-0" />
                    <span>
                      {isFree ? "Free to unlock" : `$${selectedArtwork.price} USDC to unlock`}
                    </span>
                  </div>

                  {unlockError && (
                    <p className="text-red-400 text-xs px-1">{unlockError}</p>
                  )}

                  {!walletConnected ? (
                    <button
                      onClick={onConnectWallet}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors"
                      style={{ background: "linear-gradient(135deg, #D27A92 0%, #c96b84 100%)" }}
                    >
                      <Wallet className="w-4 h-4" />
                      Connect Wallet to Unlock
                    </button>
                  ) : !isBaseNetwork ? (
                    <button
                      disabled
                      className="w-full px-4 py-2.5 rounded-xl text-sm font-semibold text-white/60 bg-white/10 border border-white/10 cursor-not-allowed"
                    >
                      Switch to Base Network
                    </button>
                  ) : (
                    <button
                      onClick={() => onUnlockArtwork(selectedArtwork)}
                      disabled={unlocking || !walletReady}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-colors"
                      style={{ background: "linear-gradient(135deg, #D27A92 0%, #c96b84 100%)" }}
                    >
                      {unlocking ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Processing...
                        </>
                      ) : isFree ? (
                        "Unlock for Free"
                      ) : (
                        `Unlock — $${selectedArtwork.price} USDC`
                      )}
                    </button>
                  )}
                </div>
              )}

              {/* Already unlocked */}
              {selectedArtwork.hasNsfw && selectedArtwork.nsfwUnlocked && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-400">
                  <CheckCircle className="w-4 h-4" />
                  <span>Unlocked</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
