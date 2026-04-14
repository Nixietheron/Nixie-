"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useAccount, useChainId, useDisconnect, usePublicClient, useWalletClient } from "wagmi";
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

type AvatarChoice = "female" | "male";

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
  const [avatarChoice, setAvatarChoice] = useState<AvatarChoice>("female");
  const [displayName, setDisplayName] = useState("");
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileRequired, setProfileRequired] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
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

  useEffect(() => {
    let cancelled = false;
    if (!isConnected || !address) {
      setProfileLoading(false);
      setProfileRequired(true);
      setDisplayName("");
      setAvatarChoice("female");
      return;
    }

    setProfileLoading(true);
    setProfileError(null);

    fetch("/api/museum/profile", { cache: "no-store", credentials: "include" })
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!r.ok && r.status !== 404) throw new Error(d.error ?? "Failed to load profile");
        return d as { profile?: { displayName?: string; avatar?: AvatarChoice } | null };
      })
      .then((d) => {
        if (cancelled) return;
        if (d.profile) {
          setDisplayName(d.profile.displayName ?? "");
          setAvatarChoice(d.profile.avatar === "male" ? "male" : "female");
          setProfileRequired(false);
        } else {
          setProfileRequired(true);
        }
      })
      .catch((e) => {
        if (cancelled) return;
        setProfileRequired(true);
        setProfileError(e instanceof Error ? e.message : "Failed to load profile");
      })
      .finally(() => {
        if (!cancelled) setProfileLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isConnected, address]);

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

  const handleSaveMuseumProfile = useCallback(async () => {
    if (!isConnected || !address) {
      openConnectModal?.();
      return;
    }
    const trimmed = displayName.trim();
    if (trimmed.length < 2) {
      setProfileError("Please enter at least 2 characters for your name.");
      return;
    }
    setProfileSaving(true);
    setProfileError(null);
    try {
      const res = await fetch("/api/museum/profile", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: trimmed, avatar: avatarChoice }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? "Failed to save profile");
      setDisplayName(d.profile?.displayName ?? trimmed);
      setAvatarChoice(d.profile?.avatar === "male" ? "male" : "female");
      setProfileRequired(false);
    } catch (e) {
      setProfileError(e instanceof Error ? e.message : "Failed to save profile");
    } finally {
      setProfileSaving(false);
    }
  }, [isConnected, address, openConnectModal, displayName, avatarChoice]);

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
        avatarChoice={avatarChoice}
        onArtworkSelect={handleArtworkSelect}
        unlockAnimationArtworkId={unlockAnimationArtworkId}
        onUnlockAnimationDone={handleUnlockAnimationDone}
      />

      <MuseumOverlay
        selectedArtwork={selectedArtwork}
        onCloseArtwork={() => setSelectedArtwork(null)}
        onConnectWallet={() => openConnectModal?.()}
        onDisconnectWallet={() => disconnect()}
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

      {(!isConnected || profileLoading || profileRequired) && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#120f1e] p-6 text-white shadow-2xl">
            <h2 className="text-xl font-semibold">Start Museum Experience</h2>
            <p className="mt-2 text-sm text-white/65">
              Choose your avatar and name once. We save it and do not ask again.
            </p>

            <div className="mt-5 space-y-3">
              <label className="text-xs uppercase tracking-wide text-white/60">Display Name</label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                className="w-full rounded-lg border border-white/15 bg-black/25 px-3 py-2 text-sm text-white outline-none focus:border-[#D27A92]"
                maxLength={40}
              />
            </div>

            <div className="mt-5">
              <p className="text-xs uppercase tracking-wide text-white/60 mb-2">Avatar</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAvatarChoice("female")}
                  className={`rounded-lg border px-3 py-2 text-sm transition ${
                    avatarChoice === "female"
                      ? "border-[#D27A92] bg-[#D27A92]/20 text-white"
                      : "border-white/15 bg-black/20 text-white/80 hover:border-white/30"
                  }`}
                >
                  Female
                </button>
                <button
                  type="button"
                  onClick={() => setAvatarChoice("male")}
                  className={`rounded-lg border px-3 py-2 text-sm transition ${
                    avatarChoice === "male"
                      ? "border-[#D27A92] bg-[#D27A92]/20 text-white"
                      : "border-white/15 bg-black/20 text-white/80 hover:border-white/30"
                  }`}
                >
                  Male
                </button>
              </div>
            </div>

            {profileError ? <p className="mt-3 text-sm text-red-300">{profileError}</p> : null}

            <div className="mt-6 flex items-center gap-2">
              {!isConnected ? (
                <button
                  type="button"
                  onClick={() => openConnectModal?.()}
                  className="w-full rounded-lg bg-[#D27A92] px-4 py-2 text-sm font-semibold text-white hover:bg-[#D27A92]/90 transition"
                >
                  Connect Wallet to Start
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSaveMuseumProfile}
                  disabled={profileSaving || profileLoading}
                  className="w-full rounded-lg bg-[#D27A92] px-4 py-2 text-sm font-semibold text-white hover:bg-[#D27A92]/90 transition disabled:opacity-60"
                >
                  {profileSaving ? "Saving..." : "Save and Enter Museum"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
