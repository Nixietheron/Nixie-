"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "motion/react";
import { Sparkles, User, Wallet, LayoutList, Grid3X3, Loader2, FolderPlus, Plus } from "lucide-react";
import { ConnectButton } from "@/components/connect-button";
import { useAccount } from "wagmi";
import { useWallet } from "@solana/wallet-adapter-react";
import Link from "next/link";
import { ArtworkCard, AddToListPopover } from "@/components/nixie";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import type { Artwork } from "@/lib/types";
import type { CommentDisplay } from "@/components/nixie/comments-panel";

type ListRow = { id: string; wallet: string; name: string; created_at: string };

export default function ProfilePage() {
  const { address } = useAccount();
  const solanaWallet = useWallet();
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [lists, setLists] = useState<ListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentsByArtwork, setCommentsByArtwork] = useState<Record<string, CommentDisplay[]>>({});
  const [newListName, setNewListName] = useState("");
  const [creatingList, setCreatingList] = useState(false);

  type LayoutKey = "list" | "2" | "3" | "4";
  const [layout, setLayout] = useState<LayoutKey>("list");
  const isGrid = layout !== "list";
  const gridCols = layout === "list" ? 1 : (Number(layout) as 2 | 3 | 4);

  const isConnected = !!address || solanaWallet.connected;
  const walletDisplay = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : solanaWallet.publicKey
      ? `${solanaWallet.publicKey.toBase58().slice(0, 4)}…${solanaWallet.publicKey.toBase58().slice(-4)}`
      : undefined;

  const profileWalletParam = useMemo(() => {
    const list = [...(address ? [address] : []), ...(solanaWallet.publicKey ? [solanaWallet.publicKey.toBase58()] : [])];
    return list.length ? list.map((w) => `wallet=${encodeURIComponent(w)}`).join("&") : null;
  }, [address, solanaWallet.publicKey]);

  useEffect(() => {
    if (!profileWalletParam) {
      setArtworks([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`/api/content?${profileWalletParam}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        const list = (d.artworks ?? []).filter((a: Artwork) => a.hasPaidUnlock);
        setArtworks(list);
      })
      .catch(() => setArtworks([]))
      .finally(() => setLoading(false));
  }, [profileWalletParam]);

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

  const effectiveWallet = address ?? solanaWallet.publicKey?.toBase58() ?? null;

  useEffect(() => {
    if (!effectiveWallet) {
      setLists([]);
      return;
    }
    fetch(`/api/lists?wallet=${encodeURIComponent(effectiveWallet)}`)
      .then((r) => r.json())
      .then((d) => setLists(d.lists ?? []))
      .catch(() => setLists([]));
  }, [effectiveWallet]);

  const handleCreateList = async () => {
    if (!effectiveWallet) return;
    setCreatingList(true);
    try {
      const res = await fetch("/api/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: effectiveWallet, name: newListName || "New list" }),
      });
      const d = await res.json();
      if (d.list) {
        setLists((prev) => [d.list, ...prev]);
        setNewListName("");
      }
    } finally {
      setCreatingList(false);
    }
  };

  const handleSubmitComment = async (artworkId: string, text: string) => {
    if (!effectiveWallet) return;
    const res = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wallet: effectiveWallet, contentId: artworkId, text }),
    });
    const d = await res.json();
    if (d.comment) {
      setCommentsByArtwork((prev) => ({ ...prev, [artworkId]: [...(prev[artworkId] ?? []), d.comment] }));
    }
  };

  const handleLike = async (contentId: string, currentlyLiked: boolean) => {
    if (!effectiveWallet) return;
    await fetch("/api/like", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wallet: effectiveWallet, contentId, action: currentlyLiked ? "unlike" : "like" }),
    });
    setArtworks((prev) =>
      prev.map((a) => (a.id === contentId ? { ...a, likes: a.likes + (currentlyLiked ? -1 : 1) } : a))
    );
  };

  return (
    <div className="min-h-screen font-anime flex flex-col lg:flex-row">
      {/* ─── WEB: Left sidebar (same as feed) ─── */}
      <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:w-[200px] lg:border-r lg:border-white/[0.06] z-40 bg-[#0f0d14]/60 backdrop-blur-md">
        <div className="px-4 py-3 flex items-center gap-2 border-b border-white/[0.06]">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="font-bold text-white text-[15px] tracking-tight">Nixie</span>
            <Sparkles className="w-3.5 h-3.5 text-anime-pink opacity-90" />
          </Link>
        </div>
        <nav className="flex-1 px-2 py-2 space-y-0.5 min-w-0">
          <Link href="/feed" className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] text-white/70 hover:text-white hover:bg-white/[0.05] transition-colors">
            <LayoutList className="w-4 h-4 text-anime-lavender flex-shrink-0" />
            Feed
          </Link>
          <Link href="/profile" className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium text-white bg-white/[0.07]">
            <div className="w-4 h-4 rounded-full bg-anime-lavender/40 flex items-center justify-center text-[10px] font-semibold text-anime-lavender flex-shrink-0">P</div>
            Profile
          </Link>
        </nav>
        <div className="p-2.5 border-t border-white/[0.06]">
          <ConnectButton />
        </div>
      </aside>

      {/* ─── Mobile: Top header ─── */}
          <header className="lg:hidden sticky top-0 z-50 border-b border-white/[0.06] bg-anime-night/95 backdrop-blur-xl">
        <div className="px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="font-bold text-white text-[15px] tracking-tight">Nixie</span>
            <Sparkles className="w-3.5 h-3.5 text-anime-pink opacity-90" />
          </Link>
          <Link href="/feed" className="text-white/40 hover:text-white/70 text-sm font-medium transition-colors">Feed</Link>
        </div>
      </header>

      <main className="flex-1 lg:pl-[200px] min-h-screen pb-20 lg:pb-0">
        <div className="max-w-2xl lg:max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {!isConnected ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-24 gap-6"
          >
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center"
              style={{ background: "rgba(210,122,146,0.1)", border: "1px solid rgba(210,122,146,0.2)" }}
            >
              <User className="w-9 h-9 text-[#D27A92]/70" />
            </div>
            <div className="text-center space-y-2">
              <h1 className="text-xl font-bold text-white/90">Your collection</h1>
              <p className="text-white/40 text-sm max-w-xs">
                Connect your wallet to see artworks you’ve unlocked or that are free.
              </p>
            </div>
            <ConnectButton />
          </motion.div>
        ) : loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 className="w-10 h-10 text-anime-pink animate-spin" aria-hidden />
            <p className="text-white/50 text-sm">Loading profile…</p>
          </div>
        ) : (
          <>
            {/* My lists — always when wallet connected */}
            <section className="mb-8">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <FolderPlus className="w-4 h-4 text-anime-pink/80" />
                  <span className="text-white/50 text-xs font-semibold tracking-widest uppercase">
                    My lists
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                    placeholder="List name"
                    className="px-3 py-1.5 rounded-lg text-sm bg-white/[0.06] border border-white/10 text-white placeholder-white/30 w-32"
                  />
                  <button
                    type="button"
                    onClick={handleCreateList}
                    disabled={creatingList}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-anime-pink/80 hover:bg-anime-pink disabled:opacity-50"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {creatingList ? "…" : "New list"}
                  </button>
                </div>
              </div>
              {lists.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {lists.map((list) => (
                    <Link
                      key={list.id}
                      href={`/profile/lists/${list.id}`}
                      className="px-3 py-2 rounded-xl text-sm text-white/80 hover:text-white hover:bg-white/[0.08] border border-white/10 transition-colors"
                    >
                      {list.name}
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-white/25 text-xs">No lists yet. Create one above, then add unlocked content from your collection to lists.</p>
              )}
            </section>

            {artworks.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-24 gap-4"
              >
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{ background: "rgba(210,122,146,0.1)", border: "1px solid rgba(210,122,146,0.2)" }}
                >
                  <Wallet className="w-7 h-7 text-[#D27A92]/60" />
                </div>
                <p className="text-white/30 text-sm text-center">
                  No unlocked artworks yet.<br />
                  <span className="text-white/15">Unlock content from the feed to see it here.</span>
                </p>
                <Link href="/feed" className="text-[#D27A92] text-sm font-semibold hover:underline">
                  Browse feed
                </Link>
              </motion.div>
            ) : (
              <>
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-px w-8" style={{ background: "#D27A92" }} />
                    <span className="text-white/35 text-xs font-semibold tracking-[0.2em] uppercase">
                      Unlocked · {artworks.length} {artworks.length === 1 ? "artwork" : "artworks"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setLayout("list")}
                      className={`px-2 py-1 rounded text-[11px] font-medium transition-all ${
                        layout === "list"
                          ? "bg-anime-pink text-white"
                          : "bg-white/[0.06] text-white/50 hover:text-white/80"
                      }`}
                      title="Single"
                    >
                      <LayoutList className="w-3.5 h-3.5 inline-block align-middle" />
                    </button>
                    {([2, 3, 4] as const).map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setLayout(String(n) as LayoutKey)}
                        className={`px-2 py-1 rounded text-[11px] font-medium transition-all ${
                          layout === String(n)
                            ? "bg-anime-pink text-white"
                            : "bg-white/[0.06] text-white/50 hover:text-white/80"
                        }`}
                        title={`${n} columns`}
                      >
                        <Grid3X3 className="w-3.5 h-3.5 inline-block align-middle" />
                        <span className="ml-0.5">{n}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div
                  className={`grid gap-3 sm:gap-4 lg:gap-5 ${
                    isGrid
                      ? `grid-cols-2 sm:grid-cols-${Math.min(gridCols, 3)} lg:grid-cols-${gridCols}`
                      : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                  }`}
                >
                  {artworks.map((artwork, index) => (
                <motion.div
                  key={artwork.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.4 }}
                  className="space-y-1"
                >
                  <ArtworkCard
                    artwork={artwork}
                    comments={getCommentsForCard(artwork.id)}
                    walletDisplay={walletDisplay}
                    walletAddress={effectiveWallet ?? undefined}
                    walletAddresses={[
                      ...(address ? [address] : []),
                      ...(solanaWallet.publicKey ? [solanaWallet.publicKey.toBase58()] : []),
                    ]}
                    compact
                    onLike={handleLike}
                    onSubmitComment={(text) => handleSubmitComment(artwork.id, text)}
                    onNewComment={(id, c) =>
                      setCommentsByArtwork((prev) => ({ ...prev, [id]: [...(prev[id] ?? []), c] }))
                    }
                    onUnlockPayment={undefined}
                  />
                  <div className="flex justify-end">
                    <AddToListPopover
                      contentId={artwork.id}
                      lists={lists.map((l) => ({ id: l.id, name: l.name }))}
                      wallet={effectiveWallet}
                      compact
                      onListCreated={() => {
                        if (!effectiveWallet) return;
                        fetch(`/api/lists?wallet=${encodeURIComponent(effectiveWallet)}`)
                          .then((r) => r.json())
                          .then((d) => setLists(d.lists ?? []));
                      }}
                    />
                  </div>
                </motion.div>
              ))}
                </div>
              </>
            )}
          </>
        )}
        </div>
      </main>

      {/* Mobile: fixed bottom navigation */}
      <MobileBottomNav />
    </div>
  );
}
