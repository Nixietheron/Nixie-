import { NextRequest, NextResponse } from "next/server";
import {
  getCommentsByContentId,
  addComment,
} from "@/lib/supabase/data";

export async function GET(request: NextRequest) {
  const contentId = request.nextUrl.searchParams.get("contentId");
  if (!contentId) {
    return NextResponse.json(
      { error: "contentId required" },
      { status: 400 }
    );
  }
  const comments = await getCommentsByContentId(contentId);
  return NextResponse.json({ comments });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { wallet, contentId, text } = body;
  if (!wallet || !contentId || !text?.trim()) {
    return NextResponse.json(
      { error: "wallet, contentId, and text required" },
      { status: 400 }
    );
  }
  const { comment, error } = await addComment(wallet, contentId, text.trim());
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ comment });
}
