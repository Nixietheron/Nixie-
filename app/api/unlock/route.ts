import { NextRequest, NextResponse } from "next/server";
import { decodePaymentSignatureHeader, encodePaymentResponseHeader } from "@x402/core/http";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import {
  buildPaymentRequired,
  encodePaymentRequired,
  verifyAndSettle,
} from "@/lib/x402-server";

/** Base mainnet wallet that receives USDC for unlocks. When set, 402 is returned until payment. */
const RECIPIENT_WALLET = process.env.X402_RECIPIENT_WALLET;

const VALID_UNLOCK_TYPES = ["nsfw", "animated"] as const;
type UnlockType = (typeof VALID_UNLOCK_TYPES)[number];

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { wallet, contentId, txHash, unlockType: rawUnlockType } = body;
  if (!wallet || !contentId) {
    return NextResponse.json(
      { error: "wallet and contentId required" },
      { status: 400 }
    );
  }
  const unlockType: UnlockType = VALID_UNLOCK_TYPES.includes(rawUnlockType) ? rawUnlockType : "nsfw";

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("unlocks")
    .select("id")
    .eq("wallet", wallet)
    .eq("content_id", contentId)
    .eq("unlock_type", unlockType)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ unlocked: true, already: true });
  }

  const { data: content } = await supabase
    .from("content")
    .select("price_usdc, price_animated_usdc")
    .eq("id", contentId)
    .single();

  if (!content) {
    return NextResponse.json({ error: "Content not found" }, { status: 404 });
  }

  const priceUsdc =
    unlockType === "nsfw"
      ? Number(content.price_usdc ?? 0)
      : Number((content as { price_animated_usdc?: number }).price_animated_usdc ?? 0);

  if (priceUsdc <= 0) {
    const admin = createAdminClient();
    const { error: insertError } = await admin.from("unlocks").insert({
      wallet,
      content_id: contentId,
      unlock_type: unlockType,
      tx_hash: null,
    });
    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
    return NextResponse.json({ unlocked: true });
  }

  const paymentSignature =
    request.headers.get("payment-signature") ??
    request.headers.get("PAYMENT-SIGNATURE") ??
    request.headers.get("x-payment") ??
    request.headers.get("X-PAYMENT");

  // --- Real x402: verify + settle (Base/Solana via CDP) ---
  if (RECIPIENT_WALLET && paymentSignature) {
    try {
      const paymentPayload = decodePaymentSignatureHeader(paymentSignature);
      const resource = request.url ?? `${request.nextUrl?.origin ?? ""}/api/unlock`;
      const paymentRequired = await buildPaymentRequired({
        priceUsdc,
        payTo: RECIPIENT_WALLET!,
        resource,
        contentId,
      });
      if (!paymentRequired.accepts.length) {
        return NextResponse.json({ error: "Invalid payment requirements" }, { status: 400 });
      }
      const settleResult = await verifyAndSettle(paymentPayload, paymentRequired);
      const txFromSettle = (settleResult as { transaction?: string }).transaction;

      const admin = createAdminClient();
      const { error: insertError } = await admin.from("unlocks").insert({
        wallet,
        content_id: contentId,
        unlock_type: unlockType,
        tx_hash: txFromSettle ?? null,
      });
      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }

      const res = NextResponse.json({ unlocked: true });
      try {
        res.headers.set("PAYMENT-RESPONSE", encodePaymentResponseHeader(settleResult));
      } catch {
        // ignore header encode errors
      }
      return res;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Payment verification failed";
      return NextResponse.json({ error: message }, { status: 402 });
    }
  }

  // --- 402: require payment (x402 format: Base and/or Avalanche USDC) ---
  if (!txHash) {
    if (RECIPIENT_WALLET) {
      const resource = request.url ?? `${request.nextUrl?.origin ?? ""}/api/unlock`;
      const paymentRequired = await buildPaymentRequired({
        priceUsdc,
        payTo: RECIPIENT_WALLET,
        resource,
        contentId,
      });
      return NextResponse.json(paymentRequired, {
        status: 402,
        headers: {
          "PAYMENT-REQUIRED": encodePaymentRequired(paymentRequired),
          "Content-Type": "application/json",
        },
      });
    }
    const admin = createAdminClient();
    const { error: insertError } = await admin.from("unlocks").insert({
      wallet,
      content_id: contentId,
      unlock_type: unlockType,
      tx_hash: null,
    });
    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
    return NextResponse.json({ unlocked: true });
  }

  // When x402 is used (402 response), only PAYMENT-SIGNATURE is accepted; txHash is ignored
  if (RECIPIENT_WALLET) {
    return NextResponse.json(
      { error: "Payment must be made via x402 (sign with wallet). Direct transfer is not accepted." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { error } = await admin.from("unlocks").insert({
    wallet,
    content_id: contentId,
    unlock_type: unlockType,
    tx_hash: txHash,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ unlocked: true });
}
