/** Must match `FRAME_SPACING` / wall start Z in `museum-art-frames.tsx`. */
const FRAME_SPACING = 5;
const SFW_ROW_START_Z = -3;
// NSFW arch is at Z=-58; frames start 5 units past it. Keep in sync with
// NSFW_ARCH_Z / NSFW_FRAMES_START_Z in museum-art-frames.tsx.
const NSFW_ROW_START_Z = -63;

/**
 * Furthest walkable Z (negative) so the player can reach the last frames on both walls.
 */
export function computeCorridorMinZ(publicCount: number, nsfwCount: number): number {
  const minSfw =
    publicCount > 0
      ? SFW_ROW_START_Z - (Math.ceil(publicCount / 2) - 1) * FRAME_SPACING
      : SFW_ROW_START_Z;
  const minNsfw =
    nsfwCount > 0
      ? NSFW_ROW_START_Z - (Math.ceil(nsfwCount / 2) - 1) * FRAME_SPACING
      : NSFW_ROW_START_Z;
  return Math.min(minSfw, minNsfw) - 12;
}
