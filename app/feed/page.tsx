"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, Grid3X3, LayoutList, Clock, TrendingUp, X, Lock, Menu } from "lucide-react";
import { ConnectButton } from "@/components/connect-button";
import { useAccount, useChainId, usePublicClient, useWalletClient } from "wagmi";
import { wrapFetchWithPayment } from "@x402/fetch";
import { x402Client } from "@x402/core/client";
import { ExactEvmScheme } from "@x402/evm/exact/client";
import { ExactEvmSchemeV1 } from "@x402/evm/exact/v1/client";
import { ArtworkCard } from "@/components/nixie";
import type { Artwork } from "@/lib/types";
import type { CommentDisplay } from "@/components/nixie/comments-panel";
import { ipfsUrl } from "@/lib/constants";
import Link from "next/link";

const BASE_CHAIN_ID = 8453;

type StoryItem = {
  id: string;
  image_cid: string;
  nsfw_cid: string | null;
  animated_cid: string | null;
  is_paid: boolean;
  price_usdc: number;
  expires_at: string;
  created_at: string;
  unlocked?: boolean;
};

type SortKey = "new" | "old" | "top";
type LayoutKey = "list" | "2" | "3" | "4";

const SORT_OPTIONS: { key: SortKey; label: string; icon: React.ReactNode }[] = [
  { key: "new", label: "New", icon: <Clock className="w-3.5 h-3.5" /> },
  { key: "old", label: "Old", icon: <Clock className="w-3.5 h-3.5 scale-x-[-1]" /> },
  { key: "top", label: "Top", icon: <TrendingUp className="w-3.5 h-3.5" /> },
];

const STORY_VIEW_SECONDS = 5;

