"use client";

import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { Artwork } from "@/lib/types";
import { ipfsProxyUrl } from "@/lib/constants";
import { loadCachedImage } from "@/lib/museum/cached-image";
import {
  getPenthouseFrameSlots,
  getPenthouseFrameSlotForArtwork,
} from "@/lib/museum/penthouse-layout";

const FRAME_COLOR = "#1a1520";
const FRAME_LIME = "#D7FF00";
const ACCESS_ACCENT = "#D7FF00";

/** Full-res texture when this close (meters), even if frustum edge misses side walls. */
const LOD_FULL_DIST = 22;
/** Always allow a cheap thumbnail within this range (corridor “bubble”). */
const LOD_SOFT_DIST = 42;
/** Max distance to keep a low-res texture while in frustum. */
const LOD_LOW_DIST = 62;
/** Beyond this: unload texture entirely. */
const LOD_CULL_DIST = 78;

const LOW_RES_MAX_EDGE = 256;

function CanvasLabel({
  text,
  position,
  fontSize,
  color,
  maxWidth = 1.8,
}: {
  text: string;
  position: [number, number, number];
  fontSize: number;
  color: string;
  maxWidth?: number;
}) {
  const { texture, width, height } = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 768;
    canvas.height = 160;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = color;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "800 58px Arial, Helvetica, sans-serif";
      ctx.fillText(text, canvas.width / 2, canvas.height / 2, canvas.width - 48);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    return { texture, width: maxWidth, height: fontSize * 1.7 };
  }, [color, fontSize, maxWidth, text]);

  useEffect(() => () => texture.dispose(), [texture]);

  return (
    <mesh position={position}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial map={texture} transparent toneMapped={false} depthWrite={false} />
    </mesh>
  );
}

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
  // Go through the authenticated proxy for every museum texture. This keeps
  // token-holder media private and avoids gateway CORS failures in canvas.
  if (artwork.sfwPreview.startsWith("/")) return artwork.sfwPreview;
  if (artwork.hasNsfw && artwork.nsfwFull) {
    return `/api/ipfs-image?contentId=${encodeURIComponent(artwork.id)}&type=nsfw`;
  }
  if (artwork.id) return `/api/ipfs-image?contentId=${encodeURIComponent(artwork.id)}&type=sfw`;
  const src = artwork.sfwPreview;
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

  const isLocked = false;
  const accentColor = FRAME_LIME;

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

      {isLocked && <CanvasLabel text="LOCKED" position={[0, 0.3, 0.12]} fontSize={0.28} color="#ffffff" maxWidth={1.2} />}
      {isLocked && (
        <CanvasLabel text="Nixie Museum Collection" position={[0, -0.2, 0.12]} fontSize={0.14} color="#F4FFD1" maxWidth={1.6} />
      )}

      <CanvasLabel text={artwork.title || "Untitled"} position={[0, -1.75, 0.1]} fontSize={0.13} color="#B8A9C9" maxWidth={1.8} />
    </group>
  );
}

interface MuseumArtFramesProps {
  publicArtworks: Artwork[];
  nsfwArtworks: Artwork[];
  onSelect: (artwork: Artwork | null) => void;
}

export const getPublicFrameSlotForArtwork = getPenthouseFrameSlotForArtwork;

export function MuseumArtFrames({ publicArtworks, nsfwArtworks, onSelect }: MuseumArtFramesProps) {
  const cullingStoreRef = useRef<MuseumCullingStore>(createCullingStore());
  const slots = getPenthouseFrameSlots([...publicArtworks, ...nsfwArtworks]);

  return (
    <group>
      <MuseumCullingTick storeRef={cullingStoreRef} />
      {slots.map((slot) => (
        <ArtFrame
          key={`${slot.artwork.id}-${slot.position[0]}-${slot.position[2]}`}
          artwork={slot.artwork}
          position={slot.position}
          rotation={slot.rotation}
          onSelect={onSelect}
          cullingStoreRef={cullingStoreRef}
        />
      ))}

    </group>
  );
}
