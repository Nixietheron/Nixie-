import { NextRequest, NextResponse } from "next/server";
import { addListItem, removeListItem, getListItemsContentIds } from "@/lib/supabase/data";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: listId } = await params;
  const body = await request.json().catch(() => ({}));
  const wallet = body.wallet as string | undefined;
  const contentId = body.contentId as string | undefined;
  if (!wallet || !contentId) {
    return NextResponse.json({ error: "wallet and contentId required" }, { status: 400 });
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
  const contentId = request.nextUrl.searchParams.get("contentId");
  const wallet = request.nextUrl.searchParams.get("wallet");
  if (!wallet || !contentId) {
    return NextResponse.json({ error: "wallet and contentId required" }, { status: 400 });
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
