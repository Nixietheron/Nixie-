import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { uploadToPinata } from "@/lib/pinata";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email || (ADMIN_EMAIL && user.email !== ADMIN_EMAIL)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const type = formData.get("type") as string; // "sfw" | "nsfw" | "animated"
  const file = formData.get("file") as File | null;

  if (!file || !["sfw", "nsfw", "animated"].includes(type)) {
    return NextResponse.json(
      { error: "Invalid type or missing file" },
      { status: 400 }
    );
  }

  try {
    // Upload as public so the gateway can serve the image (blurred preview in app).
    // Locking/visibility is enforced in-app; without payment the UI only shows blurred NSFW.
    const cid = await uploadToPinata(file, file.name, { isPublic: true });
    return NextResponse.json({ cid });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
