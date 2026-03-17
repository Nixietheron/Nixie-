"use client";

import { useEffect, useMemo, useRef } from "react";
import { useAccount, useConnect } from "wagmi";

function looksLikeBaseInAppBrowser(): boolean {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent || "";
  const ref = document.referrer || "";

  // Base App does not publicly guarantee a stable UA; keep this heuristic conservative.
  // We gate auto-connect to reduce unexpected connects on normal web.
  const uaHint =
    /\bBaseApp\b/i.test(ua) ||
    /\bBase\b/i.test(ua) ||
    /\bCoinbase\b/i.test(ua) ||
    /\bCBW\b/i.test(ua);
  const refHint = /base\.app/i.test(ref) || /base\.dev/i.test(ref);

  // Mobile-only heuristic (Base App runs a mobile in-app browser).
  const isMobile = /Android|iPhone|iPad|iPod/i.test(ua);

  return isMobile && (refHint || uaHint);
}

export function AutoConnectBaseApp() {
  const { isConnected } = useAccount();
  const { connectAsync, connectors, status } = useConnect();
  const attemptedRef = useRef(false);

  const baseAccountConnector = useMemo(
    () => connectors.find((c) => c.id === "baseAccount"),
    [connectors],
  );

  useEffect(() => {
    if (attemptedRef.current) return;
    if (isConnected) return;
    if (status === "pending") return;
    if (!baseAccountConnector) return;
    if (!looksLikeBaseInAppBrowser()) return;

    attemptedRef.current = true;

    // Best-effort: Base App may allow this without a user gesture, but web browsers often won't.
    // If it fails, user can still connect via the normal UI.
    connectAsync({ connector: baseAccountConnector }).catch(() => {});
  }, [isConnected, status, baseAccountConnector, connectAsync]);

  return null;
}

