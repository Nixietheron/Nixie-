import { useState } from "react";
import { motion } from "motion/react";
import { Sparkles } from "lucide-react";
import { ArtworkCard } from "../components/artwork-card";
import { mockArtworks } from "../data/mock-artworks";

export function FeedScreen() {
  const [artworks] = useState(mockArtworks);

  return (
    <div className="min-h-screen bg-[#F7E8EB]">
      {/* Header */}
      <div className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-[#ECC1CE] z-40">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-2xl text-[#D27A92]">Nixie</h1>
            <Sparkles className="w-5 h-5 text-[#D27A92]" />
          </div>
        </div>
      </div>

      {/* Feed */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Wallet Info */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-4 mb-6 shadow-md shadow-[#D27A92]/5"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[#8B6B73] mb-1">Connected Wallet</p>
              <p className="text-sm text-[#5A3D45]">0x1234...5678</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-[#8B6B73] mb-1">USDC Balance</p>
              <p className="text-sm text-[#D27A92]">$45.50</p>
            </div>
          </div>
        </motion.div>

        {/* Artworks */}
        <div className="space-y-6">
          {artworks.map((artwork, index) => (
            <motion.div
              key={artwork.id}
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <ArtworkCard artwork={artwork} />
            </motion.div>
          ))}
        </div>

        {/* Load More */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center py-8"
        >
          <p className="text-sm text-[#8B6B73]">
            You've reached the end! ✨
          </p>
        </motion.div>
      </div>
    </div>
  );
}