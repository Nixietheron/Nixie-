export const NIXIE_TREASURY = "0xd946d82224841038E3970ff87E70e291eacDc84C" as const;
export const NIXIE_GENESIS_ADDRESS = "0xd092B7e9FC3e2684b59B83212394d293E6a89550" as const;
export const NIXIE_TOKEN_ADDRESS = "0x41b24bb02b0884b3b696f1a4e7c4bc3d4a31fc8f" as const;
export const NIXIE_DEXSCREENER_PAIR = "0x74A2e6bFC4507F68b4c98104722192597b71715A" as const;
export const NIXIE_UNISWAP_BUY_URL =
  `https://app.uniswap.org/swap?chain=robinhood&inputCurrency=NATIVE&outputCurrency=${NIXIE_TOKEN_ADDRESS}` as const;
export const NIXIE_USD_PRICE = 5;
export const NIXIE_MAX_PER_WALLET = 3;
export const NIXIE_MIN_LIQUIDITY_USD = 1000;
export const NIXIE_MAX_PRICE_USD = 0.000012;
export const NIXIE_MAX_PRICE_CHANGE_5M_PERCENT = 25;

export const NIXIE_CHARACTERS = [
  "Velvet Arcana", "Solenne Veil", "Nocturna Lace", "Sakura Mercy", "Astral Vixen",
  "Dawn Whisper", "Obsidian Bloom", "Crimson Reverie", "Neon Koi", "Moonlit Maid",
  "Cyber Kiss", "Pink Eclipse", "Velvet Thorn", "Lunar Bunny", "Celeste Tide",
  "Verdant Doll", "Nova Obscura", "Rose Remedy", "Amethyst Noir", "Seraphine Dusk",
] as const;

export function nixieName(tokenId: number) {
  return NIXIE_CHARACTERS[tokenId - 1] || "Unknown Nixie";
}
