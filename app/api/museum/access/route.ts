import { NextRequest, NextResponse } from "next/server";
import { getMuseumAccess } from "@/lib/museum-access";
import { getWalletsForRequest } from "@/lib/wallet-session";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const wallet = getWalletsForRequest(request)?.[0];
  const access = await getMuseumAccess(wallet);
  return NextResponse.json(access, { status: access.allowed ? 200 : 403 });
}
