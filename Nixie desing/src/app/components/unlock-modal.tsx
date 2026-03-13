import { X, Lock } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Artwork } from "../data/mock-artworks";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { NixieButton } from "./nixie-button";

interface UnlockModalProps {
  artwork: Artwork;
  onClose: () => void;
  onUnlock: () => void;
}

export function UnlockModal({ artwork, onClose, onUnlock }: UnlockModalProps) {
  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          className="relative bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md p-6 shadow-2xl z-10"
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-[#F7E8EB] text-[#5A3D45]"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-[#D27A92] to-[#E1A1B0] rounded-full flex items-center justify-center shadow-lg shadow-[#D27A92]/30">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl mb-2 text-[#5A3D45]">Unlock Full Version</h2>
            <p className="text-sm text-[#8B6B73]">
              Get access to the full NSFW artwork
            </p>
          </div>

          {/* Preview */}
          <div className="mb-6 rounded-2xl overflow-hidden">
            <div className="relative aspect-[3/4]">
              <ImageWithFallback
                src={`https://source.unsplash.com/400x500/?${artwork.sfwPreview}`}
                alt="Preview"
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-0 left-0 right-0 h-1/3 backdrop-blur-xl bg-gradient-to-t from-[#D27A92]/50 to-transparent" />
            </div>
          </div>

          {/* Price & Info */}
          <div className="bg-[#F7E8EB] rounded-2xl p-4 mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-[#8B6B73]">Price</span>
              <span className="text-2xl text-[#D27A92]">
                ${artwork.price} USDC
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-[#8B6B73]">Creator</span>
              <span className="text-[#5A3D45]">{artwork.creator}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <NixieButton
              variant="ghost"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </NixieButton>
            <NixieButton
              variant="primary"
              onClick={onUnlock}
              className="flex-1"
            >
              Pay with USDC
            </NixieButton>
          </div>

          {/* Note */}
          <p className="text-xs text-center text-[#8B6B73] mt-4">
            Payment via x402 on Base network
          </p>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
