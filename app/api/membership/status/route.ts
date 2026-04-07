import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getActiveMembershipForWallets } from "@/lib/supabase/data";
import { getWalletArray, verifySessionCookie, WALLET_SESSION_COOKIE } from "@/lib/wallet-session";

export const dynamic = "force-dynamic";

export async function GET() {
  const cookieStore = await cookies();
  const session = verifySessionCookie(cookieStore.get(WALLET_SESSION_COOKIE)?.value);
  if (!session) {
    return NextResponse.json({ active: false, wallet: null, endsAt: null, daysLeft: 0 });
  }
  const wallets = getWalletArray(session);
  if (!wallets.length) {
    return NextResponse.json({ active: false, wallet: null, endsAt: null, daysLeft: 0 });
  }
  const membership = await getActiveMembershipForWallets(wallets);
  return NextResponse.json(membership);
}
