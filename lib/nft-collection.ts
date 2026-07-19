export const NIXIE_TREASURY = "0xd946d82224841038E3970ff87E70e291eacDc84C" as const;
export const NIXIE_USD_PRICE = 5;
export const NIXIE_MAX_PER_WALLET = 3;

export const NIXIE_CHARACTERS = [
  "Velvet Arcana", "Solenne Veil", "Nocturna Lace", "Sakura Mercy", "Astral Vixen",
  "Dawn Whisper", "Obsidian Bloom", "Crimson Reverie", "Neon Koi", "Moonlit Maid",
  "Cyber Kiss", "Pink Eclipse", "Velvet Thorn", "Lunar Bunny", "Celeste Tide",
  "Verdant Doll", "Nova Obscura", "Rose Remedy", "Amethyst Noir", "Seraphine Dusk",
] as const;

export function nixieName(tokenId: number) {
  return NIXIE_CHARACTERS[tokenId - 1] || "Unknown Nixie";
}
