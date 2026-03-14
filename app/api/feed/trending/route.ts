import { NextRequest, NextResponse } from "next/server";
import { getTrendingArtworks } from "@/lib/supabase/data";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const walletParam = request.nextUrl.searchParams.get("wallet");
  const walletMultiple = request.nextUrl.searchParams.getAll("wallet").filter(Boolean);
  const wallet = walletMultiple.length > 0 ? walletMultiple : walletParam ?? undefined;
  const limit = Math.min(Number(request.nextUrl.searchParams.get("limit")) || 8, 12);
  try {
    const { artworks } = await getTrendingArtworks(wallet, limit);
    return NextResponse.json({ artworks });
  } catch (e) {
    console.error("[feed/trending]", e);
    return NextResponse.json({ artworks: [] });
  }
}
