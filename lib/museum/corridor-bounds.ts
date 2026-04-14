/** Must match `FRAME_SPACING` / wall start Z in `museum-art-frames.tsx`. */
const FRAME_SPACING = 5;
const SFW_ROW_START_Z = -3;
const SFW_MAIN_SLOTS_PER_WALL = 7;
const SFW_MAIN_MIN_Z = SFW_ROW_START_Z - (SFW_MAIN_SLOTS_PER_WALL - 1) * FRAME_SPACING; // -33
const SFW_BRANCH_MIN_Z = -51; // branch corridor walls
const STRUCTURE_MIN_Z = -147; // extended NSFW corridor end wall
// NSFW arch is at Z=-58; frames start 5 units past it. Keep in sync with
// NSFW_ARCH_Z / NSFW_FRAMES_START_Z in museum-art-frames.tsx.
const NSFW_ROW_START_Z = -63;

/**
 * Furthest walkable Z (negative) so the player can reach the last frames on both walls.
 */
export function computeCorridorMinZ(publicCount: number, nsfwCount: number): number {
  const minSfw = publicCount > 0 ? Math.min(SFW_MAIN_MIN_Z, SFW_BRANCH_MIN_Z) : SFW_ROW_START_Z;
  const minNsfw =
    nsfwCount > 0
      ? NSFW_ROW_START_Z - (Math.ceil(nsfwCount / 2) - 1) * FRAME_SPACING
      : NSFW_ROW_START_Z;
  return Math.min(minSfw, minNsfw, STRUCTURE_MIN_Z) - 12;
}
