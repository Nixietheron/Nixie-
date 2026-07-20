import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http, isAddress, keccak256, parseUnits, stringToHex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { randomUUID } from "crypto";
import {
  NIXIE_DEXSCREENER_PAIR,
  NIXIE_GENESIS_ADDRESS,
  NIXIE_MAX_PER_WALLET,
  NIXIE_MAX_PRICE_CHANGE_5M_PERCENT,
  NIXIE_MAX_PRICE_USD,
  NIXIE_MIN_LIQUIDITY_USD,
  NIXIE_TOKEN_ADDRESS,
  NIXIE_USD_PRICE,
} from "@/lib/nft-collection";
import { ROBINHOOD_CHAIN_ID, robinhoodMainnet } from "@/lib/robinhood-chain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const QUOTE_SECONDS = 180;
const RATE_WINDOW_MS = 60_000;

type DexPair = {
  baseToken?: { address?: string };
  priceUsd?: string;
  liquidity?: { usd?: number };
  priceChange?: { m5?: number };
};
const saleSecurityAbi = [
  { name: "priceSigner", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { name: "owner", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { name: "treasury", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
] as const;
const quoteRateLimits = new Map<string, { count: number; resetAt: number }>();

function rateLimitKey(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

function canIssueQuote(request: NextRequest) {
  const now = Date.now();
  const key = rateLimitKey(request);
  const configuredLimit = Number(process.env.NIXIE_QUOTE_RATE_LIMIT_PER_MINUTE || "20");
  const limit = Number.isInteger(configuredLimit) && configuredLimit > 0 && configuredLimit <= 100 ? configuredLimit : 20;
  if (quoteRateLimits.size > 5_000) quoteRateLimits.clear();
  const current = quoteRateLimits.get(key);
  if (!current || current.resetAt <= now) {
    quoteRateLimits.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (current.count >= limit) return false;
  ++current.count;
  return true;
}

function requiredNixAmount(priceUsd: string) {
  const nixUsd = parseUnits(priceUsd, 18);
  if (nixUsd <= BigInt(0)) throw new Error("Market returned an invalid NIX price");
  const targetUsd = parseUnits(String(NIXIE_USD_PRICE), 18);
  const nixDecimals = BigInt(10) ** BigInt(18);
  return (targetUsd * nixDecimals + nixUsd - BigInt(1)) / nixUsd;
}

const v3PoolAbi = [
  {
    name: "slot0",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "sqrtPriceX96", type: "uint160" },
      { name: "tick", type: "int24" },
      { name: "observationIndex", type: "uint16" },
      { name: "observationCardinality", type: "uint16" },
      { name: "observationCardinalityNext", type: "uint16" },
      { name: "feeProtocol", type: "uint8" },
      { name: "unlocked", type: "bool" },
    ],
  },
  { name: "liquidity", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint128" }] },
] as const;

async function resolveNixMarketPrice(client: ReturnType<typeof createPublicClient>) {
  const [dex, fallback] = await Promise.allSettled([
    fetch(`https://api.dexscreener.com/latest/dex/pairs/robinhood/${NIXIE_DEXSCREENER_PAIR}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    }).then(async (response) => {
      if (!response.ok) throw new Error("Dexscreener price service is unavailable");
      const payload = await response.json() as { pairs?: DexPair[] | null; pair?: DexPair | null };
      const pairs = payload.pairs ?? (payload.pair ? [payload.pair] : []);
      const pair = pairs.find((item) => item.baseToken?.address?.toLowerCase() === NIXIE_TOKEN_ADDRESS.toLowerCase());
      const liquidity = pair?.liquidity?.usd;
      const livePrice = Number(pair?.priceUsd);
      if (!pair?.priceUsd || !Number.isFinite(livePrice) || livePrice <= 0 || !Number.isFinite(liquidity)) {
        throw new Error("Dexscreener did not return the NIX pair");
      }
      return {
        priceUsd: pair.priceUsd,
        liquidityUsd: liquidity!,
        fiveMinuteMove: Number(pair.priceChange?.m5),
        source: "dexscreener" as const,
      };
    }),
    (async () => {
      const [slot0, poolLiquidity, ethUsdPayload] = await Promise.all([
        client.readContract({ address: NIXIE_DEXSCREENER_PAIR, abi: v3PoolAbi, functionName: "slot0" }),
        client.readContract({ address: NIXIE_DEXSCREENER_PAIR, abi: v3PoolAbi, functionName: "liquidity" }),
        fetch("https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd", {
          cache: "no-store",
          signal: AbortSignal.timeout(8_000),
        }).then((response) => response.json() as Promise<{ ethereum?: { usd?: number } }>),
      ]);
      const sqrtPriceX96 = slot0[0];
      const q192 = BigInt(2) ** BigInt(192);
      const precision = BigInt(10) ** BigInt(18);
      const nixPerEth = (sqrtPriceX96 * sqrtPriceX96 * precision) / q192;
      const ethUsd = Number(ethUsdPayload.ethereum?.usd);
      if (nixPerEth <= BigInt(0) || poolLiquidity <= BigInt(0) || !Number.isFinite(ethUsd) || ethUsd <= 0) {
        throw new Error("On-chain NIX pool price is unavailable");
      }
      const nixPerEthFloat = Number(nixPerEth) / 1e18;
      const priceUsd = ethUsd / nixPerEthFloat;
      if (!Number.isFinite(priceUsd) || priceUsd <= 0) throw new Error("On-chain NIX pool price is invalid");
      return {
        priceUsd: priceUsd.toFixed(18).replace(/0+$/, "").replace(/\.$/, ""),
        liquidityUsd: NIXIE_MIN_LIQUIDITY_USD,
        fiveMinuteMove: Number.NaN,
        source: "onchain-pool" as const,
      };
    })(),
  ]);

  if (dex.status === "fulfilled") return dex.value;
  if (fallback.status === "fulfilled") return fallback.value;
  throw new Error(dex.reason instanceof Error ? dex.reason.message : "NIX market price is unavailable");
}

export async function POST(request: NextRequest) {
  try {
    if (!canIssueQuote(request)) {
      return NextResponse.json({ error: "Too many quote requests. Please wait one minute." }, { status: 429 });
    }
    const { wallet, quantity } = await request.json() as { wallet?: string; quantity?: number };
    if (!wallet || !isAddress(wallet) || !Number.isInteger(quantity) || !quantity || quantity < 1 || quantity > NIXIE_MAX_PER_WALLET) {
      return NextResponse.json({ error: "A valid wallet and mint quantity between 1 and 3 are required." }, { status: 400 });
    }

    const contractAddress = process.env.NEXT_PUBLIC_NIXIE_NFT_ADDRESS || NIXIE_GENESIS_ADDRESS;
    const signerKey = process.env.NIXIE_PRICE_SIGNER_PRIVATE_KEY as `0x${string}` | undefined;
    if (!contractAddress || !isAddress(contractAddress) || !signerKey || !/^0x[0-9a-fA-F]{64}$/.test(signerKey)) {
      return NextResponse.json({ error: "NFT sale quote service is not configured yet." }, { status: 503 });
    }

    const account = privateKeyToAccount(signerKey);
    const client = createPublicClient({ chain: robinhoodMainnet, transport: http() });
    const saleAddress = contractAddress as `0x${string}`;
    const [market, onchainSigner, owner, treasury] = await Promise.all([
      resolveNixMarketPrice(client),
      client.readContract({ address: saleAddress, abi: saleSecurityAbi, functionName: "priceSigner" }),
      client.readContract({ address: saleAddress, abi: saleSecurityAbi, functionName: "owner" }),
      client.readContract({ address: saleAddress, abi: saleSecurityAbi, functionName: "treasury" }),
    ]);
    if (onchainSigner.toLowerCase() !== account.address.toLowerCase()) {
      throw new Error("Configured quote signer does not match the sale contract");
    }
    if ([owner, treasury].some((address) => address.toLowerCase() === account.address.toLowerCase())) {
      throw new Error("Quote signer must be isolated from owner and treasury keys");
    }
    const liquidity = market.liquidityUsd;
    const livePrice = Number(market.priceUsd);
    const configuredMaxAcceptedPrice = Number(process.env.NIXIE_MAX_NIX_PRICE_USD || NIXIE_MAX_PRICE_USD);
    const maxAcceptedPrice = Number.isFinite(configuredMaxAcceptedPrice) && configuredMaxAcceptedPrice > 0
      ? configuredMaxAcceptedPrice
      : NIXIE_MAX_PRICE_USD;
    const configuredMinLiquidity = Number(process.env.NIXIE_MIN_LIQUIDITY_USD || NIXIE_MIN_LIQUIDITY_USD);
    const minLiquidity = Number.isFinite(configuredMinLiquidity) && configuredMinLiquidity > 0
      ? configuredMinLiquidity
      : NIXIE_MIN_LIQUIDITY_USD;
    if (!Number.isFinite(liquidity) || liquidity < minLiquidity) {
      throw new Error("NIX market liquidity is currently below the mint safety threshold");
    }
    if (!Number.isFinite(livePrice) || livePrice <= 0 || livePrice > maxAcceptedPrice) {
      throw new Error("NIX price moved above the mint safety ceiling; minting is temporarily paused");
    }
    const maxFiveMinuteMove = Number(process.env.NIXIE_MAX_PRICE_CHANGE_5M_PERCENT || NIXIE_MAX_PRICE_CHANGE_5M_PERCENT);
    const fiveMinuteMove = Number(market.fiveMinuteMove);
    if (
      Number.isFinite(fiveMinuteMove) &&
      Number.isFinite(maxFiveMinuteMove) &&
      maxFiveMinuteMove > 0 &&
      Math.abs(fiveMinuteMove) > maxFiveMinuteMove
    ) {
      throw new Error("NIX price is moving too quickly; minting is temporarily paused");
    }

    const nixAmount = requiredNixAmount(market.priceUsd) * BigInt(quantity);
    const minimumAmountAtSafetyCeiling = requiredNixAmount(String(maxAcceptedPrice)) * BigInt(quantity);
    if (nixAmount < minimumAmountAtSafetyCeiling) {
      throw new Error("Quote amount is below the configured economic safety floor");
    }
    const deadline = BigInt(Math.floor(Date.now() / 1000) + QUOTE_SECONDS);
    const nonce = BigInt(keccak256(stringToHex(`${wallet.toLowerCase()}:${quantity}:${randomUUID()}`)));
    const message = { buyer: wallet as `0x${string}`, quantity: BigInt(quantity), nixAmount, nonce, deadline };
    const signature = await account.signTypedData({
      domain: { name: "Nixie Genesis", version: "1", chainId: ROBINHOOD_CHAIN_ID, verifyingContract: contractAddress as `0x${string}` },
      types: { MintQuote: [{ name: "buyer", type: "address" }, { name: "quantity", type: "uint256" }, { name: "nixAmount", type: "uint256" }, { name: "nonce", type: "uint256" }, { name: "deadline", type: "uint256" }] },
      primaryType: "MintQuote",
      message,
    });

    return NextResponse.json({
      quote: { buyer: wallet, quantity, nixAmount: nixAmount.toString(), nonce: nonce.toString(), deadline: deadline.toString() },
      signature,
      priceUsd: market.priceUsd,
      liquidityUsd: liquidity,
      priceSource: market.source,
      expiresAt: Number(deadline) * 1000,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[nft/quote] quote issuance failed:", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Live mint pricing is temporarily unavailable." }, { status: 503 });
  }
}
