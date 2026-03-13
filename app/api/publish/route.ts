import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email || (ADMIN_EMAIL && user.email !== ADMIN_EMAIL)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { title, description, sfw_cid, nsfw_cid, animated_cid, price_usdc, price_animated_usdc } = body;

  const hasSfw = typeof sfw_cid === "string" && sfw_cid.trim().length > 0;
  const hasNsfw = typeof nsfw_cid === "string" && nsfw_cid.trim().length > 0;
  const hasAnimated = typeof animated_cid === "string" && animated_cid.trim().length > 0;
  if (!title || typeof price_usdc !== "number" || !(hasSfw || hasNsfw || hasAnimated)) {
    return NextResponse.json(
      { error: "title, price_usdc, and at least one of sfw_cid, nsfw_cid, or animated_cid required" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("content")
    .insert({
      title: String(title).trim(),
      description: description ? String(description).trim() : null,
      sfw_cid: hasSfw ? String(sfw_cid).trim() : null,
      nsfw_cid: hasNsfw ? String(nsfw_cid).trim() : null,
      animated_cid: hasAnimated ? String(animated_cid).trim() : null,
      price_usdc: Number(price_usdc),
      price_animated_usdc: typeof price_animated_usdc === "number" ? Number(price_animated_usdc) : 0,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ id: data.id });
}
