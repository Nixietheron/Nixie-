import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

const envPath = path.join(process.cwd(), ".env.local");
let source = await readFile(envPath, "utf8");
const current = source.match(/^NIXIE_PRICE_SIGNER_PRIVATE_KEY=(0x[0-9a-fA-F]{64})$/m)?.[1];
const privateKey = current || generatePrivateKey();

if (!current) {
  source = source.endsWith("\n") ? source : `${source}\n`;
  source += `NIXIE_PRICE_SIGNER_PRIVATE_KEY=${privateKey}\n`;
  await writeFile(envPath, source, { mode: 0o600 });
}

const account = privateKeyToAccount(privateKey);
console.log(`QUOTE_SIGNER_ADDRESS=${account.address}`);
console.log(`CREATED=${current ? "false" : "true"}`);
