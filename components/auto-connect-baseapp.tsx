"use client";

import { useEffect, useMemo, useRef } from "react";
import { useAccount, useConnect } from "wagmi";

function looksLikeBaseInAppBrowser(): boolean {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent || "";
  const ref = document.referrer || "";

  // Base App does not publicly guarantee a stable UA; use a conservative heuristic,
  // but allow a fallback path when there is clearly no injected EVM provider.
  const uaHint =
    /\bBaseApp\b/i.test(ua) ||
    /\bBase\b/i.test(ua) ||
    /\bCoinbase\b/i.test(ua) ||
    /\bCBW\b/i.test(ua);
  const refHint = /base\.app/i.test(ref) || /base\.dev/i.test(ref);

  // Mobile-only heuristic (Base App runs a mobile in-app browser).
  const isMobile = /Android|iPhone|iPad|iPod/i.test(ua);

  const noInjectedEvm =
    typeof window !== "undefined" && (window as unknown as { ethereum?: unknown }).ethereum == null;

  // If we have no injected provider on mobile, it's very likely an in-app context.
  // This keeps web desktop from unexpectedly popping Base Account flows.
  return isMobile && (refHint || uaHint || noInjectedEvm);
}

export function AutoConnectBaseApp() {
  const { isConnected } = useAccount();
  const { connectAsync, connectors, status } = useConnect();
  const attemptedRef = useRef(false);

  const baseAccountConnector = useMemo(() => {
    const byId = connectors.find((c) => c.id === "baseAccount");
    if (byId) return byId;
    return connectors.find((c) => /base/i.test(c.name) || /coinbase/i.test(c.name));
  }, [connectors]);

  useEffect(() => {
    if (attemptedRef.current) return;
    if (isConnected) return;
    if (status === "pending") return;
    if (!baseAccountConnector) return;
    if (!looksLikeBaseInAppBrowser()) return;

    attemptedRef.current = true;

    // Best-effort: Base App may allow this without a user gesture, but web browsers often won't.
    // If it fails, user can still connect via the normal UI.
    connectAsync({ connector: baseAccountConnector }).catch((e) => {
      // Debug only; helps confirm whether connector is present and why it fails in Base App.
      console.error("AutoConnectBaseApp failed", e, {
        connectors: connectors.map((c) => ({ id: c.id, name: c.name })),
      });
    });
  }, [isConnected, status, baseAccountConnector, connectAsync]);

  return null;
}

