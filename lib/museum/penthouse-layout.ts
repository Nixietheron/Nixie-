import type { Artwork } from "@/lib/types";

export const PENTHOUSE_BOUNDS = {
  minX: -20,
  maxX: 20,
  minZ: -27,
  maxZ: 10,
} as const;

export const FRAMES_PER_GALLERY = 42;
const GALLERY_LENGTH = 38;

export type MuseumFrameSlot = {
  artwork: Artwork;
  position: [number, number, number];
  rotation: [number, number, number];
};

const FRAME_Y = 2.35;
const SPACING = 4.35;

/**
 * Distributes the complete collection over the penthouse's perimeter and
 * freestanding exhibition panels.  There is intentionally no separate adult
 * wing: one token-gated museum, one complete collection.
 */
export function getPenthouseFrameSlots(artworks: Artwork[]): MuseumFrameSlot[] {
  const wallSlots: Array<Omit<MuseumFrameSlot, "artwork">> = [];
  const addRow = (
    count: number,
    get: (index: number) => Omit<MuseumFrameSlot, "artwork">,
  ) => {
    for (let index = 0; index < count; index += 1) wallSlots.push(get(index));
  };

  // Perimeter galleries.
  addRow(8, (i) => ({ position: [-19.55, FRAME_Y, 8 - i * SPACING], rotation: [0, Math.PI / 2, 0] }));
  addRow(8, (i) => ({ position: [19.55, FRAME_Y, 8 - i * SPACING], rotation: [0, -Math.PI / 2, 0] }));
  addRow(8, (i) => ({ position: [-15.2 + i * SPACING, FRAME_Y, -26.55], rotation: [0, 0, 0] }));

  // Freestanding double-sided partitions make the hall feel curated rather
  // than like a tunnel, while keeping overflow within the same compact room.
  for (const x of [-7, 7]) {
    addRow(5, (i) => ({ position: [x, FRAME_Y, 6 - i * SPACING], rotation: [0, 0, 0] }));
    addRow(5, (i) => ({ position: [x, FRAME_Y, 5.72 - i * SPACING], rotation: [0, Math.PI, 0] }));
  }

  return artworks.map((artwork, index) => {
    const base = wallSlots[index % wallSlots.length];
    const cycle = Math.floor(index / FRAMES_PER_GALLERY);
    return {
      artwork,
      position: [base.position[0], base.position[1], base.position[2] - cycle * GALLERY_LENGTH],
      rotation: base.rotation,
    };
  });
}

export function getGalleryCount(artworkCount: number) {
  return Math.max(1, Math.ceil(artworkCount / FRAMES_PER_GALLERY));
}

export function getPenthouseMinZ(artworkCount: number) {
  return PENTHOUSE_BOUNDS.minZ - (getGalleryCount(artworkCount) - 1) * GALLERY_LENGTH;
}

export function getPenthouseFrameSlotForArtwork(artworks: Artwork[], artworkId: string) {
  const slot = getPenthouseFrameSlots(artworks).find(({ artwork }) => artwork.id === artworkId);
  return slot ? { frameX: slot.position[0], frameZ: slot.position[2] } : null;
}
