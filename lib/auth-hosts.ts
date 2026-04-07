import type { NextRequest } from "next/server";

/** Normalize host without port. */
function hostOnly(value: string): string {
  return value.split(",")[0]?.trim()?.split(":")[0] ?? "";
}

/**
 * Hostnames allowed for SIWE `domain` verification (proxy, www vs apex, Base App WebView).
 */
export function getTrustedSiweHosts(request: NextRequest): Set<string> {
  const set = new Set<string>();
  const xf = request.headers.get("x-forwarded-host");
  const hHost = request.headers.get("host");
  for (const raw of [xf, hHost]) {
    const h = hostOnly(raw ?? "");
    if (h) {
      set.add(h);
      if (h.startsWith("www.")) set.add(h.slice(4));
      else set.add(`www.${h}`);
    }
  }
  try {
    const nu = request.nextUrl.host;
    const nh = hostOnly(nu);
    if (nh) {
      set.add(nh);
      if (nh.startsWith("www.")) set.add(nh.slice(4));
      else set.add(`www.${nh}`);
    }
  } catch {
    /* ignore */
  }
  for (const key of ["NEXT_PUBLIC_APP_URL", "APP_URL"] as const) {
    const v = process.env[key];
    if (!v) continue;
    try {
      const h = hostOnly(new URL(v).host);
      if (h) {
        set.add(h);
        if (h.startsWith("www.")) set.add(h.slice(4));
        else set.add(`www.${h}`);
      }
    } catch {
      /* ignore */
    }
  }
  set.delete("");
  return set;
}
