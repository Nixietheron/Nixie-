import { NextRequest, NextResponse } from "next/server";
import { getWalletsForRequest } from "@/lib/wallet-session";
import { getMuseumAccess } from "@/lib/museum-access";
import { createAdminClient } from "@/lib/supabase/server";

const GATEWAY = "https://gateway.pinata.cloud/ipfs";

/** Simple CID format check (v0 Qm..., v1 bafy..., etc.) */
function isValidCid(cid: string): boolean {
  return /^[a-zA-Z0-9]+$/.test(cid) && cid.length >= 32 && cid.length <= 128;
}

export async function GET(request: NextRequest) {
  const contentId = request.nextUrl.searchParams.get("contentId");
  const cidParam = request.nextUrl.searchParams.get("cid");
  const sessionWallets = getWalletsForRequest(request);
  const wallet = sessionWallets?.[0];
  const type = request.nextUrl.searchParams.get("type"); // "sfw" | "nsfw" | "animated"

  let cid: string | null = null;

  if (cidParam) {
    if (!isValidCid(cidParam)) {
      return NextResponse.json({ error: "Invalid cid" }, { status: 400 });
    }
    cid = cidParam;
  } else if (contentId) {
    if (!wallet) return new NextResponse(null, { status: 401 });
    const access = await getMuseumAccess(wallet);
    if (!access.allowed) return new NextResponse(null, { status: 403 });
    if (type === "animated") {
      const { data } = await createAdminClient().from("content").select("animated_cid").eq("id", contentId).maybeSingle();
      cid = data?.animated_cid ?? null;
    } else if (type === "sfw") {
      const { data } = await createAdminClient().from("content").select("sfw_cid").eq("id", contentId).maybeSingle();
      cid = data?.sfw_cid ?? null;
    } else {
      const { data } = await createAdminClient().from("content").select("nsfw_cid").eq("id", contentId).maybeSingle();
      cid = data?.nsfw_cid ?? null;
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
