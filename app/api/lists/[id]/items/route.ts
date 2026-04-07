import { NextRequest, NextResponse } from "next/server";
import { addListItem, removeListItem, getListItemsContentIds } from "@/lib/supabase/data";
import { assertWalletMatchesSession, parseWalletSession } from "@/lib/wallet-session";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: listId } = await params;
  const session = parseWalletSession(request);
  if (!session) {
    return NextResponse.json({ error: "Wallet session required" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const wallet = body.wallet as string | undefined;
  const contentId = body.contentId as string | undefined;
  if (!wallet || !contentId) {
    return NextResponse.json({ error: "wallet and contentId required" }, { status: 400 });
  }
  if (!assertWalletMatchesSession(session, wallet)) {
    return NextResponse.json({ error: "Wallet does not match signed-in session" }, { status: 403 });
  }
  const { error } = await addListItem(listId, contentId, wallet);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: listId } = await params;
  const session = parseWalletSession(request);
  if (!session) {
    return NextResponse.json({ error: "Wallet session required" }, { status: 401 });
  }
  const contentId = request.nextUrl.searchParams.get("contentId");
  const wallet = request.nextUrl.searchParams.get("wallet");
  if (!wallet || !contentId) {
    return NextResponse.json({ error: "wallet and contentId required" }, { status: 400 });
  }
  if (!assertWalletMatchesSession(session, wallet)) {
    return NextResponse.json({ error: "Wallet does not match signed-in session" }, { status: 403 });
  }
  const { error } = await removeListItem(listId, contentId, wallet);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const contentIds = await getListItemsContentIds(id);
  return NextResponse.json({ contentIds });
}
