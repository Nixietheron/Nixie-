import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth-admin";
import {
  getDmThreadForAdmin,
  getDmMessagesForAdmin,
  addDmAdminReply,
} from "@/lib/supabase/data";

export const dynamic = "force-dynamic";

/** GET: admin gets thread + messages. */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const auth = await getAdminUser();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }
  const { threadId } = await params;
  const thread = await getDmThreadForAdmin(threadId);
  if (!thread) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  }
  const messages = await getDmMessagesForAdmin(threadId);
  return NextResponse.json({ thread, messages });
}

/** POST: admin replies. Body: { body } */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const auth = await getAdminUser();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }
  const { threadId } = await params;
  const body = await request.json().catch(() => ({}));
  const replyBody = (body.body as string)?.trim();
  if (!replyBody) {
    return NextResponse.json({ error: "body required" }, { status: 400 });
  }
  const thread = await getDmThreadForAdmin(threadId);
  if (!thread) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  }
  const { error } = await addDmAdminReply(threadId, replyBody);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const messages = await getDmMessagesForAdmin(threadId);
  return NextResponse.json({ thread, messages });
}
