import { NextResponse } from "next/server";
import {
  AUTH_NONCE_COOKIE,
  generateAuthNonce,
  sessionCookieOptions,
} from "@/lib/wallet-session";

export const dynamic = "force-dynamic";

const NONCE_TTL_MS = 10 * 60 * 1000;

export async function GET() {
  const nonce = generateAuthNonce();
  const res = NextResponse.json({ nonce });
  res.cookies.set(AUTH_NONCE_COOKIE, nonce, sessionCookieOptions(NONCE_TTL_MS));
  return res;
}
