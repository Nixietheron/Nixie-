import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { createServerClient } from "@supabase/ssr";

const hasSupabase = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

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
  const canonicalRedirect = redirectToCanonicalHost(request);
  if (canonicalRedirect) return canonicalRedirect;

  const path = request.nextUrl.pathname;
  if (path.startsWith("/admin") && !path.startsWith("/admin/login")) {
    if (!hasSupabase) {
      return NextResponse.next({ request: { headers: request.headers } });
    }
    let response = NextResponse.next({
      request: { headers: request.headers },
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
    if (!user) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
    return response;
  }
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
