import { NextRequest, NextResponse } from "next/server";
import { decodePaymentSignatureHeader, encodePaymentResponseHeader } from "@x402/core/http";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import {
  buildPaymentRequired,
  encodePaymentRequired,
  verifyAndSettle,
} from "@/lib/x402-server";

const RECIPIENT_WALLET = process.env.X402_RECIPIENT_WALLET;

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { wallet, storyId } = body;
  if (!wallet || !storyId) {
    return NextResponse.json(
      { error: "wallet and storyId required" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("story_unlocks")
    .select("story_id")
    .eq("wallet", wallet)
    .eq("story_id", storyId)
    .single();

  if (existing) {
    return NextResponse.json({ unlocked: true, already: true });
  }

  const { data: story } = await admin
    .from("stories")
    .select("id, price_usdc, is_paid, expires_at")
    .eq("id", storyId)
    .single();

  if (!story) {
    return NextResponse.json({ error: "Story not found" }, { status: 404 });
  }
  if (new Date(story.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: "Story expired" }, { status: 410 });
  }
  if (!story.is_paid || Number(story.price_usdc) <= 0) {
    const { error: insertError } = await admin.from("story_unlocks").insert({
      wallet,
      story_id: storyId,
    });
    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
    return NextResponse.json({ unlocked: true });
  }

  const priceUsdc = Number(story.price_usdc);
  const paymentSignature =
    request.headers.get("payment-signature") ??
    request.headers.get("PAYMENT-SIGNATURE") ??
    request.headers.get("x-payment") ??
    request.headers.get("X-PAYMENT");

  if (RECIPIENT_WALLET && paymentSignature) {
    try {
      const paymentPayload = decodePaymentSignatureHeader(paymentSignature);
      const resource = request.url ?? `${request.nextUrl?.origin ?? ""}/api/story-unlock`;
      const paymentRequired = await buildPaymentRequired({
        priceUsdc,
        payTo: RECIPIENT_WALLET!,
        resource,
        contentId: storyId,
      });
      if (!paymentRequired.accepts.length) {
        return NextResponse.json({ error: "Invalid payment requirements" }, { status: 400 });
      }
      const settleResult = await verifyAndSettle(paymentPayload, paymentRequired);

      const { error: insertError } = await admin.from("story_unlocks").insert({
        wallet,
        story_id: storyId,
      });
      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }

      const res = NextResponse.json({ unlocked: true });
      try {
        res.headers.set("PAYMENT-RESPONSE", encodePaymentResponseHeader(settleResult));
      } catch {
        // ignore
      }
      return res;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Payment verification failed";
      return NextResponse.json({ error: message }, { status: 402 });
    }
  }

  if (!RECIPIENT_WALLET) {
    const { error: insertError } = await admin.from("story_unlocks").insert({
      wallet,
      story_id: storyId,
    });
    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
    return NextResponse.json({ unlocked: true });
  }

  const resource = request.url ?? `${request.nextUrl?.origin ?? ""}/api/story-unlock`;
  const paymentRequired = await buildPaymentRequired({
    priceUsdc,
    payTo: RECIPIENT_WALLET,
    resource,
    contentId: storyId,
  });
  return NextResponse.json(paymentRequired, {
    status: 402,
    headers: {
      "PAYMENT-REQUIRED": encodePaymentRequired(paymentRequired),
      "Content-Type": "application/json",
    },
  });
}
