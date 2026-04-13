"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import { MuseumEnvironment } from "./museum-environment";
import { MuseumCharacterController } from "./museum-character-controller";
import { MuseumArtFrames } from "./museum-art-frames";
import type { Artwork } from "@/lib/types";

interface MuseumSceneProps {
  artworks: Artwork[];
  onArtworkSelect: (artwork: Artwork | null) => void;
}

export function MuseumScene({
  artworks,
  onArtworkSelect,
}: MuseumSceneProps) {
  const publicArtworks = artworks.filter((a) => a.sfwPreview);
  const nsfwArtworks = artworks.filter((a) => a.hasNsfw);

  return (
    <Canvas
      dpr={[1, 1.5]}
      shadows="basic"
      camera={{ fov: 55, near: 0.1, far: 120, position: [0, 3, 12] }}
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
        <MuseumEnvironment />
        <MuseumArtFrames
          publicArtworks={publicArtworks}
          nsfwArtworks={nsfwArtworks}
          onSelect={onArtworkSelect}
        />
        <MuseumCharacterController />
      </Suspense>
    </Canvas>
  );
}
