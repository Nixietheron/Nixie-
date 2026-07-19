import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const address = process.argv[2];
if (!/^0x[0-9a-fA-F]{40}$/.test(address || "")) throw new Error("A valid deployment address is required");

const envPath = path.join(process.cwd(), ".env.local");
let source = await readFile(envPath, "utf8");

const settings = {
  NEXT_PUBLIC_NIXIE_NFT_ADDRESS: address,
  ROBINHOOD_NFT_ADDRESS: address,
  NIXIE_NFT_CHARACTER_COUNT: "20",
  NIXIE_MIN_LIQUIDITY_USD: "1000",
  NIXIE_MAX_NIX_PRICE_USD: "0.000012",
  NIXIE_QUOTE_RATE_LIMIT_PER_MINUTE: "20",
};

for (const [key, value] of Object.entries(settings)) {
  const line = `${key}=${value}`;
  const pattern = new RegExp(`^${key}=.*$`, "m");
  source = pattern.test(source) ? source.replace(pattern, line) : `${source.trimEnd()}\n${line}\n`;
}

await writeFile(envPath, source, { mode: 0o600 });
console.log(`Configured Nixie Genesis deployment: ${address}`);
