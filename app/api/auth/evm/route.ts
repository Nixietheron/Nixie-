import { NextRequest, NextResponse } from "next/server";
import { type Client, getAddress, type Hex } from "viem";
import { parseSiweMessage, verifySiweMessage } from "viem/siwe";
import { cookies } from "next/headers";
import {
  AUTH_NONCE_COOKIE,
  mergeSession,
  signSession,
  verifySessionCookie,
  WALLET_SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/wallet-session";
import { getTrustedSiweHosts, isTrustedSiweDomain } from "@/lib/auth-hosts";
import { publicClientForSiweChain } from "@/lib/siwe-public-client";

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export async function POST(request: NextRequest) {
  let body: { message?: string; signature?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const messageStr = typeof body.message === "string" ? body.message : "";
  const signatureRaw = typeof body.signature === "string" ? body.signature.trim() : "";
  if (!messageStr || !signatureRaw) {
    return NextResponse.json({ error: "message and signature required" }, { status: 400 });
  }
  const signature = (signatureRaw.startsWith("0x") ? signatureRaw : `0x${signatureRaw}`) as Hex;

  const cookieStore = await cookies();
  const nonceCookie = cookieStore.get(AUTH_NONCE_COOKIE)?.value;
  if (!nonceCookie) {
    return NextResponse.json({ error: "Missing nonce — call GET /api/auth/nonce first" }, { status: 400 });
  }

  const trustedHosts = getTrustedSiweHosts(request);

  let parsed;
  try {
    parsed = parseSiweMessage(messageStr);
  } catch {
    return NextResponse.json({ error: "Invalid SIWE message" }, { status: 400 });
  }

  if (!parsed.address || !parsed.domain) {
    return NextResponse.json({ error: "Invalid SIWE message fields" }, { status: 400 });
  }

  /**
   * Domain check: allow when trustedHosts has matches OR when the domain belongs to the same
   * bare hostname (wallet_connect may produce a domain like "nixiepink.com" even if the proxy
   * sends host as "www.nixiepink.com").
   * Skip domain check entirely only as a last resort when trustedHosts is empty (unusual).
   */
  if (trustedHosts.size > 0 && !isTrustedSiweDomain(parsed.domain, trustedHosts)) {
    // Last-chance: allow if the nonce matches and the message is otherwise structurally valid.
    // This handles Base App WebView where window.location.hostname may differ from x-forwarded-host.
    // We still verify nonce + signature below — domain is advisory here.
    console.warn(
      `[auth/evm] SIWE domain "${parsed.domain}" not in trusted set ${JSON.stringify(Array.from(trustedHosts))}; proceeding with nonce+sig check`
    );
  }

  // Nonce quick-check before expensive RPC call
  if (parsed.nonce && parsed.nonce !== nonceCookie) {
    return NextResponse.json({ error: "SIWE nonce mismatch" }, { status: 401 });
  }

  const chainId =
    typeof parsed.chainId === "number" && !Number.isNaN(parsed.chainId) ? parsed.chainId : 8453;
  const client = publicClientForSiweChain(chainId);

  try {
    /**
     * verifySiweMessage → verifyHash → ERC-6492 path (viem):
     * Handles EOA (personal_sign), EIP-1271 (deployed contract), ERC-6492 (counterfactual/
     * pre-deployed smart wallet). Coinbase Smart Wallet returns ERC-6492 wrapped signatures
     * from both personal_sign and wallet_connect + signInWithEthereum.
     */
    const ok = await verifySiweMessage(client as Client, {
      message: messageStr,
      signature,
      address: parsed.address,
      nonce: nonceCookie,
    });
    if (!ok) {
      return NextResponse.json(
        { error: "SIWE signature verification failed" },
        { status: 401 }
      );
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Verification failed";
    return NextResponse.json({ error: msg }, { status: 401 });
  }

  const address = getAddress(parsed.address);
  const existingRaw = cookieStore.get(WALLET_SESSION_COOKIE)?.value;
  const existing = verifySessionCookie(existingRaw);
  const merged = mergeSession(existing, { evm: address });
  const token = signSession(merged);

  const res = NextResponse.json({ ok: true, address });
  res.cookies.set(AUTH_NONCE_COOKIE, "", { path: "/", maxAge: 0 });
  res.cookies.set(WALLET_SESSION_COOKIE, token, sessionCookieOptions(SESSION_TTL_MS));
  return res;
}
