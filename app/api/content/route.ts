import { NextRequest, NextResponse } from "next/server";
import { getContentWithCounts } from "@/lib/supabase/data";

export async function GET(request: NextRequest) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.json({ artworks: [] });
  }
  const wallet = request.nextUrl.searchParams.get("wallet") ?? undefined;
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
