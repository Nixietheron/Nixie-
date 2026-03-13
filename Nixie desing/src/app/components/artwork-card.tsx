import { Heart, MessageCircle, Lock } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { Artwork } from "../data/mock-artworks";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { UnlockModal } from "./unlock-modal";
import { CommentsPanel } from "./comments-panel";
import { UnlockedView } from "./unlocked-view";

interface ArtworkCardProps {
  artwork: Artwork;
  onLike?: () => void;
  onUnlock?: () => void;
}

export function ArtworkCard({ artwork, onLike, onUnlock }: ArtworkCardProps) {
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showUnlockedView, setShowUnlockedView] = useState(false);
  const [isLiked, setIsLiked] = useState(false);

  const handleLike = () => {
    setIsLiked(!isLiked);
    onLike?.();
  };

  const handleUnlock = () => {
    setShowUnlockModal(false);
    setShowUnlockedView(true);
    onUnlock?.();
  };

  if (showUnlockedView) {
    return (
      <UnlockedView
        artwork={artwork}
        onClose={() => setShowUnlockedView(false)}
      />
    );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#ECC1CE] rounded-3xl overflow-hidden shadow-lg shadow-[#D27A92]/10 mb-4"
      >
        {/* Artwork Preview */}
        <div className="relative aspect-[3/4] overflow-hidden">
          <ImageWithFallback
            src={`https://source.unsplash.com/600x800/?${artwork.sfwPreview}`}
            alt={`Artwork by ${artwork.creator}`}
            className="w-full h-full object-cover"
          />
          
          {/* Blurred NSFW area overlay */}
          <div className="absolute bottom-0 left-0 right-0 h-1/3 backdrop-blur-xl bg-gradient-to-t from-[#D27A92]/40 to-transparent flex items-center justify-center">
            <div className="flex flex-col items-center gap-2 text-white">
              <Lock className="w-8 h-8" />
              <p className="text-sm">NSFW Content Hidden</p>
            </div>
          </div>
        </div>

        {/* Card Footer */}
        <div className="p-4">
          {/* Creator Info */}
          <div className="mb-3">
            <p className="font-medium text-[#5A3D45]">by {artwork.creator}</p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Like Button */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handleLike}
                className="flex items-center gap-1.5 text-[#5A3D45]"
              >
                <Heart
                  className={`w-5 h-5 transition-colors ${
                    isLiked ? "fill-[#D27A92] text-[#D27A92]" : ""
                  }`}
                />
                <span className="text-sm">{artwork.likes + (isLiked ? 1 : 0)}</span>
              </motion.button>

              {/* Comment Button */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowComments(true)}
                className="flex items-center gap-1.5 text-[#5A3D45]"
              >
                <MessageCircle className="w-5 h-5" />
                <span className="text-sm">{artwork.comments}</span>
              </motion.button>
            </div>

            {/* Unlock Button */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowUnlockModal(true)}
              className="bg-gradient-to-r from-[#D27A92] to-[#E1A1B0] text-white px-5 py-2 rounded-full flex items-center gap-2 shadow-lg shadow-[#D27A92]/30"
            >
              <Lock className="w-4 h-4" />
              <span className="text-sm">${artwork.price} USDC</span>
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Unlock Modal */}
      {showUnlockModal && (
        <UnlockModal
          artwork={artwork}
          onClose={() => setShowUnlockModal(false)}
          onUnlock={handleUnlock}
        />
      )}

      {/* Comments Panel */}
      {showComments && (
        <CommentsPanel
          artworkId={artwork.id}
          onClose={() => setShowComments(false)}
        />
      )}
    </>
  );
}