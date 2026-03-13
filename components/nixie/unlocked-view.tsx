"use client";

import { X, Heart, MessageCircle, DollarSign, Play } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { Artwork } from "@/lib/types";
import { ImageWithFallback } from "./image-with-fallback";
import { CommentsPanel, CommentDisplay } from "./comments-panel";
import { NixieButton } from "./nixie-button";

interface UnlockedViewProps {
  artwork: Artwork;
  onClose: () => void;
  comments: CommentDisplay[];
  onSubmitComment: (text: string) => Promise<void>;
  likeCount: number;
  isLiked: boolean;
  onLike: () => void;
  walletDisplay?: string;
  /** Required for proxy URLs (NSFW / animated) to work */
  walletAddress?: string | null;
}

export function UnlockedView({
  artwork,
  onClose,
  comments,
  onSubmitComment,
  likeCount,
  isLiked,
  onLike,
  walletDisplay,
  walletAddress,
}: UnlockedViewProps) {
  const [showComments, setShowComments] = useState(false);
  const [showAnimated, setShowAnimated] = useState(false);
  const [showTipModal, setShowTipModal] = useState(false);

  const baseSrc =
    showAnimated && artwork.animatedVersion
      ? artwork.animatedVersion
      : artwork.nsfwFull;
  const imageSrc =
    baseSrc && baseSrc.includes("/api/ipfs-image") && walletAddress
      ? baseSrc + `&wallet=${encodeURIComponent(walletAddress)}`
      : baseSrc ?? "";

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="fixed inset-0 z-50 bg-[#F7E8EB] overflow-y-auto"
      >
        <div className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-[#ECC1CE] z-10">
          <div className="flex items-center justify-between p-4">
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-[#F7E8EB] text-[#5A3D45]"
            >
              <X className="w-6 h-6" />
            </button>
            <h2 className="text-lg text-[#5A3D45]">Unlocked Artwork</h2>
            <div className="w-10" />
          </div>
        </div>
        <div className="max-w-2xl mx-auto p-4">
          <div className="bg-white rounded-3xl overflow-hidden shadow-xl shadow-[#D27A92]/10 mb-4">
            <div className="relative aspect-[3/4]">
              <ImageWithFallback
                src={imageSrc}
                alt={`Full artwork by ${artwork.creator}`}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-4 right-4 bg-gradient-to-r from-[#D27A92] to-[#E1A1B0] text-white px-4 py-2 rounded-full text-sm shadow-lg">
                ✨ Unlocked
              </div>
            </div>
            <div className="p-6">
              <div className="mb-6">
                <p className="text-xl text-[#5A3D45]">by {artwork.creator}</p>
              </div>
              {artwork.animatedVersion && (
                <div className="mb-6">
                  <button
                    onClick={() => setShowAnimated(!showAnimated)}
                    className="flex items-center gap-2 text-[#D27A92]"
                  >
                    <Play className="w-5 h-5" />
                    <span className="text-sm">
                      {showAnimated ? "Show Static" : "Show Animated"}
                    </span>
                  </button>
                </div>
              )}
              <div className="flex items-center justify-between gap-4">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={onLike}
                  className="flex-1 flex items-center justify-center gap-2 bg-[#F7E8EB] rounded-full py-3 text-[#5A3D45]"
                >
                  <Heart
                    className={`w-5 h-5 ${
                      isLiked ? "fill-[#D27A92] text-[#D27A92]" : ""
                    }`}
                  />
                  <span>{likeCount}</span>
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowComments(true)}
                  className="flex-1 flex items-center justify-center gap-2 bg-[#F7E8EB] rounded-full py-3 text-[#5A3D45]"
                >
                  <MessageCircle className="w-5 h-5" />
                  <span>{comments.length}</span>
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowTipModal(true)}
                  className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-[#D27A92] to-[#E1A1B0] text-white rounded-full py-3 shadow-lg shadow-[#D27A92]/30"
                >
                  <DollarSign className="w-5 h-5" />
                  <span>Tip</span>
                </motion.button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {showComments && (
        <CommentsPanel
          artworkId={artwork.id}
          contentId={artwork.id}
          comments={comments}
          onClose={() => setShowComments(false)}
          onSubmitComment={onSubmitComment}
          walletDisplay={walletDisplay}
        />
      )}

      {showTipModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => setShowTipModal(false)}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl"
          >
            <h3 className="text-xl text-[#5A3D45] mb-4">Tip Creator</h3>
            <p className="text-sm text-[#8B6B73] mb-6">
              Show your appreciation for {artwork.creator}&apos;s work
            </p>
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[1, 2, 5].map((amount) => (
                <button
                  key={amount}
                  className="bg-[#F7E8EB] rounded-2xl py-4 text-[#D27A92] hover:bg-[#ECC1CE] transition-colors"
                >
                  ${amount}
                </button>
              ))}
            </div>
            <NixieButton
              variant="primary"
              onClick={() => setShowTipModal(false)}
              className="w-full"
            >
              Send Tip
            </NixieButton>
          </motion.div>
        </div>
      )}
    </>
  );
}
