import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { createPublicClient, formatUnits, http } from "viem";
import { erc20BalanceOfAbi } from "@/lib/abi/access";
import { ROBINHOOD_RPC_URL, robinhoodMainnet } from "@/lib/robinhood-chain";

export const revalidate = 1800;

const NIX_TOKEN = "0x41b24bb02b0884b3b696f1a4e7c4bc3d4a31fc8f" as const;
const BURN_ADDRESS = "0x000000000000000000000000000000000000dEaD" as const;

function compactNix(value: bigint) {
  const amount = Number(formatUnits(value, 18));
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: amount >= 1_000_000 ? 1 : 0,
  }).format(amount);
}

const getBurnedNix = unstable_cache(
  async () => {
    const client = createPublicClient({ chain: robinhoodMainnet, transport: http(ROBINHOOD_RPC_URL) });
    const balance = await client.readContract({
      address: NIX_TOKEN,
      abi: erc20BalanceOfAbi,
      functionName: "balanceOf",
      args: [BURN_ADDRESS],
    });
    return { amount: compactNix(balance), updatedAt: Date.now() };
  },
  ["nix-burned-balance-v1"],
  { revalidate: 1800 },
);

export async function GET() {
  try {
    return NextResponse.json(await getBurnedNix(), {
      headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=300" },
    });
  } catch {
    return NextResponse.json({ error: "Unable to load burn balance" }, { status: 503 });
  }
}
