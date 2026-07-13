"use client";

import { motion, AnimatePresence } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { X, Eye, Heart, ArrowLeft, Keyboard, Wallet, Loader2, ShieldCheck, Bookmark, Play, ChevronRight, Camera, Sparkles } from "lucide-react";
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
  favoriteArtworkIds?: Set<string>;
  onFavoriteChange?: (artwork: Artwork, favorite: boolean) => void;
  artworks?: Artwork[];
  onArtworkSelect?: (artwork: Artwork) => void;
}

export function MuseumOverlay({ selectedArtwork, onCloseArtwork, onConnectWallet, onDisconnectWallet, walletConnected, hasMoreArtworks = false, loadingMoreArtworks = false, onLoadMoreArtworks, loadedArtworkCount, totalArtworkCount, favoriteArtworkIds = new Set(), onFavoriteChange, artworks = [], onArtworkSelect }: MuseumOverlayProps) {
  const [mediaMode, setMediaMode] = useState<"portrait" | "animated">("portrait");
  const [favoritesOpen, setFavoritesOpen] = useState(false);
  const [routeOpen, setRouteOpen] = useState(false);
  const [photoMode, setPhotoMode] = useState(false);
  const [reactionCounts, setReactionCounts] = useState<Record<string, number>>({});
  const [myReactions, setMyReactions] = useState<string[]>([]);
  useEffect(() => setMediaMode("portrait"), [selectedArtwork?.id]);
  // Use the same authenticated image endpoint as the in-world frame. The
  // content object's legacy URL can be empty/stale after an access refresh.
  const image = selectedArtwork
    ? `/api/ipfs-image?contentId=${encodeURIComponent(selectedArtwork.id)}&type=${selectedArtwork.hasNsfw ? "nsfw" : "sfw"}`
    : "";
  const imageFallback = selectedArtwork?.hasNsfw
    ? `/api/ipfs-image?contentId=${encodeURIComponent(selectedArtwork.id)}&type=sfw`
    : undefined;
  const animated = selectedArtwork?.hasAnimated ? `/api/ipfs-image?contentId=${encodeURIComponent(selectedArtwork.id)}&type=animated` : undefined;
  const isFavorite = selectedArtwork ? favoriteArtworkIds.has(selectedArtwork.id) : false;
  const favoriteArtworks = useMemo(() => artworks.filter((artwork) => favoriteArtworkIds.has(artwork.id)), [artworks, favoriteArtworkIds]);
  const curatorRoute = useMemo(() => artworks.slice(0, 5), [artworks]);
  useEffect(() => { if (!selectedArtwork) return; fetch(`/api/museum/reactions?contentId=${selectedArtwork.id}`, { credentials: "include" }).then((r) => r.json()).then((data) => { setReactionCounts(data.counts ?? {}); setMyReactions(data.mine ?? []); }).catch(() => { setReactionCounts({}); setMyReactions([]); }); }, [selectedArtwork?.id]);
  const react = async (reaction: string) => { if (!selectedArtwork || myReactions.includes(reaction)) return; setMyReactions((current) => [...current, reaction]); setReactionCounts((current) => ({ ...current, [reaction]: (current[reaction] ?? 0) + 1 })); await fetch("/api/museum/reactions", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contentId: selectedArtwork.id, reaction }) }); };
  const togglePhotoMode = () => { setPhotoMode((current) => !current); };
  if (photoMode) return <button onClick={togglePhotoMode} className="fixed right-6 top-6 z-[60] rounded-xl border border-white/20 bg-black/60 px-4 py-2 text-sm text-white/85 backdrop-blur-md">Exit photo mode · P</button>;
  return <>
    <div className="fixed inset-x-0 top-0 z-50 flex items-center justify-between px-6 py-4 pointer-events-none">
      <Link href="/" className="pointer-events-auto flex items-center gap-2 rounded-xl border border-white/15 bg-[#0f0d14]/80 px-4 py-2 text-sm font-medium text-white/80 backdrop-blur-md hover:text-white"><ArrowLeft className="h-4 w-4" />Home</Link>
      <div className="pointer-events-auto flex items-center gap-3"><button onClick={togglePhotoMode} className="rounded-xl border border-white/15 bg-[#0f0d14]/80 px-3 py-2 text-xs text-white/70 backdrop-blur-md"><Camera className="mr-1 inline h-3.5 w-3.5" />Photo mode</button><div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#0f0d14]/80 px-3 py-2 text-xs text-white/50 backdrop-blur-md"><Keyboard className="h-3.5 w-3.5" /><span>WASD to move · Drag mouse to look · ESC closes artwork</span></div>{walletConnected ? <button onClick={onDisconnectWallet} className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300"><ShieldCheck className="mr-1 inline h-3.5 w-3.5" />Pass verified</button> : <button onClick={onConnectWallet} className="rounded-xl border border-[#D7FF00]/30 bg-[#D7FF00]/10 px-3 py-2 text-xs text-[#D7FF00]"><Wallet className="mr-1 inline h-3.5 w-3.5" />Connect wallet</button>}</div>
    </div>
    <AnimatePresence>{favoritesOpen && <motion.aside initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} className="fixed left-6 top-20 z-50 max-h-[calc(100vh-150px)] w-[320px] overflow-y-auto rounded-2xl border border-white/15 bg-[#0f0d14]/95 p-4 shadow-2xl backdrop-blur-xl"><div className="flex items-start justify-between gap-3"><div><h2 className="flex items-center gap-2 text-base font-semibold text-white"><Bookmark className="h-4 w-4 text-[#D7FF00]" fill="currentColor" />My After Hours</h2><p className="mt-1 text-xs leading-relaxed text-white/45">The pieces you&apos;ll want to return to.</p></div><button onClick={() => setFavoritesOpen(false)} className="rounded-full p-1 text-white/55 hover:bg-white/10 hover:text-white"><X className="h-4 w-4" /></button></div><div className="mt-4 space-y-2">{favoriteArtworks.length === 0 ? <p className="rounded-xl border border-dashed border-white/15 px-4 py-8 text-center text-sm leading-relaxed text-white/40">Save a piece from its private view and it will live here.</p> : favoriteArtworks.map((artwork) => <button key={artwork.id} onClick={() => { onArtworkSelect?.(artwork); setFavoritesOpen(false); }} className="group flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.035] px-3 py-3 text-left hover:border-[#D7FF00]/40 hover:bg-[#D7FF00]/5"><span className="min-w-0"><span className="block truncate text-sm font-medium text-white/90">{artwork.title || "Untitled"}</span><span className="mt-1 block text-xs text-white/40">Private viewing</span></span><ChevronRight className="h-4 w-4 shrink-0 text-[#D7FF00] transition-transform group-hover:translate-x-0.5" /></button>)}</div></motion.aside>}</AnimatePresence>
    <AnimatePresence>{routeOpen && <motion.aside initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} className="fixed left-6 top-20 z-50 w-[320px] rounded-2xl border border-white/15 bg-[#0f0d14]/95 p-4 shadow-2xl backdrop-blur-xl"><div className="flex items-start justify-between"><div><h2 className="flex items-center gap-2 text-base font-semibold text-white"><Sparkles className="h-4 w-4 text-[#D7FF00]" />Nixie&apos;s route</h2><p className="mt-1 text-xs text-white/45">Five pieces to linger with tonight.</p></div><button onClick={() => setRouteOpen(false)} className="text-white/55"><X className="h-4 w-4" /></button></div><div className="mt-4 space-y-2">{curatorRoute.map((artwork, index) => <button key={artwork.id} onClick={() => { onArtworkSelect?.(artwork); setRouteOpen(false); }} className="flex w-full items-center gap-3 rounded-xl border border-white/10 px-3 py-2 text-left hover:border-[#D7FF00]/40"><span className="text-xs font-bold text-[#D7FF00]">0{index + 1}</span><span className="truncate text-sm text-white/85">{artwork.title || "Untitled"}</span></button>)}</div></motion.aside>}</AnimatePresence>
    <AnimatePresence>{selectedArtwork && <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }} className="fixed right-6 top-20 z-50 max-h-[calc(100vh-120px)] w-[340px] overflow-y-auto rounded-2xl border border-white/15 bg-[#0f0d14]/95 shadow-2xl backdrop-blur-xl"><div className="relative aspect-[3/4] overflow-hidden rounded-t-2xl bg-[#16131f]">{mediaMode === "animated" && animated ? <video src={animated} className="h-full w-full object-cover" autoPlay muted loop playsInline /> : <ImageWithFallback src={image} fallbackSrc={imageFallback} alt={selectedArtwork.title || "Artwork"} className="h-full w-full object-cover" />}<button onClick={onCloseArtwork} className="absolute right-3 top-3 rounded-full bg-black/60 p-2 text-white/70 hover:text-white"><X className="h-4 w-4" /></button></div><div className="space-y-3 p-4"><div className="flex gap-2">{selectedArtwork.hasAnimated && <button onClick={() => setMediaMode((current) => current === "portrait" ? "animated" : "portrait")} className="inline-flex items-center gap-1.5 rounded-lg border border-[#D7FF00]/30 bg-[#D7FF00]/10 px-2.5 py-1.5 text-xs font-medium text-[#eafaac]"><Play className="h-3.5 w-3.5" />{mediaMode === "animated" ? "View portrait" : "Play motion"}</button>}<button onClick={() => onFavoriteChange?.(selectedArtwork, !isFavorite)} className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium ${isFavorite ? "border-[#D7FF00]/50 bg-[#D7FF00]/15 text-[#eafaac]" : "border-white/15 text-white/65"}`}><Bookmark className="h-3.5 w-3.5" fill={isFavorite ? "currentColor" : "none"} />{isFavorite ? "In my after hours" : "Save to after hours"}</button></div><h3 className="text-base font-semibold text-white">{selectedArtwork.title || "Untitled"}</h3><p className="text-xs text-white/40">by {selectedArtwork.creator}</p>{selectedArtwork.description && <p className="text-sm leading-relaxed text-white/55">{selectedArtwork.description}</p>}<div className="flex flex-wrap gap-1.5">{[["linger", "Linger"], ["dangerous", "Dangerous"], ["favorite-tonight", "Favorite tonight"]].map(([value, label]) => <button key={value} onClick={() => react(value)} className={`rounded-full border px-2 py-1 text-[11px] ${myReactions.includes(value) ? "border-[#D7FF00]/60 bg-[#D7FF00]/15 text-[#eafaac]" : "border-white/15 text-white/55"}`}>{label} {reactionCounts[value] ?? 0}</button>)}</div><p className="rounded-lg border border-[#D7FF00]/15 bg-[#D7FF00]/5 px-3 py-2 text-xs leading-relaxed text-[#e9f5b5]">Nixie&apos;s note: linger with the details — this room remembers your taste.</p><div className="flex gap-4 text-xs text-white/40"><span className="flex items-center gap-1"><Heart className="h-3.5 w-3.5" />{selectedArtwork.likes}</span><span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" />{selectedArtwork.views}</span></div></div></motion.div>}</AnimatePresence>
    <div className="fixed bottom-6 left-6 z-50 flex flex-col items-start gap-2"><button onClick={() => setRouteOpen(true)} className="rounded-xl border border-white/15 bg-[#0f0d14]/90 px-4 py-2.5 text-sm text-white/80"><Sparkles className="mr-2 inline h-4 w-4 text-[#D7FF00]" />Nixie&apos;s route</button><button onClick={() => setFavoritesOpen(true)} className="rounded-xl border border-[#D7FF00]/25 bg-[#0f0d14]/90 px-4 py-2.5 text-sm font-medium text-[#edfbb0]"><Bookmark className="mr-2 inline h-4 w-4" fill="currentColor" />My After Hours{favoriteArtworkIds.size ? ` · ${favoriteArtworkIds.size}` : ""}</button>{onLoadMoreArtworks && <>{totalArtworkCount != null && loadedArtworkCount != null && <span className="px-1 text-xs text-white/45">Loaded {loadedArtworkCount} of {totalArtworkCount}</span>}{hasMoreArtworks && <button onClick={onLoadMoreArtworks} disabled={loadingMoreArtworks} className="rounded-xl border border-white/15 bg-[#0f0d14]/90 px-4 py-2.5 text-sm text-white/90 disabled:opacity-50">{loadingMoreArtworks ? <><Loader2 className="mr-2 inline h-4 w-4 animate-spin" />Loading…</> : "Load more artworks"}</button>}</>}</div>
  </>;
}
