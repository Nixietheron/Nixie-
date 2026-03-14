import { NextRequest, NextResponse } from "next/server";
import { getNsfwCidIfAllowed, getAnimatedCidIfAllowed } from "@/lib/supabase/data";

const GATEWAY = "https://gateway.pinata.cloud/ipfs";

/** Simple CID format check (v0 Qm..., v1 bafy..., etc.) */
function isValidCid(cid: string): boolean {
  return /^[a-zA-Z0-9]+$/.test(cid) && cid.length >= 32 && cid.length <= 128;
}

export async function GET(request: NextRequest) {
  const contentId = request.nextUrl.searchParams.get("contentId");
  const cidParam = request.nextUrl.searchParams.get("cid");
  const walletMultiple = request.nextUrl.searchParams.getAll("wallet").filter(Boolean);
  const walletParam = request.nextUrl.searchParams.get("wallet") ?? null;
  const wallets =
    walletMultiple.length > 0
      ? walletMultiple
      : walletParam
        ? walletParam.split(",").map((w) => w.trim()).filter(Boolean)
        : null;
  const type = request.nextUrl.searchParams.get("type"); // "animated" | undefined (nsfw)

  let cid: string | null = null;

  if (cidParam) {
    // Public proxy: ?cid=... (stories, SFW previews, etc.)
    if (!isValidCid(cidParam)) {
      return NextResponse.json({ error: "Invalid cid" }, { status: 400 });
    }
    cid = cidParam;
  } else if (contentId) {
    // Protected: ?contentId=...&wallet=... [&type=animated]. wallet can be comma-separated (Base + Solana).
    if (type === "animated") {
      cid = await getAnimatedCidIfAllowed(wallets, contentId);
    } else {
      cid = await getNsfwCidIfAllowed(wallets, contentId);
    }
    if (!cid) {
      return new NextResponse(null, { status: 403 });
    }
  } else {
    return NextResponse.json({ error: "Missing cid or contentId" }, { status: 400 });
  }

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
    });

    if (!res.ok) {
      return new NextResponse(null, { status: res.status });
    }

    const contentType = res.headers.get("content-type") || "image/*";
    const body = await res.arrayBuffer();
    return new NextResponse(body, {
      headers: {
        "content-type": contentType,
        "cache-control": "private, max-age=86400",
      },
    });
  } catch (e) {
    console.error("[ipfs-image] fetch error:", e);
    return new NextResponse(null, { status: 502 });
  }
}
