import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, formatUnits, http, isAddress, zeroAddress, type Address } from "viem";
import { erc20TransferEventAbi } from "@/lib/abi/erc20";
import { ROBINHOOD_RPC_URL, robinhoodMainnet } from "@/lib/robinhood-chain";
import { createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STREAM_KEY = "nix-buy-alerts-v1";
const MAX_NOTIFICATIONS_PER_RUN = 30;
const NOXA_BUY_URL = "https://fun.noxa.fi/robinhood/token/0x41b24bb02b0884b3b696f1a4e7c4bc3d4a31fc8f";
const DEXSCREENER_URL = "https://dexscreener.com/robinhood/0x74a2e6bfc4507f68b4c98104722192597b71715a";

function delay(milliseconds: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}

function positiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function configuredPools(value: string | undefined): Address[] {
  const pools = (value || "").split(",").map((item) => item.trim()).filter(Boolean);
  if (!pools.length || pools.some((pool) => !isAddress(pool))) {
    throw new Error("NIX_BUY_POOL_ADDRESSES must contain one or more valid pool addresses");
  }
  return pools.map((pool) => pool.toLowerCase() as Address);
}

function shortAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function alertText(alert: { buyer_wallet: string; token_amount: string; transaction_hash: string }) {
  const symbol = process.env.NIX_TOKEN_SYMBOL || "NIX";
  const explorer = process.env.NEXT_PUBLIC_ROBINHOOD_EXPLORER_URL || "https://robinhoodchain.blockscout.com";
  const amount = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(Number(alert.token_amount));
  const buyerUrl = `${explorer}/address/${alert.buyer_wallet}`;
  const txUrl = `${explorer}/tx/${alert.transaction_hash}`;
  return `💚 <b>Nixie’s after-hours radar just lit up…</b>\n\n<b>${amount} ${symbol}</b> just turned up the heat.\n💋 <b>Buyer:</b> <a href="${buyerUrl}">${shortAddress(alert.buyer_wallet)}</a>\n✨ <b>Pair:</b> ${symbol}/WETH\n\n<i>Green candles look better after dark.</i>\n<a href="${txUrl}">View transaction</a>`;
}

function alertImageUrl() {
  if (process.env.NIX_BUY_ALERT_IMAGE_URL) return process.env.NIX_BUY_ALERT_IMAGE_URL;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://nixiepink.com";
  return `${appUrl.replace(/\/$/, "")}/nix-buy-alert.png`;
}

async function sendTelegramAlert(text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) throw new Error("TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID are required");

  const response = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      photo: alertImageUrl(),
      caption: text,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [
            { text: "Buy $NIX · Noxa", url: NOXA_BUY_URL },
            { text: "Chart · Dexscreener", url: DEXSCREENER_URL },
          ],
        ],
      },
    }),
  });
  if (!response.ok) throw new Error(`Telegram sendPhoto failed (${response.status})`);
}

function authorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret) && request.headers.get("authorization") === `Bearer ${secret}`;
}

function workerErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object") {
    const value = error as { message?: unknown; details?: unknown; hint?: unknown; code?: unknown };
    const details = [value.message, value.details, value.hint].filter((item): item is string => typeof item === "string" && item.length > 0);
    if (details.length) return details.join(" — ");
    if (typeof value.code === "string") return `Worker error (${value.code})`;
  }
  return "Buy-alert worker failed";
}

