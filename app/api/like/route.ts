import { NextRequest, NextResponse } from "next/server";
import { likeContent, unlikeContent } from "@/lib/supabase/data";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { wallet, contentId, action } = body;
  if (!wallet || !contentId) {
    return NextResponse.json(
      { error: "wallet and contentId required" },
      { status: 400 }
    );
  }
  const { error } =
    action === "unlike"
      ? await unlikeContent(wallet, contentId)
      : await likeContent(wallet, contentId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
