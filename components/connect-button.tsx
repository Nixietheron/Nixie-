"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";
import { useState, useRef, useEffect } from "react";

export function ConnectButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  const short = address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "";

  if (isConnected && address) {
    return (
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors"
          style={{
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.12)",
            color: "rgba(255,255,255,0.9)",
          }}
        >
          <div className="w-6 h-6 rounded-full bg-anime-pink/50" />
          <span className="hidden sm:inline font-mono">{short}</span>
        </button>
        {open && (
          <div
            className="absolute right-0 top-full mt-1 py-1 rounded-xl shadow-xl z-50 min-w-[160px]"
            style={{
              background: "#131115",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <button
              type="button"
              onClick={() => { disconnect(); setOpen(false); }}
              className="w-full text-left px-4 py-2 text-sm text-white/80 hover:bg-white/5 transition-colors"
            >
              Disconnect
            </button>
          </div>
        )}
      </div>
    );
  }

  const injected = connectors.find((c) => c.id === "injected" || c.type === "injected");
  const connector = injected ?? connectors[0];

  return (
    <button
      type="button"
      onClick={() => connector && connect({ connector })}
      disabled={!connector || isPending}
      className="px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 bg-anime-pink/20 border border-anime-pink/40 text-anime-pink hover:bg-anime-pink/30 hover:shadow-anime-soft"
    >
      {isPending ? "Connecting…" : "Connect Wallet"}
    </button>
  );
}
