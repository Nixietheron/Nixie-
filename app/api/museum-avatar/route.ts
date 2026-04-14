import { promises as fs } from "node:fs";
import path from "node:path";

export async function GET() {
  try {
    const modelPath = path.join(process.cwd(), "Nixie.glb");
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
