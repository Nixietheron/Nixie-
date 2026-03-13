import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth-admin";
import { deleteStory } from "@/lib/supabase/data";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAdminUser();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }
  const { id } = await params;
  const { error } = await deleteStory(id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
