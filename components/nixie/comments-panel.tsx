"use client";

import { X, Send, MessageCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export interface CommentDisplay {
  id: string;
  wallet: string;
  text: string;
  created_at: string;
}

interface CommentsPanelProps {
  artworkId: string;
  contentId: string;
  comments: CommentDisplay[];
  onClose: () => void;
  onSubmitComment: (text: string) => Promise<void>;
  onNewComment?: (comment: CommentDisplay) => void;
  walletDisplay?: string;
  /** When true, render inline (no fixed overlay) for embedding in fullscreen view */
  embedded?: boolean;
}

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

function shortWallet(w: string): string {
  if (w.startsWith("0x") && w.length > 10) return `${w.slice(0, 6)}…${w.slice(-4)}`;
  return w;
}

const MAX_COMMENTS = 3;

export function CommentsPanel({
  artworkId,
  contentId,
  comments,
  onClose,
  onSubmitComment,
  onNewComment,
  walletDisplay,
  embedded = false,
}: CommentsPanelProps) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Count how many comments current wallet has already made
  const myCommentCount = walletDisplay
    ? comments.filter((c) => c.wallet === walletDisplay || shortWallet(c.wallet) === walletDisplay).length
    : 0;
  const canComment = !!walletDisplay && myCommentCount < MAX_COMMENTS;
  const remaining = MAX_COMMENTS - myCommentCount;

  useEffect(() => {
    if (!onNewComment || !contentId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`comments:${contentId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "comments", filter: `content_id=eq.${contentId}` },
        (payload) => {
          const r = payload.new as { id: string; wallet: string; text: string; created_at: string };
          onNewComment({ id: r.id, wallet: r.wallet, text: r.text, created_at: r.created_at });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [contentId, onNewComment]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || loading) return;
    setSubmitError("");
    setLoading(true);
    try {
      await onSubmitComment(text.trim());
      setText("");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to send comment.");
    } finally {
      setLoading(false);
    }
  };

  const sheet = (
    <motion.div
      initial={embedded ? false : { y: "100%", opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={embedded ? undefined : { y: "100%", opacity: 0 }}
      transition={{ type: "spring", damping: 32, stiffness: 320 }}
      className="relative w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl flex flex-col"
      style={{
        background: "#131115",
        border: "1px solid rgba(255,255,255,0.08)",
        maxHeight: embedded ? "none" : "78vh",
      }}
    >
      {!embedded && (
        <>
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-8 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }} />
          </div>
        </>
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-5 pb-3 border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-[#D27A92]" />
              <span className="font-semibold text-white/80 text-sm">
                Comments <span className="text-white/30 font-normal">({comments.length})</span>
              </span>
            </div>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full transition-colors"
              style={{ background: "rgba(255,255,255,0.07)" }}
            >
              <X className="w-4 h-4 text-white/60" />
            </motion.button>
          </div>

      {/* Comment list */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {comments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                <MessageCircle className="w-8 h-8 text-white/15" />
                <p className="text-white/30 text-sm">No comments yet. Be the first!</p>
              </div>
            ) : (
              comments.map((c) => (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-3"
                >
                  {/* Avatar */}
                  <div
                    className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-[11px] font-bold"
                    style={{ background: "rgba(210,122,146,0.2)", color: "#D27A92" }}
                  >
                    {shortWallet(c.wallet).slice(2, 4).toUpperCase()}
                  </div>
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 mb-0.5">
                      <span className="text-white/55 text-xs font-medium font-mono">{shortWallet(c.wallet)}</span>
                      <span className="text-white/20 text-[10px]">{timeAgo(c.created_at)}</span>
                    </div>
                    <p className="text-white/80 text-sm leading-relaxed" style={{ wordBreak: "break-word" }}>
                      {c.text}
                    </p>
                  </div>
                </motion.div>
              ))
            )}
          </div>

          {/* Input area */}
          <div className="px-4 py-3 border-t" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
            {walletDisplay ? (
              <>
                {/* Limit indicator */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white/25 text-[11px] font-mono">{shortWallet(walletDisplay)}</span>
                  <span
                    className="text-[11px]"
                    style={{ color: remaining === 0 ? "rgba(239,68,68,0.8)" : "rgba(255,255,255,0.25)" }}
                  >
                    {remaining === 0 ? "Comment limit reached" : `${remaining} comment${remaining === 1 ? "" : "s"} left`}
                  </span>
                </div>

                {submitError && (
                  <p className="text-red-400 text-xs mb-2">{submitError}</p>
                )}

                <form onSubmit={handleSubmit} className="flex gap-2">
                  <input
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    disabled={!canComment || loading}
                    placeholder={canComment ? "Write a comment… emoji supported 🌸" : "Comment limit reached"}
                    maxLength={280}
                    className="flex-1 rounded-xl px-4 py-2.5 text-sm outline-none transition-all disabled:opacity-40"
                    style={{
                      background: "rgba(255,255,255,0.07)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "rgba(255,255,255,0.85)",
                    }}
                  />
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    type="submit"
                    disabled={!text.trim() || loading || !canComment}
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-35"
                    style={{ background: "rgba(210,122,146,0.25)", border: "1px solid rgba(210,122,146,0.4)" }}
                  >
                    <Send className="w-4 h-4 text-[#D27A92]" />
                  </motion.button>
                </form>
              </>
            ) : (
              <p className="text-center text-white/30 text-sm py-2">
                Connect wallet to comment.
              </p>
            )}
          </div>
    </motion.div>
  );

  if (embedded) {
    return sheet;
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0"
          style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)" }}
        />
        {sheet}
      </div>
    </AnimatePresence>
  );
}
