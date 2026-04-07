/**
 * Base App / Coinbase Wallet in-app browser heuristics (UA).
 * Used on the server for implicit wallet session; client uses the same rules to pick the auth path.
 */

export function isBaseAppUserAgent(userAgent: string | null | undefined): boolean {
  if (!userAgent) return false;
  return /\bBaseApp\b/i.test(userAgent) || /\bCoinbase\b/i.test(userAgent) || /\bCBW\b/i.test(userAgent);
}

/** Client: true when the in-app browser looks like Base App / Coinbase Wallet. */
export function isBaseAppLike(): boolean {
  if (typeof window === "undefined") return false;
  return isBaseAppUserAgent(navigator.userAgent);
}
