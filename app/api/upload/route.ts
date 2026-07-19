import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth-admin";
import { uploadToPinata } from "@/lib/pinata";
import { validateUpload } from "@/lib/upload-security";
import { randomUUID } from "crypto";

export async function POST(request: NextRequest) {
  const auth = await getAdminUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: 401 });

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
    const { extension } = await validateUpload(file);
    const safeFileName = `${type}-${randomUUID()}.${extension}`;
    // Upload as public so the gateway can serve the image (blurred preview in app).
    // Locking/visibility is enforced in-app; without payment the UI only shows blurred NSFW.
    const cid = await uploadToPinata(file, safeFileName, { isPublic: true });
    return NextResponse.json({ cid });
  } catch (e) {
    console.error("[upload] rejected or failed:", e instanceof Error ? e.message : "unknown error");
    const isValidationError = e instanceof Error && [
      "Invalid upload size",
      "Unsupported upload type",
      "File content does not match its type",
    ].includes(e.message);
    return NextResponse.json(
      { error: isValidationError ? e.message : "Upload failed" },
      { status: isValidationError ? 400 : 500 }
    );
  }
}
