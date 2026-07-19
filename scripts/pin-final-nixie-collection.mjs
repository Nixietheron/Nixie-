import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const MANIFEST_PATH = path.join(ROOT, "deployments", "nixie-genesis-ipfs.json");

function envFile(source) {
  return Object.fromEntries(
    source
      .split(/\r?\n/)
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const index = line.indexOf("=");
        return [line.slice(0, index), line.slice(index + 1).replace(/^['"]|['"]$/g, "")];
      }),
  );
}

const env = envFile(await readFile(path.join(ROOT, ".env.local"), "utf8"));
if (!env.PINATA_API_KEY || !env.PINATA_SECRET_KEY) {
  throw new Error("Pinata credentials are missing from .env.local");
}

const manifest = JSON.parse(await readFile(MANIFEST_PATH, "utf8"));
if (!Array.isArray(manifest.tokens) || manifest.tokens.length !== 20) {
  throw new Error("The final manifest must contain exactly 20 tokens");
}
const bannerCid = manifest.collection?.bannerCid;
if (!bannerCid) throw new Error("The final OpenSea banner CID is missing");

const metadata = {
  name: "NIXIE: Forbidden Genesis",
  description:
    "Twenty seductive Nixie alter egos. Fifty editions each. One thousand instantly revealed ERC-1155 collectibles on Robinhood Chain. Every Nixie unlocks holder-only access inside the Nixie Museum.",
  image: `ipfs://${manifest.tokens[0].imageCid}`,
  banner_image: `ipfs://${bannerCid}`,
  featured_image: `ipfs://${manifest.tokens[13].imageCid}`,
  external_link: "https://nixiepink.com/nft",
  seller_fee_basis_points: 500,
  fee_recipient: "0xd946d82224841038E3970ff87E70e291eacDc84C",
  collaborators: ["0x9b67F3835826192852D16373fE18Cef20381fb19"],
};

const response = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
  method: "POST",
  headers: {
    "content-type": "application/json",
    pinata_api_key: env.PINATA_API_KEY,
    pinata_secret_api_key: env.PINATA_SECRET_KEY,
  },
  body: JSON.stringify({
    pinataMetadata: {
      name: "nixie-forbidden-genesis-collection-final",
      keyvalues: { collection: "NIXIE: Forbidden Genesis", status: "final" },
    },
    pinataContent: metadata,
  }),
  signal: AbortSignal.timeout(30_000),
});
if (!response.ok) throw new Error(`Pinata collection upload failed with status ${response.status}`);

const result = await response.json();
if (!/^Qm[a-zA-Z0-9]{44}$|^bafy[a-zA-Z0-9]+$/.test(result.IpfsHash || "")) {
  throw new Error("Pinata returned an invalid collection CID");
}

manifest.collection.finalMetadataCid = result.IpfsHash;
manifest.collection.finalContractURI = `ipfs://${result.IpfsHash}`;
await writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`Final collection metadata: ipfs://${result.IpfsHash}`);
