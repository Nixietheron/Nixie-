"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const WALL_COLOR = "#1a1528";
const FLOOR_COLOR = "#1e1830";
const CEILING_COLOR = "#0e0b16";
const ACCENT_PINK = "#D27A92";
const ACCENT_PURPLE = "#7B68C0";
const NSFW_ACCENT = "#ff4080";

function Floor() {
  return (
    <group>
      {/* Main floor — slightly reflective */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -40]} receiveShadow>
        <planeGeometry args={[20, 120]} />
        <meshStandardMaterial color={FLOOR_COLOR} roughness={0.4} metalness={0.3} />
      </mesh>
      {/* Center walkway strip */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, -40]}>
        <planeGeometry args={[3, 120]} />
        <meshStandardMaterial color="#241e3a" roughness={0.3} metalness={0.4} />
      </mesh>
      {/* Edge accent lines */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-1.6, 0.006, -40]}>
        <planeGeometry args={[0.05, 120]} />
        <meshBasicMaterial color="#D27A92" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[1.6, 0.006, -40]}>
        <planeGeometry args={[0.05, 120]} />
        <meshBasicMaterial color="#D27A92" />
      </mesh>
    </group>
  );
}

function Ceiling() {
  return (
    <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 5, -40]}>
      <planeGeometry args={[20, 120]} />
      <meshStandardMaterial color={CEILING_COLOR} roughness={0.9} />
    </mesh>
  );
}

function WallSegment({
  position,
  rotation,
  width,
  height = 5,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  width: number;
  height?: number;
}) {
  return (
    <mesh position={position} rotation={rotation} receiveShadow>
      <boxGeometry args={[width, height, 0.3]} />
      <meshStandardMaterial color={WALL_COLOR} roughness={0.8} metalness={0.08} />
    </mesh>
  );
}

function AccentStrip({
  position,
  rotation,
  width,
  color = ACCENT_PINK,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  width: number;
  color?: string;
}) {
  return (
    <mesh position={position} rotation={rotation}>
      <boxGeometry args={[width, 0.06, 0.33]} />
      <meshBasicMaterial color={color} />
    </mesh>
  );
}

function PulsingOrb({
  position,
  color,
  intensity = 1,
}: {
  position: [number, number, number];
  color: string;
  intensity?: number;
}) {
  const ref = useRef<THREE.PointLight>(null);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    ref.current.intensity = intensity * (0.85 + 0.15 * Math.sin(t * 1.2));
  });

  return <pointLight ref={ref} position={position} color={color} intensity={intensity} distance={20} decay={2} />;
}

function CeilingLightFake({ position, color = "#e8dff5" }: { position: [number, number, number]; color?: string }) {
  return (
    <mesh position={position}>
      <boxGeometry args={[1.2, 0.05, 0.3]} />
      <meshBasicMaterial color={color} />
    </mesh>
  );
}

function DividerArch({ zPos }: { zPos: number }) {
  return (
    <group position={[0, 0, zPos]}>
      <mesh position={[-3.5, 2.5, 0]}>
        <boxGeometry args={[1, 5, 0.8]} />
        <meshStandardMaterial color="#12101a" roughness={0.6} metalness={0.2} />
      </mesh>
      <mesh position={[3.5, 2.5, 0]}>
        <boxGeometry args={[1, 5, 0.8]} />
        <meshStandardMaterial color="#12101a" roughness={0.6} metalness={0.2} />
      </mesh>
      <mesh position={[0, 4.7, 0]}>
        <boxGeometry args={[8, 0.6, 0.8]} />
        <meshStandardMaterial color="#12101a" roughness={0.6} metalness={0.2} />
      </mesh>
      <mesh position={[0, 4.35, 0.42]}>
        <boxGeometry args={[6, 0.08, 0.02]} />
        <meshBasicMaterial color={NSFW_ACCENT} />
      </mesh>
    </group>
  );
}

