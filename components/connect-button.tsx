"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useMemo, useState, useRef, useEffect } from "react";
import { BASE_CHAIN_ID } from "@/lib/constants";
import { isBaseAppLike } from "@/lib/base-app-detect";

type OpenMenu = "evm" | "solana" | null;

export type ConnectButtonProps = {
  /** `sheet`: used inside mobile bottom sheet — no extra top margin, menus open downward */
  layout?: "default" | "sheet";
  /** Run before opening RainbowKit / Solana modals (e.g. close the host sheet) */
  onBeforeOpenWalletModal?: () => void;
};

export function ConnectButton({
  layout = "default",
  onBeforeOpenWalletModal,
}: ConnectButtonProps = {}) {
  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { connectAsync, connectors, status } = useConnect();
  const { disconnect: disconnectEvm } = useDisconnect();
  const solana = useWallet();
  const { setVisible: setSolanaModalVisible } = useWalletModal();
  const [open, setOpen] = useState<OpenMenu>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const inBaseApp = isBaseAppLike();
  const hasInjectedEvm =
    typeof window !== "undefined" &&
    (window as unknown as { ethereum?: unknown }).ethereum != null;

  const injectedConnector = useMemo(() => {
    const byId = connectors.find((c) => c.id === "injected");
    if (byId) return byId;
    return connectors.find((c) => c.name === "Injected");
  }, [connectors]);

  // Base App: use injected provider when the host injects one. Otherwise RainbowKit (user picks wallet).
  // Never auto-use Base Account connector — user chooses in the modal.
  const preferInjectedEvm =
    inBaseApp && hasInjectedEvm && !!injectedConnector;

  const sheet = layout === "sheet";
  const menuUp = !sheet;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(null);
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  const evmShort = address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "";
  const solanaShort =
    solana.publicKey
      ? `${solana.publicKey.toBase58().slice(0, 4)}…${solana.publicKey.toBase58().slice(-4)}`
      : "";

  const handleDisconnectEvm = () => {
    disconnectEvm();
    setOpen(null);
  };

  const handleDisconnectSolana = () => {
    solana.disconnect();
    setOpen(null);
  };

  const pillStyle = {
    background: "rgba(12,12,16,0.85)",
    border: "1px solid rgba(255,255,255,0.18)",
    color: "rgba(255,255,255,0.9)",
  };
  const dropdownStyle = {
    background: "#131115",
    border: "1px solid rgba(255,255,255,0.1)",
  };

  const dropPosition = menuUp
    ? "absolute left-0 right-0 bottom-full mb-1"
    : "absolute left-0 right-0 top-full mt-1";

  return (
    <div
      className={`flex flex-col gap-3 w-full min-w-0 ${sheet ? "" : "mt-4"}`}
      ref={menuRef}
    >
      {isConnected && address ? (
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen((o) => (o === "evm" ? null : "evm"))}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors w-full text-left"
            style={pillStyle}
          >
            <div className="w-5 h-5 rounded-full bg-anime-pink/50 flex-shrink-0" />
            <span className="font-mono truncate">{evmShort}</span>
            <span className="text-[10px] text-white/50 ml-auto flex-shrink-0">EVM</span>
          </button>
          {open === "evm" && (
            <div
              className={`${dropPosition} py-1 rounded-xl shadow-xl z-50 min-w-[140px]`}
              style={dropdownStyle}
            >
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleDisconnectEvm();
                }}
                className="w-full text-left px-4 py-2 text-sm text-white/80 hover:bg-white/5 transition-colors"
              >
                Disconnect EVM
              </button>
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={async () => {
            if (status === "pending") return;

            if (preferInjectedEvm && injectedConnector) {
              try {
                await connectAsync({
                  connector: injectedConnector,
                  chainId: BASE_CHAIN_ID,
                });
                return;
              } catch (e) {
                console.error("Injected EVM connect failed", e);
                return;
              }
            }

            onBeforeOpenWalletModal?.();
            openConnectModal?.();
          }}
          disabled={(!openConnectModal || status === "pending") && !preferInjectedEvm}
          className="px-3 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50 bg-anime-pink/20 border border-anime-pink/40 text-anime-pink hover:bg-anime-pink/30 hover:shadow-anime-soft w-full"
        >
          Connect EVM
        </button>
      )}

      {!inBaseApp &&
        (solana.connected && solana.publicKey ? (
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpen((o) => (o === "solana" ? null : "solana"))}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors w-full text-left"
              style={pillStyle}
            >
              <div className="w-5 h-5 rounded-full bg-[#9945FF]/50 flex-shrink-0" />
              <span className="font-mono truncate">{solanaShort}</span>
              <span className="text-[10px] text-white/50 ml-auto flex-shrink-0">SOL</span>
            </button>
            {open === "solana" && (
              <div
                className={`${dropPosition} py-1 rounded-xl shadow-xl z-50 min-w-[140px]`}
                style={dropdownStyle}
              >
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleDisconnectSolana();
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-white/80 hover:bg-white/5 transition-colors"
                >
                  Disconnect Solana
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              onBeforeOpenWalletModal?.();
              setSolanaModalVisible(true);
            }}
            className="px-3 py-2.5 rounded-xl text-sm font-medium transition-all bg-[#9945FF]/20 border border-[#9945FF]/40 text-[#9945FF] hover:bg-[#9945FF]/30 hover:shadow-md w-full"
          >
            Connect Solana
          </button>
        ))}
    </div>
  );
}
