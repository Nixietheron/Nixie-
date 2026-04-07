import { Attribution } from "ox/erc8021";
import type { Hex } from "viem";

/** Base Builder Code — [Base Builder Codes](https://docs.base.org/base-chain/builder-codes/builder-codes) */
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
