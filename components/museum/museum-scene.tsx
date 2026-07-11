"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense, useMemo } from "react";
import * as THREE from "three";
import { MuseumEnvironment } from "./museum-environment";
import { MuseumCharacterController } from "./museum-character-controller";
import {
  MuseumArtFrames,
  getPublicFrameSlotForArtwork,
} from "./museum-art-frames";
import type { Artwork } from "@/lib/types";
import { PENTHOUSE_BOUNDS, getGalleryCount, getPenthouseMinZ } from "@/lib/museum/penthouse-layout";

interface MuseumSceneProps {
  artworks: Artwork[];
  avatarChoice?: "female" | "male";
  onArtworkSelect: (artwork: Artwork | null) => void;
  unlockAnimationArtworkId?: string | null;
  onUnlockAnimationDone?: (artworkId: string) => void;
}

export function MuseumScene({
  artworks,
  avatarChoice = "female",
  onArtworkSelect,
  unlockAnimationArtworkId,
  onUnlockAnimationDone,
}: MuseumSceneProps) {
  // A single token gate opens the full collection in one open-plan gallery.
  const { publicArtworks, nsfwArtworks, allArtworks } = useMemo(() => {
    const publicItems = artworks.filter((a) => a.sfwPreview && !a.hasNsfw);
    const fullCollection = artworks.filter((a) => a.hasNsfw);
    return {
      publicArtworks: publicItems,
      nsfwArtworks: fullCollection,
      allArtworks: [...publicItems, ...fullCollection],
    };
  }, [artworks]);

  const unlockAnimationTarget = useMemo(() => {
    if (!unlockAnimationArtworkId) return null;
    const slot = getPublicFrameSlotForArtwork(allArtworks, unlockAnimationArtworkId);
    if (slot) {
      return {
        artworkId: unlockAnimationArtworkId,
        frameX: slot.frameX,
        frameZ: slot.frameZ,
      };
    }
    return null;
  }, [unlockAnimationArtworkId, allArtworks]);
  const galleryCount = getGalleryCount(allArtworks.length);
  const minWalkZ = getPenthouseMinZ(allArtworks.length);

  return (
    <Canvas
      dpr={[1, 1.25]}
      shadows="basic"
      camera={{ fov: 55, near: 0.1, far: 90, position: [0, 3, 12] }}
      style={{ width: "100%", height: "100%" }}
      gl={{
        antialias: false,
        alpha: false,
        powerPreference: "high-performance",
        stencil: false,
        depth: true,
      }}
      onCreated={({ gl, scene }) => {
        gl.setClearColor("#34382a");
        gl.outputColorSpace = THREE.SRGBColorSpace;
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.18;
        gl.shadowMap.autoUpdate = false;
        gl.shadowMap.needsUpdate = true;
        scene.background = new THREE.Color("#34382a");
      }}
    >
      <Suspense fallback={null}>
        <MuseumEnvironment galleryCount={galleryCount} />
        <MuseumArtFrames
          publicArtworks={publicArtworks}
          nsfwArtworks={nsfwArtworks}
          onSelect={onArtworkSelect}
        />
        <MuseumCharacterController
          avatarChoice={avatarChoice}
          minWalkZ={minWalkZ}
          maxWalkX={PENTHOUSE_BOUNDS.maxX}
          unlockAnimationTarget={unlockAnimationTarget}
          onUnlockAnimationDone={onUnlockAnimationDone}
        />
      </Suspense>
    </Canvas>
  );
}
