const PINATA_API = "https://api.pinata.cloud";

export async function uploadToPinata(
  file: File | Buffer,
  fileName: string,
  options?: { isPublic?: boolean }
): Promise<string> {
  const apiKey = process.env.PINATA_API_KEY;
  const secret = process.env.PINATA_SECRET_KEY;
  if (!apiKey || !secret) {
    throw new Error("Pinata API keys not configured");
  }

  const formData = new FormData();
  if (Buffer.isBuffer(file)) {
    formData.append("file", new Blob([file]) as Blob, fileName);
  } else {
    formData.append("file", file as Blob, fileName);
  }

  const metadata = JSON.stringify({
    name: fileName,
    keyvalues: options?.isPublic === false ? { visibility: "private" } : {},
  });
  formData.append("pinataMetadata", metadata);

  const res = await fetch(`${PINATA_API}/pinning/pinFileToIPFS`, {
    method: "POST",
    headers: {
      pinata_api_key: apiKey,
      pinata_secret_api_key: secret,
    },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Pinata upload failed: ${err}`);
  }

  const data = (await res.json()) as { IpfsHash: string };
  return data.IpfsHash;
}
