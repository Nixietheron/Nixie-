"use client";

import { WalletCards } from "lucide-react";
import { useAccount } from "wagmi";
import { useAccountModal, useConnectModal } from "@rainbow-me/rainbowkit";

export function NftWalletButton() {
  const { address, isConnected } = useAccount();
  const { openAccountModal } = useAccountModal();
  const { openConnectModal } = useConnectModal();
  const label = address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "Connect wallet";

  return (
    <button
      type="button"
      onClick={() => isConnected ? openAccountModal?.() : openConnectModal?.()}
      className="flex items-center gap-2 rounded-full bg-[#d7ff00] px-3.5 py-2.5 text-[10px] font-black uppercase tracking-wider text-black transition hover:scale-[1.02] hover:bg-white sm:px-4"
      aria-label={isConnected ? `Connected wallet ${label}` : "Connect wallet"}
    >
      <WalletCards className="h-3.5 w-3.5" />
      <span>{label}</span>
    </button>
  );
}
