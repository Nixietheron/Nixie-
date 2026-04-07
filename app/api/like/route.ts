import { NextRequest, NextResponse } from "next/server";
import { likeContent, unlikeContent } from "@/lib/supabase/data";
import { assertWalletMatchesSession, parseWalletSession } from "@/lib/wallet-session";

export async function POST(request: NextRequest) {
  const session = parseWalletSession(request);
  if (!session) {
    return NextResponse.json({ error: "Wallet session required" }, { status: 401 });
  }
  const body = await request.json();
  const { wallet, contentId, action } = body;
  if (!wallet || !contentId) {
    return NextResponse.json(
      { error: "wallet and contentId required" },
      { status: 400 }
    );
  }
  if (!assertWalletMatchesSession(session, wallet)) {
    return NextResponse.json({ error: "Wallet does not match signed-in session" }, { status: 403 });
  }
  const { error } =
    action === "unlike"
      ? await unlikeContent(wallet, contentId)
      : await likeContent(wallet, contentId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
