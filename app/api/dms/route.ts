import { NextRequest, NextResponse } from "next/server";
import { getOrCreateDmThread, addDmUserMessage } from "@/lib/supabase/data";
import { assertWalletMatchesSession, parseWalletSession } from "@/lib/wallet-session";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = parseWalletSession(request);
  if (!session) {
    return NextResponse.json({ error: "Wallet session required" }, { status: 401 });
  }
  const wallet = request.nextUrl.searchParams.get("wallet") ?? undefined;
  if (!wallet) {
    return NextResponse.json({ error: "wallet required" }, { status: 400 });
  }
  if (!assertWalletMatchesSession(session, wallet)) {
    return NextResponse.json({ error: "Wallet does not match signed-in session" }, { status: 403 });
  }
  const { thread, messages, error } = await getOrCreateDmThread(wallet);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ thread, messages });
}

export async function POST(request: NextRequest) {
  const session = parseWalletSession(request);
  if (!session) {
    return NextResponse.json({ error: "Wallet session required" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const wallet = body.wallet as string | undefined;
  const message = (body.message as string)?.trim();
  const threadId = body.threadId as string | undefined;
  if (!wallet || !message) {
    return NextResponse.json({ error: "wallet and message required" }, { status: 400 });
  }
  if (!assertWalletMatchesSession(session, wallet)) {
    return NextResponse.json({ error: "Wallet does not match signed-in session" }, { status: 403 });
  }
  if (threadId) {
    const { error } = await addDmUserMessage(threadId, wallet, message);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    const { thread, messages, error: fetchErr } = await getOrCreateDmThread(wallet);
    if (fetchErr) return NextResponse.json({ thread: null, messages: [] });
    return NextResponse.json({ thread, messages });
  }
  const { thread, messages, error } = await getOrCreateDmThread(wallet);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const { error: addErr } = await addDmUserMessage(thread!.id, wallet, message);
  if (addErr) {
    return NextResponse.json({ error: addErr.message }, { status: 500 });
  }
  const { thread: t2, messages: m2 } = await getOrCreateDmThread(wallet);
  return NextResponse.json({ thread: t2, messages: m2 });
}
