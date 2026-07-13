import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth-admin";
import { createAdminClient } from "@/lib/supabase/server";

function cid(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return /^[a-zA-Z0-9]+$/.test(normalized) && normalized.length >= 32 && normalized.length <= 128
    ? normalized
    : null;
}

export async function POST(request: NextRequest) {
  const auth = await getAdminUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

  const sfwCid = cid((body as { sfw_cid?: unknown }).sfw_cid);
  const nsfwCid = cid((body as { nsfw_cid?: unknown }).nsfw_cid);
  const animatedCid = cid((body as { animated_cid?: unknown }).animated_cid);
  if (!sfwCid && !nsfwCid && !animatedCid) {
    return NextResponse.json({ error: "Add at least one Pinata CID before publishing" }, { status: 400 });
  }

  const rawTitle = typeof (body as { title?: unknown }).title === "string"
    ? (body as { title: string }).title.trim()
    : "";
  const rawDescription = typeof (body as { description?: unknown }).description === "string"
    ? (body as { description: string }).description.trim()
    : "";

  const { data, error } = await createAdminClient()
    .from("content")
    .insert({
      title: rawTitle || "Untitled artwork",
      description: rawDescription || null,
      sfw_cid: sfwCid,
      nsfw_cid: nsfwCid,
      animated_cid: animatedCid,
      // Holder access is the only gate. Legacy price columns remain zero for
      // backwards-compatible database migrations.
      price_usdc: 0,
      price_animated_usdc: 0,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: data.id }, { status: 201 });
}
