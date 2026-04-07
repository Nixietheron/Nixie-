import { NextRequest, NextResponse } from "next/server";
import { getListsByWallet, createList } from "@/lib/supabase/data";
import { assertWalletMatchesSession, parseWalletSession } from "@/lib/wallet-session";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const wallet = request.nextUrl.searchParams.get("wallet") ?? undefined;
  if (!wallet) {
    return NextResponse.json({ lists: [] });
  }
  const session = parseWalletSession(request);
  if (!session || !assertWalletMatchesSession(session, wallet)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const lists = await getListsByWallet(wallet);
  return NextResponse.json({ lists });
}

export async function POST(request: NextRequest) {
  const session = parseWalletSession(request);
  if (!session) {
    return NextResponse.json({ error: "Wallet session required" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const wallet = body.wallet as string | undefined;
  const name = (body.name as string)?.trim() || "New list";
  if (!wallet) {
    return NextResponse.json({ error: "wallet required" }, { status: 400 });
  }
  if (!assertWalletMatchesSession(session, wallet)) {
    return NextResponse.json({ error: "Wallet does not match signed-in session" }, { status: 403 });
  }
  const { data, error } = await createList(wallet, name);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ list: data });
}
