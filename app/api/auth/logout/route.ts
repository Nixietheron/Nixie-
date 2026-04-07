import { NextResponse } from "next/server";
import { AUTH_NONCE_COOKIE, WALLET_SESSION_COOKIE } from "@/lib/wallet-session";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(WALLET_SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  res.cookies.set(AUTH_NONCE_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
