"use client";

import { motion, AnimatePresence } from "motion/react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useState, useEffect } from "react";

const HERO_IMAGE = "/2026-03-15%2001.38.51.jpg";

export default function SplashScreen() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen w-full relative overflow-hidden" style={{ background: "#0a080c" }}>

      {/* ═══════════════════════════════════
          BACKGROUND — aynı foto 5 panel yan yana, aynı solukluk
      ════════════════════════════════════ */}
      <div className="absolute inset-0 flex gap-[2px]">
        {[0, 1, 2, 3, 4].map((i) => (
          <motion.div
            key={i}
            className="relative overflow-hidden flex-1"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 * i, duration: 1, ease: [0.22, 1, 0.36, 1] }}
          >
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${HERO_IMAGE})` }}
            />
            <div className="absolute inset-0" style={{ background: "rgba(10,8,12,0.30)" }} />
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(180deg, rgba(210,122,146,0.08) 0%, transparent 60%)",
              }}
            />
            {i < 4 && (
              <div
                className="absolute top-0 right-0 bottom-0 w-px"
                style={{ background: "rgba(210,122,146,0.2)" }}
              />
            )}
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
                I&apos;m Nixie — a digital anime artist. Browse previews for free,
                then unlock the full artwork with USDC. Every drop is exclusive.
              </motion.p>
            )}
          </AnimatePresence>

          {/* CTA — sadece Enter Gallery */}
          <AnimatePresence>
            {ready && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.75, duration: 0.7 }}
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
              transition={{ delay: 1, duration: 0.9 }}
              className="flex items-center justify-end"
            >
              <div className="hidden sm:flex items-center gap-2 text-white/20 text-xs">
                <span>Scroll to explore</span>
                <div className="w-8 h-px bg-white/15" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
}