export function MuseumEnvironment() {
  return (
    <group>
      {/* Global illumination — 3 cheap lights only */}
      <ambientLight intensity={0.45} color="#2a2040" />
      <hemisphereLight color="#D27A92" groundColor="#1a1528" intensity={0.5} />
      <directionalLight
        position={[5, 8, 5]}
        intensity={0.5}
        color="#e8dff5"
        castShadow
        shadow-mapSize-width={512}
        shadow-mapSize-height={512}
        shadow-camera-far={60}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />

      <fog attach="fog" args={["#0e0b16", 25, 80]} />

      <Floor />
      <Ceiling />

      {/* === SFW MAIN CORRIDOR (Z: +5 to -50) === */}
      <WallSegment position={[-8, 2.5, -22]} width={56} rotation={[0, Math.PI / 2, 0]} />
      <WallSegment position={[8, 2.5, -22]} width={56} rotation={[0, Math.PI / 2, 0]} />
      <WallSegment position={[0, 2.5, 5]} width={16} />

      {/* Accent strips — emissive meshes, zero light cost */}
      <AccentStrip position={[-7.8, 0.15, -22]} width={56} rotation={[0, Math.PI / 2, 0]} />
      <AccentStrip position={[7.8, 0.15, -22]} width={56} rotation={[0, Math.PI / 2, 0]} />
      <AccentStrip position={[-7.8, 4.85, -22]} width={56} rotation={[0, Math.PI / 2, 0]} color={ACCENT_PURPLE} />
      <AccentStrip position={[7.8, 4.85, -22]} width={56} rotation={[0, Math.PI / 2, 0]} color={ACCENT_PURPLE} />

      {/* Fake ceiling lights — visual only, no real light */}
      <CeilingLightFake position={[0, 4.9, -7]} color={ACCENT_PINK} />
      <CeilingLightFake position={[0, 4.9, -21]} color={ACCENT_PINK} />
      <CeilingLightFake position={[0, 4.9, -35]} color={ACCENT_PINK} />
      <CeilingLightFake position={[0, 4.9, -48]} color={ACCENT_PINK} />

      {/* 3 point lights for entire SFW corridor (was 10+5+5=20) */}
      <PulsingOrb position={[0, 3.5, -5]} color={ACCENT_PINK} intensity={5} />
      <PulsingOrb position={[0, 3.5, -25]} color={ACCENT_PURPLE} intensity={4} />
      <PulsingOrb position={[0, 3.5, -45]} color={ACCENT_PINK} intensity={5} />

      {/* 2 wall-wash lights per section instead of 10 */}
      <pointLight position={[-5, 3, -15]} color="#e8dff5" intensity={4} distance={25} decay={2} />
      <pointLight position={[5, 3, -35]} color="#e8dff5" intensity={4} distance={25} decay={2} />

      {/* === DIVIDER === */}
      <DividerArch zPos={-50} />

      {/* === NSFW CORRIDOR (Z: -50 to -95) === */}
      <WallSegment position={[-8, 2.5, -72]} width={45} rotation={[0, Math.PI / 2, 0]} />
      <WallSegment position={[8, 2.5, -72]} width={45} rotation={[0, Math.PI / 2, 0]} />
      <WallSegment position={[0, 2.5, -95]} width={16} />

      {/* NSFW accent strips */}
      <AccentStrip position={[-7.8, 0.15, -72]} width={45} rotation={[0, Math.PI / 2, 0]} color={NSFW_ACCENT} />
      <AccentStrip position={[7.8, 0.15, -72]} width={45} rotation={[0, Math.PI / 2, 0]} color={NSFW_ACCENT} />
      <AccentStrip position={[-7.8, 4.85, -72]} width={45} rotation={[0, Math.PI / 2, 0]} color={NSFW_ACCENT} />
      <AccentStrip position={[7.8, 4.85, -72]} width={45} rotation={[0, Math.PI / 2, 0]} color={NSFW_ACCENT} />

      {/* NSFW fake ceiling lights */}
      <CeilingLightFake position={[0, 4.9, -55]} color={NSFW_ACCENT} />
      <CeilingLightFake position={[0, 4.9, -69]} color={NSFW_ACCENT} />
      <CeilingLightFake position={[0, 4.9, -83]} color={NSFW_ACCENT} />

      {/* 2 point lights for NSFW corridor (was 4+4+4=12) */}
      <PulsingOrb position={[0, 3.5, -60]} color={NSFW_ACCENT} intensity={5} />
      <PulsingOrb position={[0, 3.5, -80]} color={ACCENT_PURPLE} intensity={4} />

      <pointLight position={[-5, 3, -65]} color="#ffb0c0" intensity={4} distance={25} decay={2} />
      <pointLight position={[5, 3, -80]} color="#ffb0c0" intensity={4} distance={25} decay={2} />

      {/* Entrance spotlight */}
      <spotLight
        position={[0, 4.5, 4]}
        angle={0.7}
        penumbra={0.8}
        intensity={4}
        color={ACCENT_PINK}
      />
    </group>
  );
}
