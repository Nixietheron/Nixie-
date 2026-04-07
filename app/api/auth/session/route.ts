import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { WALLET_SESSION_COOKIE, verifySessionCookie } from "@/lib/wallet-session";

export const dynamic = "force-dynamic";

export async function GET() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(WALLET_SESSION_COOKIE)?.value;
  const session = verifySessionCookie(raw);
  if (!session) {
    return NextResponse.json({ authenticated: false, evm: null, svm: null });
  }
  return NextResponse.json({
    authenticated: true,
    evm: session.evm ?? null,
    svm: session.svm ?? null,
  });
}
