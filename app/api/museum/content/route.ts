import { NextRequest, NextResponse } from "next/server";
import {
  getMuseumArtworksPage,
  MUSEUM_PAGE_DEFAULT,
  MUSEUM_PAGE_MAX,
} from "@/lib/supabase/data";
import { getWalletsForRequest } from "@/lib/wallet-session";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.json({
      artworks: [],
      total: 0,
      offset: 0,
      limit: MUSEUM_PAGE_DEFAULT,
      hasMore: false,
    });
  }

  const { searchParams } = new URL(request.url);
  const rawLimit = Number(searchParams.get("limit") ?? MUSEUM_PAGE_DEFAULT);
  const rawOffset = Number(searchParams.get("offset") ?? 0);
  const limit = Number.isFinite(rawLimit)
    ? Math.min(Math.max(Math.floor(rawLimit), 1), MUSEUM_PAGE_MAX)
    : MUSEUM_PAGE_DEFAULT;
  const offset = Number.isFinite(rawOffset) ? Math.max(Math.floor(rawOffset), 0) : 0;

  const sessionWallets = getWalletsForRequest(request);
  const wallet = sessionWallets?.length ? sessionWallets : undefined;

  try {
    const { artworks, total, error } = await getMuseumArtworksPage(wallet, offset, limit);
    if (error) {
      console.error("[museum/content] getMuseumArtworksPage error:", error.message);
      return NextResponse.json(
        {
          artworks: [],
          total: 0,
          offset,
          limit,
          hasMore: false,
          error: error.message,
        },
        { status: 500 }
      );
    }

    const nextOffset = offset + (artworks?.length ?? 0);
    const hasMore = nextOffset < (total ?? 0);

    return NextResponse.json({
      artworks: artworks ?? [],
      total: total ?? 0,
      offset,
      limit,
      hasMore,
      nextOffset,
    });
  } catch (e) {
    console.error("[museum/content] unexpected error:", e);
    return NextResponse.json(
      {
        artworks: [],
        total: 0,
        offset,
        limit,
        hasMore: false,
        error: e instanceof Error ? e.message : "Failed to load museum content",
      },
      { status: 500 }
    );
  }
}
