"use client";

import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import type { Artwork } from "@/lib/types";
import { ipfsProxyUrl } from "@/lib/constants";
import { loadCachedImage } from "@/lib/museum/cached-image";

const FRAME_COLOR = "#1a1520";
const FRAME_ACCENT = "#D27A92";
const LOCKED_ACCENT = "#ff4080";

/** Full-res texture when this close (meters), even if frustum edge misses side walls. */
const LOD_FULL_DIST = 22;
/** Always allow a cheap thumbnail within this range (corridor “bubble”). */
const LOD_SOFT_DIST = 42;
/** Max distance to keep a low-res texture while in frustum. */
const LOD_LOW_DIST = 62;
/** Beyond this: unload texture entirely. */
const LOD_CULL_DIST = 78;

const LOW_RES_MAX_EDGE = 256;

export type MuseumCullingStore = {
  frustum: THREE.Frustum;
  projScreenMatrix: THREE.Matrix4;
  cameraPosition: THREE.Vector3;
};

function createCullingStore(): MuseumCullingStore {
  return {
    frustum: new THREE.Frustum(),
    projScreenMatrix: new THREE.Matrix4(),
    cameraPosition: new THREE.Vector3(),
  };
}

function resolveTextureUrl(artwork: Artwork): string {
  const src =
    artwork.hasNsfw && artwork.nsfwUnlocked && artwork.nsfwFull
      ? artwork.nsfwFull
      : artwork.sfwPreview;
  if (!src) return "";
  if (src.includes("/ipfs/")) {
    return ipfsProxyUrl(src) || src;
  }
  return src;
}

function blurImage(img: HTMLImageElement, radius: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = img.width;
  c.height = img.height;
  const ctx = c.getContext("2d")!;
  ctx.filter = `blur(${radius}px) brightness(0.7)`;
  ctx.drawImage(img, 0, 0);
  return c;
}

function downscaleImage(img: HTMLImageElement, maxEdge: number): HTMLCanvasElement {
  const maxSide = Math.max(img.width, img.height);
  const scale = Math.min(1, maxEdge / maxSide);
  const w = Math.max(1, Math.floor(img.width * scale));
  const h = Math.max(1, Math.floor(img.height * scale));
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "medium";
  ctx.drawImage(img, 0, 0, w, h);
  return c;
}

function computeLodTier(worldPos: THREE.Vector3, store: MuseumCullingStore): "none" | "low" | "high" {
  const dist = worldPos.distanceTo(store.cameraPosition);
  if (dist > LOD_CULL_DIST) return "none";
  if (dist <= LOD_FULL_DIST) return "high";
  const inFrustum = store.frustum.containsPoint(worldPos);
  if (dist <= LOD_SOFT_DIST) return "low";
  if (dist <= LOD_LOW_DIST && inFrustum) return "low";
  return "none";
}

function MuseumCullingTick({ storeRef }: { storeRef: React.MutableRefObject<MuseumCullingStore> }) {
  const { camera } = useThree();
  useFrame(() => {
    const s = storeRef.current;
    s.projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    s.frustum.setFromProjectionMatrix(s.projScreenMatrix);
    camera.getWorldPosition(s.cameraPosition);
  });
  return null;
}

interface ArtFrameProps {
  artwork: Artwork;
  position: [number, number, number];
  rotation?: [number, number, number];
  onSelect: (artwork: Artwork) => void;
  cullingStoreRef: React.MutableRefObject<MuseumCullingStore>;
}

