import { NextRequest, NextResponse } from "next/server";
import { getContentWithCounts } from "@/lib/supabase/data";
import { getWalletsForRequest } from "@/lib/wallet-session";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.json({ artworks: [] });
  }
  const sessionWallets = getWalletsForRequest(request);
  const wallet = sessionWallets?.length ? sessionWallets : undefined;
  try {
    const { artworks, error } = await getContentWithCounts(wallet);
    if (error) {
      console.error("[content] getContentWithCounts error:", error.message);
      return NextResponse.json({ artworks: [], error: error.message });
    }
    return NextResponse.json({ artworks: artworks ?? [] });
  } catch (e) {
    console.error("[content] unexpected error:", e);
    return NextResponse.json({
      artworks: [],
      error: e instanceof Error ? e.message : "Failed to load content",
    });
  }
}
