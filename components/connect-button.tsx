"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { ROBINHOOD_CHAIN_ID } from "@/lib/robinhood-chain";

export function ConnectButton() {
  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { connectAsync, connectors, status } = useConnect();
  const { disconnect } = useDisconnect();
  const shortAddress = address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "";

  if (isConnected && address) {
    return <button type="button" onClick={() => disconnect()} className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm font-medium text-white/85 hover:bg-white/10">{shortAddress} · Disconnect</button>;
  }

  return <button type="button" disabled={status === "pending"} onClick={async () => {
    const injectedConnector = connectors.find((connector) => connector.id === "injected");
    if (injectedConnector && typeof window !== "undefined" && (window as Window & { ethereum?: unknown }).ethereum) {
      await connectAsync({ connector: injectedConnector, chainId: ROBINHOOD_CHAIN_ID }).catch(() => undefined);
      return;
    }
    openConnectModal?.();
  }} className="w-full rounded-xl border border-anime-lime/40 bg-anime-lime/20 px-3 py-2.5 text-sm font-medium text-anime-lime hover:bg-anime-lime/30 disabled:opacity-50">Connect Robinhood Wallet</button>;
}
