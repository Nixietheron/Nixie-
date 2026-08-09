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

function MuseumShellFallback({ galleryCount }: { galleryCount: number }) {
  const length = 46 + (galleryCount - 1) * 38;
  const centerZ = -8 - (galleryCount - 1) * 19;
  const backZ = -27 - (galleryCount - 1) * 38;

  return (
    <group>
      <ambientLight intensity={2.6} color="#f5ffd4" />
      <hemisphereLight intensity={1.8} color="#f4ffd0" groundColor="#4b5034" />
      <directionalLight position={[4, 9, 6]} intensity={2.4} color="#fff8dc" />
      <fog attach="fog" args={["#313527", 40, Math.max(95, length + 24)]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, centerZ]}>
        <planeGeometry args={[42, length]} />
        <meshStandardMaterial color="#303326" roughness={0.78} metalness={0.08} />
      </mesh>
      <mesh position={[-20, 3.15, centerZ]}>
        <boxGeometry args={[0.35, 6.3, length]} />
        <meshStandardMaterial color="#444835" roughness={0.62} />
      </mesh>
      <mesh position={[20, 3.15, centerZ]}>
        <boxGeometry args={[0.35, 6.3, length]} />
        <meshStandardMaterial color="#444835" roughness={0.62} />
      </mesh>
      <mesh position={[0, 3.15, backZ]}>
        <boxGeometry args={[42, 6.3, 0.35]} />
        <meshStandardMaterial color="#444835" roughness={0.62} />
      </mesh>
      <mesh position={[0, 3.15, 14]}>
        <boxGeometry args={[42, 6.3, 0.35]} />
        <meshStandardMaterial color="#444835" roughness={0.62} />
      </mesh>
      {[-12, -6, 0, 6, 12].map((x) => (
        <mesh key={x} position={[x, 2.4, -9]}>
          <boxGeometry args={[2.25, 3.05, 0.14]} />
          <meshStandardMaterial color="#17121e" emissive="#D7FF00" emissiveIntensity={0.12} roughness={0.42} metalness={0.25} />
        </mesh>
      ))}
      {[-5.65, 5.65].map((x) => (
        <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.035, centerZ]}>
          <planeGeometry args={[0.045, Math.max(0, length - 4)]} />
          <meshBasicMaterial color="#D7FF00" transparent opacity={0.6} />
        </mesh>
      ))}
    </group>
  );
}

function MuseumLoadingScreen({ ready }: { ready: boolean }) {
  const { active, progress } = useProgress();
  const [visible, setVisible] = useState(true);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const progressComplete = progress >= 99.5;
    const sceneCanOpen = ready && (progressComplete || !active);
    if (!sceneCanOpen) return;

    const fadeTimeout = window.setTimeout(() => setLeaving(true), 450);
    const removeTimeout = window.setTimeout(() => setVisible(false), 1150);
    return () => {
      window.clearTimeout(fadeTimeout);
      window.clearTimeout(removeTimeout);
    };
  }, [active, progress, ready]);

  if (!visible) return null;
  const displayProgress = Math.max(8, Math.min(ready ? 100 : 98, Math.round(progress || (ready ? 100 : 42))));

  return (
    <div className={`pointer-events-none absolute inset-0 z-40 overflow-hidden bg-[#09070d] transition-opacity duration-700 ${leaving ? "opacity-0" : "opacity-100"}`}>
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
  const [characterReady, setCharacterReady] = useState(false);
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

  useEffect(() => {
    setCharacterReady(false);
  }, [avatarChoice]);

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
        requestAnimationFrame(() => requestAnimationFrame(() => setSceneReady(true)));
      }}
    >
      <Suspense fallback={<MuseumShellFallback galleryCount={galleryCount} />}>
        <MuseumEnvironment galleryCount={galleryCount} />
        <MuseumArtFrames
          publicArtworks={publicArtworks}
          nsfwArtworks={nsfwArtworks}
          onSelect={onArtworkSelect}
        />
      </Suspense>
      <Suspense fallback={null}>
        <MuseumCharacterController
          avatarChoice={avatarChoice}
          minWalkZ={minWalkZ}
          maxWalkX={PENTHOUSE_BOUNDS.maxX}
          unlockAnimationTarget={unlockAnimationTarget}
          onUnlockAnimationDone={onUnlockAnimationDone}
          onCharacterReady={() => setCharacterReady(true)}
        />
      </Suspense>
      <SceneReadySignal onReady={() => setSceneReady(true)} />
    </Canvas>
    <MuseumLoadingScreen ready={sceneReady && characterReady} />
    </div>
  );
}
