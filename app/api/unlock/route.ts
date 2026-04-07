import { NextRequest, NextResponse } from "next/server";
import { decodePaymentSignatureHeader, encodePaymentResponseHeader } from "@x402/core/http";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getActiveMembershipForWallets } from "@/lib/supabase/data";
import {
  buildPaymentRequired,
  encodePaymentRequired,
  verifyAndSettle,
} from "@/lib/x402-server";
import { assertWalletMatchesSession, parseWalletSession } from "@/lib/wallet-session";

const RECIPIENT_WALLET = process.env.X402_RECIPIENT_WALLET;

const VALID_UNLOCK_TYPES = ["nsfw", "animated"] as const;
type UnlockType = (typeof VALID_UNLOCK_TYPES)[number];

export async function POST(request: NextRequest) {
  const session = parseWalletSession(request);
  if (!session) {
    return NextResponse.json({ error: "Wallet session required — sign in first" }, { status: 401 });
  }

  const body = await request.json();
  const { wallet, contentId, unlockType: rawUnlockType } = body;
  if (!wallet || !contentId) {
    return NextResponse.json(
      { error: "wallet and contentId required" },
      { status: 400 }
    );
  }
  if (!assertWalletMatchesSession(session, wallet)) {
    return NextResponse.json({ error: "Wallet does not match signed-in session" }, { status: 403 });
  }

  const unlockType: UnlockType = VALID_UNLOCK_TYPES.includes(rawUnlockType) ? rawUnlockType : "nsfw";

  const admin = createAdminClient();
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

  const membership = await getActiveMembershipForWallets([wallet]);
  if (membership.active) {
    return NextResponse.json({ unlocked: true, membership: true });
  }

  const { data: content } = await admin
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

  if (!RECIPIENT_WALLET) {
    return NextResponse.json(
      { error: "Paid unlocks require payment configuration (X402_RECIPIENT_WALLET)" },
      { status: 503 }
    );
  }

  const paymentSignature =
    request.headers.get("payment-signature") ??
    request.headers.get("PAYMENT-SIGNATURE") ??
    request.headers.get("x-payment") ??
    request.headers.get("X-PAYMENT");

  if (paymentSignature) {
    try {
      const paymentPayload = decodePaymentSignatureHeader(paymentSignature);
      const resource = request.url ?? `${request.nextUrl?.origin ?? ""}/api/unlock`;
      const paymentRequired = await buildPaymentRequired({
        priceUsdc,
        payTo: RECIPIENT_WALLET,
        resource,
        contentId,
      });
      if (!paymentRequired.accepts.length) {
        return NextResponse.json({ error: "Invalid payment requirements" }, { status: 400 });
      }
      const settleResult = await verifyAndSettle(paymentPayload, paymentRequired);
      const txFromSettle = (settleResult as { transaction?: string }).transaction;

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
