"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccount } from "wagmi";
import { Home, User, Wallet, MessageCircle, X } from "lucide-react";
import { ConnectButton } from "@/components/connect-button";

const navItems = [
  { href: "/feed", label: "Feed", icon: Home },
  { href: "/profile", label: "Profile", icon: User },
] as const;

/** Height of bottom tab bar (h-14 = 3.5rem) — keep sheet above it */
const NAV_OFFSET = "3.5rem";

type MobileBottomNavProps = {
  /** When provided, Message Nixie button opens the DM modal. Otherwise links to /profile?openDm=1 */
  onMessageNixieClick?: () => void;
};

export function MobileBottomNav({ onMessageNixieClick }: MobileBottomNavProps) {
  const pathname = usePathname();
  const { isConnected, address } = useAccount();
  const [walletOpen, setWalletOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  /** Only close sheet when connection goes false → true (not when already connected and user opens sheet). */
  const wasConnectedRef = useRef(Boolean(isConnected && address));

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (walletOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [walletOpen]);

  useEffect(() => {
    const connected = Boolean(isConnected && address);
    if (connected && !wasConnectedRef.current && walletOpen) {
      setWalletOpen(false);
    }
    wasConnectedRef.current = connected;
  }, [isConnected, address, walletOpen]);

  useEffect(() => {
    if (!walletOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setWalletOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [walletOpen]);

  const sheet =
    mounted &&
    walletOpen &&
    createPortal(
      <>
        <button
          type="button"
          className="fixed inset-0 z-[100] bg-black/65 backdrop-blur-[2px] border-0 cursor-default"
          aria-label="Close wallet panel"
          onClick={() => setWalletOpen(false)}
        />
        <div
          className="fixed left-3 right-3 z-[101] max-h-[min(78vh,440px)] overflow-y-auto rounded-2xl border border-white/12 bg-[#0e0c10] shadow-[0_-8px_40px_rgba(0,0,0,0.55)] flex flex-col"
          style={{
            bottom: `calc(${NAV_OFFSET} + env(safe-area-inset-bottom, 0px))`,
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="wallet-sheet-title"
        >
          <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-2 border-b border-white/[0.06] shrink-0">
            <h2 id="wallet-sheet-title" className="text-base font-semibold text-white tracking-tight">
              Connect wallet
            </h2>
            <button
              type="button"
              onClick={() => setWalletOpen(false)}
              className="p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="px-4 pt-2 pb-1 text-xs text-white/40 leading-relaxed">
            Choose EVM (Base) or Solana. You’ll pick your wallet in the next step.
          </p>
          <div className="px-3 pb-4 pt-1">
            <ConnectButton
              layout="sheet"
              onBeforeOpenWalletModal={() => setWalletOpen(false)}
            />
          </div>
        </div>
      </>,
      document.body
    );

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-white/[0.08] bg-anime-night/95 backdrop-blur-xl safe-area-pb"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 8px)" }}
    >
      {sheet}
      <div className="flex items-center justify-around h-14">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-2 transition-colors ${
                isActive ? "text-anime-pink" : "text-white/50 hover:text-white/80"
              }`}
            >
              <Icon className="w-6 h-6" strokeWidth={isActive ? 2.2 : 1.8} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
        {onMessageNixieClick ? (
          <button
            type="button"
            onClick={onMessageNixieClick}
            className="flex flex-col items-center justify-center gap-0.5 flex-1 py-2 transition-colors text-white/50 hover:text-white/80"
            aria-label="Message Nixie"
          >
            <MessageCircle className="w-6 h-6" strokeWidth={1.8} />
            <span className="text-[10px] font-medium">Message</span>
          </button>
        ) : (
          <Link
            href="/profile?openDm=1"
            className="flex flex-col items-center justify-center gap-0.5 flex-1 py-2 transition-colors text-white/50 hover:text-white/80"
            aria-label="Message Nixie"
          >
            <MessageCircle className="w-6 h-6" strokeWidth={1.8} />
            <span className="text-[10px] font-medium">Message</span>
          </Link>
        )}
        <div className="relative flex-1 flex flex-col items-center justify-center py-2">
          <button
            type="button"
            onClick={() => setWalletOpen((o) => !o)}
            className={`flex flex-col items-center justify-center gap-0.5 transition-colors ${
              walletOpen ? "text-anime-pink" : "text-white/50 hover:text-white/80"
            }`}
            aria-expanded={walletOpen}
            aria-haspopup="dialog"
            aria-label="Wallet"
          >
            <Wallet className="w-6 h-6" strokeWidth={walletOpen ? 2.2 : 1.8} />
            <span className="text-[10px] font-medium">Wallet</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
