import { NextRequest, NextResponse } from "next/server";
import { SiweMessage } from "siwe";
import { getAddress } from "viem";
import { cookies } from "next/headers";
import {
  AUTH_NONCE_COOKIE,
  mergeSession,
  signSession,
  verifySessionCookie,
  WALLET_SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/wallet-session";

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function requestHost(request: NextRequest): string {
  const xf = request.headers.get("x-forwarded-host");
  const raw = xf ?? request.headers.get("host") ?? "";
  return raw.split(",")[0]?.trim() ?? "";
}

function hostFromUrl(value: string | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value).host;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  let body: { message?: string; signature?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const messageStr = typeof body.message === "string" ? body.message : "";
  const signature = typeof body.signature === "string" ? body.signature : "";
  if (!messageStr || !signature) {
    return NextResponse.json({ error: "message and signature required" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const nonceCookie = cookieStore.get(AUTH_NONCE_COOKIE)?.value;
  if (!nonceCookie) {
    return NextResponse.json({ error: "Missing nonce — call GET /api/auth/nonce first" }, { status: 400 });
  }

  const requestDomain = requestHost(request);
  if (!requestDomain) {
    return NextResponse.json({ error: "Could not determine host" }, { status: 400 });
  }

  try {
    const siweMessage = new SiweMessage(messageStr);
    const allowedDomains = new Set<string>([
      requestDomain,
      request.nextUrl.host,
      hostFromUrl(process.env.NEXT_PUBLIC_APP_URL) ?? "",
      hostFromUrl(process.env.APP_URL) ?? "",
    ].filter(Boolean));
    if (!allowedDomains.has(siweMessage.domain)) {
      return NextResponse.json({ error: `SIWE domain mismatch: ${siweMessage.domain}` }, { status: 401 });
    }
    const result = await siweMessage.verify({
      signature,
      nonce: nonceCookie,
    });
    if (!result.success) {
      return NextResponse.json(
        { error: result.error?.type ?? "SIWE verification failed" },
        { status: 401 }
      );
    }
    const address = getAddress(siweMessage.address);
    const existingRaw = cookieStore.get(WALLET_SESSION_COOKIE)?.value;
    const existing = verifySessionCookie(existingRaw);
    const merged = mergeSession(existing, { evm: address });
    const token = signSession(merged);

    const res = NextResponse.json({ ok: true, address });
    res.cookies.set(AUTH_NONCE_COOKIE, "", { path: "/", maxAge: 0 });
    res.cookies.set(WALLET_SESSION_COOKIE, token, sessionCookieOptions(SESSION_TTL_MS));
    return res;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Verification failed";
    return NextResponse.json({ error: msg }, { status: 401 });
  }
}
