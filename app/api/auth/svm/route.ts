import { NextRequest, NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import nacl from "tweetnacl";
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

function buildLoginMessage(nonce: string): string {
  return `Nixie\nSign in to verify wallet ownership.\nNonce: ${nonce}`;
}

export async function POST(request: NextRequest) {
  let body: { publicKey?: string; message?: string; signature?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const publicKeyStr = typeof body.publicKey === "string" ? body.publicKey.trim() : "";
  const message = typeof body.message === "string" ? body.message : "";
  const signatureB58 = typeof body.signature === "string" ? body.signature.trim() : "";
  if (!publicKeyStr || !message || !signatureB58) {
    return NextResponse.json(
      { error: "publicKey, message, and signature required" },
      { status: 400 }
    );
  }

  const cookieStore = await cookies();
  const nonceCookie = cookieStore.get(AUTH_NONCE_COOKIE)?.value;
  if (!nonceCookie) {
    return NextResponse.json({ error: "Missing nonce — call GET /api/auth/nonce first" }, { status: 400 });
  }

  const expected = buildLoginMessage(nonceCookie);
  if (message !== expected) {
    return NextResponse.json({ error: "Message mismatch" }, { status: 400 });
  }

  let pub: PublicKey;
  try {
    pub = new PublicKey(publicKeyStr);
  } catch {
    return NextResponse.json({ error: "Invalid public key" }, { status: 400 });
  }

  if (pub.toBase58() !== publicKeyStr) {
    return NextResponse.json({ error: "Public key format invalid" }, { status: 400 });
  }

  try {
    const messageBytes = new TextEncoder().encode(message);
    const sigBytes = bs58.decode(signatureB58);
    const ok = nacl.sign.detached.verify(messageBytes, sigBytes, pub.toBytes());
    if (!ok) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ error: "Signature verification failed" }, { status: 401 });
  }

  const svm = pub.toBase58();
  const existingRaw = cookieStore.get(WALLET_SESSION_COOKIE)?.value;
  const existing = verifySessionCookie(existingRaw);
  const merged = mergeSession(existing, { svm });
  const token = signSession(merged);

  const res = NextResponse.json({ ok: true, publicKey: svm });
  res.cookies.set(AUTH_NONCE_COOKIE, "", { path: "/", maxAge: 0 });
  res.cookies.set(WALLET_SESSION_COOKIE, token, sessionCookieOptions(SESSION_TTL_MS));
  return res;
}
