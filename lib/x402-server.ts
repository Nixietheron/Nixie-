/**
 * x402 server helpers: CDP facilitator for Base and Solana. Used by POST /api/unlock and /api/story-unlock.
 * @see https://docs.cdp.coinbase.com/x402/quickstart-for-sellers
 * @see https://docs.cdp.coinbase.com/api-reference/v2/rest-api/x402-facilitator/get-supported-payment-schemes-and-networks (fee payer in /supported for Solana)
 */

import { HTTPFacilitatorClient, encodePaymentRequiredHeader } from "@x402/core/http";
import { createFacilitatorConfig } from "@coinbase/x402";
import type {
  PaymentRequired,
  PaymentRequiredV1,
  PaymentRequirements,
  PaymentRequirementsV1,
  PaymentPayload,
  SettleResponse,
} from "@x402/core/types";
import { USDC_ON_BASE, USDC_SPL_SOLANA } from "./constants";

const CDP_API_KEY_ID = process.env.CDP_API_KEY_ID;
const CDP_API_KEY_SECRET = process.env.CDP_API_KEY_SECRET;
const X402_RECIPIENT_WALLET = process.env.X402_RECIPIENT_WALLET;
/** Solana address (base58) to receive USDC SPL. When set with CDP keys, Solana pay option is offered. */
const X402_SOLANA_RECIPIENT_WALLET = process.env.X402_SOLANA_RECIPIENT_WALLET;
/** Solana fee payer address (base58). Optional: if unset or invalid (e.g. placeholder), fetched from CDP GET /supported. */
const X402_SOLANA_FEE_PAYER_RAW = process.env.X402_SOLANA_FEE_PAYER;
const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
function isValidSolanaBase58(s: string | undefined): boolean {
  if (!s || typeof s !== "string" || s.length < 32 || s.length > 44) return false;
  for (let i = 0; i < s.length; i++) if (!BASE58_ALPHABET.includes(s[i])) return false;
  return true;
}
const X402_SOLANA_FEE_PAYER = isValidSolanaBase58(X402_SOLANA_FEE_PAYER_RAW)
  ? X402_SOLANA_FEE_PAYER_RAW
  : undefined;

const CDP_FACILITATOR_URL = "https://api.cdp.coinbase.com/platform/v2/x402";

/** Base mainnet: v1 uses "base". */
const BASE_NETWORK_V1 = "base" as const;
/** Solana mainnet: v1 uses "solana". */
const SOLANA_NETWORK_V1 = "solana" as const;

let cdpFacilitatorClient: HTTPFacilitatorClient | null = null;

/**
 * Returns CDP facilitator client (Base) when API keys are set; otherwise null.
 */
export function getFacilitatorClient(): HTTPFacilitatorClient | null {
  if (!CDP_API_KEY_ID || !CDP_API_KEY_SECRET || !X402_RECIPIENT_WALLET) {
    return null;
  }
  if (!cdpFacilitatorClient) {
    const config = createFacilitatorConfig(CDP_API_KEY_ID, CDP_API_KEY_SECRET);
    cdpFacilitatorClient = new HTTPFacilitatorClient({
      url: CDP_FACILITATOR_URL,
      createAuthHeaders: config.createAuthHeaders,
    });
  }
  return cdpFacilitatorClient;
}

/**
 * Whether real x402 is enabled (recipient wallet set; Base/Solana via CDP).
 */
export function isX402Enabled(): boolean {
  return !!X402_RECIPIENT_WALLET;
}

/** Cached Solana fee payer from CDP GET /supported (avoids calling on every 402). */
let cachedSolanaFeePayer: string | null | undefined = undefined;

/**
 * Resolve Solana fee payer: env X402_SOLANA_FEE_PAYER or CDP GET /supported.
 * CDP may return kinds[] with extra.feePayer or top-level feePayer.
 */