async function handleBuyAlerts(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const tokenAddress = process.env.ROBINHOOD_TOKEN_ADDRESS;
    if (!tokenAddress || !isAddress(tokenAddress)) throw new Error("ROBINHOOD_TOKEN_ADDRESS must be a valid NIX token address");

    const pools = configuredPools(process.env.NIX_BUY_POOL_ADDRESSES);
    const minAmount = Number(process.env.NIX_BUY_MIN_AMOUNT || "0");
    if (!Number.isFinite(minAmount) || minAmount < 0) throw new Error("NIX_BUY_MIN_AMOUNT must be zero or a positive number");

    const client = createPublicClient({ chain: robinhoodMainnet, transport: http(ROBINHOOD_RPC_URL) });
    const db = createAdminClient();
    const confirmations = positiveInteger(process.env.NIX_BUY_CONFIRMATIONS, 3);
    const maxBlockRange = positiveInteger(process.env.NIX_BUY_MAX_BLOCK_RANGE, 500);
    // Alchemy's free tier accepts eth_getLogs windows of at most 10 blocks.
    // Keep progress batching independent, so a delayed job can still catch up.
    const logBlockRange = positiveInteger(process.env.NIX_BUY_LOG_BLOCK_RANGE, 10);
    // Free RPC plans also cap requests per second. 500ms keeps catch-up traffic
    // below that limit while leaving enough headroom for a five-minute task.
    const logRequestDelay = positiveInteger(process.env.NIX_BUY_LOG_REQUEST_DELAY_MS, 500);
    const latestBlock = await client.getBlockNumber();
    const safeBlock = latestBlock > BigInt(confirmations) ? latestBlock - BigInt(confirmations) : BigInt(0);
    const { data: state, error: stateError } = await db
      .from("telegram_buy_alert_state")
      .select("last_processed_block")
      .eq("stream_key", STREAM_KEY)
      .maybeSingle();
    if (stateError) throw stateError;

    // On the first run begin at the confirmed head, so enabling the bot never
    // broadcasts historical buys to the community.
    if (!state) {
      const { error } = await db.from("telegram_buy_alert_state").insert({ stream_key: STREAM_KEY, last_processed_block: safeBlock.toString() });
      if (error) throw error;
      return NextResponse.json({ initialized: true, lastProcessedBlock: safeBlock.toString() });
    }

    const lastProcessed = BigInt(state.last_processed_block);
    if (lastProcessed >= safeBlock) return NextResponse.json({ processed: false, lastProcessedBlock: lastProcessed.toString() });
    const toBlock = lastProcessed + BigInt(maxBlockRange) < safeBlock ? lastProcessed + BigInt(maxBlockRange) : safeBlock;
    const logRanges: { fromBlock: bigint; toBlock: bigint }[] = [];
    for (let fromBlock = lastProcessed + BigInt(1); fromBlock <= toBlock; fromBlock += BigInt(logBlockRange)) {
      const chunkToBlock = fromBlock + BigInt(logBlockRange - 1) < toBlock ? fromBlock + BigInt(logBlockRange - 1) : toBlock;
      logRanges.push({ fromBlock, toBlock: chunkToBlock });
    }
    const getTransferLogs = (range: { fromBlock: bigint; toBlock: bigint }) => client.getLogs({
      address: tokenAddress,
      event: erc20TransferEventAbi[0],
      ...range,
    });
    const logs: Awaited<ReturnType<typeof getTransferLogs>> = [];
    for (let index = 0; index < logRanges.length; index += 1) {
      const range = logRanges[index];
      let attempt = 0;
      while (true) {
        try {
          logs.push(...await getTransferLogs(range));
          break;
        } catch (error) {
          if (attempt >= 3) throw error;
          attempt += 1;
          await delay(logRequestDelay * attempt * 2);
        }
      }
      if (index < logRanges.length - 1) await delay(logRequestDelay);
    }

    const poolSet = new Set(pools);
    const candidates = logs
      .filter((log) => {
        const from = log.args.from?.toLowerCase();
        const to = log.args.to?.toLowerCase();
        const value = log.args.value;
        return Boolean(from && to && value !== undefined && from !== zeroAddress && to !== zeroAddress && from !== to && poolSet.has(from as Address) && !poolSet.has(to as Address) && Number(formatUnits(value!, Number(process.env.ROBINHOOD_TOKEN_DECIMALS || "18"))) >= minAmount);
      })
      .map((log) => ({
        id: `${log.transactionHash}-${log.logIndex}`,
        transaction_hash: log.transactionHash!,
        log_index: Number(log.logIndex),
        block_number: Number(log.blockNumber),
        buyer_wallet: log.args.to!.toLowerCase(),
        pool_address: log.args.from!.toLowerCase(),
        token_amount: formatUnits(log.args.value!, Number(process.env.ROBINHOOD_TOKEN_DECIMALS || "18")),
      }));

    if (candidates.length) {
      const { error } = await db.from("telegram_buy_alerts").upsert(candidates, { onConflict: "id", ignoreDuplicates: true });
      if (error) throw error;
    }

    const { data: pending, error: pendingError } = await db
      .from("telegram_buy_alerts")
      .select("id, buyer_wallet, token_amount, transaction_hash")
      .is("sent_at", null)
      .order("block_number", { ascending: true })
      .limit(MAX_NOTIFICATIONS_PER_RUN);
    if (pendingError) throw pendingError;

    for (const alert of pending || []) {
      await sendTelegramAlert(alertText(alert));
      const { error } = await db.from("telegram_buy_alerts").update({ sent_at: new Date().toISOString() }).eq("id", alert.id);
      if (error) throw error;
    }
    if ((pending || []).length === MAX_NOTIFICATIONS_PER_RUN) {
      return NextResponse.json({ processed: false, queued: true, sent: pending!.length });
    }

    const { error: cursorError } = await db
      .from("telegram_buy_alert_state")
      .update({ last_processed_block: toBlock.toString(), updated_at: new Date().toISOString() })
      .eq("stream_key", STREAM_KEY);
    if (cursorError) throw cursorError;
    return NextResponse.json({ processed: true, fromBlock: (lastProcessed + BigInt(1)).toString(), toBlock: toBlock.toString(), detected: candidates.length, sent: (pending || []).length });
  } catch (error) {
    console.error("Telegram buy-alert worker failed", error);
    return NextResponse.json({ error: workerErrorMessage(error) }, { status: 500 });
  }
}

// Vercel Cron invokes routes with GET; an external scheduler may use POST.
export function GET(request: NextRequest) {
  return handleBuyAlerts(request);
}

export function POST(request: NextRequest) {
  return handleBuyAlerts(request);
}
