import { NextRequest, NextResponse } from "next/server";
import { getListWithArtworks, deleteList } from "@/lib/supabase/data";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const walletParam = request.nextUrl.searchParams.get("wallet");
  const walletMultiple = request.nextUrl.searchParams.getAll("wallet").filter(Boolean);
  const wallet = walletMultiple.length > 0 ? walletMultiple : walletParam ?? undefined;
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
  const body = await request.json().catch(() => ({}));
  const wallet = body.wallet as string | undefined;
  if (!wallet) {
    return NextResponse.json({ error: "wallet required" }, { status: 400 });
  }
  const { error } = await deleteList(id, wallet);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
