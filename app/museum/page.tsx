"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useAccount, useChainId, useDisconnect, useSwitchChain } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { Loader2, Monitor, ShieldCheck } from "lucide-react";
import dynamic from "next/dynamic";
import type { Artwork } from "@/lib/types";
import { ROBINHOOD_CHAIN_ID } from "@/lib/robinhood-chain";
import { MuseumOverlay } from "@/components/museum";

type AvatarChoice = "female" | "male";
type AccessState = "checking" | "allowed" | "wallet-required" | "signature-required" | "wrong-network" | "not-eligible" | "not-configured" | "rpc-error";

const MuseumScene = dynamic(() => import("@/components/museum/museum-scene").then((m) => m.MuseumScene), { ssr: false });

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check(); window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile;
}

export default function MuseumPage() {
  const isMobile = useIsMobile();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const { openConnectModal } = useConnectModal();
  const [accessState, setAccessState] = useState<AccessState>("checking");
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextOffset, setNextOffset] = useState(0);
  const [totalCatalog, setTotalCatalog] = useState<number | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedArtwork, setSelectedArtwork] = useState<Artwork | null>(null);
  const [avatarChoice, setAvatarChoice] = useState<AvatarChoice>("female");
  const [displayName, setDisplayName] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileRequired, setProfileRequired] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [authRefresh, setAuthRefresh] = useState(0);

  const fetchArtworks = useCallback(async (offset: number, append = false) => {
    const response = await fetch(`/api/museum/content?limit=80&offset=${offset}`, { cache: "no-store", credentials: "include" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Unable to load museum.");
    const batch: Artwork[] = Array.isArray(data.artworks) ? data.artworks as Artwork[] : [];
    setArtworks((current) => append ? [...current, ...batch.filter((item) => !current.some((existing) => existing.id === item.id))] : batch);
    setHasMore(Boolean(data.hasMore));
    setNextOffset(typeof data.nextOffset === "number" ? data.nextOffset : offset + batch.length);
    setTotalCatalog(typeof data.total === "number" ? data.total : null);
  }, []);

  useEffect(() => {
    const refresh = () => setAuthRefresh((value) => value + 1);
    window.addEventListener("nixie-wallet-session", refresh);
    return () => window.removeEventListener("nixie-wallet-session", refresh);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setAccessState("checking");
    fetch("/api/museum/access", { cache: "no-store", credentials: "include" })
      .then(async (response) => ({ response, data: await response.json().catch(() => ({})) }))
      .then(({ response, data }) => {
        if (cancelled) return;
        if (response.ok && data.allowed) { setAccessState("allowed"); return; }
        if (!isConnected || !address) { setAccessState("wallet-required"); return; }
        if (response.status === 401 || data.reason === "signature-required") { setAccessState("signature-required"); return; }
        if (chainId !== ROBINHOOD_CHAIN_ID) { setAccessState("wrong-network"); return; }
        setAccessState(data.reason === "not-configured" ? "not-configured" : data.reason === "network-not-configured" ? "rpc-error" : data.reason === "rpc-error" ? "rpc-error" : "not-eligible");
      }).catch(() => !cancelled && setAccessState("rpc-error"));
    return () => { cancelled = true; };
  }, [address, authRefresh, chainId, isConnected]);

  useEffect(() => {
    if (accessState !== "allowed") return;
    setLoading(true);
    fetchArtworks(0).catch(() => setArtworks([])).finally(() => setLoading(false));
  }, [accessState, fetchArtworks]);

  useEffect(() => {
    if (accessState !== "allowed" || !address) return;
    let cancelled = false;
    setProfileLoading(true); setProfileError(null);
    fetch("/api/museum/profile", { cache: "no-store", credentials: "include" })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok && response.status !== 404) throw new Error(data.error || "Failed to load profile");
        return data;
      }).then((data) => {
        if (cancelled) return;
        if (data.profile) { setDisplayName(data.profile.displayName || ""); setAvatarChoice(data.profile.avatar === "male" ? "male" : "female"); setProfileRequired(false); }
        else setProfileRequired(true);
      }).catch((error) => !cancelled && setProfileError(error instanceof Error ? error.message : "Failed to load profile"))
      .finally(() => !cancelled && setProfileLoading(false));
    return () => { cancelled = true; };
  }, [accessState, address]);

  const saveProfile = async () => {
    const trimmed = displayName.trim();
    if (trimmed.length < 2) { setProfileError("Please enter at least 2 characters for your name."); return; }
    setProfileSaving(true); setProfileError(null);
    try {
      const response = await fetch("/api/museum/profile", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ displayName: trimmed, avatar: avatarChoice }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Failed to save profile");
      setProfileRequired(false);
    } catch (error) { setProfileError(error instanceof Error ? error.message : "Failed to save profile"); }
    finally { setProfileSaving(false); }
  };

  const gateCopy = useMemo(() => {
    if (accessState === "allowed") return null;
    return ({
    "checking": ["Checking access", "Verifying your Robinhood Mainnet wallet…"],
    "wallet-required": ["Enter Nixie Museum", "Connect the Robinhood Mainnet wallet that holds a Nixie token or NFT."],
    "signature-required": ["Verify wallet", "Sign the secure wallet message to verify ownership before entering."],
    "wrong-network": ["Switch to Robinhood Mainnet", "Museum access is available only on Robinhood Mainnet."],
    "not-eligible": ["Museum pass required", "Hold a Nixie token or any Nixie NFT in this wallet to enter."],
    "not-configured": ["Museum opening soon", "The Nixie token and NFT contracts have not been configured yet."],
    "rpc-error": ["Robinhood RPC unavailable", "Set NEXT_PUBLIC_ROBINHOOD_RPC_URL in Colify, then reconnect your wallet."],
    } as const)[accessState];
  }, [accessState]);

  if (isMobile) return <div className="min-h-screen flex flex-col items-center justify-center px-6 font-anime" style={{ background: "#0a080c" }}><Monitor className="mb-6 h-8 w-8 text-[#D7FF00]" /><h1 className="mb-2 text-xl font-bold text-white">Desktop Only</h1><p className="max-w-xs text-center text-sm text-white/50">The Nixie Museum is a 3D experience designed for desktop browsers.</p></div>;

  const retryAccess = () => window.location.reload();
  const gateAction = accessState === "wallet-required"
    ? () => openConnectModal?.()
    : accessState === "signature-required"
      ? retryAccess
    : accessState === "wrong-network"
      ? () => switchChain?.({ chainId: ROBINHOOD_CHAIN_ID })
      : retryAccess;
  const gateActionLabel = accessState === "wallet-required" ? "Connect Robinhood wallet" : accessState === "signature-required" ? "Continue verification" : accessState === "wrong-network" ? "Switch to Robinhood Mainnet" : "Try again";
  if (accessState !== "allowed") return <div className="min-h-screen flex items-center justify-center px-4 font-anime" style={{ background: "#080610" }}><div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#120f1e] p-7 text-center shadow-2xl"><ShieldCheck className="mx-auto mb-4 h-9 w-9 text-[#D7FF00]" /><h1 className="text-xl font-semibold text-white">{gateCopy?.[0]}</h1><p className="mt-2 text-sm leading-relaxed text-white/60">{gateCopy?.[1]}</p>{accessState !== "checking" && <button onClick={gateAction} className="mt-6 w-full rounded-xl bg-[#D7FF00] px-4 py-3 text-sm font-semibold text-white hover:bg-[#c6eb00]">{gateActionLabel}</button>}</div></div>;
  if (loading) return <div className="min-h-screen flex flex-col items-center justify-center font-anime" style={{ background: "#080610" }}><Loader2 className="mb-4 h-10 w-10 animate-spin text-[#D7FF00]" /><p className="text-sm text-white/50">Loading museum...</p></div>;

  return <div className="relative h-screen w-screen overflow-hidden font-anime" style={{ background: "#080610" }}>
    <MuseumScene artworks={artworks} avatarChoice={avatarChoice} onArtworkSelect={setSelectedArtwork} />
    <MuseumOverlay selectedArtwork={selectedArtwork} onCloseArtwork={() => setSelectedArtwork(null)} onConnectWallet={() => openConnectModal?.()} onDisconnectWallet={() => disconnect()} walletConnected={Boolean(address)} hasMoreArtworks={hasMore} loadingMoreArtworks={loadingMore} onLoadMoreArtworks={() => { setLoadingMore(true); fetchArtworks(nextOffset, true).finally(() => setLoadingMore(false)); }} loadedArtworkCount={artworks.length} totalArtworkCount={totalCatalog} />
    {(profileLoading || profileRequired) && <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"><div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#120f1e] p-6 text-white"><h2 className="text-xl font-semibold">Start Museum Experience</h2><p className="mt-2 text-sm text-white/65">Choose your avatar and name once.</p><input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Your name" maxLength={40} className="mt-5 w-full rounded-lg border border-white/15 bg-black/25 px-3 py-2 text-sm outline-none focus:border-[#D7FF00]" /><div className="mt-4 grid grid-cols-2 gap-2">{(["female", "male"] as const).map((avatar) => <button key={avatar} onClick={() => setAvatarChoice(avatar)} className={`rounded-lg border px-3 py-2 text-sm ${avatarChoice === avatar ? "border-[#D7FF00] bg-[#D7FF00]/20" : "border-white/15"}`}>{avatar === "female" ? "Female" : "Male"}</button>)}</div>{profileError && <p className="mt-3 text-sm text-red-300">{profileError}</p>}<button onClick={saveProfile} disabled={profileSaving || profileLoading} className="mt-6 w-full rounded-lg bg-[#D7FF00] px-4 py-2 text-sm font-semibold disabled:opacity-60">{profileSaving ? "Saving..." : "Save and Enter Museum"}</button></div></div>}
  </div>;
}
