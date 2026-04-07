import { Attribution } from "ox/erc8021";
import type { Hex } from "viem";

/** Default Base Builder Code (override with NEXT_PUBLIC_BASE_BUILDER_CODES). */
const DEFAULT_BUILDER_CODES = ["bc_dln6i1f5"] as const;

function builderCodesFromEnv(): readonly string[] {
  const raw = process.env.NEXT_PUBLIC_BASE_BUILDER_CODES?.trim();
  if (!raw) return DEFAULT_BUILDER_CODES;
  const parsed = raw
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);
  return parsed.length > 0 ? parsed : DEFAULT_BUILDER_CODES;
}

let cachedSuffix: Hex | undefined;

/**
 * ERC-8021 calldata suffix for [Base Builder Codes](https://docs.base.org/base-chain/builder-codes/builder-codes).
 * Append-only; contracts ignore trailing bytes. Use via viem `WalletClient` `dataSuffix`.
 */
export function getErc8021DataSuffix(): Hex {
  if (cachedSuffix) return cachedSuffix;
  const codes = builderCodesFromEnv();
  cachedSuffix = Attribution.toDataSuffix({ codes }) as Hex;
  return cachedSuffix;
}
