import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http, isAddress, keccak256, parseUnits, stringToHex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { randomUUID } from "crypto";
import { NIXIE_MAX_PER_WALLET, NIXIE_USD_PRICE } from "@/lib/nft-collection";
import { ROBINHOOD_CHAIN_ID, robinhoodMainnet } from "@/lib/robinhood-chain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NIX_TOKEN = "0x41b24bb02b0884b3b696f1a4e7c4bc3d4a31fc8f";
const PAIR = "0x74A2e6bFC4507F68b4c98104722192597b71715A";
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
  if (nixUsd <= BigInt(0)) throw new Error("Dexscreener returned an invalid NIX price");
  const targetUsd = parseUnits(String(NIXIE_USD_PRICE), 18);
  const nixDecimals = BigInt(10) ** BigInt(18);
  return (targetUsd * nixDecimals + nixUsd - BigInt(1)) / nixUsd;
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

    const contractAddress = process.env.NEXT_PUBLIC_NIXIE_NFT_ADDRESS;
    const signerKey = process.env.NIXIE_PRICE_SIGNER_PRIVATE_KEY as `0x${string}` | undefined;
    if (!contractAddress || !isAddress(contractAddress) || !signerKey || !/^0x[0-9a-fA-F]{64}$/.test(signerKey)) {
      return NextResponse.json({ error: "NFT sale quote service is not configured yet." }, { status: 503 });
    }

    const account = privateKeyToAccount(signerKey);
    const client = createPublicClient({ chain: robinhoodMainnet, transport: http() });
    const saleAddress = contractAddress as `0x${string}`;
    const [response, onchainSigner, owner, treasury] = await Promise.all([
      fetch(`https://api.dexscreener.com/latest/dex/pairs/robinhood/${PAIR}`, {
        cache: "no-store",
        signal: AbortSignal.timeout(8_000),
      }),
      client.readContract({ address: saleAddress, abi: saleSecurityAbi, functionName: "priceSigner" }),
      client.readContract({ address: saleAddress, abi: saleSecurityAbi, functionName: "owner" }),
      client.readContract({ address: saleAddress, abi: saleSecurityAbi, functionName: "treasury" }),
    ]);
    if (!response.ok) throw new Error("Dexscreener price service is unavailable");
    if (onchainSigner.toLowerCase() !== account.address.toLowerCase()) {
      throw new Error("Configured quote signer does not match the sale contract");
    }
    if ([owner, treasury].some((address) => address.toLowerCase() === account.address.toLowerCase())) {
      throw new Error("Quote signer must be isolated from owner and treasury keys");
    }
    const payload = await response.json() as { pairs?: DexPair[] };
    const pair = payload.pairs?.find((item) => item.baseToken?.address?.toLowerCase() === NIX_TOKEN.toLowerCase());
    const liquidity = pair?.liquidity?.usd;
    const livePrice = Number(pair?.priceUsd);
    const maxAcceptedPrice = Number(process.env.NIXIE_MAX_NIX_PRICE_USD);
    if (!Number.isFinite(maxAcceptedPrice) || maxAcceptedPrice <= 0) {
      throw new Error("NIX mint price safety ceiling is not configured");
    }
    if (!pair?.priceUsd || !Number.isFinite(liquidity) || liquidity! < Number(process.env.NIXIE_MIN_LIQUIDITY_USD || "1000")) {
      throw new Error("NIX market liquidity is currently below the mint safety threshold");
    }
    if (!Number.isFinite(livePrice) || livePrice <= 0 || livePrice > maxAcceptedPrice) {
      throw new Error("NIX price moved above the mint safety ceiling; minting is temporarily paused");
    }
    const maxFiveMinuteMove = Number(process.env.NIXIE_MAX_PRICE_CHANGE_5M_PERCENT || "25");
    const fiveMinuteMove = Number(pair.priceChange?.m5);
    if (
      Number.isFinite(fiveMinuteMove) &&
      Number.isFinite(maxFiveMinuteMove) &&
      maxFiveMinuteMove > 0 &&
      Math.abs(fiveMinuteMove) > maxFiveMinuteMove
    ) {
      throw new Error("NIX price is moving too quickly; minting is temporarily paused");
    }

    const nixAmount = requiredNixAmount(pair.priceUsd) * BigInt(quantity);
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
      priceUsd: pair.priceUsd,
      liquidityUsd: liquidity,
      expiresAt: Number(deadline) * 1000,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[nft/quote] quote issuance failed:", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Live mint pricing is temporarily unavailable." }, { status: 503 });
  }
}
