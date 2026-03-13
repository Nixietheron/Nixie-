import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth-admin";
import { updateContent, deleteContent } from "@/lib/supabase/data";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAdminUser();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }
  const { id } = await params;
  const body = await request.json();
  const updates: Record<string, unknown> = {};
  if (typeof body.title === "string") updates.title = body.title.trim();
  if (body.description !== undefined) updates.description = body.description ? String(body.description).trim() : null;
  if (typeof body.price_usdc === "number") updates.price_usdc = body.price_usdc;
  if (typeof body.price_animated_usdc === "number") updates.price_animated_usdc = body.price_animated_usdc;
  if (body.sfw_cid !== undefined) updates.sfw_cid = body.sfw_cid ? String(body.sfw_cid).trim() : null;
  if (body.nsfw_cid !== undefined) updates.nsfw_cid = body.nsfw_cid ? String(body.nsfw_cid).trim() : null;
  if (body.animated_cid !== undefined) updates.animated_cid = body.animated_cid ? String(body.animated_cid).trim() : null;
  const { error } = await updateContent(id, updates as Parameters<typeof updateContent>[1]);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAdminUser();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }
  const { id } = await params;
  const { error } = await deleteContent(id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
