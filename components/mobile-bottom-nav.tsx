"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, User, Wallet, MessageCircle } from "lucide-react";
import { ConnectButton } from "@/components/connect-button";

const navItems = [
  { href: "/feed", label: "Feed", icon: Home },
  { href: "/profile", label: "Profile", icon: User },
] as const;

type MobileBottomNavProps = {
  /** When provided, Message Nixie button opens the DM modal. Otherwise links to /profile?openDm=1 */
  onMessageNixieClick?: () => void;
};

export function MobileBottomNav({ onMessageNixieClick }: MobileBottomNavProps) {
  const pathname = usePathname();
  const [walletOpen, setWalletOpen] = useState(false);
  const walletRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (walletRef.current && !walletRef.current.contains(e.target as Node)) setWalletOpen(false);
    }
    if (walletOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [walletOpen]);

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-white/[0.08] bg-anime-night/95 backdrop-blur-xl safe-area-pb"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 8px)" }}
    >
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
        <div className="relative flex-1 flex flex-col items-center justify-center py-2" ref={walletRef}>
          <button
            type="button"
            onClick={() => setWalletOpen((o) => !o)}
            className={`flex flex-col items-center justify-center gap-0.5 transition-colors ${
              walletOpen ? "text-anime-pink" : "text-white/50 hover:text-white/80"
            }`}
            aria-label="Wallet"
          >
            <Wallet className="w-6 h-6" strokeWidth={walletOpen ? 2.2 : 1.8} />
            <span className="text-[10px] font-medium">Wallet</span>
          </button>
          {walletOpen && (
            <div className="absolute left-1/2 bottom-full mb-2 -translate-x-1/2 w-[calc(100vw-2rem)] max-w-[280px] py-2 px-2 rounded-xl shadow-xl border border-white/10 bg-anime-night/98 backdrop-blur-xl z-50">
              <ConnectButton />
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
