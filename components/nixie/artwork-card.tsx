"use client";

import { Heart, MessageCircle, Lock, Unlock, Eye, Calendar, X, Play } from "lucide-react";
import { motion } from "motion/react";
import { useState, useRef, useEffect } from "react";
import { Artwork } from "@/lib/types";
import { ipfsProxyUrl } from "@/lib/constants";
import { ImageWithFallback } from "./image-with-fallback";
import { UnlockModal, type PaymentNetwork } from "./unlock-modal";
import { CommentsPanel, CommentDisplay } from "./comments-panel";

const LOCKED_BLUR_IMAGES = [
  "/Nixie1.png",
  "/Nixie2.png",
  "/Nixie3.png",
  "/Nixie4.png",
  "/Nixie5.png",
] as const;

function pickLockedBlurImage(contentId: string, tileIndex: number): string {
  let hash = 0;
  const seed = `${contentId}:${tileIndex}`;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return LOCKED_BLUR_IMAGES[hash % LOCKED_BLUR_IMAGES.length];
}

interface ArtworkCardProps {
  artwork: Artwork;
  comments: CommentDisplay[];
  onLike?: (contentId: string, currentlyLiked: boolean) => void | Promise<void>;
  onUnlock?: () => void;
  /** Called when user pays to unlock; receives contentId, unlockType, and payment network (base/solana). */
  onUnlockPayment?: (contentId: string, unlockType: "nsfw" | "animated", paymentNetwork: PaymentNetwork) => void | Promise<void>;
  /** When true, "Pay with Solana" is enabled in the unlock modal. */
  solanaWalletConnected?: boolean;
  /** Called when user clicks "Connect Solana wallet" in the unlock modal. */
  onConnectSolanaClick?: () => void;
  /** When true, Base (EVM) wallet is connected and on Base network (ready for x402). */
  baseWalletReady?: boolean;
  /** When true, an EVM wallet is connected (to show "switch network" vs "connect" in modal). */
  baseWalletConnected?: boolean;
  onSubmitComment?: (text: string) => Promise<void>;
  onNewComment?: (contentId: string, comment: CommentDisplay) => void;
  walletDisplay?: string;
  /** Full wallet address for protected NSFW image URL (required for paid unlock). Used for display/comment. */
  walletAddress?: string | null;
  /** All connected wallets (Base + Solana) for image unlock check; if set, used in ipfs-image URL so either wallet can load. */
  walletAddresses?: string[];
  compact?: boolean;
  /** Called once when card becomes visible in viewport. */
  onTrackImpression?: (contentId: string) => void;
  /** Called on card interactions (click/tap) to count an additional view. */
  onTrackClick?: (contentId: string) => void;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = (now.getTime() - d.getTime()) / 1000;
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 7 * 86400) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}

type ViewMode = "sfw" | "nsfw" | "animated";

function getInitialViewMode(artwork: Artwork): ViewMode {
  if (artwork.sfwPreview) return "sfw";
  if (artwork.hasAnimated) return "animated";
  if (artwork.hasNsfw) return "nsfw";
  return "sfw";
}

