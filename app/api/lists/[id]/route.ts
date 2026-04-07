import { NextRequest, NextResponse } from "next/server";
import { getListWithArtworks, deleteList } from "@/lib/supabase/data";
import { assertWalletMatchesSession, getWalletsForRequest, parseWalletSession } from "@/lib/wallet-session";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sessionWallets = getWalletsForRequest(request);
  const wallet = sessionWallets?.length ? sessionWallets : undefined;
  const { list, artworks } = await getListWithArtworks(id, wallet);
  if (!list) {
    return NextResponse.json({ error: "List not found" }, { status: 404 });
  }
  return NextResponse.json({ list, artworks });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = parseWalletSession(request);
  if (!session) {
    return NextResponse.json({ error: "Wallet session required" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const wallet = body.wallet as string | undefined;
  if (!wallet) {
    return NextResponse.json({ error: "wallet required" }, { status: 400 });
  }
  if (!assertWalletMatchesSession(session, wallet)) {
    return NextResponse.json({ error: "Wallet does not match signed-in session" }, { status: 403 });
  }
  const { error } = await deleteList(id, wallet);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
