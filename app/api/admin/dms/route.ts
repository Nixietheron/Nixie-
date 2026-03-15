import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth-admin";
import { getDmThreadsForAdmin } from "@/lib/supabase/data";

export const dynamic = "force-dynamic";

/** GET: admin list of all DM threads. */
export async function GET() {
  const auth = await getAdminUser();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }
  const threads = await getDmThreadsForAdmin();
  return NextResponse.json({ threads });
}