async function getSolanaFeePayer(): Promise<string | null> {
  if (X402_SOLANA_FEE_PAYER) return X402_SOLANA_FEE_PAYER;
  if (cachedSolanaFeePayer !== undefined) return cachedSolanaFeePayer ?? null;
  const client = getFacilitatorClient();
  if (!client) {
    cachedSolanaFeePayer = null;
    return null;
  }
  try {
    const supported = (await client.getSupported()) as Record<string, unknown>;
    const rawKinds = (
      supported?.paymentKinds ??
      supported?.kinds ??
      (supported?.data && typeof supported.data === "object" && (supported.data as Record<string, unknown>)?.kinds) ??
      []
    ) as Array<Record<string, unknown>>;
    const kinds = Array.isArray(rawKinds) ? rawKinds : [];
    const isSolana = (n: unknown) =>
      typeof n === "string" && (n === "solana" || n.startsWith("solana:"));
    const solana = kinds.find((k) => isSolana(k?.network));
    const fromExtra =
      solana?.extra && typeof solana.extra === "object" && solana.extra !== null
        ? (solana.extra as Record<string, unknown>).feePayer
        : undefined;
    const feePayerStr =
      (typeof solana?.feePayer === "string" && solana.feePayer.length > 0
        ? solana.feePayer
        : typeof fromExtra === "string" && fromExtra.length > 0
          ? fromExtra
          : null) as string | null;
    cachedSolanaFeePayer = feePayerStr;
    return feePayerStr;
  } catch {
    cachedSolanaFeePayer = null;
    return null;
  }
}

/**
 * Build x402 PaymentRequired for 402 response (v1 format with accepts).
 * Base (CDP) and Solana when recipient + fee payer (env or CDP /supported) are set.
 */
export async function buildPaymentRequired(opts: {
  priceUsdc: number;
  payTo: string;
  resource: string;
  contentId: string;
}): Promise<PaymentRequiredV1> {
  const { priceUsdc, payTo, resource, contentId } = opts;
  const maxAmountRequired = String(Math.round(priceUsdc * 1_000_000)); // USDC 6 decimals

  const accepts: PaymentRequirementsV1[] = [];
  const solanaRecipient = X402_SOLANA_RECIPIENT_WALLET ?? null;
  const solanaFeePayer =
    getFacilitatorClient() && solanaRecipient ? await getSolanaFeePayer() : null;

  // Put Solana first so clients that only have "solana" registered (e.g. fetchWithPaymentSolana)
  // can match the first requirement; otherwise they fail with "No network/scheme registered".
  if (solanaFeePayer && solanaRecipient) {
    accepts.push({
      scheme: "exact",
      network: SOLANA_NETWORK_V1 as PaymentRequirementsV1["network"],
      maxAmountRequired,
      resource,
      description: `Unlock content ${contentId}`,
      mimeType: "application/json",
      outputSchema: {},
      payTo: solanaRecipient,
      maxTimeoutSeconds: 60,
      asset: USDC_SPL_SOLANA,
      extra: { feePayer: solanaFeePayer },
    });
  }
  if (getFacilitatorClient()) {
    accepts.push({
      scheme: "exact",
      network: BASE_NETWORK_V1 as PaymentRequirementsV1["network"],
      maxAmountRequired,
      resource,
      description: `Unlock content ${contentId}`,
      mimeType: "application/json",
      outputSchema: {},
      payTo,
      maxTimeoutSeconds: 60,
      asset: USDC_ON_BASE,
      extra: { name: "USD Coin", version: "2" },
    });
  }

  return {
    x402Version: 1,
    error: "Payment required",
    accepts,
  };
}

/**
 * Encode PaymentRequired for PAYMENT-REQUIRED header (base64).
 */
export function encodePaymentRequired(paymentRequired: PaymentRequiredV1): string {
  return encodePaymentRequiredHeader(paymentRequired as unknown as PaymentRequired);
}

/**
 * Verify and settle payment via CDP (Base and Solana).
 * Only verify/settle with the requirement that matches the payload's network to avoid "network mismatch: base != solana".
 */
export async function verifyAndSettle(
  paymentPayload: PaymentPayload,
  paymentRequired: PaymentRequiredV1
): Promise<SettleResponse> {
  const baseClient = getFacilitatorClient();
  if (!baseClient) throw new Error("CDP facilitator not configured.");

  const payloadNetwork =
    typeof (paymentPayload as unknown as { network?: string }).network === "string"
      ? (paymentPayload as unknown as { network: string }).network
      : null;
  if (!payloadNetwork) {
    throw new Error("Payment payload missing network.");
  }

  const matchingAccept = paymentRequired.accepts.find(
    (accept) => (accept.network as string) === payloadNetwork
  );
  if (!matchingAccept) {
    throw new Error(
      `No payment requirement for network "${payloadNetwork}". Expected one of: ${paymentRequired.accepts.map((a) => a.network).join(", ")}`
    );
  }

  const requirement = matchingAccept as unknown as PaymentRequirements;
  const verifyResult = await baseClient.verify(paymentPayload, requirement);
  if (!verifyResult.isValid) {
    throw new Error("Payment verification failed.");
  }

  return baseClient.settle(paymentPayload, requirement);
}
