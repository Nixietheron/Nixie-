import { NextRequest, NextResponse } from "next/server";
import { getWalletsForRequest } from "@/lib/wallet-session";
import { getMuseumAccess } from "@/lib/museum-access";
import { createAdminClient } from "@/lib/supabase/server";

async function requireHolder(request: NextRequest) {
  const wallet = getWalletsForRequest(request)?.[0];
  if (!wallet) return { wallet: null, error: NextResponse.json({ error: "Wallet session required" }, { status: 401 }) };
  const access = await getMuseumAccess(wallet);
  if (!access.allowed) return { wallet: null, error: NextResponse.json({ error: "Museum pass required" }, { status: 403 }) };
  return { wallet, error: null };
}

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { wallet, error } = await requireHolder(request);
  if (error || !wallet) return error!;
  const { data, error: queryError } = await createAdminClient().from("museum_favorites").select("content_id").eq("wallet", wallet);
  if (queryError) return NextResponse.json({ error: queryError.message }, { status: 500 });
  return NextResponse.json({ contentIds: (data ?? []).map((item) => item.content_id) });
}

export async function POST(request: NextRequest) {
  const { wallet, error } = await requireHolder(request);
  if (error || !wallet) return error!;
  const body = await request.json().catch(() => null) as { contentId?: unknown; favorite?: unknown } | null;
  const contentId = typeof body?.contentId === "string" ? body.contentId : "";
  const favorite = body?.favorite === true;
  if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(contentId)) return NextResponse.json({ error: "Invalid artwork" }, { status: 400 });
  const admin = createAdminClient();
  const { error: changeError } = favorite
    ? await admin.from("museum_favorites").upsert({ wallet, content_id: contentId }, { onConflict: "wallet,content_id" })
    : await admin.from("museum_favorites").delete().eq("wallet", wallet).eq("content_id", contentId);
  if (changeError) return NextResponse.json({ error: changeError.message }, { status: 500 });
  return NextResponse.json({ contentId, favorite });
}
