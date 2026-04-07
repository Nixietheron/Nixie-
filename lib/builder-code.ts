/**
 * ERC-8021 suffix helper for [Base Builder Codes](https://docs.base.org/base-chain/builder-codes/builder-codes).
 * Not wired into `useWalletClient` yet: wrapping wagmi’s client with `createWalletClient({ dataSuffix })`
 * broke at runtime (`transport is not a function`). Re-integrate when using wagmi/viem’s supported API.
 */
import { Attribution } from "ox/erc8021";
import type { Hex } from "viem";

const BUILDER_CODES = ["bc_dln6i1f5"] as const;

let cachedSuffix: Hex | undefined;

/**
 * ERC-8021 calldata suffix. Append-only; contracts ignore trailing bytes.
 * Use via viem `WalletClient` `dataSuffix`.
 */
export function getErc8021DataSuffix(): Hex {
  if (cachedSuffix) return cachedSuffix;
  cachedSuffix = Attribution.toDataSuffix({ codes: [...BUILDER_CODES] }) as Hex;
  return cachedSuffix;
}
