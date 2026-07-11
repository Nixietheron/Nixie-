"use client";

import { Canvas } from "@react-three/fiber";
import { useProgress } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useState } from "react";
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

const LOADING_IMAGES = ["/nixie2.webp", "/nixie3.webp", "/nixie4.webp", "/nixie5.webp", "/nixie6.webp"] as const;

function SceneReadySignal({ onReady }: { onReady: () => void }) {
  useEffect(() => {
    const frame = requestAnimationFrame(onReady);
    return () => cancelAnimationFrame(frame);
  }, [onReady]);
  return null;
}

function MuseumLoadingScreen({ ready }: { ready: boolean }) {
  const { active, progress } = useProgress();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!ready || active) return;
    const timeout = window.setTimeout(() => setVisible(false), 650);
    return () => window.clearTimeout(timeout);
  }, [active, ready]);

  if (!visible) return null;
  const displayProgress = Math.max(8, Math.min(100, Math.round(progress || (ready ? 94 : 42))));

  return (
    <div className="pointer-events-none absolute inset-0 z-40 overflow-hidden bg-[#09070d] transition-opacity duration-700">
      <div className="absolute inset-0 flex gap-px opacity-65">
        {LOADING_IMAGES.map((src, index) => (
          <div key={src} className="relative flex-1 overflow-hidden">
            <div className="absolute inset-0 scale-110 bg-cover bg-center" style={{ backgroundImage: `url(${src})`, backgroundPosition: `center calc(50% + ${index % 2 ? 28 : 52}px)` }} />
            <div className="absolute inset-0 bg-[#09070d]/60" />
          </div>
        ))}
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(215,255,0,0.15),transparent_46%),linear-gradient(to_top,rgba(8,6,10,0.98),rgba(8,6,10,0.25)_58%,rgba(8,6,10,0.82))]" />
      <div className="relative flex h-full flex-col items-center justify-center px-6 text-center">
        <div className="mb-5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.32em] text-[#D7FF00]">
          <span className="h-2 w-2 animate-pulse rounded-full bg-[#D7FF00]" /> Private access verified
        </div>
        <h1 className="max-w-2xl text-4xl font-black tracking-[-0.04em] text-white sm:text-6xl">Nixie After Hours</h1>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-white/70 sm:text-base">The doors are opening. Linger a little longer—every room has something worth looking at twice.</p>
        <div className="mt-9 w-full max-w-sm">
          <div className="mb-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.18em] text-white/50"><span>Preparing your private collection</span><span>{displayProgress}%</span></div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-[#D7FF00] transition-all duration-500" style={{ width: `${displayProgress}%` }} /></div>
        </div>
        <p className="mt-5 text-xs tracking-[0.12em] text-white/40">GLAMOUR · DESIRE · DIGITAL FANTASY</p>
      </div>
    </div>
  );
}

export function MuseumScene({
  artworks,
  avatarChoice = "female",
  onArtworkSelect,
  unlockAnimationArtworkId,
  onUnlockAnimationDone,
}: MuseumSceneProps) {
  const [sceneReady, setSceneReady] = useState(false);
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
    <div className="relative h-full w-full">
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
        <SceneReadySignal onReady={() => setSceneReady(true)} />
      </Suspense>
    </Canvas>
    <MuseumLoadingScreen ready={sceneReady} />
    </div>
  );
}