export default function FeedScreen() {
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [stories, setStories] = useState<StoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [layout, setLayout] = useState<LayoutKey>("list");
  const isGrid = layout !== "list";
  const gridCols = layout === "list" ? 1 : (Number(layout) as 2 | 3 | 4);
  const [sort, setSort] = useState<SortKey>("new");
  const [storyViewerIndex, setStoryViewerIndex] = useState<number | null>(null);
  const [storyProgress, setStoryProgress] = useState(0);
  const [storyPaused, setStoryPaused] = useState(false);
  const storyStartTimeRef = useRef<number>(0);
  const storyProgressRef = useRef<number>(0);
  const [storyUnlockingId, setStoryUnlockingId] = useState<string | null>(null);
  const [scrollY, setScrollY] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const fetchWithPayment = useMemo(() => {
    if (chainId !== BASE_CHAIN_ID) return null;
    if (!walletClient?.account || !publicClient) return null;
    const signer = {
      address: walletClient.account.address,
      signTypedData: walletClient.signTypedData.bind(walletClient),
      readContract: publicClient.readContract.bind(publicClient),
    };
    const client = new x402Client();
    client.register("eip155:*", new ExactEvmScheme(signer));
    client.registerV1("base", new ExactEvmSchemeV1(signer));
    return wrapFetchWithPayment(fetch, client);
  }, [chainId, walletClient, publicClient]);

  const walletDisplay = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : undefined;

  useEffect(() => {
    const url = address
      ? `/api/content?wallet=${encodeURIComponent(address)}`
      : "/api/content";
    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        setArtworks(Array.isArray(d.artworks) ? d.artworks : []);
        if (d.error) console.error("Feed load error:", d.error);
      })
      .catch((err) => {
        console.error("Feed fetch failed:", err);
        setArtworks([]);
      })
      .finally(() => setLoading(false));
  }, [address]);

  useEffect(() => {
    const url = address
      ? `/api/stories?wallet=${encodeURIComponent(address)}`
      : "/api/stories";
    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        setStories(Array.isArray(d.stories) ? d.stories : []);
      })
      .catch(() => setStories([]));
  }, [address]);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Reset start time when opening a new story
  useEffect(() => {
    if (storyViewerIndex === null || !stories[storyViewerIndex]) return;
    storyStartTimeRef.current = Date.now();
    storyProgressRef.current = 0;
    setStoryProgress(0);
  }, [storyViewerIndex, stories.length]);

  // Auto-advance story viewer; pause when holding, unlocking, or when current story is locked (stay until pay)
  useEffect(() => {
    if (storyViewerIndex === null || !stories[storyViewerIndex] || storyPaused || storyUnlockingId) return;
    const current = stories[storyViewerIndex];
    const isLocked = current.is_paid && !current.unlocked;
    if (isLocked) return;
    const t = setInterval(() => {
      const start = storyStartTimeRef.current;
      const elapsed = (Date.now() - start) / 1000;
      const p = Math.min(1, elapsed / STORY_VIEW_SECONDS);
      storyProgressRef.current = p;
      setStoryProgress(p);
      if (p >= 1) {
        clearInterval(t);
        setStoryViewerIndex((i) => (i !== null && i < stories.length - 1 ? i + 1 : null));
      }
    }, 50);
    return () => clearInterval(t);
  }, [storyViewerIndex, stories, storyPaused, storyUnlockingId]);

  const sortedArtworks = useMemo(() => {
    const arr = [...artworks];
    if (sort === "new") arr.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    else if (sort === "old") arr.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    else if (sort === "top") arr.sort((a, b) => (b.likes + b.comments) - (a.likes + a.comments));
    return arr;
  }, [artworks, sort]);

  const [commentsByArtwork, setCommentsByArtwork] = useState<Record<string, CommentDisplay[]>>({});

  const loadComments = (artworkId: string) => {
    if (commentsByArtwork[artworkId]) return;
    fetch(`/api/comments?contentId=${encodeURIComponent(artworkId)}`)
      .then((r) => r.json())
      .then((d) => setCommentsByArtwork((prev) => ({ ...prev, [artworkId]: d.comments ?? [] })));
  };

  const getCommentsForCard = (artworkId: string): CommentDisplay[] => {
    if (!commentsByArtwork[artworkId]) { loadComments(artworkId); return []; }
    return commentsByArtwork[artworkId];
  };

  const handleSubmitComment = async (artworkId: string, text: string) => {
    if (!address) return;
    const res = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wallet: address, contentId: artworkId, text }),
    });
    const d = await res.json();
    if (d.comment) {
      setCommentsByArtwork((prev) => ({ ...prev, [artworkId]: [...(prev[artworkId] ?? []), d.comment] }));
    }
  };

  const handleLike = async (contentId: string, currentlyLiked: boolean) => {
    if (!address) return;
    await fetch("/api/like", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wallet: address, contentId, action: currentlyLiked ? "unlike" : "like" }),
    });
    setArtworks((prev) =>
      prev.map((a) =>
        a.id === contentId ? { ...a, likes: a.likes + (currentlyLiked ? -1 : 1) } : a
      )
    );
  };

  const refetchAfterUnlock = async (artworkId: string, unlockType: "nsfw" | "animated") => {
    if (!address) return;
    const r2 = await fetch(`/api/content?wallet=${encodeURIComponent(address)}`);
    const data = await r2.json().catch(() => ({}));
    if (Array.isArray(data.artworks)) setArtworks(data.artworks);
    else
      setArtworks((prev) =>
        prev.map((a) =>
          a.id === artworkId
            ? {
                ...a,
                nsfwUnlocked: unlockType === "nsfw" ? true : (a.nsfwUnlocked ?? false),
                animatedUnlocked: unlockType === "animated" ? true : (a.animatedUnlocked ?? false),
                isUnlocked: true,
              }
            : a
        )
      );
  };

  const handleUnlockPayment = async (artworkId: string, unlockType: "nsfw" | "animated") => {
    if (!address) return;
    if (!fetchWithPayment) {
      if (chainId !== BASE_CHAIN_ID) {
        throw new Error("Switch to Base network. x402 signature required for payment.");
      }
      throw new Error("Wallet signature not ready. Refresh the page and try again.");
    }
    const body = JSON.stringify({ wallet: address, contentId: artworkId, unlockType });
    const opts = { method: "POST" as const, headers: { "Content-Type": "application/json" }, body };
    const res = await fetchWithPayment("/api/unlock", opts);
    const d = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(d.error ?? "Unlock failed");
    if (d.unlocked) await refetchAfterUnlock(artworkId, unlockType);
  };

  const refetchStories = useCallback(() => {
    const url = address
      ? `/api/stories?wallet=${encodeURIComponent(address)}`
      : "/api/stories";
    return fetch(url)
      .then((r) => r.json())
      .then((d) => setStories(Array.isArray(d.stories) ? d.stories : []))
      .catch(() => {});
  }, [address]);

  const handleStoryUnlock = async (storyId: string) => {
    if (!address) return;
    setStoryUnlockingId(storyId);
    try {
      if (!fetchWithPayment) {
        if (chainId !== BASE_CHAIN_ID) {
          throw new Error("Switch to Base network. x402 signature required for payment.");
        }
        throw new Error("Wallet signature not ready.");
      }
      const body = JSON.stringify({ wallet: address, storyId });
      const opts = { method: "POST" as const, headers: { "Content-Type": "application/json" }, body };
      const res = await fetchWithPayment("/api/story-unlock", opts);
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? "Unlock failed");
      if (d.unlocked) {
        // Optimistically mark this story as unlocked so the Pay button
        // never appears again for this user on this story in this session.
        setStories((prev) =>
          prev.map((s) => (s.id === storyId ? { ...s, unlocked: true } : s))
        );
        await refetchStories();
        storyStartTimeRef.current = Date.now();
        storyProgressRef.current = 0;
        setStoryProgress(0);
      }
    } finally {
      setStoryUnlockingId(null);
    }
  };

  return (
    <div className="relative min-h-screen font-anime flex flex-col lg:flex-row overflow-hidden">
      {/* Subtle anime orbs in the background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="anime-orb anime-orb--pink w-[280px] h-[280px] -top-24 left-10 opacity-60" />
        <div className="anime-orb anime-orb--lavender w-[260px] h-[260px] top-40 -right-24 opacity-55" />
        <div className="anime-orb anime-orb--peach w-[220px] h-[220px] -bottom-16 left-1/4 opacity-45" />
      </div>
      {/* ─── WEB: Left sidebar — compact, proportional ─── */}
      <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:w-[200px] lg:border-r lg:border-white/[0.06] z-40 bg-[#0f0d14]/60 backdrop-blur-md">
        <div className="px-4 py-3 flex items-center gap-2 border-b border-white/[0.06]">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="font-bold text-white text-[15px] tracking-tight">Nixie</span>
            <Sparkles className="w-3.5 h-3.5 text-anime-pink opacity-90" />
          </Link>
        </div>
        <nav className="flex-1 px-2 py-2 space-y-0.5 min-w-0">
          <Link href="/feed" className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium text-white bg-white/[0.07]">
            <LayoutList className="w-4 h-4 text-anime-lavender flex-shrink-0" />
            Feed
          </Link>
          <Link href="/profile" className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] text-white/70 hover:text-white hover:bg-white/[0.05] transition-colors">
            <div className="w-4 h-4 rounded-full bg-anime-lavender/40 flex items-center justify-center text-[10px] font-semibold text-anime-lavender flex-shrink-0">P</div>
            Profile
          </Link>
          <div className="px-2.5 py-2 space-y-1.5 rounded-lg">
            <span className="text-white/50 text-[12px]">View</span>
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => setLayout("list")}
                className={`px-2 py-1 rounded text-[11px] font-medium transition-all ${layout === "list" ? "bg-anime-pink text-white" : "bg-white/[0.06] text-white/50 hover:text-white/80"}`}
                title="Single"
              >
                <LayoutList className="w-3.5 h-3.5 inline-block align-middle" />
              </button>
              {([2, 3, 4] as const).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setLayout(String(n) as LayoutKey)}
                  className={`px-2 py-1 rounded text-[11px] font-medium transition-all ${layout === String(n) ? "bg-anime-pink text-white" : "bg-white/[0.06] text-white/50 hover:text-white/80"}`}
                  title={`${n} columns`}
                >
                  <Grid3X3 className="w-3.5 h-3.5 inline-block align-middle" />
                  <span className="ml-0.5">{n}</span>
                </button>
              ))}
            </div>
          </div>
        </nav>
        <div className="p-2.5 border-t border-white/[0.06]">
          <ConnectButton />
        </div>
      </aside>

      {/* ─── Mobile: Top header (sticky) ─── */}
      <header className="lg:hidden sticky top-0 z-50 border-b border-anime-lavender/10 bg-anime-night/95 backdrop-blur-xl">
        <div
          className="px-4 overflow-hidden"
          style={{
            maxHeight: Math.max(0, 130 - (scrollY / 220) * 130),
            opacity: Math.max(0, Math.min(1, 1 - scrollY / 220)),
            paddingBottom: scrollY > 200 ? 0 : Math.max(0, 6 - (scrollY / 220) * 6),
            pointerEvents: scrollY > 210 ? "none" : "auto",
          }}
        >
          <div className="flex flex-row items-center justify-between gap-2 pt-1.5 pb-0.5">
            {stories.length > 0 ? (
              <div className="order-1 min-w-0 flex-1 flex items-center gap-2">
                <div className="flex gap-2.5 overflow-x-auto scrollbar-hide py-3 px-2 -mx-1 w-full">
                  {stories.map((story, index) => {
                    const isNsfw = !!story.nsfw_cid || (story.is_paid && !story.unlocked);
                    return (
                      <motion.button
                        key={story.id}
                        type="button"
                        onClick={() => setStoryViewerIndex(index)}
                        whileTap={{ scale: 0.96 }}
                        className="flex-shrink-0 flex flex-col items-center gap-0.5"
                      >
                        <div
                          className="w-11 h-11 rounded-full p-[2px] flex-shrink-0 transition-[box-shadow] duration-200 [box-shadow:0_0_0_2px_rgba(255,107,157,0.85),0_0_0_4px_rgba(255,107,157,0.15)]"
                          style={{
                            background: "linear-gradient(135deg, #D27A92 0%, #B8A9C9 50%, #D27A92 100%)",
                          }}
                        >
                          <div className="w-full h-full rounded-full overflow-hidden bg-[#1a161c]/88 backdrop-blur-[1px] flex items-center justify-center ring-1 ring-inset ring-white/[0.04]">
                            {story.animated_cid && story.image_cid === story.animated_cid ? (
                              <video src={ipfsUrl(story.image_cid)} muted loop playsInline className={`w-full h-full object-cover ${isNsfw ? "blur-md" : ""}`} preload="metadata" />
                            ) : (
                              <img src={ipfsUrl(story.image_cid)} alt="" className={`w-full h-full object-cover ${isNsfw ? "blur-md" : ""}`} />
                            )}
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="order-1 flex-1" />
            )}
            <div className="order-2 flex-shrink-0 relative">
              <button type="button" onClick={() => setMobileMenuOpen((o) => !o)} className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10" aria-label="Menu">
                <Menu className="w-5 h-5" />
              </button>
              <AnimatePresence>
                {mobileMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" aria-hidden onClick={() => setMobileMenuOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-1 z-50 min-w-[180px] rounded-xl py-2 shadow-xl border border-white/10 bg-anime-night-card/98 backdrop-blur-xl"
                    >
                      <Link href="/profile" className="block px-4 py-2.5 text-sm text-white/80 hover:text-white hover:bg-white/5" onClick={() => setMobileMenuOpen(false)}>Profile</Link>
                      <div className="px-3 py-2 border-t border-white/10"><ConnectButton /></div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
          <div className="flex items-center gap-1.5 pb-1.5">
            {SORT_OPTIONS.map(({ key, label, icon }) => (
              <motion.button
                key={key}
                onClick={() => setSort(key)}
                whileTap={{ scale: 0.95 }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${sort === key ? "text-white" : "text-white/35 hover:text-white/60"}`}
                style={sort === key ? { background: "rgba(255,107,157,0.2)", border: "1px solid rgba(255,107,157,0.5)" } : { border: "1px solid transparent" }}
              >
                {icon}
                {label}
              </motion.button>
            ))}
            {!loading && artworks.length > 0 && <span className="text-white/20 text-xs tabular-nums ml-1">{artworks.length}</span>}
          </div>
        </div>
      </header>

      {/* ─── WEB: Main content — compact header, full-width feed ─── */}
      <div className="flex-1 lg:pl-[200px] min-h-screen flex flex-col relative z-10">
        {/* Web: One compact row — Stories + Sort inline ─── */}
        <div className="hidden lg:block border-b border-white/[0.04] bg-[#0f0d14]/55 backdrop-blur-md">
          <div className="px-4 py-3 flex items-center justify-between gap-4">
            {stories.length > 0 ? (
              <div className="flex items-center gap-3 flex-shrink-0 min-w-0">
                <div className="flex flex-col">
                  <span className="text-[11px] font-semibold text-white/60 uppercase tracking-[0.3em]">Stories</span>
                  <span className="text-[11px] text-white/30">Tap to view · hold to pause</span>
                </div>
                <div className="flex gap-2.5 overflow-x-auto scrollbar-hide py-3 px-3">
                  {stories.map((story, index) => {
                    const isNsfw = !!story.nsfw_cid || (story.is_paid && !story.unlocked);
                    return (
                      <motion.button
                        key={story.id}
                        type="button"
                        onClick={() => setStoryViewerIndex(index)}
                        whileTap={{ scale: 0.97 }}
                        className="group flex-shrink-0 flex flex-col items-center gap-1"
                      >
                        <div
                          className="w-12 h-12 rounded-full p-[2px] flex-shrink-0 bg-gradient-to-br from-[#D27A92] via-[#E1A1B0] to-[#ECC1CE] transition-[box-shadow,transform] duration-200 ease-out scale-100 group-hover:scale-110 [box-shadow:0_0_0_2px_rgba(210,122,146,0.9),0_0_0_5px_rgba(210,122,146,0.25)] group-hover:[box-shadow:0_0_0_2px_rgba(239,212,204,1),0_0_0_7px_rgba(239,212,204,0.3)]"
                        >
                          <div className="w-full h-full rounded-full overflow-hidden bg-[#0f0d14]/88 backdrop-blur-[1px] flex items-center justify-center ring-1 ring-inset ring-white/[0.04]">
                            {story.animated_cid && story.image_cid === story.animated_cid ? (
                              <video src={ipfsUrl(story.image_cid)} muted loop playsInline className={`w-full h-full object-cover ${isNsfw ? "blur-md" : ""}`} preload="metadata" />
                            ) : (
                              <img src={ipfsUrl(story.image_cid)} alt="" className={`w-full h-full object-cover ${isNsfw ? "blur-md" : ""}`} />
                            )}
                          </div>
                        </div>
                        <span className="text-[9px] text-white/45 max-w-[48px] truncate">{story.is_paid && !story.unlocked ? `$${story.price_usdc}` : "Story"}</span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div />
            )}
            <div className="flex items-center gap-1.5 flex-shrink-0 ml-auto">
              {SORT_OPTIONS.map(({ key, label, icon }) => (
                <motion.button
                  key={key}
                  onClick={() => setSort(key)}
                  whileTap={{ scale: 0.98 }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${sort === key ? "text-white bg-white/10" : "text-white/45 hover:text-white/75"}`}
                >
                  {icon}
                  {label}
                </motion.button>
              ))}
              {!loading && artworks.length > 0 && <span className="text-white/35 text-xs tabular-nums ml-1">{artworks.length}</span>}
            </div>
          </div>
        </div>

      {/* Story viewer modal — full-size image; hold to pause timer */}
      <AnimatePresence>
        {storyViewerIndex !== null && stories[storyViewerIndex] && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black flex flex-col"
          >
            {/* Progress bar: full width on mobile; on desktop start after sidebar (200px) so it doesn’t sit under header */}
            <div className="absolute top-0 left-0 right-0 lg:left-[200px] min-h-[3rem] flex flex-col justify-end gap-1.5 px-3 pb-2 z-10">
              <div className="flex gap-0.5 w-full">
                {stories.map((_, i) => (
                  <div
                    key={i}
                    className="h-0.5 flex-1 rounded-full bg-white/25 overflow-hidden"
                  >
                    <motion.div
                      className="h-full bg-white rounded-full"
                      style={{
                        width: i < storyViewerIndex! ? "100%" : i === storyViewerIndex ? `${storyProgress * 100}%` : "0%",
                      }}
                      transition={i === storyViewerIndex ? { duration: 0.05 } : undefined}
                    />
                  </div>
                ))}
              </div>
              {/* Story index and upload time */}
              {stories[storyViewerIndex!]?.created_at && (
                <p className="text-white/40 text-[10px] mt-1 tabular-nums">
                  {storyViewerIndex! + 1}/{stories.length}
                  {" · "}
                  {new Date(stories[storyViewerIndex!].created_at).toLocaleString("en-US", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setStoryViewerIndex(null)}
              className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div
              className="flex-1 flex items-center justify-center min-h-0 w-full overflow-hidden pt-12"
              onPointerDown={() => {
                storyStartTimeRef.current = Date.now() - storyProgressRef.current * STORY_VIEW_SECONDS * 1000;
                setStoryPaused(true);
              }}
              onPointerUp={() => setStoryPaused(false)}
              onPointerLeave={() => setStoryPaused(false)}
              onClick={(e) => {
                if ((e.target as HTMLElement).closest("button")) return;
                if (storyUnlockingId) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                if (x < rect.width / 2) {
                  setStoryViewerIndex((i) => (i !== null && i > 0 ? i - 1 : null));
                } else {
                  setStoryViewerIndex((i) => {
                    if (i === null) return null;
                    return i < stories.length - 1 ? i + 1 : null;
                  });
                }
              }}
            >
              {(() => {
                const story = stories[storyViewerIndex];
                const isLocked = story.is_paid && !story.unlocked;
                const showAnimated = !isLocked && story.animated_cid;
                const animatedSrc = showAnimated ? ipfsUrl(story.animated_cid) : "";
                const staticSrc = ipfsUrl(isLocked ? story.image_cid : (story.nsfw_cid || story.image_cid));
                const staticCid = isLocked ? story.image_cid : (story.nsfw_cid || story.image_cid);
                const staticIsVideo = !!story.animated_cid && staticCid === story.animated_cid;
                return (
                  <div className="relative w-full h-full max-h-[calc(100vh-3.5rem)] flex items-center justify-center">
                    {showAnimated ? (
                      <>
                        <video
                          key={animatedSrc}
                          src={animatedSrc}
                          autoPlay
                          loop
                          muted
                          playsInline
                          className="max-w-full max-h-full w-auto h-auto object-contain select-none"
                          style={{ maxHeight: "calc(100vh - 3.5rem)" }}
                          onError={(e) => {
                            (e.target as HTMLVideoElement).style.display = "none";
                            const img = (e.target as HTMLVideoElement).nextElementSibling as HTMLImageElement;
                            if (img) img.style.display = "block";
                          }}
                        />
                        <img
                          src={animatedSrc}
                          alt=""
                          className="max-w-full max-h-full w-auto h-auto object-contain select-none hidden"
                          style={{ maxHeight: "calc(100vh - 3.5rem)" }}
                          draggable={false}
                        />
                      </>
                    ) : staticIsVideo ? (
                      <video
                        key={staticSrc}
                        src={staticSrc}
                        loop
                        muted
                        playsInline
                        className={`max-w-full max-h-full w-auto h-auto object-contain select-none ${isLocked ? "blur-2xl scale-105" : ""}`}
                        style={{ maxHeight: "calc(100vh - 3.5rem)" }}
                      />
                    ) : (
                      <img
                        src={staticSrc}
                        alt=""
                        className={`max-w-full max-h-full w-auto h-auto object-contain select-none ${isLocked ? "blur-2xl scale-105" : ""}`}
                        draggable={false}
                        style={{ maxHeight: "calc(100vh - 3.5rem)" }}
                      />
                    )}
                    {isLocked && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6">
                        <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center">
                          <Lock className="w-7 h-7 text-white/80" />
                        </div>
                        <p className="text-white/90 font-medium">Paid story</p>
                        <p className="text-white/60 text-sm">${story.price_usdc} USDC to view</p>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStoryUnlock(story.id);
                          }}
                          disabled={storyUnlockingId === story.id}
                          className="px-6 py-3 rounded-xl font-medium text-white transition-colors disabled:opacity-50 shadow-anime-soft"
                          style={{ background: "linear-gradient(135deg, #D27A92, #D27A92)" }}
                        >
                          {storyUnlockingId === story.id ? "Unlocking…" : `Pay $${story.price_usdc} USDC`}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
            {storyPaused && (
              <p className="absolute bottom-6 left-0 right-0 text-center text-white/50 text-xs z-20 pointer-events-none">
                Holding — timer paused
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

        {/* ─── FEED ─── */}
        <main className="flex-1 w-full max-w-[960px] lg:max-w-[880px] mx-auto px-3 sm:px-4 lg:px-6 py-4 lg:py-5">
        {loading ? (
          <div className={isGrid ? `grid gap-3 lg:gap-5 ${gridCols === 2 ? "grid-cols-2" : gridCols === 3 ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"}` : "space-y-4 max-w-[420px] sm:max-w-[480px] lg:max-w-[520px] mx-auto"}>
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl overflow-hidden animate-pulse bg-white/[0.04]">
                <div className="aspect-[4/5] lg:aspect-[4/3] bg-white/[0.03]" />
                <div className="p-2.5 space-y-1.5">
                  <div className="h-2.5 w-24 rounded-full bg-white/[0.06]" />
                  <div className="h-2 w-14 rounded-full bg-white/[0.04]" />
                </div>
              </div>
            ))}
          </div>
        ) : sortedArtworks.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-16 gap-3"
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-white/[0.06] border border-white/[0.08]">
              <Sparkles className="w-5 h-5 text-anime-pink/70" />
            </div>
            <p className="text-white/40 text-sm text-center">No content yet.</p>
            <p className="text-white/25 text-xs text-center max-w-xs">Publish from Admin to get started.</p>
          </motion.div>
        ) : (
          <div className={isGrid
            ? `grid gap-3 lg:gap-5 ${
                gridCols === 2 ? "grid-cols-2" :
                gridCols === 3 ? "grid-cols-2 sm:grid-cols-3" :
                "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
              }`
            : "flex flex-col items-center gap-4 max-w-[420px] sm:max-w-[480px] lg:max-w-[520px] mx-auto"
          }>
            {sortedArtworks.map((artwork, index) => (
              <motion.div
                key={artwork.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className={layout === "list" ? "w-full" : ""}
              >
                <ArtworkCard
                  artwork={artwork}
                  comments={getCommentsForCard(artwork.id)}
                  walletDisplay={walletDisplay}
                  walletAddress={address ?? undefined}
                  compact={isGrid}
                  onLike={handleLike}
                  onSubmitComment={(text) => handleSubmitComment(artwork.id, text)}
                  onNewComment={(id, c) =>
                    setCommentsByArtwork((prev) => ({ ...prev, [id]: [...(prev[id] ?? []), c] }))
                  }
                  onUnlockPayment={(id, unlockType) => handleUnlockPayment(id, unlockType)}
                />
              </motion.div>
            ))}
          </div>
        )}

        {!loading && sortedArtworks.length > 0 && (
          <div className="flex items-center gap-3 py-8 justify-center">
            <div className="h-px flex-1 max-w-8 bg-white/[0.06]" />
            <span className="text-white/20 text-[10px] uppercase tracking-widest">End</span>
            <div className="h-px flex-1 max-w-8 bg-white/[0.06]" />
          </div>
        )}
        </main>
      </div>
    </div>
  );
}