export function ArtworkCard({
  artwork,
  comments,
  onLike,
  onUnlock,
  onUnlockPayment,
  onSubmitComment,
  onNewComment,
  walletDisplay,
  walletAddress,
  walletAddresses,
  solanaWalletConnected = false,
  onConnectSolanaClick,
  baseWalletReady = false,
  baseWalletConnected = false,
  compact = false,
  onTrackImpression,
  onTrackClick,
}: ArtworkCardProps) {
  const [viewMode, setViewMode] = useState<ViewMode>(() => getInitialViewMode(artwork));
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [unlockTypeToPay, setUnlockTypeToPay] = useState<"nsfw" | "animated">("nsfw");
  const [showComments, setShowComments] = useState(false);
  const [showFullscreenImage, setShowFullscreenImage] = useState(false);
  const [fullscreenViewMode, setFullscreenViewMode] = useState<ViewMode>("sfw");
  const [isLiked, setIsLiked] = useState(Boolean(artwork.likedByViewer));
  const [unlockLoading, setUnlockLoading] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [animatedUseVideo, setAnimatedUseVideo] = useState(true);
  const [animatedPlaying, setAnimatedPlaying] = useState(false);
  const animatedVideoRef = useRef<HTMLVideoElement>(null);
  const fullscreenVideoRef = useRef<HTMLVideoElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const impressionTrackedRef = useRef(false);
  const [fullscreenAnimatedPlaying, setFullscreenAnimatedPlaying] = useState(false);
  useEffect(() => {
    if (!showFullscreenImage) setFullscreenAnimatedPlaying(false);
  }, [showFullscreenImage]);
  useEffect(() => {
    setIsLiked(Boolean(artwork.likedByViewer));
  }, [artwork.likedByViewer, artwork.id]);

  useEffect(() => {
    if (!cardRef.current || impressionTrackedRef.current || !onTrackImpression) return;
    const el = cardRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (!first?.isIntersecting) return;
        impressionTrackedRef.current = true;
        onTrackImpression(artwork.id);
        observer.disconnect();
      },
      { threshold: 0.55 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [artwork.id, onTrackImpression]);

  const handleLike = () => {
    if (isLiked) return;
    setIsLiked(true);
    onLike?.(artwork.id, false);
  };

  const handleUnlock = async (paymentNetwork: PaymentNetwork) => {
    setUnlockError(null);
    if (onUnlockPayment) {
      setUnlockLoading(true);
      try {
        await onUnlockPayment(artwork.id, unlockTypeToPay, paymentNetwork);
        setShowUnlockModal(false);
        onUnlock?.();
      } catch (e) {
        setUnlockError(e instanceof Error ? e.message : "Unlock failed");
      } finally {
        setUnlockLoading(false);
      }
    } else {
      setShowUnlockModal(false);
      onUnlock?.();
    }
  };

  const likeCount = artwork.likes + (isLiked ? 1 : 0);
  const nsfwUnlocked = artwork.nsfwUnlocked ?? false;
  const animatedUnlocked = artwork.animatedUnlocked ?? false;
  const isFree = artwork.price === 0;
  const walletConnected = !!walletAddress;

  // What to show in the single image area. NSFW and Animated unlock separately.
  const showSfw = viewMode === "sfw";
  const showNsfwLocked = viewMode === "nsfw" && !nsfwUnlocked && artwork.hasNsfw;
  const showNsfwUnlocked = viewMode === "nsfw" && nsfwUnlocked;
  const showAnimated = viewMode === "animated" && artwork.hasAnimated;
  const showAnimatedLocked = showAnimated && !artwork.animatedVersion;
  const showAnimatedUnlocked = showAnimated && !!artwork.animatedVersion;
  const showPaidLockedCollage = showNsfwLocked || showAnimatedLocked;
  const rawImageSrc = showSfw ? artwork.sfwPreview : showAnimatedUnlocked ? artwork.animatedVersion : artwork.nsfwFull;
  const walletQuery =
    (walletAddresses?.length ? walletAddresses.map((w) => `wallet=${encodeURIComponent(w)}`).join("&") : null) ??
    (walletAddress ? `wallet=${encodeURIComponent(walletAddress)}` : null);
  const imageSrc = showSfw
    ? (rawImageSrc?.includes("/ipfs/") ? ipfsProxyUrl(rawImageSrc) || rawImageSrc : rawImageSrc || "")
    : showAnimatedUnlocked
      ? (rawImageSrc || "") + (walletQuery ? `&${walletQuery}` : "")
      : (rawImageSrc ? rawImageSrc + (walletQuery ? `&${walletQuery}` : "") : "");

  return (
    <>
      <motion.div
        ref={cardRef}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={compact ? undefined : { y: -4, boxShadow: "0 14px 40px rgba(210,122,146,0.35)" }}
        transition={{ duration: 0.25 }}
        className="rounded-2xl overflow-hidden w-full bg-[#16131f] border border-white/[0.12] hover:border-[#D27A92]/50 transition-colors shadow-xl shadow-black/30"
        onClickCapture={() => onTrackClick?.(artwork.id)}
      >
        <div
          className={`relative overflow-hidden bg-[#0f0d14] ${
            compact ? "aspect-square flex items-center justify-center" : "aspect-[3/4] min-h-[280px] flex items-center justify-center"
          }`}
        >
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-transparent to-black/20" />
          {showAnimatedLocked ? (
            <div
              className="absolute inset-0 flex items-center justify-center min-h-[280px]"
              style={{ background: "rgba(10,8,12,0.2)" }}
            >
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => { setUnlockTypeToPay("animated"); setShowUnlockModal(true); }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-anime-pink to-anime-coral border border-white/20"
              >
                <Lock className="w-4 h-4" />
                <span>Pay ${artwork.animatedPrice ?? 0} USDC to unlock</span>
              </motion.button>
            </div>
          ) : showAnimatedUnlocked && imageSrc ? (
            <>
              {animatedUseVideo && (
                <div
                  className="absolute inset-0 flex items-center justify-center cursor-pointer"
                  onClick={() => {
                    const v = animatedVideoRef.current;
                    if (!v) return;
                    if (animatedPlaying) {
                      v.pause();
                    } else {
                      v.play();
                    }
                  }}
                >
                  <video
                    ref={animatedVideoRef}
                    key={imageSrc}
                    src={imageSrc}
                    loop
                    muted
                    playsInline
                    className={
                      compact
                        ? "w-full h-full object-contain"
                        : `absolute inset-0 w-full h-full object-contain transition-all duration-500 ${
                            "hover:scale-[1.01]"
                          }`
                    }
                    onPlay={() => setAnimatedPlaying(true)}
                    onPause={() => setAnimatedPlaying(false)}
                    onError={() => setAnimatedUseVideo(false)}
                  />
                  {/* Play/pause overlay: only when unlocked; hide when playing */}
                  {!animatedPlaying && (
                    <div
                      className="absolute inset-0 flex items-center justify-center pointer-events-none"
                      aria-hidden
                    >
                      <div
                        className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg"
                        style={{
                          background: "rgba(210,122,146,0.5)",
                          border: "2px solid rgba(255,255,255,0.4)",
                          backdropFilter: "blur(8px)",
                        }}
                      >
                        <Play className="w-7 h-7 text-white ml-0.5" fill="currentColor" stroke="none" />
                      </div>
                    </div>
                  )}
                </div>
              )}
              {!animatedUseVideo && (
                <ImageWithFallback
                  src={imageSrc}
                  alt="Animated"
                  className={
                    compact
                      ? "w-full h-full object-contain"
                      : "absolute inset-0 w-full h-full object-contain transition-all duration-500 hover:scale-[1.01]"
                  }
                />
              )}
            </>
          ) : (
            <ImageWithFallback
              src={imageSrc}
              alt={showSfw ? "SFW preview" : "NSFW full"}
              errorVariant={showNsfwLocked ? "locked" : undefined}
              className={
                compact
                  ? `w-full h-full object-contain ${
                      showNsfwLocked ? "blur-xl scale-105" : ""
                    }`
                  : `absolute inset-0 w-full h-full object-contain transition-all duration-500 ${
                      showNsfwLocked ? "blur-xl scale-105" : "hover:scale-[1.01]"
                    }`
              }
            />
          )}

          {showPaidLockedCollage && (
            <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 opacity-90">
              {[0, 1, 2, 3].map((tile) => (
                <div
                  key={tile}
                  className="bg-center bg-cover"
                  style={{
                    backgroundImage: `url(${pickLockedBlurImage(artwork.id, tile)})`,
                    filter: "blur(9px) saturate(1.05) brightness(0.62)",
                    transform: "scale(1.08)",
                  }}
                />
              ))}
              <div className="absolute inset-0 bg-black/30" />
            </div>
          )}

          {/* Wallet not connected hint over blurred media */}
          {!walletConnected && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="px-3 py-1.5 rounded-full bg-black/70 border border-white/20 text-[11px] font-medium text-white/80">
                Connect wallet to view clearly
              </div>
            </div>
          )}

          <div className="absolute bottom-0 left-0 right-0 h-12 pointer-events-none bg-gradient-to-t from-black/40 to-transparent" />

          {/* Badges top-left, small, pink glass */}
          {showAnimatedUnlocked && (
            <div className="absolute top-2 left-2">
              <div
                className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-semibold"
                style={{
                  background: "rgba(210,122,146,0.35)",
                  border: "1px solid rgba(210,122,146,0.45)",
                  backdropFilter: "blur(6px)",
                  color: "rgba(255,255,255,0.95)",
                }}
              >
                <Play className="w-2 h-2" />
                Animated
              </div>
            </div>
          )}
          {showSfw && !showAnimated && (
            <div className="absolute top-2 left-2">
              <div
                className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-semibold"
                style={{
                  background: "rgba(210,122,146,0.35)",
                  border: "1px solid rgba(210,122,146,0.45)",
                  backdropFilter: "blur(6px)",
                  color: "rgba(255,255,255,0.95)",
                }}
              >
                Free
              </div>
            </div>
          )}

          {showNsfwUnlocked && (
            <div className="absolute top-2 left-2">
              <div
                className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-semibold"
                style={{
                  background: isFree ? "rgba(210,122,146,0.35)" : "rgba(210,122,146,0.4)",
                  border: "1px solid rgba(210,122,146,0.5)",
                  backdropFilter: "blur(6px)",
                  color: "rgba(255,255,255,0.95)",
                }}
              >
                <Unlock className="w-2 h-2" />
                {isFree ? "Free" : "Unlocked"}
              </div>
            </div>
          )}

          {/* NSFW locked: image already blurred; light overlay so shape visible but not clear */}
          {showNsfwLocked && (
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{
                background: "rgba(10,8,12,0.2)",
              }}
            >
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => { setUnlockTypeToPay("nsfw"); setShowUnlockModal(true); }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-anime-pink to-anime-coral border border-white/20"
              >
                <Lock className="w-4 h-4" />
                <span>Pay ${artwork.price} USDC to unlock</span>
              </motion.button>
            </div>
          )}
        </div>

        {/* ── FOOTER ── */}
        <div className={compact ? "p-2" : "p-3 sm:p-3.5"}>

          {/* SFW / NSFW / Animated toggle buttons — selected = pink */}
          <div className="flex gap-1.5 mb-2 p-0.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            {artwork.sfwPreview && (
              <button
                type="button"
                onClick={() => setViewMode("sfw")}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all duration-200 flex items-center justify-center gap-1.5 ${
                  viewMode === "sfw"
                    ? "text-white shadow-sm"
                    : "text-white/50 hover:text-white/75"
                }`}
                style={
                  viewMode === "sfw"
                    ? {
                        background: "linear-gradient(180deg, rgba(210,122,146,0.35) 0%, rgba(210,122,146,0.18) 100%)",
                        border: "1px solid rgba(210,122,146,0.5)",
                        boxShadow: "0 1px 0 0 rgba(255,255,255,0.08) inset",
                      }
                    : { border: "1px solid transparent", background: "transparent" }
                }
              >
                SFW
              </button>
            )}
            {artwork.hasNsfw && (
              <button
                type="button"
                onClick={() => setViewMode("nsfw")}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all duration-200 flex items-center justify-center gap-1.5 ${
                  viewMode === "nsfw"
                    ? "text-white shadow-sm"
                    : "text-white/50 hover:text-white/75"
                }`}
                style={
                  viewMode === "nsfw"
                    ? {
                        background: "linear-gradient(180deg, rgba(210,122,146,0.35) 0%, rgba(210,122,146,0.18) 100%)",
                        border: "1px solid rgba(210,122,146,0.5)",
                        boxShadow: "0 1px 0 0 rgba(255,255,255,0.08) inset",
                      }
                    : { border: "1px solid transparent", background: "transparent" }
                }
              >
                {!nsfwUnlocked && <Lock className="w-3.5 h-3.5 opacity-80" />}
                NSFW
              </button>
            )}
            {artwork.hasAnimated && (
              <button
                type="button"
                onClick={() => setViewMode("animated")}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all duration-200 flex items-center justify-center gap-1.5 ${
                  viewMode === "animated"
                    ? "text-white shadow-sm"
                    : "text-white/50 hover:text-white/75"
                }`}
                style={
                  viewMode === "animated"
                    ? {
                        background: "linear-gradient(180deg, rgba(210,122,146,0.35) 0%, rgba(210,122,146,0.18) 100%)",
                        border: "1px solid rgba(210,122,146,0.5)",
                        boxShadow: "0 1px 0 0 rgba(255,255,255,0.08) inset",
                      }
                    : { border: "1px solid transparent", background: "transparent" }
                }
              >
                <Play className="w-3 h-3" />
                Animated
              </button>
            )}
          </div>

          {/* Title + meta + description */}
          <div className="mb-2">
            <p
              className="font-semibold text-white/90 truncate text-[13px] sm:text-sm"
            >
              {artwork.title || "Untitled"}
            </p>
            {!compact && (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-white/35 text-xs">by {artwork.creator}</span>
                <span className="text-white/15 text-xs">·</span>
                <span className="flex items-center gap-1 text-white/25 text-xs">
                  <Calendar className="w-2.5 h-2.5" />
                  {formatDate(artwork.createdAt)}
                </span>
              </div>
            )}
            {!compact && artwork.description && (
              <p className="mt-2 text-white/55 text-sm leading-relaxed" style={{ wordBreak: "break-word" }}>
                {artwork.description}
              </p>
            )}
          </div>

          {/* Actions: likes + comments; View full when NSFW unlocked */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-3">
              <motion.button
                whileTap={{ scale: 0.82 }}
                onClick={handleLike}
                className="flex items-center gap-1.5 transition-colors"
                style={{ color: isLiked ? "#D27A92" : "rgba(255,255,255,0.35)" }}
              >
                <Heart
                  className="transition-all"
                  style={{
                    width: compact ? 14 : 16,
                    height: compact ? 14 : 16,
                    fill: isLiked ? "#D27A92" : "none",
                  }}
                />
                <span className="text-xs tabular-nums">{likeCount}</span>
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.82 }}
                onClick={() => setShowComments(true)}
                className="flex items-center gap-1.5 text-white/35 hover:text-white/60 transition-colors"
              >
                <MessageCircle className={compact ? "w-3.5 h-3.5" : "w-4 h-4"} />
                <span className="text-xs tabular-nums">{artwork.comments}</span>
              </motion.button>
              <div className="flex items-center gap-1.5 text-white/35">
                <Eye className={compact ? "w-3.5 h-3.5" : "w-4 h-4"} />
                <span className="text-xs tabular-nums">{artwork.views ?? 0}</span>
              </div>
            </div>
            {((viewMode === "sfw" && artwork.sfwPreview) || (viewMode === "nsfw" && nsfwUnlocked) || (viewMode === "animated" && !!artwork.animatedVersion)) && (
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => { setFullscreenViewMode(viewMode); setShowFullscreenImage(true); }}
                className="flex items-center gap-2 rounded-xl font-semibold text-xs px-3.5 py-2 text-white"
                style={{
                  background: "linear-gradient(135deg, rgba(210,122,146,0.45) 0%, rgba(225,161,176,0.3) 50%, rgba(210,122,146,0.35) 100%)",
                  border: "1px solid rgba(210,122,146,0.55)",
                  boxShadow: "0 1px 0 0 rgba(255,255,255,0.12) inset, 0 2px 8px rgba(210,122,146,0.2)",
                }}
              >
                <Eye className="w-3.5 h-3.5" />
                Enlarge
              </motion.button>
            )}
          </div>

          {compact && (
            <p className="text-white/20 text-[10px] mt-2 truncate">{formatDate(artwork.createdAt)}</p>
          )}
        </div>
      </motion.div>

      {showUnlockModal && (
        <UnlockModal
          artwork={artwork}
          unlockType={unlockTypeToPay}
          onClose={() => { setShowUnlockModal(false); setUnlockError(null); }}
          onUnlock={handleUnlock}
          isLoading={unlockLoading}
          error={unlockError}
          solanaWalletConnected={solanaWalletConnected}
          onConnectSolanaClick={onConnectSolanaClick}
          baseWalletReady={baseWalletReady}
          baseWalletConnected={baseWalletConnected}
        />
      )}

      {showComments && (
        <CommentsPanel
          artworkId={artwork.id}
          contentId={artwork.id}
          comments={comments}
          onClose={() => setShowComments(false)}
          onSubmitComment={onSubmitComment ?? (async () => {})}
          onNewComment={onNewComment ? (c) => onNewComment(artwork.id, c) : undefined}
          walletDisplay={walletDisplay}
        />
      )}

      {/* View full: enlarged image/video + comments; close button top-right */}
      {showFullscreenImage && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex flex-col bg-[#0a080c]"
        >
          <div className="relative flex items-center justify-center p-3 border-b border-white/10 shrink-0 min-h-[52px]">
            <span className="text-white/70 text-sm truncate max-w-[70%]">{artwork.title || "Untitled"}</span>
            <button
              type="button"
              onClick={() => setShowFullscreenImage(false)}
              className="absolute top-3 right-3 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/15"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="flex justify-center p-4">
              {fullscreenViewMode === "animated" && artwork.animatedVersion ? (
                <div
                  className="relative flex items-center justify-center cursor-pointer"
                  onClick={() => {
                    const v = fullscreenVideoRef.current;
                    if (!v) return;
                    if (fullscreenAnimatedPlaying) {
                      v.pause();
                    } else {
                      v.play();
                    }
                  }}
                >
                  <video
                    ref={fullscreenVideoRef}
                    src={artwork.animatedVersion + (walletQuery ? `&${walletQuery}` : "")}
                    loop
                    muted
                    playsInline
                    className="max-w-full max-h-[88vh] w-auto h-auto object-contain rounded-xl"
                    onPlay={() => setFullscreenAnimatedPlaying(true)}
                    onPause={() => setFullscreenAnimatedPlaying(false)}
                  />
                  {!fullscreenAnimatedPlaying && (
                    <div
                      className="absolute inset-0 flex items-center justify-center pointer-events-none rounded-xl"
                      aria-hidden
                    >
                      <div
                        className="w-16 h-16 rounded-full flex items-center justify-center shadow-xl"
                        style={{
                          background: "rgba(210,122,146,0.5)",
                          border: "2px solid rgba(255,255,255,0.4)",
                          backdropFilter: "blur(8px)",
                        }}
                      >
                        <Play className="w-8 h-8 text-white ml-1" fill="currentColor" stroke="none" />
                      </div>
                    </div>
                  )}
                </div>
              ) : fullscreenViewMode === "nsfw" && artwork.nsfwFull ? (
                <ImageWithFallback
                  src={artwork.nsfwFull + (walletQuery ? `&${walletQuery}` : "")}
                  alt={artwork.title || "Full artwork"}
                  className="max-w-full max-h-[88vh] w-auto h-auto object-contain rounded-xl"
                />
              ) : (
                <ImageWithFallback
                  src={fullscreenViewMode === "sfw" && artwork.sfwPreview ? (artwork.sfwPreview.includes("/ipfs/") ? (ipfsProxyUrl(artwork.sfwPreview) || artwork.sfwPreview) : artwork.sfwPreview) : ""}
                  alt={artwork.title || "Full artwork"}
                  className="max-w-full max-h-[88vh] w-auto h-auto object-contain rounded-xl"
                />
              )}
            </div>
            <div className="px-4 pb-6">
              <div className="flex items-center gap-4 mb-3">
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  onClick={handleLike}
                  className="flex items-center gap-2 text-white/70 hover:text-[#D27A92]"
                  style={{ color: isLiked ? "#D27A92" : undefined }}
                >
                  <Heart className="w-5 h-5" style={{ fill: isLiked ? "#D27A92" : "none" }} />
                  <span className="text-sm tabular-nums">{likeCount}</span>
                </motion.button>
                <span className="flex items-center gap-2 text-white/50 text-sm">
                  <MessageCircle className="w-4 h-4" />
                  {artwork.comments} comments
                </span>
              </div>
              <CommentsPanel
                artworkId={artwork.id}
                contentId={artwork.id}
                comments={comments}
                onClose={() => setShowFullscreenImage(false)}
                onSubmitComment={onSubmitComment ?? (async () => {})}
                onNewComment={onNewComment ? (c) => onNewComment(artwork.id, c) : undefined}
                walletDisplay={walletDisplay}
                embedded
              />
            </div>
          </div>
        </motion.div>
      )}
    </>
  );
}
