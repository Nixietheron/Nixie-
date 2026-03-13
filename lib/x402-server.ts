/**
 * x402 server helpers: CDP facilitator client and payment requirement building.
 * Used by POST /api/unlock when CDP_API_KEY_ID + CDP_API_KEY_SECRET are set.
 * @see https://docs.cdp.coinbase.com/x402/quickstart-for-sellers#setting-up-cdp-facilitator-for-production
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
import { USDC_ON_BASE } from "./constants";

const CDP_API_KEY_ID = process.env.CDP_API_KEY_ID;
const CDP_API_KEY_SECRET = process.env.CDP_API_KEY_SECRET;
const X402_RECIPIENT_WALLET = process.env.X402_RECIPIENT_WALLET;

const CDP_FACILITATOR_URL = "https://api.cdp.coinbase.com/platform/v2/x402";

/** Base mainnet: v1 uses "base", facilitator/CAIP-2 uses "eip155:8453". */
const BASE_NETWORK_V1 = "base" as const;
const BASE_NETWORK_CAIP2 = "eip155:8453" as const;

let facilitatorClient: HTTPFacilitatorClient | null = null;

/**
 * Returns CDP facilitator client when API keys are set; otherwise null.
 */
export function getFacilitatorClient(): HTTPFacilitatorClient | null {
  if (!CDP_API_KEY_ID || !CDP_API_KEY_SECRET || !X402_RECIPIENT_WALLET) {
    return null;
  }
  if (!facilitatorClient) {
    const config = createFacilitatorConfig(CDP_API_KEY_ID, CDP_API_KEY_SECRET);
    facilitatorClient = new HTTPFacilitatorClient({
      url: CDP_FACILITATOR_URL,
      createAuthHeaders: config.createAuthHeaders,
    });
  }
  return facilitatorClient;
}

/**
 * Whether real x402 (CDP verify/settle) is enabled.
 */
export function isX402Enabled(): boolean {
  return getFacilitatorClient() !== null;
}

/**
 * Build x402 PaymentRequired for 402 response (v1 format with accepts).
 * Price is in USDC dollars; maxAmountRequired is in atomic units (6 decimals).
 */
export function buildPaymentRequired(opts: {
  priceUsdc: number;
  payTo: string;
  resource: string;
  contentId: string;
}): PaymentRequiredV1 {
  const { priceUsdc, payTo, resource, contentId } = opts;
  const maxAmountRequired = String(Math.round(priceUsdc * 1_000_000)); // USDC 6 decimals

  const accepts: PaymentRequirementsV1[] = [
    {
      scheme: "exact",
      network: BASE_NETWORK_V1 as PaymentRequirementsV1["network"],
      maxAmountRequired,
      resource,
      description: `Unlock NSFW content ${contentId}`,
      mimeType: "application/json",
      outputSchema: {},
      payTo,
      maxTimeoutSeconds: 60,
      asset: USDC_ON_BASE,
      extra: { name: "USD Coin", version: "2" },
    },
  ];

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
 * Verify and settle payment via CDP facilitator; returns settle result or throws.
 */
export async function verifyAndSettle(
  paymentPayload: PaymentPayload,
  paymentRequirements: PaymentRequirementsV1
): Promise<SettleResponse> {
  const client = getFacilitatorClient();
  if (!client) throw new Error("x402 facilitator not configured");

  const req = paymentRequirements as unknown as PaymentRequirements;
  const verifyResult = await client.verify(paymentPayload, req);
  if (!verifyResult.isValid) {
    const msg = (verifyResult as { errorMessage?: string }).errorMessage ?? "Verification failed";
    throw new Error(msg);
  }

  return client.settle(paymentPayload, req);
}
