import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth-admin";
import { getContentListForAdmin } from "@/lib/supabase/data";

export async function GET() {
  const auth = await getAdminUser();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }
  const list = await getContentListForAdmin();
  return NextResponse.json({ content: list });
}
