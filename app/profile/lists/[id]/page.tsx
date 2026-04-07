"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "motion/react";
import { Sparkles, LayoutList, Loader2, ArrowLeft, Crown, Trash2 } from "lucide-react";
import { ConnectButton } from "@/components/connect-button";
import { useAccount } from "wagmi";
import { useWallet } from "@solana/wallet-adapter-react";
import { ArtworkCard } from "@/components/nixie";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import type { Artwork } from "@/lib/types";
import type { CommentDisplay } from "@/components/nixie/comments-panel";

type ListRow = { id: string; wallet: string; name: string; created_at: string };

export default function ListDetailPage() {
  const params = useParams();
  const listId = typeof params?.id === "string" ? params.id : "";
  const { address } = useAccount();
  const solanaWallet = useWallet();
  const effectiveWallet = address ?? solanaWallet.publicKey?.toBase58() ?? null;

  const [list, setList] = useState<ListRow | null>(null);
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentsByArtwork, setCommentsByArtwork] = useState<Record<string, CommentDisplay[]>>({});
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [sessionNonce, setSessionNonce] = useState(0);

  const walletAddresses = [
    ...(address ? [address] : []),
    ...(solanaWallet.publicKey ? [solanaWallet.publicKey.toBase58()] : []),
  ];
  const walletConnectKey = `${address ?? ""}|${solanaWallet.publicKey?.toBase58() ?? ""}`;

  useEffect(() => {
    const bump = () => setSessionNonce((n) => n + 1);
    window.addEventListener("nixie-wallet-session", bump);
    return () => window.removeEventListener("nixie-wallet-session", bump);
  }, []);

  useEffect(() => {
    if (!listId) {
      setLoading(false);
      return;
    }
    if (!effectiveWallet) {
      setList(null);
      setArtworks([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`/api/lists/${listId}`, { cache: "no-store", credentials: "include" })
      .then((r) => {
        if (r.status === 404) return null;
        return r.json();
      })
      .then((d) => {
        if (!d) {
          setList(null);
          setArtworks([]);
          return;
        }
        setList(d.list);
        setArtworks(d.artworks ?? []);
      })
      .catch(() => {
        setList(null);
        setArtworks([]);
      })
      .finally(() => setLoading(false));
  }, [listId, effectiveWallet, walletConnectKey, sessionNonce]);

  const loadComments = (artworkId: string) => {
    if (commentsByArtwork[artworkId]) return;
    fetch(`/api/comments?contentId=${encodeURIComponent(artworkId)}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setCommentsByArtwork((prev) => ({ ...prev, [artworkId]: d.comments ?? [] })));
  };

  const getCommentsForCard = (artworkId: string): CommentDisplay[] => {
    if (!commentsByArtwork[artworkId]) {
      loadComments(artworkId);
      return [];
    }
    return commentsByArtwork[artworkId];
  };

  const handleRemoveFromList = async (contentId: string) => {
    if (!list) return;
    const ownerWallet = list.wallet;
    setRemovingId(contentId);
    try {
      const res = await fetch(
        `/api/lists/${listId}/items?contentId=${encodeURIComponent(contentId)}&wallet=${encodeURIComponent(ownerWallet)}`,
        { method: "DELETE", credentials: "include" }
      );
      if (res.ok) {
        setArtworks((prev) => prev.filter((a) => a.id !== contentId));
      }
    } finally {
      setRemovingId(null);
    }
  };

  const isOwner = list && walletAddresses.includes(list.wallet);
  const isConnected = !!effectiveWallet;

  return (
    <div className="min-h-screen font-anime flex flex-col lg:flex-row">
      <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:w-[200px] lg:border-r lg:border-white/[0.06] z-40 bg-[#0f0d14]/60 backdrop-blur-md">
        <div className="px-4 py-3 flex items-center gap-2 border-b border-white/[0.06]">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="font-bold text-white text-[15px] tracking-tight">Nixie</span>
            <Sparkles className="w-3.5 h-3.5 text-anime-pink opacity-90" />
          </Link>
        </div>
        <nav className="flex-1 px-2 py-2 space-y-0.5 min-w-0">
          <Link
            href="/feed"
            className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] text-white/70 hover:text-white hover:bg-white/[0.05] transition-colors"
          >
            <LayoutList className="w-4 h-4 text-anime-lavender flex-shrink-0" />
            Feed
          </Link>
          <Link
            href="/profile"
            className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium text-white bg-white/[0.07]"
          >
            <div className="w-4 h-4 rounded-full bg-anime-lavender/40 flex items-center justify-center text-[10px] font-semibold text-anime-lavender flex-shrink-0">
              P
            </div>
            Profile
          </Link>
          <Link
            href="/membership"
            className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] text-white/70 hover:text-white hover:bg-white/[0.05] transition-colors"
          >
            <Crown className="w-4 h-4 text-anime-pink/80 flex-shrink-0" />
            Membership
          </Link>
        </nav>
        <div className="p-2.5 border-t border-white/[0.06]">
          <ConnectButton />
        </div>
      </aside>

      <header className="lg:hidden sticky top-0 z-50 border-b border-white/[0.06] bg-anime-night/95 backdrop-blur-xl">
        <div className="px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="font-bold text-white text-[15px] tracking-tight">Nixie</span>
            <Sparkles className="w-3.5 h-3.5 text-anime-pink opacity-90" />
          </Link>
          <Link href="/feed" className="text-white/40 hover:text-white/70 text-sm font-medium transition-colors">
            Feed
          </Link>
        </div>
      </header>

      <main className="flex-1 lg:pl-[200px] min-h-screen pb-20 lg:pb-0">
        <div className="max-w-2xl lg:max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          {!isConnected ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <p className="text-white/50 text-sm">Connect a wallet to view your list.</p>
              <ConnectButton />
            </div>
          ) : loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <Loader2 className="w-10 h-10 text-anime-pink animate-spin" aria-hidden />
              <p className="text-white/50 text-sm">Loading list…</p>
            </div>
          ) : !list ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <p className="text-white/50 text-sm">List not found.</p>
              <Link href="/profile" className="text-anime-pink text-sm font-semibold hover:underline">
                Back to profile
              </Link>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-4 mb-6">
                <Link
                  href="/profile"
                  className="flex items-center gap-1.5 text-white/50 hover:text-white/80 text-sm transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Profile
                </Link>
                <div className="h-px flex-1 min-w-4" style={{ background: "rgba(255,255,255,0.08)" }} />
                <h1 className="text-lg font-semibold text-white truncate">{list.name}</h1>
                <span className="text-white/35 text-xs tabular-nums">{artworks.length} items</span>
              </div>

              {artworks.length === 0 ? (
                <p className="text-white/35 text-sm py-12 text-center">
                  This list is empty. Add content from your profile using &quot;Add to list&quot; on unlocked items.
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                  {artworks.map((artwork, index) => (
                    <motion.div
                      key={artwork.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.04, duration: 0.3 }}
                      className="relative group"
                    >
                      <ArtworkCard
                        artwork={artwork}
                        comments={getCommentsForCard(artwork.id)}
                        walletDisplay={effectiveWallet ?? undefined}
                        walletAddress={effectiveWallet ?? undefined}
                        compact
                      />
                      {isOwner && (
                        <button
                          type="button"
                          onClick={() => handleRemoveFromList(artwork.id)}
                          disabled={removingId === artwork.id}
                          className="absolute top-2 right-2 z-10 p-1.5 rounded-lg bg-black/60 hover:bg-red-500/80 text-white/80 hover:text-white transition-colors disabled:opacity-50"
                          title="Remove from list"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <MobileBottomNav />
    </div>
  );
}
