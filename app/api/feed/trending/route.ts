import { NextRequest, NextResponse } from "next/server";
import { getTrendingArtworks } from "@/lib/supabase/data";
import { getWalletsForRequest } from "@/lib/wallet-session";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const sessionWallets = getWalletsForRequest(request);
  const wallet = sessionWallets?.length ? sessionWallets : undefined;
  const limit = Math.min(Number(request.nextUrl.searchParams.get("limit")) || 8, 12);
  try {
    const { artworks } = await getTrendingArtworks(wallet, limit);
    return NextResponse.json({ artworks });
  } catch (e) {
    console.error("[feed/trending]", e);
    return NextResponse.json({ artworks: [] });
  }
}
