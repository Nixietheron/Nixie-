import { promises as fs } from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";
 

export async function GET(request: NextRequest) {
  try {
    const avatar = new URL(request.url).searchParams.get("avatar");
    const fileName = avatar === "male" ? "MaleWalking.glb" : "nixie2.glb";
    const modelPath = path.join(process.cwd(), fileName);
    const data = await fs.readFile(modelPath);
    return new Response(data, {
      headers: {
        "Content-Type": "model/gltf-binary",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch {
    return Response.json({ error: "Avatar model not found" }, { status: 404 });
  }
}
