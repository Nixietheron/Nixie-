import { NextRequest, NextResponse } from "next/server";
import { addContentView } from "@/lib/supabase/data";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const contentId = typeof body?.contentId === "string" ? body.contentId.trim() : "";
    const eventType = body?.eventType === "click" ? "click" : "impression";

    if (!contentId) {
      return NextResponse.json({ error: "contentId is required" }, { status: 400 });
    }

    const { error } = await addContentView(contentId, eventType);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to record view" },
      { status: 500 }
    );
  }
}
