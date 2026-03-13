import { NextRequest, NextResponse } from "next/server";
import { getActiveStoriesWithUnlock } from "@/lib/supabase/data";

export async function GET(request: NextRequest) {
  const wallet = request.nextUrl.searchParams.get("wallet") ?? undefined;
  const stories = await getActiveStoriesWithUnlock(wallet);
  return NextResponse.json({ stories });
}
