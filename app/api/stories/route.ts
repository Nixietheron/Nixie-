import { NextRequest, NextResponse } from "next/server";
import { getActiveStoriesWithUnlock } from "@/lib/supabase/data";
import { getWalletsForRequest } from "@/lib/wallet-session";

export async function GET(request: NextRequest) {
  const sessionWallets = getWalletsForRequest(request);
  const wallet = sessionWallets?.length ? sessionWallets : undefined;
  const stories = await getActiveStoriesWithUnlock(wallet);
  return NextResponse.json({ stories });
}
