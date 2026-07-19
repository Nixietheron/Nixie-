import { readFile, readdir, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const ARTWORK_DIR = "/Users/gelistirmebilgisayari/Desktop/Nixie NFT";
const OUTPUT_DIR = path.join(ROOT, "deployments");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "nixie-genesis-ipfs.json");

const names = [
  "Velvet Arcana", "Solenne Veil", "Nocturna Lace", "Sakura Mercy", "Astral Vixen",
  "Dawn Whisper", "Obsidian Bloom", "Crimson Reverie", "Neon Koi", "Moonlit Maid",
  "Cyber Kiss", "Pink Eclipse", "Velvet Thorn", "Lunar Bunny", "Celeste Tide",
  "Verdant Doll", "Nova Obscura", "Rose Remedy", "Amethyst Noir", "Seraphine Dusk",
];

function envFile(source) {
  return Object.fromEntries(
    source.split(/\r?\n/)
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const index = line.indexOf("=");
        return [line.slice(0, index), line.slice(index + 1).replace(/^['"]|['"]$/g, "")];
      }),
  );
}

const env = envFile(await readFile(path.join(ROOT, ".env.local"), "utf8"));
const apiKey = env.PINATA_API_KEY;
const secretKey = env.PINATA_SECRET_KEY;
if (!apiKey || !secretKey) throw new Error("Pinata credentials are missing from .env.local");

const headers = { pinata_api_key: apiKey, pinata_secret_api_key: secretKey };

async function pinFile(filePath, pinName) {
  const bytes = await readFile(filePath);
  const form = new FormData();
  form.append("file", new Blob([bytes], { type: "image/jpeg" }), `${pinName}.jpg`);
  form.append("pinataMetadata", JSON.stringify({ name: pinName, keyvalues: { collection: "Nixie Genesis" } }));
  const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", { method: "POST", headers, body: form });
  if (!response.ok) throw new Error(`Pinata image upload failed (${response.status}): ${await response.text()}`);
  return response.json();
}

async function pinJson(content, pinName) {
  const response = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
    method: "POST",
    headers: { ...headers, "content-type": "application/json" },
    body: JSON.stringify({ pinataMetadata: { name: pinName, keyvalues: { collection: "Nixie Genesis" } }, pinataContent: content }),
  });
  if (!response.ok) throw new Error(`Pinata JSON upload failed (${response.status}): ${await response.text()}`);
  return response.json();
}

const files = (await readdir(ARTWORK_DIR))
  .filter((file) => file.toLowerCase().endsWith(".jpg"))
  .sort((a, b) => a.localeCompare(b));
if (files.length !== names.length) throw new Error(`Expected 20 artworks, found ${files.length}`);

const existing = await readFile(OUTPUT_FILE, "utf8").then(JSON.parse).catch(() => ({ tokens: [] }));
const tokens = [];

for (let index = 0; index < files.length; index += 1) {
  const tokenId = index + 1;
  const paddedId = String(tokenId).padStart(2, "0");
  const previous = existing.tokens?.find((token) => token.tokenId === tokenId);
  const image = previous?.imageCid
    ? { IpfsHash: previous.imageCid }
    : await pinFile(path.join(ARTWORK_DIR, files[index]), `nixie-genesis-${paddedId}-${names[index].toLowerCase().replaceAll(" ", "-")}`);

  const metadata = {
    name: `Nixie — ${names[index]}`,
    description: `One of 50 editions of ${names[index]} from Nixie Genesis. This immediately revealed ERC-1155 collectible unlocks its holder-only room inside the Nixie Museum. Nixie Genesis is an 18+ art collection on Robinhood Chain.`,
    image: `ipfs://${image.IpfsHash}`,
    external_url: `${env.NEXT_PUBLIC_APP_URL || "https://nixie.hair"}/nft`,
    background_color: "09070D",
    attributes: [
      { trait_type: "Character", value: names[index] },
      { trait_type: "Genesis ID", value: paddedId },
      { trait_type: "Edition Supply", value: 50, display_type: "number" },
      { trait_type: "Access", value: "Private Museum Room" },
      { trait_type: "Reveal", value: "Instant" },
      { trait_type: "Network", value: "Robinhood Chain" },
    ],
  };
  const metadataPin = previous?.metadataCid
    ? { IpfsHash: previous.metadataCid }
    : await pinJson(metadata, `nixie-genesis-${paddedId}-metadata`);

  tokens.push({ tokenId, name: names[index], sourceFile: files[index], imageCid: image.IpfsHash, metadataCid: metadataPin.IpfsHash });
  console.log(`[${paddedId}/20] ${names[index]} uploaded`);
  await mkdir(OUTPUT_DIR, { recursive: true });
  await writeFile(OUTPUT_FILE, `${JSON.stringify({ collection: existing.collection || null, tokens }, null, 2)}\n`);
}

const collectionMetadata = {
  name: "Nixie Genesis",
  description: "Twenty Nixie characters. Fifty editions each. One thousand immediately revealed ERC-1155 collectibles with holder-only access inside the Nixie Museum.",
  image: `ipfs://${tokens[0].imageCid}`,
  banner_image: `ipfs://${tokens[9].imageCid}`,
  featured_image: `ipfs://${tokens[13].imageCid}`,
  external_link: `${env.NEXT_PUBLIC_APP_URL || "https://nixie.hair"}/nft`,
  seller_fee_basis_points: 500,
  fee_recipient: "0xd946d82224841038E3970ff87E70e291eacDc84C",
};
const collectionPin = existing.collection?.metadataCid
  ? { IpfsHash: existing.collection.metadataCid }
  : await pinJson(collectionMetadata, "nixie-genesis-collection-metadata");

const manifest = {
  collection: { metadataCid: collectionPin.IpfsHash, contractURI: `ipfs://${collectionPin.IpfsHash}` },
  tokens,
};
await writeFile(OUTPUT_FILE, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Collection metadata: ${manifest.collection.contractURI}`);
console.log(`Manifest: ${OUTPUT_FILE}`);
