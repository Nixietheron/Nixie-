"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense, useMemo } from "react";
import { MuseumEnvironment } from "./museum-environment";
import { MuseumCharacterController } from "./museum-character-controller";
import {
  MuseumArtFrames,
  getPublicFrameSlotForArtwork,
} from "./museum-art-frames";
import type { Artwork } from "@/lib/types";
import { computeCorridorMinZ } from "@/lib/museum/corridor-bounds";

interface MuseumSceneProps {
  artworks: Artwork[];
  onArtworkSelect: (artwork: Artwork | null) => void;
  unlockAnimationArtworkId?: string | null;
  onUnlockAnimationDone?: (artworkId: string) => void;
}

export function MuseumScene({
  artworks,
  onArtworkSelect,
  unlockAnimationArtworkId,
  onUnlockAnimationDone,
}: MuseumSceneProps) {
  // Keep corridors disjoint: NSFW-capable items live only in NSFW corridor.
  const publicArtworks = artworks.filter((a) => a.sfwPreview && !a.hasNsfw);
  const nsfwArtworks = artworks.filter((a) => a.hasNsfw);
  const corridorMinZ = computeCorridorMinZ(publicArtworks.length, nsfwArtworks.length);
  const cameraFar = Math.max(120, -corridorMinZ + 45);
  const fogFar = Math.max(80, Math.min(420, -corridorMinZ * 0.35 + 100));
  // Keep free branches open even when currently empty.
  const hasBranches = true;

  const unlockAnimationTarget = useMemo(() => {
    if (!unlockAnimationArtworkId) return null;
    const publicSlot = getPublicFrameSlotForArtwork(publicArtworks, unlockAnimationArtworkId);
    if (publicSlot) {
      return {
        artworkId: unlockAnimationArtworkId,
        frameX: publicSlot.frameX,
        frameZ: publicSlot.frameZ,
      };
    }

    const FRAME_SPACING = 5;
    const WALL_X = 7.6;
    const nsfwLeft: Artwork[] = [];
    const nsfwRight: Artwork[] = [];
    nsfwArtworks.forEach((art, i) => {
      if (i % 2 === 0) nsfwLeft.push(art);
      else nsfwRight.push(art);
    });
    const findIndex = (arr: Artwork[]) => arr.findIndex((art) => art.id === unlockAnimationArtworkId);
    const nsfwLeftIdx = findIndex(nsfwLeft);
    const nsfwRightIdx = findIndex(nsfwRight);
    if (nsfwLeftIdx >= 0) {
      return {
        artworkId: unlockAnimationArtworkId,
        frameX: -WALL_X,
        frameZ: -55 - nsfwLeftIdx * FRAME_SPACING,
      };
    }
    if (nsfwRightIdx >= 0) {
      return {
        artworkId: unlockAnimationArtworkId,
        frameX: WALL_X,
        frameZ: -55 - nsfwRightIdx * FRAME_SPACING,
      };
    }
    return null;
  }, [unlockAnimationArtworkId, publicArtworks, nsfwArtworks]);

  return (
    <Canvas
      dpr={[1, 1.5]}
      shadows="basic"
      camera={{ fov: 55, near: 0.1, far: cameraFar, position: [0, 3, 12] }}
      style={{ width: "100%", height: "100%" }}
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
        stencil: false,
        depth: true,
      }}
      onCreated={({ gl }) => {
        gl.setClearColor("#080610");
        gl.shadowMap.autoUpdate = false;
        gl.shadowMap.needsUpdate = true;
      }}
    >
      <Suspense fallback={null}>
        <MuseumEnvironment fogFar={fogFar} hasPublicBranches={hasBranches} />
        <MuseumArtFrames
          publicArtworks={publicArtworks}
          nsfwArtworks={nsfwArtworks}
          onSelect={onArtworkSelect}
        />
        <MuseumCharacterController
          minWalkZ={corridorMinZ}
          maxWalkX={hasBranches ? 57.5 : 7.5}
          unlockAnimationTarget={unlockAnimationTarget}
          onUnlockAnimationDone={onUnlockAnimationDone}
        />
      </Suspense>
    </Canvas>
  );
}
