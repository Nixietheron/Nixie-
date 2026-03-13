import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth-admin";
import { createStory, getStoriesForAdmin } from "@/lib/supabase/data";

export async function GET() {
  const auth = await getAdminUser();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }
  const list = await getStoriesForAdmin();
  return NextResponse.json({ stories: list });
}

export async function POST(request: NextRequest) {
  const auth = await getAdminUser();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }
  const body = await request.json();
  const nsfw_cid = body.nsfw_cid ?? null;
  const animated_cid = body.animated_cid ?? null;
  const image_cid_raw = body.image_cid;
  // Circle preview: need at least one of image, nsfw, or animated
  const image_cid =
    typeof image_cid_raw === "string" && image_cid_raw
      ? image_cid_raw
      : nsfw_cid
        ? nsfw_cid
        : animated_cid
          ? animated_cid
          : null;
  if (!image_cid) {
    return NextResponse.json(
      { error: "At least one of image_cid, nsfw_cid, or animated_cid required" },
      { status: 400 }
    );
  }
  const is_paid = Boolean(body.is_paid);
  const price_usdc = is_paid ? Number(body.price_usdc) ?? 0 : 0;
  const duration_hours = Number(body.duration_hours) || 24;
  if (duration_hours < 1 || duration_hours > 168) {
    return NextResponse.json({ error: "duration_hours must be 1–168" }, { status: 400 });
  }
  const { data, error } = await createStory({
    image_cid,
    nsfw_cid: nsfw_cid || null,
    animated_cid: animated_cid || null,
    is_paid,
    price_usdc,
    duration_hours,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ id: data?.id });
}
