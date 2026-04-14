"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useAccount, useChainId, usePublicClient, useWalletClient } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { wrapFetchWithPayment } from "@x402/fetch";
import { x402Client } from "@x402/core/client";
import { ExactEvmScheme } from "@x402/evm/exact/client";
import { ExactEvmSchemeV1 } from "@x402/evm/exact/v1/client";
import { Loader2, Monitor } from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import type { Artwork } from "@/lib/types";
import { BASE_CHAIN_ID, X402_CHAIN_IDS } from "@/lib/constants";
import { MuseumOverlay } from "@/components/museum";

const MuseumScene = dynamic(
  () => import("@/components/museum/museum-scene").then((m) => m.MuseumScene),
  { ssr: false }
);

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile;
}

export default function MuseumPage() {
  const isMobile = useIsMobile();
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextOffset, setNextOffset] = useState(0);
  const [totalCatalog, setTotalCatalog] = useState<number | null>(null);
  const [selectedArtwork, setSelectedArtwork] = useState<Artwork | null>(null);
  const [unlocking, setUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [unlockAnimationArtworkId, setUnlockAnimationArtworkId] = useState<string | null>(null);

  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { openConnectModal } = useConnectModal();

  const fetchWithPayment = useMemo(() => {
    if (!X402_CHAIN_IDS.includes(chainId as (typeof X402_CHAIN_IDS)[number])) return null;
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

  const baseWalletReady = !!address && chainId === BASE_CHAIN_ID && !!fetchWithPayment;

  useEffect(() => {
    setLoading(true);
    setNextOffset(0);
    fetch("/api/museum/content?limit=80&offset=0", { cache: "no-store", credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        const list = Array.isArray(d.artworks) ? d.artworks : [];
        setArtworks(list);
        setHasMore(Boolean(d.hasMore));
        setNextOffset(typeof d.nextOffset === "number" ? d.nextOffset : list.length);
        setTotalCatalog(typeof d.total === "number" ? d.total : null);
      })
      .catch(() => {
        setArtworks([]);
        setHasMore(false);
        setTotalCatalog(null);
      })
      .finally(() => setLoading(false));
  }, [address]);

  const loadMoreArtworks = useCallback(() => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    fetch(`/api/museum/content?limit=80&offset=${nextOffset}`, {
      cache: "no-store",
      credentials: "include",
    })
      .then((r) => r.json())
      .then((d) => {
        const batch = Array.isArray(d.artworks) ? d.artworks : [];
        setArtworks((prev) => {
          const seen = new Set(prev.map((a) => a.id));
          const merged = [...prev];
          for (const a of batch) {
            if (!seen.has(a.id)) {
              seen.add(a.id);
              merged.push(a);
            }
          }
          return merged;
        });
        setHasMore(Boolean(d.hasMore));
        setNextOffset(typeof d.nextOffset === "number" ? d.nextOffset : nextOffset + batch.length);
        if (typeof d.total === "number") setTotalCatalog(d.total);
      })
      .catch(() => {})
      .finally(() => setLoadingMore(false));
  }, [hasMore, loadingMore, nextOffset]);

  const handleArtworkSelect = useCallback((artwork: Artwork | null) => {
    setSelectedArtwork(artwork);
    setUnlockError(null);
  }, []);

  const handleUnlockArtwork = useCallback(
    async (artwork: Artwork) => {
      if (!address) {
        openConnectModal?.();
        return;
      }
      if (chainId !== BASE_CHAIN_ID) {
        setUnlockError("Please switch your wallet to Base network.");
        return;
      }
      if (!fetchWithPayment) {
        setUnlockError("Preparing payment client... please try again.");
        return;
      }
      setUnlocking(true);
      setUnlockError(null);
      try {
        const body = JSON.stringify({
          wallet: address,
          contentId: artwork.id,
          unlockType: "nsfw",
        });
        const res = await fetchWithPayment("/api/unlock", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body,
        });
        const d = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(d.error ?? "Unlock failed");

        // Apply unlock immediately so the purchased piece opens without waiting animation.
        setArtworks((prev) =>
          prev.map((a) =>
            a.id === artwork.id
              ? {
                  ...a,
                  nsfwUnlocked: true,
                  isUnlocked: true,
                  // contentToArtwork returns empty nsfwFull while locked; fill it immediately after purchase.
                  nsfwFull: a.nsfwFull || `/api/ipfs-image?contentId=${a.id}`,
                }
              : a
          )
        );
        setSelectedArtwork((prev) =>
          prev && prev.id === artwork.id
            ? {
                ...prev,
                nsfwUnlocked: true,
                isUnlocked: true,
                nsfwFull: prev.nsfwFull || `/api/ipfs-image?contentId=${prev.id}`,
              }
            : prev
        );
        setUnlockAnimationArtworkId(artwork.id);
      } catch (e) {
        setUnlockError(e instanceof Error ? e.message : "Unlock failed");
      } finally {
        setUnlocking(false);
      }
    },
    [address, fetchWithPayment, chainId, openConnectModal]
  );

  const handleUnlockAnimationDone = useCallback((artworkId: string) => {
    setUnlockAnimationArtworkId((current) => (current === artworkId ? null : current));
  }, []);

  if (isMobile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 font-anime" style={{ background: "#0a080c" }}>
        <div className="w-16 h-16 rounded-2xl bg-[#D27A92]/10 border border-[#D27A92]/20 flex items-center justify-center mb-6">
          <Monitor className="w-8 h-8 text-[#D27A92]" />
        </div>
        <h1 className="text-white font-bold text-xl mb-2">Desktop Only</h1>
        <p className="text-white/50 text-sm text-center max-w-xs mb-6">
          The Nixie Museum is a 3D experience designed for desktop browsers.
          Please visit on a computer with a keyboard.
        </p>
        <Link
          href="/feed"
          className="px-6 py-3 rounded-xl text-sm font-medium text-white bg-[#D27A92]/80 hover:bg-[#D27A92] transition-colors"
        >
          Go to Feed
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center font-anime" style={{ background: "#080610" }}>
        <Loader2 className="w-10 h-10 text-[#D27A92] animate-spin mb-4" />
        <p className="text-white/50 text-sm">Loading museum...</p>
      </div>
    );
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden font-anime" style={{ background: "#080610" }}>
      <MuseumScene
        artworks={artworks}
        onArtworkSelect={handleArtworkSelect}
        unlockAnimationArtworkId={unlockAnimationArtworkId}
        onUnlockAnimationDone={handleUnlockAnimationDone}
      />

      <MuseumOverlay
        selectedArtwork={selectedArtwork}
        onCloseArtwork={() => setSelectedArtwork(null)}
        onConnectWallet={() => openConnectModal?.()}
        onUnlockArtwork={handleUnlockArtwork}
        unlocking={unlocking}
        unlockError={unlockError}
        walletConnected={isConnected && !!address}
        walletReady={baseWalletReady}
        isBaseNetwork={chainId === BASE_CHAIN_ID}
        hasMoreArtworks={hasMore}
        loadingMoreArtworks={loadingMore}
        onLoadMoreArtworks={loadMoreArtworks}
        loadedArtworkCount={artworks.length}
        totalArtworkCount={totalCatalog}
      />
    </div>
  );
}
