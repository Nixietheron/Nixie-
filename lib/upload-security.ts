const MAX_UPLOAD_BYTES = 30 * 1024 * 1024;

const EXTENSIONS: Record<string, string> = {
  "image/avif": "avif",
  "image/gif": "gif",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "video/mp4": "mp4",
  "video/webm": "webm",
};

function ascii(bytes: Uint8Array, start: number, end: number): string {
  return String.fromCharCode(...bytes.slice(start, end));
}

function detectedMime(bytes: Uint8Array): string | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && bytes.slice(0, 8).every((b, i) => b === [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a][i])) return "image/png";
  if (ascii(bytes, 0, 6) === "GIF87a" || ascii(bytes, 0, 6) === "GIF89a") return "image/gif";
  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 12) === "WEBP") return "image/webp";
  if (ascii(bytes, 4, 8) === "ftyp") {
    const brand = ascii(bytes, 8, 12);
    if (["avif", "avis"].includes(brand)) return "image/avif";
    return "video/mp4";
  }
  if (bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) return "video/webm";
  return null;
}

export async function validateUpload(file: File): Promise<{ mime: string; extension: string }> {
  if (file.size <= 0 || file.size > MAX_UPLOAD_BYTES) throw new Error("Invalid upload size");
  const claimed = file.type.trim().toLowerCase();
  if (!EXTENSIONS[claimed]) throw new Error("Unsupported upload type");

  const header = new Uint8Array(await file.slice(0, 32).arrayBuffer());
  const detected = detectedMime(header);
  if (!detected || detected !== claimed) throw new Error("File content does not match its type");
  return { mime: detected, extension: EXTENSIONS[detected] };
}
