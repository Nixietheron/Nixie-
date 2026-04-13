"use client";

import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import type { Artwork } from "@/lib/types";
import { ipfsProxyUrl } from "@/lib/constants";

const FRAME_COLOR = "#1a1520";
const FRAME_ACCENT = "#D27A92";
const LOCKED_ACCENT = "#ff4080";

function resolveTextureUrl(artwork: Artwork): string {
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

interface ArtFrameProps {
  artwork: Artwork;
  position: [number, number, number];
  rotation?: [number, number, number];
  onSelect: (artwork: Artwork) => void;
}

function ArtFrame({ artwork, position, rotation = [0, 0, 0], onSelect }: ArtFrameProps) {
  const frameRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  const isLocked = artwork.hasNsfw && !artwork.nsfwUnlocked;
  const accentColor = isLocked ? LOCKED_ACCENT : FRAME_ACCENT;

  useEffect(() => {
    const url = resolveTextureUrl(artwork);
    if (!url) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      let source: TexImageSource = img;
      if (isLocked) {
        source = blurImage(img, 18);
      }
      const tex = new THREE.Texture(source);
      tex.needsUpdate = true;
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.generateMipmaps = false;
      setTexture(tex);
    };
    img.onerror = () => setTexture(null);
    img.src = url;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [artwork.sfwPreview, isLocked]);

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

  const handleClick = useCallback((e: THREE.Event) => {
    (e as any).stopPropagation();
    onSelect(artwork);
  }, [artwork, onSelect]);

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

      {/* Lock icon for NSFW locked */}
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

export function MuseumArtFrames({ publicArtworks, nsfwArtworks, onSelect }: MuseumArtFramesProps) {
  const FRAME_SPACING = 5;
  const WALL_X = 7.6;
  const FRAME_Y = 2.3;

  const sfwLeft: Artwork[] = [];
  const sfwRight: Artwork[] = [];
  publicArtworks.forEach((art, i) => {
    if (i % 2 === 0) sfwLeft.push(art);
    else sfwRight.push(art);
  });

  const nsfwLeftArr: Artwork[] = [];
  const nsfwRightArr: Artwork[] = [];
  nsfwArtworks.forEach((art, i) => {
    if (i % 2 === 0) nsfwLeftArr.push(art);
    else nsfwRightArr.push(art);
  });

  return (
    <group>
      {sfwLeft.map((art, i) => (
        <ArtFrame
          key={`left-${art.id}`}
          artwork={art}
          position={[-WALL_X, FRAME_Y, -3 - i * FRAME_SPACING]}
          rotation={[0, Math.PI / 2, 0]}
          onSelect={onSelect}
        />
      ))}

      {sfwRight.map((art, i) => (
        <ArtFrame
          key={`right-${art.id}`}
          artwork={art}
          position={[WALL_X, FRAME_Y, -3 - i * FRAME_SPACING]}
          rotation={[0, -Math.PI / 2, 0]}
          onSelect={onSelect}
        />
      ))}

      {nsfwLeftArr.map((art, i) => (
        <ArtFrame
          key={`nsfw-l-${art.id}`}
          artwork={art}
          position={[-WALL_X, FRAME_Y, -55 - i * FRAME_SPACING]}
          rotation={[0, Math.PI / 2, 0]}
          onSelect={onSelect}
        />
      ))}

      {nsfwRightArr.map((art, i) => (
        <ArtFrame
          key={`nsfw-r-${art.id}`}
          artwork={art}
          position={[WALL_X, FRAME_Y, -55 - i * FRAME_SPACING]}
          rotation={[0, -Math.PI / 2, 0]}
          onSelect={onSelect}
        />
      ))}
    </group>
  );
}
