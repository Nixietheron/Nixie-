import { createPublicClient, http, isAddress, type Address } from "viem";
import { erc20BalanceOfAbi, erc721BalanceOfAbi } from "@/lib/abi/access";
import { robinhoodMainnet } from "@/lib/robinhood-chain";
import { ROBINHOOD_RPC_CONFIGURED } from "@/lib/robinhood-chain";

export type MuseumAccess =
  | { allowed: true; source: "token" | "nft" | "preview" }
  | { allowed: false; reason: "not-configured" | "network-not-configured" | "not-eligible" | "rpc-error" };

const tokenAddress = process.env.ROBINHOOD_TOKEN_ADDRESS;
const nftAddress = process.env.ROBINHOOD_NFT_ADDRESS;
const tokenDecimals = Number(process.env.ROBINHOOD_TOKEN_DECIMALS || "18");
const previewMode = process.env.MUSEUM_PREVIEW_MODE === "true";

function parseTokenAmount(value: string, decimals: number): bigint {
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 36) throw new Error("Invalid ROBINHOOD_TOKEN_DECIMALS");
  const normalized = value.trim();
  if (!/^\d+(?:\.\d+)?$/.test(normalized)) throw new Error("Invalid ROBINHOOD_MIN_TOKEN_AMOUNT");
  const [whole, fraction = ""] = normalized.split(".");
  if (fraction.length > decimals) throw new Error("ROBINHOOD_MIN_TOKEN_AMOUNT has too many decimal places");
  const unit = BigInt(`1${"0".repeat(decimals)}`);
  const fractionalUnits = decimals === 0 ? BigInt(0) : BigInt((fraction + "0".repeat(decimals)).slice(0, decimals));
  return BigInt(whole) * unit + fractionalUnits;
}

const minTokenBalance = parseTokenAmount(
  process.env.ROBINHOOD_MIN_TOKEN_AMOUNT || "500000",
  tokenDecimals
);

function validContract(value: string | undefined): value is Address {
  return Boolean(value && isAddress(value));
}

export async function getMuseumAccess(wallet?: string): Promise<MuseumAccess> {
  if (!validContract(tokenAddress) && !validContract(nftAddress)) {
    return previewMode
      ? { allowed: true, source: "preview" }
      : { allowed: false, reason: "not-configured" };
  }
  if (!wallet || !isAddress(wallet)) return { allowed: false, reason: "not-eligible" };
  if (!ROBINHOOD_RPC_CONFIGURED) return { allowed: false, reason: "network-not-configured" };

  const client = createPublicClient({ chain: robinhoodMainnet, transport: http() });
  try {
    const [tokenBalance, nftBalance] = await Promise.all([
      validContract(tokenAddress)
        ? client.readContract({ address: tokenAddress, abi: erc20BalanceOfAbi, functionName: "balanceOf", args: [wallet] })
        : Promise.resolve(BigInt(0)),
      validContract(nftAddress)
        ? client.readContract({ address: nftAddress, abi: erc721BalanceOfAbi, functionName: "balanceOf", args: [wallet] })
        : Promise.resolve(BigInt(0)),
    ]);
    if (tokenBalance >= minTokenBalance && validContract(tokenAddress)) return { allowed: true, source: "token" };
    if (nftBalance > BigInt(0) && validContract(nftAddress)) return { allowed: true, source: "nft" };
    return { allowed: false, reason: "not-eligible" };
  } catch (error) {
    console.error("[museum/access] ownership check failed", error);
    return { allowed: false, reason: "rpc-error" };
  }
}
