"use client";

import { motion, AnimatePresence } from "motion/react";
import Link from "next/link";
import { ArrowRight, ExternalLink, Flame, Mail, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";
import { useAccount, useDisconnect } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { SITE } from "@/lib/site";
import { TelegramLogo } from "@/components/icons/telegram-logo";
import { NIXIE_DEXSCREENER_URL, NIXIE_UNISWAP_BUY_URL } from "@/lib/nft-collection";

/** Landing hero: one artwork per column (left → right). */
const HERO_IMAGES = [
  "/nixie2.webp",
  "/nixie3.webp",
  "/nixie4.webp",
  "/nixie5.webp",
  "/nixie6.webp",
] as const;

const BUY_NIX_URL = NIXIE_UNISWAP_BUY_URL;
const DEXSCREENER_URL = NIXIE_DEXSCREENER_URL;

export default function SplashScreen() {
  const [ready, setReady] = useState(false);
  const [burnedNix, setBurnedNix] = useState<string | null>(null);
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { openConnectModal } = useConnectModal();
  const shortAddress = address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "";

  const disconnectWallet = () => {
    void fetch("/api/auth/logout", { method: "POST", credentials: "include", keepalive: true });
    disconnect();
  };

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 100);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadBurnedNix = async () => {
      try {
        const response = await fetch("/api/token/burned", { cache: "no-store" });
        const data = await response.json().catch(() => ({}));
        if (response.ok && typeof data.amount === "string" && !cancelled) setBurnedNix(data.amount);
      } catch {
        // The header remains compact and simply hides the counter if the RPC is temporarily unavailable.
      }
    };
    void loadBurnedNix();
    const interval = window.setInterval(loadBurnedNix, 30 * 60 * 1000);
    return () => { cancelled = true; window.clearInterval(interval); };
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
              className="absolute inset-0 bg-cover bg-no-repeat"
              style={{
                backgroundImage: `url(${src})`,
                backgroundPosition: "center calc(50% + 70px)",
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
                  "linear-gradient(180deg, rgba(215,255,0,0.08) 0%, transparent 60%)",
              }}
            />
            {i < 4 && (
              <div
                className="absolute top-0 right-0 bottom-0 w-px"
                style={{ background: "rgba(215,255,0,0.2)" }}
              />
            )}
          </motion.div>
        ))}

        {/* Structured read zone: deep left gradient, subtle edge vignette. */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(90deg, rgba(7,6,9,0.96) 0%, rgba(7,6,9,0.78) 22%, rgba(7,6,9,0.16) 48%, transparent 70%, rgba(7,6,9,0.2) 100%)",
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
          className="fixed top-0 left-0 right-0 z-40 border-b border-white/[0.08] bg-[#09070d]/80 px-6 py-3.5 backdrop-blur-2xl sm:px-10 lg:px-16 xl:px-24"
        >
          <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-6">
            <Link href="/" className="flex shrink-0 items-center gap-3" aria-label="Nixie home">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#D7FF00] text-sm font-black text-[#09070d]">N</span>
              <span className="hidden text-xs font-bold uppercase tracking-[0.22em] text-white/80 sm:block">Nixie</span>
            </Link>

            <nav className="hidden items-center gap-7 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45 md:flex" aria-label="Primary navigation">
              <Link href="/museum" className="transition hover:text-white">Museum</Link>
              <Link href="/nft" className="transition hover:text-white">Genesis NFT</Link>
              <a href={BUY_NIX_URL} target="_blank" rel="noopener noreferrer" className="transition hover:text-white">Buy $NIX</a>
              <a href={DEXSCREENER_URL} target="_blank" rel="noopener noreferrer" className="transition hover:text-white">Market</a>
              <a href={SITE.xUrl} target="_blank" rel="noopener noreferrer" className="transition hover:text-white">X</a>
              <a href={SITE.telegramUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 transition hover:text-white">
                <TelegramLogo className="h-3.5 w-3.5" />
                TG
              </a>
            </nav>

            <div className="flex shrink-0 items-center gap-3">
              {!isConnected ? (
                <button type="button" onClick={() => openConnectModal?.()} className="rounded-full border border-[#D7FF00]/45 bg-[#D7FF00]/10 px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[#D7FF00] transition hover:bg-[#D7FF00]/20 sm:px-5">Connect wallet</button>
              ) : (
                <button type="button" onClick={disconnectWallet} title={`Disconnect ${address}`} className="rounded-full border border-white/15 bg-white/[0.06] px-4 py-2.5 text-[11px] font-semibold text-white/75 transition hover:border-red-300/40 hover:bg-red-300/10 hover:text-red-200 sm:px-5">{shortAddress}<span className="hidden sm:inline"> · Disconnect</span></button>
              )}
            </div>
          </div>
        </motion.div>

        <div className="flex-1 min-h-[20vh]" aria-hidden />

        {/* Main copy — bottom-aligned */}
        <div className="shrink-0 pb-12 sm:pb-16 max-w-xl lg:max-w-2xl">
          <AnimatePresence>
            {ready && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4, duration: 0.7 }}
                className="mb-5 flex items-center gap-3"
              >
                <div className="h-px w-10 shrink-0" style={{ background: "#D7FF00" }} />
                <span className="text-[#D7FF00] text-xs font-semibold tracking-[0.35em] uppercase">
                  Private digital universe
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
                className="mb-5 select-none font-black leading-[0.88] tracking-[-0.055em] text-white"
                style={{ fontSize: "clamp(4rem, 9vw, 7.5rem)" }}
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
                className="mb-7 max-w-lg text-base leading-[1.65] text-white/60 sm:text-[17px]"
              >
                Step into Nixie&apos;s private 3D museum—an evolving world of art, stories and holder-only experiences on Robinhood Mainnet.
              </motion.p>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {ready && (
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.63, duration: 0.65 }}
                className="mb-7 flex max-w-lg items-center gap-4 rounded-2xl border border-white/10 bg-black/45 px-4 py-3.5 backdrop-blur-xl"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#D7FF00] text-[#09070d]">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">Museum access</p>
                  <p className="mt-1 text-sm font-bold text-white sm:text-base">Hold 500K $NIX <span className="font-normal text-white/35">or</span> 1 Genesis NFT</p>
                </div>
                <span className="hidden rounded-full border border-[#D7FF00]/25 bg-[#D7FF00]/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#D7FF00] sm:block">Live</span>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {ready && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7, duration: 0.65 }}
                className="flex flex-col items-start gap-5"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <Link href="/museum" className="group inline-flex items-center gap-3 rounded-full bg-[#D7FF00] px-7 py-4 text-[14px] font-black uppercase tracking-[0.08em] text-[#09070d] shadow-[0_16px_50px_rgba(215,255,0,0.16)] transition hover:-translate-y-0.5 hover:brightness-105">
                    Enter museum
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                  <Link href="/nft" className="inline-flex items-center gap-2.5 rounded-full border border-white/20 bg-white/[0.06] px-7 py-4 text-[14px] font-bold uppercase tracking-[0.08em] text-white transition hover:-translate-y-0.5 hover:border-white/40 hover:bg-white/10">
                    Mint Genesis
                    <Sparkles className="h-4 w-4 text-[#D7FF00]" />
                  </Link>
                </div>

                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-semibold text-white/40">
                  <a href={BUY_NIX_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 transition hover:text-[#D7FF00]">Buy $NIX <ExternalLink className="h-3.5 w-3.5" /></a>
                  <span className="h-1 w-1 rounded-full bg-white/20" />
                  <a href={DEXSCREENER_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 transition hover:text-white">View market <ExternalLink className="h-3.5 w-3.5" /></a>
                  <span className="h-1 w-1 rounded-full bg-white/20" />
                  <a href={SITE.telegramUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 transition hover:text-[#D7FF00]"><TelegramLogo className="h-3.5 w-3.5" />Telegram</a>
                  {burnedNix && <><span className="hidden h-1 w-1 rounded-full bg-white/20 sm:block" /><span className="hidden items-center gap-1.5 sm:inline-flex"><Flame className="h-3.5 w-3.5 text-orange-400" />{burnedNix} $NIX burned</span></>}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      </div>

      {/* ═══════════════════════════════════
          Footer
      ════════════════════════════════════ */}
      <footer className="relative z-20 border-t border-[#D7FF00]/15 bg-[#060508] px-6 py-14 sm:px-10 lg:px-16 xl:px-24">
        <div className="mx-auto max-w-6xl grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-4 lg:gap-10">
          <div className="lg:col-span-1">
            <p className="text-white font-bold tracking-tight text-lg mb-3">{SITE.name}</p>
            <p className="text-white/45 text-sm leading-relaxed max-w-xs">
              A private 3D museum for Nixie token and NFT holders on Robinhood Mainnet.
            </p>
          </div>

          <div>
            <p className="text-[#D7FF00] text-[11px] font-semibold tracking-[0.2em] uppercase mb-4">
              Museum
            </p>
            <ul className="space-y-3 text-sm">
              <li>
                <Link href="/museum" className="text-white/60 hover:text-white transition-colors">
                  Enter Museum
                </Link>
              </li>
              <li>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-[#D7FF00] text-[11px] font-semibold tracking-[0.2em] uppercase mb-4">
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
            <p className="text-[#D7FF00] text-[11px] font-semibold tracking-[0.2em] uppercase mb-4">
              Contact
            </p>
            <ul className="space-y-3 text-sm">
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
                  href={SITE.telegramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-white/60 hover:text-white transition-colors"
                >
                  <TelegramLogo className="w-3.5 h-3.5 opacity-70" />
                  Telegram
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
            <span>Robinhood Mainnet</span>
          </span>
        </div>
      </footer>

    </div>
  );
}
