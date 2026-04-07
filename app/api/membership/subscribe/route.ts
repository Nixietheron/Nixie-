import { NextRequest, NextResponse } from "next/server";
import { decodePaymentSignatureHeader, encodePaymentResponseHeader } from "@x402/core/http";
import { buildPaymentRequired, encodePaymentRequired, verifyAndSettle } from "@/lib/x402-server";
import { getActiveMembershipForWallets, upsertMembership } from "@/lib/supabase/data";
import { MEMBERSHIP_PRICE_USDC } from "@/lib/constants";
import {
  assertWalletMatchesSession,
  parseWalletSession,
} from "@/lib/wallet-session";

const RECIPIENT_WALLET = process.env.X402_RECIPIENT_WALLET;

export async function POST(request: NextRequest) {
  const session = parseWalletSession(request);
  if (!session) {
    return NextResponse.json({ error: "Wallet session required — sign in first" }, { status: 401 });
  }

  const body = await request.json();
  const wallet = typeof body?.wallet === "string" ? body.wallet.trim() : "";
  if (!wallet) {
    return NextResponse.json({ error: "wallet required" }, { status: 400 });
  }
  if (!assertWalletMatchesSession(session, wallet)) {
    return NextResponse.json({ error: "Wallet does not match signed-in session" }, { status: 403 });
  }

  const active = await getActiveMembershipForWallets([wallet]);
  if (active.active) {
    return NextResponse.json({ subscribed: true, already: true, endsAt: active.endsAt, daysLeft: active.daysLeft });
  }

  if (!RECIPIENT_WALLET) {
    return NextResponse.json(
      { error: "Membership payments are not configured (X402_RECIPIENT_WALLET)" },
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
      const resource = request.url ?? `${request.nextUrl?.origin ?? ""}/api/membership/subscribe`;
      const paymentRequired = await buildPaymentRequired({
        priceUsdc: MEMBERSHIP_PRICE_USDC,
        payTo: RECIPIENT_WALLET,
        resource,
        contentId: "membership-30d",
      });
      if (!paymentRequired.accepts.length) {
        return NextResponse.json({ error: "Invalid payment requirements" }, { status: 400 });
      }
      const settleResult = await verifyAndSettle(paymentPayload, paymentRequired);
      const txFromSettle = (settleResult as { transaction?: string }).transaction ?? null;
      const { error, endsAt, daysLeft } = await upsertMembership(wallet, txFromSettle);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      const res = NextResponse.json({ subscribed: true, endsAt, daysLeft });
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

  const resource = request.url ?? `${request.nextUrl?.origin ?? ""}/api/membership/subscribe`;
  const paymentRequired = await buildPaymentRequired({
    priceUsdc: MEMBERSHIP_PRICE_USDC,
    payTo: RECIPIENT_WALLET,
    resource,
    contentId: "membership-30d",
  });
  return NextResponse.json(paymentRequired, {
    status: 402,
    headers: {
      "PAYMENT-REQUIRED": encodePaymentRequired(paymentRequired),
      "Content-Type": "application/json",
    },
  });
}
