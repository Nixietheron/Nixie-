"use client";

import { Heart, MessageCircle, Lock, Unlock, Eye, Calendar, X, Play } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { Artwork } from "@/lib/types";
import { ipfsProxyUrl } from "@/lib/constants";
import { ImageWithFallback } from "./image-with-fallback";
import { UnlockModal } from "./unlock-modal";
import { CommentsPanel, CommentDisplay } from "./comments-panel";

interface ArtworkCardProps {
  artwork: Artwork;
  comments: CommentDisplay[];
  onLike?: (contentId: string, currentlyLiked: boolean) => void | Promise<void>;
  onUnlock?: () => void;
  /** Called when user pays to unlock; receives contentId and which type (nsfw | animated) */
  onUnlockPayment?: (contentId: string, unlockType: "nsfw" | "animated") => void | Promise<void>;
  onSubmitComment?: (text: string) => Promise<void>;
  onNewComment?: (contentId: string, comment: CommentDisplay) => void;
  walletDisplay?: string;
  /** Full wallet address for protected NSFW image URL (required for paid unlock) */
  walletAddress?: string | null;
  compact?: boolean;
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
  compact = false,
}: ArtworkCardProps) {
  const [viewMode, setViewMode] = useState<ViewMode>(() => getInitialViewMode(artwork));
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [unlockTypeToPay, setUnlockTypeToPay] = useState<"nsfw" | "animated">("nsfw");
  const [showComments, setShowComments] = useState(false);
  const [showFullscreenImage, setShowFullscreenImage] = useState(false);
  const [fullscreenViewMode, setFullscreenViewMode] = useState<ViewMode>("sfw");
  const [isLiked, setIsLiked] = useState(false);
  const [unlockLoading, setUnlockLoading] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [animatedUseVideo, setAnimatedUseVideo] = useState(true);

  const handleLike = () => {
    setIsLiked((v) => !v);
    onLike?.(artwork.id, isLiked);
  };

  const handleUnlock = async () => {
    setUnlockError(null);
    if (onUnlockPayment) {
      setUnlockLoading(true);
      try {
        await onUnlockPayment(artwork.id, unlockTypeToPay);
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
  const rawImageSrc = showSfw ? artwork.sfwPreview : showAnimatedUnlocked ? artwork.animatedVersion : artwork.nsfwFull;
  const imageSrc = showSfw
    ? (rawImageSrc?.includes("/ipfs/") ? ipfsProxyUrl(rawImageSrc) || rawImageSrc : rawImageSrc || "")
    : showAnimatedUnlocked
      ? (rawImageSrc || "") + (walletAddress ? `&wallet=${encodeURIComponent(walletAddress)}` : "")
      : (rawImageSrc
          ? rawImageSrc + (walletAddress ? `&wallet=${encodeURIComponent(walletAddress)}` : "")
          : "");

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={compact ? undefined : { y: -4, boxShadow: "0 14px 40px rgba(210,122,146,0.35)" }}
        transition={{ duration: 0.25 }}
        className="rounded-2xl overflow-hidden w-full bg-[#16131f] border border-white/[0.12] hover:border-[#D27A92]/50 transition-colors shadow-xl shadow-black/30"
      >
        <div
          className={`relative overflow-hidden bg-[#0f0d14] ${
            compact ? "aspect-square flex items-center justify-center" : "min-h-[200px]"
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
                <video
                  key={imageSrc}
                  src={imageSrc}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className={
                    compact
                      ? `w-full h-full object-contain ${walletConnected ? "" : "blur-xl scale-105"}`
                      : `w-full h-auto max-h-[80vh] object-contain block transition-all duration-500 ${
                          walletConnected ? "hover:scale-[1.01]" : "blur-xl scale-105"
                        }`
                  }
                  onError={() => setAnimatedUseVideo(false)}
                />
              )}
              {!animatedUseVideo && (
                <ImageWithFallback
                  src={imageSrc}
                  alt="Animated"
                  className={
                    compact
                      ? `w-full h-full object-contain ${walletConnected ? "" : "blur-xl scale-105"}`
                      : `w-full h-auto max-h-[80vh] object-contain block transition-all duration-500 ${
                          walletConnected ? "hover:scale-[1.01]" : "blur-xl scale-105"
                        }`
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
                      showNsfwLocked || !walletConnected ? "blur-xl scale-105" : ""
                    }`
                  : `w-full h-auto max-h-[80vh] object-contain block transition-all duration-500 ${
                      showNsfwLocked || !walletConnected ? "blur-xl scale-105" : "hover:scale-[1.01]"
                    }`
              }
            />
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

          {/* Animated badge when Animated is selected (unlocked) */}
          {showAnimatedUnlocked && (
            <div className="absolute top-2.5 right-2.5">
              <div
                className="flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold"
                style={{
                  background: "rgba(184,169,201,0.25)",
                  border: "1px solid rgba(184,169,201,0.4)",
                  backdropFilter: "blur(6px)",
                  color: "rgb(200,190,220)",
                }}
              >
                <Play className="w-2.5 h-2.5" />
                Animated
              </div>
            </div>
          )}
          {/* SFW = free badge when SFW is selected */}
          {showSfw && !showAnimated && (
            <div className="absolute top-2.5 right-2.5">
              <div
                className="flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold"
                style={{
                  background: "rgba(59,130,246,0.2)",
                  border: "1px solid rgba(59,130,246,0.35)",
                  backdropFilter: "blur(6px)",
                  color: "rgb(96,165,250)",
                }}
              >
                Free
              </div>
            </div>
          )}

          {/* NSFW unlocked badge */}
          {showNsfwUnlocked && (
            <div className="absolute top-2.5 right-2.5">
              <div
                className="flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold"
                style={{
                  background: isFree ? "rgba(59,130,246,0.2)" : "rgba(16,185,129,0.18)",
                  border: isFree ? "1px solid rgba(59,130,246,0.35)" : "1px solid rgba(16,185,129,0.35)",
                  backdropFilter: "blur(6px)",
                  color: isFree ? "rgb(96,165,250)" : "rgb(52,211,153)",
                }}
              >
                <Unlock className="w-2.5 h-2.5" />
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

          {/* SFW / NSFW / Animated toggle buttons */}
          <div className="flex gap-1.5 mb-2">
            {artwork.sfwPreview && (
              <button
                type="button"
                onClick={() => setViewMode("sfw")}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  viewMode === "sfw"
                    ? "bg-white/12 text-white border border-white/20"
                    : "bg-white/5 text-white/50 border border-white/10 hover:text-white/70"
                }`}
              >
                SFW
              </button>
            )}
            {artwork.hasNsfw && (
              <button
                type="button"
                onClick={() => setViewMode("nsfw")}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1 ${
                  viewMode === "nsfw"
                    ? "bg-[#D27A92]/20 text-[#D27A92] border border-[#D27A92]/40"
                    : "bg-white/5 text-white/50 border border-white/10 hover:text-white/70"
                }`}
              >
                {!nsfwUnlocked && <Lock className="w-3.5 h-3.5" />}
                NSFW
              </button>
            )}
            {artwork.hasAnimated && (
              <button
                type="button"
                onClick={() => setViewMode("animated")}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1 ${
                  viewMode === "animated"
                    ? "bg-anime-lavender/20 text-anime-lavender border border-anime-lavender/40"
                    : "bg-white/5 text-white/50 border border-white/10 hover:text-white/70"
                }`}
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
            </div>
            {((viewMode === "sfw" && artwork.sfwPreview) || (viewMode === "nsfw" && nsfwUnlocked) || (viewMode === "animated" && !!artwork.animatedVersion)) && (
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => { setFullscreenViewMode(viewMode); setShowFullscreenImage(true); }}
                className="flex items-center gap-1.5 rounded-xl font-medium text-xs px-3 py-1.5"
                style={{
                  background: isFree ? "rgba(59,130,246,0.12)" : "rgba(52,211,153,0.1)",
                  border: "1px solid rgba(52,211,153,0.25)",
                  color: "rgb(52,211,153)",
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
                <>
                  <video
                    src={artwork.animatedVersion + (walletAddress ? `&wallet=${encodeURIComponent(walletAddress)}` : "")}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="max-w-full max-h-[88vh] w-auto h-auto object-contain rounded-xl"
                  />
                </>
              ) : fullscreenViewMode === "nsfw" && artwork.nsfwFull ? (
                <ImageWithFallback
                  src={artwork.nsfwFull + (walletAddress ? `&wallet=${encodeURIComponent(walletAddress)}` : "")}
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
