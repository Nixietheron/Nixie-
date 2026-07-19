import type { NextRequest } from "next/server";

/** Normalize host without port. */
function hostOnly(value: string): string {
  return value.split(",")[0]?.trim()?.split(":")[0] ?? "";
}

/**
 * Hostnames allowed for SIWE `domain` verification (proxy, www vs apex).
 */
export function getTrustedSiweHosts(request: NextRequest): Set<string> {
  const set = new Set<string>();
  const addHost = (h: string) => {
    if (!h) return;
    set.add(h);
    if (h.startsWith("www.")) set.add(h.slice(4));
    else set.add(`www.${h}`);
  };

  // Production trust comes only from configured canonical origins, never Host headers.
  for (const key of ["NEXT_PUBLIC_APP_URL", "APP_URL"] as const) {
    const v = process.env[key];
    if (!v) continue;
    try {
      const h = hostOnly(new URL(v).host);
      addHost(h);
    } catch {
      /* ignore */
    }
  }

  if (process.env.NODE_ENV !== "production") {
    const requestHost = hostOnly(request.nextUrl.host);
    if (["localhost", "127.0.0.1", "::1"].includes(requestHost)) addHost(requestHost);
  }
  set.delete("");
  return set;
}

/** Match SIWE `domain` (may include :port) against trusted host set. */
export function isTrustedSiweDomain(domain: string, trusted: Set<string>): boolean {
  if (trusted.has(domain)) return true;
  const bare = hostOnly(domain);
  if (bare && trusted.has(bare)) return true;
  for (const t of Array.from(trusted)) {
    if (hostOnly(t) === bare) return true;
  }
  return false;
}