function ArtFrame({
  artwork,
  position,
  rotation = [0, 0, 0],
  onSelect,
  cullingStoreRef,
}: ArtFrameProps) {
  const frameRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  const [px, py, pz] = position;
  const worldPos = useMemo(() => new THREE.Vector3(px, py, pz), [px, py, pz]);

  const isLocked = artwork.hasNsfw && !artwork.nsfwUnlocked;
  const accentColor = isLocked ? LOCKED_ACCENT : FRAME_ACCENT;

  const lodTierRef = useRef<"none" | "low" | "high">("none");
  const [lodTier, setLodTier] = useState<"none" | "low" | "high">("none");

  useFrame(() => {
    const next = computeLodTier(worldPos, cullingStoreRef.current);
    if (next !== lodTierRef.current) {
      lodTierRef.current = next;
      setLodTier(next);
    }
  });

  useEffect(() => {
    if (lodTier === "none") {
      setTexture((prev) => {
        if (prev) prev.dispose();
        return null;
      });
      return;
    }

    const url = resolveTextureUrl(artwork);
    if (!url) return;

    let cancelled = false;

    loadCachedImage(url)
      .then((img) => {
        if (cancelled) return;
        let source: TexImageSource = img;
        if (isLocked) {
          source = blurImage(img, 18);
        } else if (lodTier === "low") {
          const src = source instanceof HTMLImageElement ? source : img;
          source = downscaleImage(src, LOW_RES_MAX_EDGE);
        }
        const tex = new THREE.Texture(source);
        tex.needsUpdate = true;
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.generateMipmaps = false;
        setTexture((prev) => {
          if (prev) prev.dispose();
          return tex;
        });
      })
      .catch(() => {
        if (!cancelled) {
          setTexture((prev) => {
            if (prev) prev.dispose();
            return null;
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [lodTier, artwork.id, artwork.sfwPreview, artwork.nsfwFull, artwork.nsfwUnlocked, artwork.hasNsfw, isLocked]);

  useEffect(() => {
    return () => {
      if (texture) texture.dispose();
    };
  }, [texture]);

  useFrame(() => {
    if (!frameRef.current) return;
    const mat = frameRef.current.material as THREE.MeshStandardMaterial;
    const target = hovered ? 0.5 : 0;
    mat.emissiveIntensity += (target - mat.emissiveIntensity) * 0.1;
  });

  const handleEnter = useCallback((e: THREE.Event) => {
    (e as any).stopPropagation();
    setHovered(true);
    document.body.style.cursor = "pointer";
  }, []);

  const handleLeave = useCallback(() => {
    setHovered(false);
    document.body.style.cursor = "default";
  }, []);

  const handleClick = useCallback(
    (e: THREE.Event) => {
      (e as any).stopPropagation();
      onSelect(artwork);
    },
    [artwork, onSelect],
  );

  return (
    <group position={position} rotation={rotation}>
      <mesh ref={frameRef}>
        <boxGeometry args={[2.2, 3, 0.12]} />
        <meshStandardMaterial
          color={FRAME_COLOR}
          emissive={accentColor}
          emissiveIntensity={0}
          roughness={0.5}
          metalness={0.3}
        />
      </mesh>

      <mesh position={[0, 0, 0.07]}>
        <boxGeometry args={[2.05, 2.85, 0.02]} />
        <meshBasicMaterial color={accentColor} />
      </mesh>

      <mesh
        position={[0, 0, 0.09]}
        onPointerEnter={handleEnter}
        onPointerLeave={handleLeave}
        onClick={handleClick}
      >
        <planeGeometry args={[1.8, 2.6]} />
        {texture ? (
          <meshBasicMaterial map={texture} toneMapped={false} />
        ) : (
          <meshBasicMaterial color="#2a2040" />
        )}
      </mesh>

      {isLocked && (
        <Text
          position={[0, 0.3, 0.12]}
          fontSize={0.45}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
        >
          🔒
        </Text>
      )}
      {isLocked && (
        <Text
          position={[0, -0.2, 0.12]}
          fontSize={0.14}
          color="#ffb0c0"
          anchorX="center"
          anchorY="middle"
          maxWidth={1.6}
        >
          {`$${artwork.price} USDC`}
        </Text>
      )}

      <Text
        position={[0, -1.75, 0.1]}
        fontSize={0.13}
        color="#B8A9C9"
        anchorX="center"
        anchorY="top"
        maxWidth={1.8}
      >
        {artwork.title || "Untitled"}
      </Text>
    </group>
  );
}

interface MuseumArtFramesProps {
  publicArtworks: Artwork[];
  nsfwArtworks: Artwork[];
  onSelect: (artwork: Artwork | null) => void;
}

type PublicFrameSlot = {
  artwork: Artwork;
  position: [number, number, number];
  rotation: [number, number, number];
};

const FRAME_SPACING = 5;
const FRAME_Y = 2.3;
const MAIN_WALL_X = 7.6;
// Corridor-aware public layout:
// - Corridor 1 (main): walls on X = ±7.6, Z from -3 down to -33 (7 slots per wall)
// - Corridor 2 (right branch): X from +12 to +52, two walls (Z=-35 and Z=-51), 9 per wall
// - Corridor 3 (left branch): X from -12 to -52, two walls (Z=-35 and Z=-51), 9 per wall
const MAIN_START_Z = -3;
const MAIN_SLOTS_PER_WALL = 7;
const MAIN_PUBLIC_CAPACITY = MAIN_SLOTS_PER_WALL * 2; // 14

const BRANCH_Z_NEAR_WALL = -35;
const BRANCH_Z_FAR_WALL = -51;
const BRANCH_START_X = 12;
const BRANCH_BASE_SLOTS_PER_WALL = 9;

// NSFW arch is at Z=-58 — NSFW frames must start past the arch.
// Keep this in sync with DividerArch zPos in museum-environment.tsx.
const NSFW_ARCH_Z = -58;
const NSFW_FRAMES_START_Z = NSFW_ARCH_Z - 5; // first frame 5 units past the arch

export function hasPublicBranchCorridors(publicCount: number): boolean {
  return publicCount > MAIN_PUBLIC_CAPACITY;
}

export function getBranchSlotsPerWall(publicCount: number): number {
  const overflow = Math.max(0, publicCount - MAIN_PUBLIC_CAPACITY);
  if (overflow <= 0) return BRANCH_BASE_SLOTS_PER_WALL;
  return Math.max(BRANCH_BASE_SLOTS_PER_WALL, Math.ceil(overflow / 4));
}

export function getBranchOuterX(publicCount: number): number {
  // Last frame center X + 5.5 corridor clearance
  const slots = getBranchSlotsPerWall(publicCount);
  const lastFrameX = BRANCH_START_X + (slots - 1) * FRAME_SPACING;
  return lastFrameX + 5.5;
}

export function getPublicFrameSlots(publicArtworks: Artwork[]): PublicFrameSlot[] {
  const slots: PublicFrameSlot[] = [];

  const main = publicArtworks.slice(0, MAIN_PUBLIC_CAPACITY);
  const mainLeft: Artwork[] = [];
  const mainRight: Artwork[] = [];
  main.forEach((art, i) => {
    if (i % 2 === 0) mainLeft.push(art);
    else mainRight.push(art);
  });

  mainLeft.forEach((art, i) => {
    slots.push({
      artwork: art,
      position: [-MAIN_WALL_X, FRAME_Y, MAIN_START_Z - i * FRAME_SPACING],
      rotation: [0, Math.PI / 2, 0],
    });
  });
  mainRight.forEach((art, i) => {
    slots.push({
      artwork: art,
      position: [MAIN_WALL_X, FRAME_Y, MAIN_START_Z - i * FRAME_SPACING],
      rotation: [0, -Math.PI / 2, 0],
    });
  });

  // Overflow goes into branch corridors in deterministic corridor order.
  // Order:
  // 1) Corridor 2 near wall (Z=-35, facing -Z)
  // 2) Corridor 2 far wall  (Z=-51, facing +Z)
  // 3) Corridor 3 near wall (Z=-35, facing -Z)
  // 4) Corridor 3 far wall  (Z=-51, facing +Z)
  const branchSlotsPerWall = getBranchSlotsPerWall(publicArtworks.length);
  const branchCapacity = branchSlotsPerWall * 4;
  const overflow = publicArtworks.slice(MAIN_PUBLIC_CAPACITY, MAIN_PUBLIC_CAPACITY + branchCapacity);

  const branchWalls: Array<{
    xSign: 1 | -1;
    wallZ: number;
    rotation: [number, number, number];
  }> = [
    { xSign: 1, wallZ: BRANCH_Z_NEAR_WALL, rotation: [0, Math.PI, 0] }, // right branch near wall
    { xSign: 1, wallZ: BRANCH_Z_FAR_WALL, rotation: [0, 0, 0] }, // right branch far wall
    { xSign: -1, wallZ: BRANCH_Z_NEAR_WALL, rotation: [0, Math.PI, 0] }, // left branch near wall
    { xSign: -1, wallZ: BRANCH_Z_FAR_WALL, rotation: [0, 0, 0] }, // left branch far wall
  ];

  overflow.forEach((art, idx) => {
    const wallIdx = Math.floor(idx / branchSlotsPerWall);
    const slotInWall = idx % branchSlotsPerWall;
    const wall = branchWalls[wallIdx];
    if (!wall) return;

    const x = wall.xSign * (BRANCH_START_X + slotInWall * FRAME_SPACING);
    slots.push({
      artwork: art,
      position: [x, FRAME_Y, wall.wallZ],
      rotation: wall.rotation,
    });
  });

  return slots;
}

export function getPublicFrameSlotForArtwork(
  publicArtworks: Artwork[],
  artworkId: string
): { frameX: number; frameZ: number } | null {
  const slot = getPublicFrameSlots(publicArtworks).find((s) => s.artwork.id === artworkId);
  if (!slot) return null;
  return { frameX: slot.position[0], frameZ: slot.position[2] };
}

export function MuseumArtFrames({ publicArtworks, nsfwArtworks, onSelect }: MuseumArtFramesProps) {
  const cullingStoreRef = useRef<MuseumCullingStore>(createCullingStore());
  const publicSlots = getPublicFrameSlots(publicArtworks);

  const nsfwLeftArr: Artwork[] = [];
  const nsfwRightArr: Artwork[] = [];
  nsfwArtworks.forEach((art, i) => {
    if (i % 2 === 0) nsfwLeftArr.push(art);
    else nsfwRightArr.push(art);
  });

  return (
    <group>
      <MuseumCullingTick storeRef={cullingStoreRef} />
      {publicSlots.map((slot) => (
        <ArtFrame
          key={`public-${slot.artwork.id}-${slot.position[0]}-${slot.position[2]}`}
          artwork={slot.artwork}
          position={slot.position}
          rotation={slot.rotation}
          onSelect={onSelect}
          cullingStoreRef={cullingStoreRef}
        />
      ))}

      {nsfwLeftArr.map((art, i) => (
        <ArtFrame
          key={`nsfw-l-${art.id}`}
          artwork={art}
          position={[-MAIN_WALL_X, FRAME_Y, NSFW_FRAMES_START_Z - i * FRAME_SPACING]}
          rotation={[0, Math.PI / 2, 0]}
          onSelect={onSelect}
          cullingStoreRef={cullingStoreRef}
        />
      ))}

      {nsfwRightArr.map((art, i) => (
        <ArtFrame
          key={`nsfw-r-${art.id}`}
          artwork={art}
          position={[MAIN_WALL_X, FRAME_Y, NSFW_FRAMES_START_Z - i * FRAME_SPACING]}
          rotation={[0, -Math.PI / 2, 0]}
          onSelect={onSelect}
          cullingStoreRef={cullingStoreRef}
        />
      ))}
    </group>
  );
}
