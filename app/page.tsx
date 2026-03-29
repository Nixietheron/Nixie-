"use client";

import { motion, AnimatePresence } from "motion/react";
import Link from "next/link";
import { ArrowRight, ArrowDown, ExternalLink, Mail } from "lucide-react";
import { useState, useEffect } from "react";
import { SITE } from "@/lib/site";

/** Landing hero: one artwork per column (left → right). */
const HERO_IMAGES = [
  "/Nixie1.png",
  "/Nixie2.png",
  "/Nixie3.png",
  "/Nixie4.png",
  "/Nixie5.png",
] as const;

export default function SplashScreen() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="w-full relative" style={{ background: "#0a080c" }}>

      {/* ═══════════════════════════════════
          HERO — full viewport, copy anchored bottom (artwork visible)
      ════════════════════════════════════ */}
      <div className="min-h-screen w-full relative overflow-hidden">

      <div className="absolute inset-0 flex gap-[2px]">
        {HERO_IMAGES.map((src, i) => (
          <motion.div
            key={src}
            className="relative overflow-hidden flex-1"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 * i, duration: 1, ease: [0.22, 1, 0.36, 1] }}
          >
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage: `url(${src})`,
                ...(i === 0
                  ? { filter: "brightness(1.18) contrast(1.06) saturate(1.05)" }
                  : {}),
              }}
            />
            <div
              className="absolute inset-0"
              style={{
                background: i === 0 ? "rgba(10,8,12,0.16)" : "rgba(10,8,12,0.30)",
              }}
            />
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

        {/* Light edge vignette only — no heavy left wash so figures stay visible */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(to right, rgba(10,8,12,0.28) 0%, transparent 28%, transparent 72%, rgba(10,8,12,0.2) 100%)",
          }}
        />

        {/* Bottom read zone — full width, lifts type without covering faces */}
        <div
          className="absolute bottom-0 left-0 right-0 pointer-events-none h-[min(52vh,520px)]"
          style={{
            background:
              "linear-gradient(to top, rgba(8,6,10,0.97) 0%, rgba(8,6,10,0.75) 38%, rgba(8,6,10,0.35) 65%, transparent 100%)",
          }}
        />

        <div
          className="absolute top-0 left-0 right-0 h-20 pointer-events-none"
          style={{
            background: "linear-gradient(to bottom, rgba(10,8,12,0.55) 0%, transparent 100%)",
          }}
        />
      </div>

      <div className="relative z-20 min-h-screen flex flex-col px-6 sm:px-10 lg:px-16 xl:px-24 w-full [text-shadow:0_2px_24px_rgba(0,0,0,0.75)]">

        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: ready ? 1 : 0, y: ready ? 0 : -16 }}
          transition={{ delay: 0.3, duration: 0.7 }}
          className="flex items-center justify-between shrink-0 pt-8 sm:pt-10"
        >
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#D27A92] animate-pulse" />
            <span className="text-white/45 text-xs tracking-[0.2em] uppercase font-medium">
              Nixie — Exclusive Art
            </span>
          </div>
        </motion.div>

        <div className="flex-1 min-h-[20vh]" aria-hidden />

        {/* Main copy — bottom-aligned */}
        <div className="shrink-0 pb-10 sm:pb-12 max-w-xl lg:max-w-2xl">
          <AnimatePresence>
            {ready && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4, duration: 0.7 }}
                className="flex items-center gap-3 mb-4"
              >
                <div className="h-px w-10 shrink-0" style={{ background: "#D27A92" }} />
                <span className="text-[#D27A92] text-xs font-semibold tracking-[0.35em] uppercase">
                  Anime Art Collection
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {ready && (
              <motion.h1
                initial={{ opacity: 0, y: 32 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45, duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
                className="font-black text-white leading-[0.9] tracking-[-0.03em] mb-4 select-none"
                style={{ fontSize: "clamp(2.75rem, 9vw, 5.5rem)" }}
              >
                Nixie
              </motion.h1>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {ready && (
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.58, duration: 0.75 }}
                className="text-white/60 text-base sm:text-[17px] leading-[1.65] mb-6 max-w-md"
              >
                I&apos;m Nixie — an anime-inspired digital character. Browse previews for free,
                then unlock the full artwork with USDC. Every drop is exclusive.
              </motion.p>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {ready && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.68, duration: 0.65 }}
                className="flex flex-wrap items-center gap-4"
              >
                <Link href="/feed">
                  <motion.button
                    whileHover={{ scale: 1.04, backgroundColor: "#fff" }}
                    whileTap={{ scale: 0.96 }}
                    className="group flex items-center gap-2.5 bg-white text-[#0a080c] font-bold text-[15px] px-7 py-3.5 rounded-2xl transition-all duration-200 shadow-lg shadow-black/30"
                  >
                    Enter Gallery
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </motion.button>
                </Link>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {ready && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.95, duration: 0.8 }}
                className="hidden sm:flex items-center gap-2 mt-8 text-white/25 text-xs"
              >
                <ArrowDown className="w-3.5 h-3.5" />
                <span>Scroll for site info</span>
                <div className="w-10 h-px bg-white/15" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      </div>

      {/* ═══════════════════════════════════
          Footer
      ════════════════════════════════════ */}
      <footer className="relative z-20 border-t border-[#D27A92]/15 bg-[#060508] px-6 py-14 sm:px-10 lg:px-16 xl:px-24">
        <div className="mx-auto max-w-6xl grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-4 lg:gap-10">
          <div className="lg:col-span-1">
            <p className="text-white font-bold tracking-tight text-lg mb-3">{SITE.name}</p>
            <p className="text-white/45 text-sm leading-relaxed max-w-xs">
              Exclusive anime art onchain. Previews are free; full pieces unlock with USDC on Base.
            </p>
          </div>

          <div>
            <p className="text-[#D27A92] text-[11px] font-semibold tracking-[0.2em] uppercase mb-4">
              Explore
            </p>
            <ul className="space-y-3 text-sm">
              <li>
                <Link href="/feed" className="text-white/60 hover:text-white transition-colors">
                  Gallery
                </Link>
              </li>
              <li>
                <Link href="/profile" className="text-white/60 hover:text-white transition-colors">
                  Profile
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-[#D27A92] text-[11px] font-semibold tracking-[0.2em] uppercase mb-4">
              Legal
            </p>
            <ul className="space-y-3 text-sm">
              <li>
                <Link href="/terms" className="text-white/60 hover:text-white transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-white/60 hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-[#D27A92] text-[11px] font-semibold tracking-[0.2em] uppercase mb-4">
              Community &amp; contact
            </p>
            <ul className="space-y-3 text-sm">
              <li>
                {SITE.baseAppUrl ? (
                  <a
                    href={SITE.baseAppUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-white/60 hover:text-white transition-colors"
                  >
                    Base App
                    <ExternalLink className="w-3.5 h-3.5 opacity-50" />
                  </a>
                ) : (
                  <span
                    className="inline-flex items-center gap-1.5 text-white/35"
                    title="Link will be added when the Base App integration is live"
                  >
                    Base App
                  </span>
                )}
              </li>
              <li>
                <a
                  href={SITE.xUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-white/60 hover:text-white transition-colors"
                >
                  X
                  <ExternalLink className="w-3.5 h-3.5 opacity-50" />
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${SITE.contactEmail}`}
                  className="inline-flex items-center gap-1.5 text-white/60 hover:text-white transition-colors"
                >
                  <Mail className="w-3.5 h-3.5 opacity-60" />
                  {SITE.contactEmail}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mx-auto max-w-6xl mt-14 pt-8 border-t border-white/[0.06] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-xs text-white/30">
          <span>© {new Date().getFullYear()} {SITE.name}. All rights reserved.</span>
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1 sm:justify-end">
            <span>Payments &amp; unlocks on Base</span>
            <span className="text-white/15" aria-hidden>
              ·
            </span>
            <span>USDC</span>
          </span>
        </div>
      </footer>

    </div>
  );
}
