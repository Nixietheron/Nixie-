"use client";

import { motion, AnimatePresence } from "motion/react";
import { X, Eye, Heart, ArrowLeft, Keyboard, Wallet, Loader2, ShieldCheck } from "lucide-react";
import Link from "next/link";
import type { Artwork } from "@/lib/types";
import { ImageWithFallback } from "@/components/nixie/image-with-fallback";

interface MuseumOverlayProps {
  selectedArtwork: Artwork | null;
  onCloseArtwork: () => void;
  onConnectWallet: () => void;
  onDisconnectWallet: () => void;
  walletConnected: boolean;
  hasMoreArtworks?: boolean;
  loadingMoreArtworks?: boolean;
  onLoadMoreArtworks?: () => void;
  loadedArtworkCount?: number;
  totalArtworkCount?: number | null;
}

export function MuseumOverlay({ selectedArtwork, onCloseArtwork, onConnectWallet, onDisconnectWallet, walletConnected, hasMoreArtworks = false, loadingMoreArtworks = false, onLoadMoreArtworks, loadedArtworkCount, totalArtworkCount }: MuseumOverlayProps) {
  // Use the same authenticated image endpoint as the in-world frame. The
  // content object's legacy URL can be empty/stale after an access refresh.
  const image = selectedArtwork
    ? `/api/ipfs-image?contentId=${encodeURIComponent(selectedArtwork.id)}&type=${selectedArtwork.hasNsfw ? "nsfw" : "sfw"}`
    : "";
  const imageFallback = selectedArtwork?.hasNsfw
    ? `/api/ipfs-image?contentId=${encodeURIComponent(selectedArtwork.id)}&type=sfw`
    : undefined;
  return <>
    <div className="fixed inset-x-0 top-0 z-50 flex items-center justify-between px-6 py-4 pointer-events-none">
      <Link href="/" className="pointer-events-auto flex items-center gap-2 rounded-xl border border-white/15 bg-[#0f0d14]/80 px-4 py-2 text-sm font-medium text-white/80 backdrop-blur-md hover:text-white"><ArrowLeft className="h-4 w-4" />Home</Link>
      <div className="pointer-events-auto flex items-center gap-3"><div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#0f0d14]/80 px-3 py-2 text-xs text-white/50 backdrop-blur-md"><Keyboard className="h-3.5 w-3.5" /><span>WASD to move · Drag mouse to look · ESC closes artwork</span></div>{walletConnected ? <button onClick={onDisconnectWallet} className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300"><ShieldCheck className="mr-1 inline h-3.5 w-3.5" />Pass verified</button> : <button onClick={onConnectWallet} className="rounded-xl border border-[#D7FF00]/30 bg-[#D7FF00]/10 px-3 py-2 text-xs text-[#D7FF00]"><Wallet className="mr-1 inline h-3.5 w-3.5" />Connect wallet</button>}</div>
    </div>
    <AnimatePresence>{selectedArtwork && <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }} className="fixed right-6 top-20 z-50 max-h-[calc(100vh-120px)] w-[340px] overflow-y-auto rounded-2xl border border-white/15 bg-[#0f0d14]/95 shadow-2xl backdrop-blur-xl"><div className="relative aspect-[3/4] overflow-hidden rounded-t-2xl bg-[#16131f]"><ImageWithFallback src={image} fallbackSrc={imageFallback} alt={selectedArtwork.title || "Artwork"} className="h-full w-full object-cover" /><button onClick={onCloseArtwork} className="absolute right-3 top-3 rounded-full bg-black/60 p-2 text-white/70 hover:text-white"><X className="h-4 w-4" /></button></div><div className="space-y-3 p-4"><h3 className="text-base font-semibold text-white">{selectedArtwork.title || "Untitled"}</h3><p className="text-xs text-white/40">by {selectedArtwork.creator}</p>{selectedArtwork.description && <p className="text-sm leading-relaxed text-white/55">{selectedArtwork.description}</p>}<div className="flex gap-4 text-xs text-white/40"><span className="flex items-center gap-1"><Heart className="h-3.5 w-3.5" />{selectedArtwork.likes}</span><span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" />{selectedArtwork.views}</span></div></div></motion.div>}</AnimatePresence>
    {onLoadMoreArtworks && <div className="fixed bottom-6 left-6 z-50 flex flex-col items-start gap-2">{totalArtworkCount != null && loadedArtworkCount != null && <span className="px-1 text-xs text-white/45">Loaded {loadedArtworkCount} of {totalArtworkCount}</span>}{hasMoreArtworks && <button onClick={onLoadMoreArtworks} disabled={loadingMoreArtworks} className="rounded-xl border border-white/15 bg-[#0f0d14]/90 px-4 py-2.5 text-sm text-white/90 disabled:opacity-50">{loadingMoreArtworks ? <><Loader2 className="mr-2 inline h-4 w-4 animate-spin" />Loading…</> : "Load more artworks"}</button>}</div>}
  </>;
}
