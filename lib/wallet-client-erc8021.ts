"use client";

import { useMemo } from "react";
import { createWalletClient, type Transport } from "viem";
import { useWalletClient } from "wagmi";
import { getErc8021DataSuffix } from "@/lib/builder-code";

/**
 * Same as `useWalletClient`, but the returned client appends your Base Builder Code
 * (ERC-8021) to any transaction `data` via viem `dataSuffix`.
 *
 * Note: x402 “Exact” EVM payments use EIP-712 `signTypedData` only — no user-submitted
 * `eth_sendTransaction` for the authorization. Attribution for settlement txs is done by
 * the facilitator. This hook still ensures any future `sendTransaction` / `writeContract`
 * from this client (or integrations that use the same client) carry the suffix.
 */
export function useWalletClientWithErc8021() {
  const query = useWalletClient();
  const data = useMemo(() => {
    const wc = query.data;
    if (!wc?.account || !wc.chain || !wc.transport) return undefined;
    return createWalletClient({
      account: wc.account,
      chain: wc.chain,
      // Wagmi’s wallet transport is runtime-compatible with viem `Transport`.
      transport: wc.transport as unknown as Transport,
      dataSuffix: getErc8021DataSuffix(),
    });
  }, [query.data]);

  return { ...query, data };
}
