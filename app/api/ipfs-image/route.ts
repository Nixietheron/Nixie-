import { NextRequest, NextResponse } from "next/server";
import { getWalletsForRequest } from "@/lib/wallet-session";
import { getMuseumAccess } from "@/lib/museum-access";
import { createAdminClient } from "@/lib/supabase/server";

const GATEWAY = "https://gateway.pinata.cloud/ipfs";
const MAX_MEDIA_BYTES = 30 * 1024 * 1024;
const SAFE_MEDIA_TYPES = new Set([
  "image/avif",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/webm",
]);

/** Simple CID format check (v0 Qm..., v1 bafy..., etc.) */
function isValidCid(cid: string): boolean {
  return /^[a-zA-Z0-9]+$/.test(cid) && cid.length >= 32 && cid.length <= 128;
}

export async function GET(request: NextRequest) {
  const contentId = request.nextUrl.searchParams.get("contentId");
  const sessionWallets = getWalletsForRequest(request);
  const wallet = sessionWallets?.[0];
  const type = request.nextUrl.searchParams.get("type"); // "sfw" | "nsfw" | "animated"

  if (!contentId) {
    return NextResponse.json({ error: "Missing contentId" }, { status: 400 });
  }
  if (!type || !["sfw", "nsfw", "animated"].includes(type)) {
    return NextResponse.json({ error: "Invalid media type" }, { status: 400 });
  }
  if (!wallet) return new NextResponse(null, { status: 401 });

  const access = await getMuseumAccess(wallet);
  if (!access.allowed) return new NextResponse(null, { status: 403 });

  // Museum access is the only entitlement. Legacy per-item purchase/unlock
  // records must not gate NSFW or animated media after the holder check above.
  const cidColumn = type === "animated" ? "animated_cid" : type === "nsfw" ? "nsfw_cid" : "sfw_cid";
  const { data } = await createAdminClient()
    .from("content")
    .select(cidColumn)
    .eq("id", contentId)
    .maybeSingle();
  const cid = (data as Record<string, string | null> | null)?.[cidColumn] ?? null;

  if (!cid || !isValidCid(cid)) return new NextResponse(null, { status: 404 });

  const url = `${GATEWAY}/${cid}`;
  const headers: Record<string, string> = {};
  const token = process.env.PINATA_GATEWAY_TOKEN;
  if (token) {
    headers["x-pinata-gateway-token"] = token;
  }

  try {
    const res = await fetch(url, {
      headers,
      cache: "force-cache",
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      return new NextResponse(null, { status: res.status });
    }

    const contentType = (res.headers.get("content-type") || "")
      .split(";", 1)[0]
      .trim()
      .toLowerCase();
    if (!SAFE_MEDIA_TYPES.has(contentType)) {
      return new NextResponse(null, { status: 415 });
    }
    const declaredLength = Number(res.headers.get("content-length"));
    if (Number.isFinite(declaredLength) && declaredLength > MAX_MEDIA_BYTES) {
      return new NextResponse(null, { status: 413 });
    }
    const body = await res.arrayBuffer();
    if (body.byteLength > MAX_MEDIA_BYTES) {
      return new NextResponse(null, { status: 413 });
    }
    return new NextResponse(body, {
      headers: {
        "content-type": contentType,
        "cache-control": "private, max-age=86400",
        "content-disposition": "inline",
        "x-content-type-options": "nosniff",
        "content-security-policy": "default-src 'none'; sandbox",
      },
    });
  } catch (e) {
    console.error("[ipfs-image] fetch error:", e);
    return new NextResponse(null, { status: 502 });
  }
}
