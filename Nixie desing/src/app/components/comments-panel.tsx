import { X, Send } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useState } from "react";
import { mockComments } from "../data/mock-artworks";

interface CommentsPanelProps {
  artworkId: string;
  onClose: () => void;
}

export function CommentsPanel({ artworkId, onClose }: CommentsPanelProps) {
  const [comment, setComment] = useState("");
  const comments = mockComments.filter((c) => c.artworkId === artworkId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (comment.trim()) {
      // In a real app, this would save the comment
      console.log("New comment:", comment);
      setComment("");
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        />

        {/* Panel */}
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 30, stiffness: 300 }}
          className="relative bg-white rounded-t-3xl w-full max-h-[70vh] flex flex-col shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-[#ECC1CE]">
            <h3 className="text-lg text-[#5A3D45]">Comments</h3>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-[#F7E8EB] text-[#5A3D45]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Comments List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {comments.length === 0 ? (
              <div className="text-center py-8 text-[#8B6B73]">
                <p>No comments yet. Be the first to comment!</p>
              </div>
            ) : (
              comments.map((c) => (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-[#F7E8EB] rounded-2xl p-4"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-sm text-[#5A3D45]">{c.user}</p>
                      <p className="text-xs text-[#8B6B73]">{c.userWallet}</p>
                    </div>
                    <span className="text-xs text-[#8B6B73]">
                      {c.timestamp.toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-[#5A3D45]">{c.text}</p>
                </motion.div>
              ))
            )}
          </div>

          {/* Comment Input */}
          <form
            onSubmit={handleSubmit}
            className="p-4 border-t border-[#ECC1CE] bg-[#F7E8EB]"
          >
            <div className="flex gap-2">
              <input
                type="text"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1 bg-white rounded-full px-4 py-3 outline-none focus:ring-2 focus:ring-[#D27A92] text-[#5A3D45] placeholder:text-[#8B6B73]"
              />
              <motion.button
                whileTap={{ scale: 0.9 }}
                type="submit"
                disabled={!comment.trim()}
                className="w-12 h-12 bg-gradient-to-r from-[#D27A92] to-[#E1A1B0] rounded-full flex items-center justify-center text-white shadow-lg shadow-[#D27A92]/30 disabled:opacity-50"
              >
                <Send className="w-5 h-5" />
              </motion.button>
            </div>
            <p className="text-xs text-[#8B6B73] mt-2 text-center">
              Commenting as 0x1234...5678
            </p>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
