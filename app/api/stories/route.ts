import { NextRequest, NextResponse } from "next/server";
import { getActiveStoriesWithUnlock } from "@/lib/supabase/data";

export async function GET(request: NextRequest) {
  const walletParam = request.nextUrl.searchParams.get("wallet");
  const walletMultiple = request.nextUrl.searchParams.getAll("wallet").filter(Boolean);
  const wallet = walletMultiple.length > 0 ? walletMultiple : walletParam ?? undefined;
  const stories = await getActiveStoriesWithUnlock(wallet);
  return NextResponse.json({ stories });
}
