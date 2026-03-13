"use client";

import { motion, AnimatePresence } from "motion/react";
import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";
import { useState, useEffect } from "react";

// SFW panel images — will come from Supabase content table later
const PANELS = [
  "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=500&q=90",
  "https://images.unsplash.com/photo-1609220136736-443140cffec6?w=500&q=90",
  "https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=500&q=90",
  "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=500&q=90",
  "https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=500&q=90",
  "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=500&q=90",
];

export default function SplashScreen() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen w-full relative overflow-hidden" style={{ background: "#0a080c" }}>

      {/* ═══════════════════════════════════
          BACKGROUND — visible art panels
      ════════════════════════════════════ */}
      <div className="absolute inset-0 flex gap-[2px]">
        {PANELS.map((src, i) => (
          <motion.div
            key={i}
            className="relative overflow-hidden"
            style={{ flex: i === 2 ? "1.4" : "1" }}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: 0.08 * i,
              duration: 1.4,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            {/* Actual artwork */}
            <div
              className="absolute inset-0 bg-cover bg-center scale-[1.04] hover:scale-100 transition-transform duration-[3000ms]"
              style={{ backgroundImage: `url(${src})` }}
            />

            {/* Very light uniform tint so images remain visible */}
            <div className="absolute inset-0" style={{ background: "rgba(10,8,12,0.30)" }} />

            {/* Subtle pink tint hint */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(180deg, rgba(210,122,146,0.08) 0%, transparent 60%)",
              }}
            />

            {/* Thin separator line */}
            <div className="absolute top-0 right-0 bottom-0 w-px" style={{ background: "rgba(210,122,146,0.25)" }} />
          </motion.div>
        ))}

        {/* Left text-safe gradient */}
        <div
          className="absolute inset-y-0 left-0 pointer-events-none"
          style={{
            width: "52%",
            background:
              "linear-gradient(to right, rgba(10,8,12,0.97) 0%, rgba(10,8,12,0.92) 30%, rgba(10,8,12,0.70) 55%, transparent 100%)",
          }}
        />

        {/* Bottom vignette */}
        <div
          className="absolute bottom-0 left-0 right-0 h-48 pointer-events-none"
          style={{
            background: "linear-gradient(to top, rgba(10,8,12,0.8) 0%, transparent 100%)",
          }}
        />

        {/* Top vignette */}
        <div
          className="absolute top-0 left-0 right-0 h-24 pointer-events-none"
          style={{
            background: "linear-gradient(to bottom, rgba(10,8,12,0.6) 0%, transparent 100%)",
          }}
        />
      </div>

      {/* ═══════════════════════════════════
          FOREGROUND CONTENT (responsive: narrow on mobile, contained on web)
      ════════════════════════════════════ */}
      <div className="relative z-20 min-h-screen flex flex-col justify-between py-10 px-6 sm:px-10 lg:px-16 xl:px-24 w-full max-w-2xl lg:max-w-xl">

        {/* Top bar */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: ready ? 1 : 0, y: ready ? 0 : -16 }}
          transition={{ delay: 0.3, duration: 0.7 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#D27A92] animate-pulse" />
            <span className="text-white/40 text-xs tracking-[0.2em] uppercase font-medium">
              Nixie — Exclusive Art
            </span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 backdrop-blur-sm">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-white/50 text-xs">Base Network</span>
          </div>
        </motion.div>

        {/* Centre — main hero text */}
        <div className="flex flex-col max-w-xl">

          {/* Label */}
          <AnimatePresence>
            {ready && (
              <motion.div
                initial={{ opacity: 0, x: -24 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4, duration: 0.7 }}
                className="flex items-center gap-3 mb-5"
              >
                <div className="h-px w-10" style={{ background: "#D27A92" }} />
                <span className="text-[#D27A92] text-xs font-semibold tracking-[0.35em] uppercase">
                  Anime Art Collection
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Big title */}
          <AnimatePresence>
            {ready && (
              <motion.h1
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                className="font-black text-white leading-[0.88] tracking-[-0.03em] mb-6 select-none"
                style={{ fontSize: "clamp(4rem, 11vw, 8.5rem)" }}
              >
                Nixie
              </motion.h1>
            )}
          </AnimatePresence>

          {/* Tagline */}
          <AnimatePresence>
            {ready && (
              <motion.p
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.65, duration: 0.8 }}
                className="text-white/55 text-base sm:text-[17px] leading-[1.65] mb-8 max-w-sm"
              >
                I&apos;m Nixie — a digital anime artist. Browse SFW previews
                for free, then unlock the full artwork with USDC on Base.
                Every drop is exclusive.
              </motion.p>
            )}
          </AnimatePresence>

          {/* Stats row */}
          <AnimatePresence>
            {ready && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.75, duration: 0.7 }}
                className="flex items-center gap-6 mb-9"
              >
                {[
                  { value: "USDC", label: "Payment" },
                  { value: "IPFS", label: "Storage" },
                  { value: "Free", label: "Preview" },
                ].map((s) => (
                  <div key={s.label} className="flex flex-col">
                    <span className="text-white font-bold text-lg leading-none">{s.value}</span>
                    <span className="text-white/35 text-[11px] mt-1 tracking-wide">{s.label}</span>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* CTA buttons */}
          <AnimatePresence>
            {ready && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.85, duration: 0.7 }}
                className="flex items-center gap-3"
              >
                <Link href="/feed">
                  <motion.button
                    whileHover={{ scale: 1.04, backgroundColor: "#fff" }}
                    whileTap={{ scale: 0.96 }}
                    className="group flex items-center gap-2.5 bg-white text-[#0a080c] font-bold text-[15px] px-7 py-3.5 rounded-2xl transition-all duration-200"
                  >
                    Enter Gallery
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </motion.button>
                </Link>

                <Link href="/feed">
                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    className="flex items-center gap-2 px-6 py-3.5 rounded-2xl border border-white/15 text-white/60 hover:text-white hover:border-white/30 text-[15px] font-medium transition-all duration-200 backdrop-blur-sm"
                  >
                    <Sparkles className="w-4 h-4 text-[#D27A92]" />
                    Free Preview
                  </motion.button>
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom bar */}
        <AnimatePresence>
          {ready && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.1, duration: 0.9 }}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                {["Base", "x402", "IPFS", "USDC"].map((tag, i) => (
                  <span
                    key={tag}
                    className="text-[11px] text-white/25 border border-white/08 rounded-full px-3 py-1"
                    style={{ borderColor: "rgba(255,255,255,0.08)" }}
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div className="hidden sm:flex items-center gap-2 text-white/20 text-xs">
                <span>Scroll to explore</span>
                <div className="w-8 h-px bg-white/15" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Panel count badge (top-right on images) */}
      <AnimatePresence>
        {ready && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.2, duration: 0.6 }}
            className="absolute top-10 right-8 z-30 hidden sm:flex flex-col items-end gap-1"
          >
            <div
              className="px-3 py-1.5 rounded-xl backdrop-blur-md text-xs font-semibold text-[#D27A92]"
              style={{
                background: "rgba(210,122,146,0.12)",
                border: "1px solid rgba(210,122,146,0.25)",
              }}
            >
              SFW Preview
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
