import { NextRequest, NextResponse } from "next/server";
import { getAddress } from "viem";
import { cookies } from "next/headers";
import {
  mergeSession,
  signSession,
  verifySessionCookie,
  WALLET_SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/wallet-session";
import { isBaseAppUserAgent } from "@/lib/base-app-detect";

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Bind EVM address to HTTP session **without** SIWE — only for Base App / Coinbase Wallet UA.
 * Weaker than SIWE (UA can be spoofed); use only to avoid SIWE friction in Base App WebView.
 * Set `ALLOW_IMPLICIT_EVM_SESSION=false` to disable.
 */
export async function POST(request: NextRequest) {
  if (process.env.ALLOW_IMPLICIT_EVM_SESSION === "false") {
    return NextResponse.json({ error: "Implicit wallet session is disabled" }, { status: 403 });
  }

  if (!isBaseAppUserAgent(request.headers.get("user-agent"))) {
    return NextResponse.json(
      { error: "Implicit bind is only available from Base App / Coinbase Wallet" },
      { status: 403 }
    );
  }

  let body: { address?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const raw = typeof body.address === "string" ? body.address.trim() : "";
  if (!raw) {
    return NextResponse.json({ error: "address required" }, { status: 400 });
  }

  let address: `0x${string}`;
  try {
    address = getAddress(raw);
  } catch {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const existingRaw = cookieStore.get(WALLET_SESSION_COOKIE)?.value;
  const existing = verifySessionCookie(existingRaw);
  const merged = mergeSession(existing, { evm: address });
  const token = signSession(merged);

  const res = NextResponse.json({ ok: true, address, implicit: true });
  res.cookies.set(WALLET_SESSION_COOKIE, token, sessionCookieOptions(SESSION_TTL_MS));
  return res;
}
