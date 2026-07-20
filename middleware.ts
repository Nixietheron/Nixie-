import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { createServerClient } from "@supabase/ssr";

const hasSupabase = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function securityPolicy(nonce: string): string {
  // Next.js development tooling (webpack + React Refresh) evaluates generated
  // source strings. Keep this exception local to development builds; the
  // production CSP remains nonce-based without unsafe-eval.
  const developmentEval = process.env.NODE_ENV === "production" ? "" : " 'unsafe-eval'";
  // Three.js loaders may instantiate small WASM decoders in production. This is
  // narrower than enabling general unsafe-eval and keeps the museum compatible
  // with GLTF/texture tooling.
  const wasmEval = process.env.NODE_ENV === "production" ? " 'wasm-unsafe-eval'" : "";
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${developmentEval}${wasmEval}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://gateway.pinata.cloud https://images.unsplash.com https://source.unsplash.com",
    "font-src 'self' data:",
    "media-src 'self' blob: https://gateway.pinata.cloud",
    "connect-src 'self' blob: https://*.supabase.co wss://*.supabase.co https://rpc.mainnet.chain.robinhood.com https://*.g.alchemy.com https://*.walletconnect.com wss://*.walletconnect.com https://*.walletconnect.org wss://*.walletconnect.org https://*.reown.com wss://*.reown.com https://*.coinbase.com wss://*.coinbase.com https://*.metamask.io wss://*.metamask.io",
    "frame-src 'self' https://*.walletconnect.com https://*.walletconnect.org https://*.reown.com https://*.coinbase.com https://*.metamask.io",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ];
  if (process.env.NODE_ENV === "production") directives.push("upgrade-insecure-requests");
  return directives.join("; ");
}

function applySecurityHeaders(response: NextResponse, csp: string): NextResponse {
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  return response;
}

function canonicalHostnameFromEnv(): string | null {
  const u = process.env.NEXT_PUBLIC_APP_URL;
  if (!u) return null;
  try {
    return new URL(u).hostname;
  } catch {
    return null;
  }
}

function bareHostname(host: string): string {
  return host.startsWith("www.") ? host.slice(4) : host;
}

/** One hostname per cookie jar: redirect www ↔ apex to match NEXT_PUBLIC_APP_URL. */
function redirectToCanonicalHost(request: NextRequest): NextResponse | null {
  const canonical = canonicalHostnameFromEnv();
  const host = request.headers.get("host")?.split(":")[0] ?? "";
  if (!canonical || !host || host === canonical) return null;
  const local = host.includes("localhost") || host.endsWith(".local");
  if (local) return null;
  if (bareHostname(host) !== bareHostname(canonical)) return null;
  const url = request.nextUrl.clone();
  url.hostname = canonical;
  url.protocol = "https:";
  return NextResponse.redirect(url, 308);
}

export async function middleware(request: NextRequest) {
  const nonce = crypto.randomUUID().replaceAll("-", "");
  const csp = securityPolicy(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const canonicalRedirect = redirectToCanonicalHost(request);
  if (canonicalRedirect) return applySecurityHeaders(canonicalRedirect, csp);

  const path = request.nextUrl.pathname;
  if (path.startsWith("/admin") && !path.startsWith("/admin/login")) {
    const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    if (!hasSupabase || !adminEmail) {
      return applySecurityHeaders(
        NextResponse.redirect(new URL("/admin/login?error=configuration", request.url)),
        csp
      );
    }
    let response = NextResponse.next({
      request: { headers: requestHeaders },
    });
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options ?? {})
            );
          },
        },
      }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email || user.email.trim().toLowerCase() !== adminEmail) {
      return applySecurityHeaders(NextResponse.redirect(new URL("/admin/login", request.url)), csp);
    }
    return applySecurityHeaders(response, csp);
  }
  return applySecurityHeaders(await updateSession(request, requestHeaders), csp);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
