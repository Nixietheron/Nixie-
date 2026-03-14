"use client";

import { useEffect, useRef } from "react";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { BASE_CHAIN_ID } from "@/lib/constants";

/**
 * When EVM wallet connects, switch to Base if not already. Reset when user disconnects.
 */
export function SwitchToBaseEffect() {
  const chainId = useChainId();
  const { isConnected } = useAccount();
  const { switchChain } = useSwitchChain();
  const tried = useRef(false);

  useEffect(() => {
    if (!isConnected) {
      tried.current = false;
      return;
    }
    if (chainId === undefined || chainId === BASE_CHAIN_ID) return;
    if (tried.current) return;
    tried.current = true;
    switchChain({ chainId: BASE_CHAIN_ID });
  }, [isConnected, chainId, switchChain]);

  return null;
}
