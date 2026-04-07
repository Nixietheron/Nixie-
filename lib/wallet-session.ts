import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";
import { getAddress, isAddress } from "viem";

export const WALLET_SESSION_COOKIE = "nixie_wallet_session";
export const AUTH_NONCE_COOKIE = "nixie_auth_nonce";

export type WalletSessionPayload = {
  evm?: string;
  svm?: string;
  exp: number;
};

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function getSecret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("AUTH_SECRET is required in production");
    }
    return "dev-insecure-nixie-auth-secret-change-me";
  }
  return s;
}

export function signSession(payload: WalletSessionPayload): string {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = createHmac("sha256", getSecret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifySessionCookie(value: string | undefined): WalletSessionPayload | null {
  if (!value?.includes(".")) return null;
  const [body, sig] = value.split(".", 2);
  if (!body || !sig) return null;
  const expected = createHmac("sha256", getSecret()).update(body).digest("base64url");
  try {
    if (!timingSafeEqual(Buffer.from(sig, "utf8"), Buffer.from(expected, "utf8"))) return null;
  } catch {
    return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as WalletSessionPayload;
    if (typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function parseWalletSession(request: NextRequest): WalletSessionPayload | null {
  return verifySessionCookie(request.cookies.get(WALLET_SESSION_COOKIE)?.value);
}

export function getWalletArray(session: WalletSessionPayload): string[] {
  const out: string[] = [];
  if (session.evm) out.push(getAddress(session.evm));
  if (session.svm) out.push(session.svm);
  return out;
}

export function getWalletsForRequest(request: NextRequest): string[] | undefined {
  const s = parseWalletSession(request);
  if (!s) return undefined;
  return getWalletArray(s);
}

export function mergeSession(
  existing: WalletSessionPayload | null,
  patch: { evm?: string; svm?: string }
): WalletSessionPayload {
  const exp = Date.now() + SESSION_TTL_MS;
  return {
    evm: patch.evm !== undefined ? patch.evm : existing?.evm,
    svm: patch.svm !== undefined ? patch.svm : existing?.svm,
    exp,
  };
}

export function assertWalletMatchesSession(session: WalletSessionPayload | null, wallet: string): boolean {
  if (!session) return false;
  const w = wallet.trim();
  if (isAddress(w)) {
    return !!session.evm && getAddress(session.evm) === getAddress(w);
  }
  return !!session.svm && session.svm === w;
}

export function sessionCookieOptions(expiresMs: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: Math.floor(expiresMs / 1000),
  };
}

export function generateAuthNonce(): string {
  return randomBytes(16).toString("hex");
}
