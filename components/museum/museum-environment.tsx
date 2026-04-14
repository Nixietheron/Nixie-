"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";

const WALL_COLOR = "#1a1528";
const FLOOR_COLOR = "#1e1830";
const CEILING_COLOR = "#0e0b16";
const ACCENT_PINK = "#D27A92";
const ACCENT_PURPLE = "#7B68C0";
const NSFW_ACCENT = "#ff4080";

function Floor() {
  const tileTexture = useMemo(() => {
    const size = 512;
    const c = document.createElement("canvas");
    c.width = size;
    c.height = size;
    const ctx = c.getContext("2d");
    if (!ctx) return null;

    // Base tint for the whole floor
    ctx.fillStyle = "#2a2240";
    ctx.fillRect(0, 0, size, size);

    // Parquet/stone-like blocks (2 staggered rows for natural look)
    const cols = 8;
    const rows = 12;
    const blockW = size / cols;
    const blockH = size / rows;
    for (let y = 0; y < rows; y += 1) {
      const stagger = y % 2 === 0 ? 0 : blockW * 0.5;
      for (let x = -1; x < cols + 1; x += 1) {
        const px = x * blockW + stagger;
        const py = y * blockH;
        const hue = 258 + Math.random() * 8;
        const sat = 28 + Math.random() * 10;
        const light = 20 + Math.random() * 7;
        ctx.fillStyle = `hsl(${hue} ${sat}% ${light}%)`;
        ctx.fillRect(px + 2, py + 2, blockW - 4, blockH - 4);

        // Soft highlight per block
        const g = ctx.createLinearGradient(px, py, px + blockW, py + blockH);
        g.addColorStop(0, "rgba(255,255,255,0.08)");
        g.addColorStop(1, "rgba(0,0,0,0.06)");
        ctx.fillStyle = g;
        ctx.fillRect(px + 2, py + 2, blockW - 4, blockH - 4);
      }
    }

    // Grout between blocks
    ctx.strokeStyle = "rgba(210, 185, 235, 0.24)";
    ctx.lineWidth = 2;
    for (let x = 0; x <= cols; x += 1) {
      const gx = x * blockW;
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, size);
      ctx.stroke();
    }
    for (let y = 0; y <= rows; y += 1) {
      const gy = y * blockH;
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(size, gy);
      ctx.stroke();
    }

    // Slight grain so it feels less flat
    for (let i = 0; i < 2000; i += 1) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const a = 0.02 + Math.random() * 0.05;
      ctx.fillStyle = `rgba(255,255,255,${a})`;
      ctx.fillRect(x, y, 1, 1);
    }

    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(18, 105);
    tex.anisotropy = 2;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);

  useEffect(() => {
    return () => {
      tileTexture?.dispose();
    };
  }, [tileTexture]);

  return (
    <group>
      {/* Main floor — covers Z: +5 to -160 (centre=-77.5, len=165) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -77.5]} receiveShadow>
        <planeGeometry args={[20, 165]} />
        <meshStandardMaterial
          color="#2b2241"
          map={tileTexture ?? undefined}
          roughness={0.85}
          metalness={0.04}
        />
      </mesh>
      {/* Center walkway strip */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, -77.5]}>
        <planeGeometry args={[3, 165]} />
        <meshStandardMaterial
          color="#3a2c59"
          map={tileTexture ?? undefined}
          roughness={0.86}
          metalness={0.04}
        />
      </mesh>
      {/* Edge accent lines */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-1.6, 0.006, -77.5]}>
        <planeGeometry args={[0.05, 165]} />
        <meshBasicMaterial color="#D27A92" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[1.6, 0.006, -77.5]}>
        <planeGeometry args={[0.05, 165]} />
        <meshBasicMaterial color="#D27A92" />
      </mesh>
    </group>
  );
}

function Ceiling() {
  return (
    <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 5, -77.5]}>
      <planeGeometry args={[20, 165]} />
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
  void position;
  void color;
  void intensity;
  return null;
}

function CeilingDiscoLight({
  position,
  color = "#e8dff5",
  intensity = 0.9,
}: {
  position: [number, number, number];
  color?: string;
  intensity?: number;
}) {
  return (
    <group position={position}>
      {/* Ceiling hook */}
      <mesh position={[0, 0.24, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.14, 12]} />
        <meshStandardMaterial color="#c9b2d4" metalness={0.7} roughness={0.25} />
      </mesh>
      {/* Ring connector */}
      <mesh position={[0, 0.15, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.08, 0.012, 10, 20]} />
        <meshStandardMaterial color="#c9b2d4" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Pink disco ball */}
      <mesh>
        <icosahedronGeometry args={[0.28, 4]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.22}
          metalness={0.88}
          roughness={0.18}
          flatShading
        />
      </mesh>
      {/* Local point glow removed for performance */}
    </group>
  );
}

function DividerArch({ zPos }: { zPos: number }) {
  const barMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const sideBarMatRefs = useRef<THREE.MeshStandardMaterial[]>([]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    // Strong gate-like blink so bars are visibly ON/OFF, not just tiny shimmer.
    const blink = Math.sin(t * 3.0) > 0 ? 1 : 0.08;
    if (barMatRef.current) {
      barMatRef.current.emissiveIntensity = 2.8 * blink;
    }
    sideBarMatRefs.current.forEach((m) => {
      m.emissiveIntensity = 2.4 * blink;
    });
  });

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
        <meshStandardMaterial
          ref={barMatRef}
          color="#1b0a12"
          emissive={NSFW_ACCENT}
          emissiveIntensity={0.1}
          roughness={0.3}
          metalness={0.15}
        />
      </mesh>
      {/* Side neon bars (same style as top bar) */}
      <mesh position={[-3.02, 2.4, 0.42]}>
        <boxGeometry args={[0.08, 3.8, 0.02]} />
        <meshStandardMaterial
          ref={(m) => {
            if (m) sideBarMatRefs.current[0] = m;
          }}
          color="#1b0a12"
          emissive={NSFW_ACCENT}
          emissiveIntensity={0.1}
          roughness={0.3}
          metalness={0.15}
        />
      </mesh>
      <mesh position={[3.02, 2.4, 0.42]}>
        <boxGeometry args={[0.08, 3.8, 0.02]} />
        <meshStandardMaterial
          ref={(m) => {
            if (m) sideBarMatRefs.current[1] = m;
          }}
          color="#1b0a12"
          emissive={NSFW_ACCENT}
          emissiveIntensity={0.1}
          roughness={0.3}
          metalness={0.15}
        />
      </mesh>
      <Text
        position={[0, 3.95, 0.45]}
        fontSize={0.42}
        color="#ffb3d2"
        anchorX="center"
        anchorY="middle"
      >
        +18
      </Text>
      <Text
        position={[0, 3.45, 0.45]}
        fontSize={0.28}
        color={NSFW_ACCENT}
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.08}
      >
        NSFW
      </Text>
    </group>
  );
}

function EntranceNixieSign() {
  const textBloomRef = useRef<THREE.MeshStandardMaterial>(null);

  useFrame(({ clock }) => {
    const pulse = 0.7 + 0.3 * Math.sin(clock.getElapsedTime() * 1.8);
    if (textBloomRef.current) textBloomRef.current.emissiveIntensity = 0.85 * pulse;
  });

  return (
    <group position={[0, 2.55, 4.84]} rotation={[0, Math.PI, 0]}>
      {/* Full-wall pink panel */}
      <mesh>
        <planeGeometry args={[14.8, 4.7]} />
        <meshStandardMaterial color="#5a1f3f" roughness={0.72} metalness={0.02} />
      </mesh>
      {/* Inner glossy area */}
      <mesh position={[0, 0, 0.01]}>
        <planeGeometry args={[14.2, 4.1]} />
        <meshStandardMaterial color="#7a2d57" roughness={0.45} metalness={0.03} />
      </mesh>
      {/* Soft center glow on the wall */}
      <mesh position={[0, 0, 0.02]}>
        <planeGeometry args={[8.8, 2.4]} />
        <meshStandardMaterial
          color="#a34777"
          emissive="#ff8fc2"
          emissiveIntensity={0.12}
          transparent
          opacity={0.3}
        />
      </mesh>

      {/* Single bold neon text (no duplicate ghosting) */}
      <Text
        position={[0, -0.02, 0.045]}
        fontSize={2.05}
        color="#fff3f8"
        anchorX="center"
        anchorY="middle"
      >
        Nixie
      </Text>
      <mesh position={[0, -0.02, 0.038]}>
        <planeGeometry args={[6.2, 1.05]} />
        <meshStandardMaterial
          ref={textBloomRef}
          color="#ffd3e7"
          emissive="#ff9cc7"
          emissiveIntensity={0.65}
          transparent
          opacity={0.22}
        />
      </mesh>
    </group>
  );
}

interface MuseumEnvironmentProps {
  /** When the corridor extends further (many artworks), keep distant geometry in fog range. */
  fogFar?: number;
  /** Open extra left/right branches for overflow free artworks. */
  hasPublicBranches?: boolean;
  /** Side corridor outer X bound (dynamic, grows with content). */
  branchOuterX?: number;
}

export function MuseumEnvironment({
  fogFar = 80,
  hasPublicBranches = false,
  branchOuterX = 57.5,
}: MuseumEnvironmentProps) {
  const branchLength = Math.max(50, branchOuterX - 8);
  const branchCenterX = 8 + branchLength / 2;
  const branchAccentLength = Math.max(0, branchLength - 8);
  const branchAccentCenterX = 16 + branchAccentLength / 2;
  const branchEndX = 8 + branchLength;
  const branchLightX1 = 8 + branchLength * 0.25;
  const branchLightX2 = 8 + branchLength * 0.75;

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

      <fog attach="fog" args={["#0e0b16", 25, fogFar]} />

      <Floor />
      <Ceiling />

      {/* ================================================================
          LAYOUT:
            Corridor 1 (main, Z axis): X ∈ [-8,+8],  Z: +5 → -100+
            Side junction at Z=-35 .. -51 (16 units deep in Z)
              Corridor 2 (right, X axis): X: +8 → +58, Z ∈ [-51,-35]
              Corridor 3 (left,  X axis): X: -8 → -58, Z ∈ [-51,-35]
            NSFW arch at Z=-58 (after the junction, clear of side walls)
          ================================================================ */}

      {/* --- Corridor 1 side walls (split for junction opening) --- */}
      {hasPublicBranches ? (
        <>
          {/* Left wall: entrance (Z=+5) → just before opening (Z=-35) */}
          <WallSegment position={[-8, 2.5, -15]}  width={40} rotation={[0, Math.PI / 2, 0]} />
          {/* Left wall: after opening (Z=-51) → beyond NSFW (Z=-100) */}
          <WallSegment position={[-8, 2.5, -75.5]} width={49} rotation={[0, Math.PI / 2, 0]} />

          {/* Right wall: same */}
          <WallSegment position={[8, 2.5, -15]}   width={40} rotation={[0, Math.PI / 2, 0]} />
          <WallSegment position={[8, 2.5, -75.5]}  width={49} rotation={[0, Math.PI / 2, 0]} />

          {/* Arch headers above openings */}
          {([-8, 8] as number[]).map((x) => (
            <group key={x}>
              <mesh position={[x, 4.55, -43]}>
                <boxGeometry args={[0.34, 0.5, 16.2]} />
                <meshStandardMaterial color="#12101a" roughness={0.6} metalness={0.2} />
              </mesh>
              <mesh position={[x, 4.78, -43]}>
                <boxGeometry args={[0.37, 0.06, 16.2]} />
                <meshBasicMaterial color={ACCENT_PINK} />
              </mesh>
            </group>
          ))}
        </>
      ) : (
        <>
          <WallSegment position={[-8, 2.5, -47]} width={110} rotation={[0, Math.PI / 2, 0]} />
          <WallSegment position={[8,  2.5, -47]} width={110} rotation={[0, Math.PI / 2, 0]} />
        </>
      )}

      <WallSegment position={[0, 2.5, 5]} width={16} />
      <EntranceNixieSign />

      {/* Accent strips along Corridor 1 walls (full length, both sides) */}
      <AccentStrip position={[-7.8, 0.15, -47]} width={110} rotation={[0, Math.PI / 2, 0]} />
      <AccentStrip position={[7.8,  0.15, -47]} width={110} rotation={[0, Math.PI / 2, 0]} />
      <AccentStrip position={[-7.8, 4.85, -47]} width={110} rotation={[0, Math.PI / 2, 0]} color={ACCENT_PURPLE} />
      <AccentStrip position={[7.8,  4.85, -47]} width={110} rotation={[0, Math.PI / 2, 0]} color={ACCENT_PURPLE} />

      {/* ================================================================
          SIDE CORRIDORS (X axis, junction Z: -35 .. -51, width 16)
            Corridor 2 (right): X: +8 .. +58  (centre X=+33)
            Corridor 3 (left):  X: -8 .. -58  (centre X=-33)
          Each has floor/ceiling, 2 long walls (Z=-35 / Z=-51),
          end cap, and accent strips on BOTH long walls AND along the
          X-axis direction (matching Corridor 1 style).
          ================================================================ */}
      {hasPublicBranches && (
        <>
          {/* ── Corridor 2 — RIGHT (X: +8..+58, Z: -35..-51)
                Floor/ceiling overlap the main corridor floor seamlessly.
                Long walls start at X=+8 (flush with main corridor wall).
                Corner pieces fill the gap between main wall end and branch wall. ── */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[branchCenterX, 0.003, -43]}>
            <planeGeometry args={[branchLength, 16]} />
            <meshStandardMaterial color="#2b2241" roughness={0.88} metalness={0.04} />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[branchCenterX, 5, -43]}>
            <planeGeometry args={[branchLength, 16]} />
            <meshStandardMaterial color={CEILING_COLOR} roughness={0.9} />
          </mesh>
          {/* Long walls — start at X=+8, dynamic branch length */}
          <WallSegment position={[branchCenterX, 2.5, -35]} width={branchLength} />
          <WallSegment position={[branchCenterX, 2.5, -51]} width={branchLength} />
          {/* End cap */}
          <WallSegment position={[branchEndX, 2.5, -43]} width={16} rotation={[0, Math.PI / 2, 0]} />
          {/* Wall accent strips — avoid overlap with main corridor entrance zone */}
          <AccentStrip position={[branchAccentCenterX, 0.15, -35.2]} width={branchAccentLength} />
          <AccentStrip position={[branchAccentCenterX, 0.15, -50.8]} width={branchAccentLength} />
          <AccentStrip position={[branchAccentCenterX, 4.85, -35.2]} width={branchAccentLength} color={ACCENT_PURPLE} />
          <AccentStrip position={[branchAccentCenterX, 4.85, -50.8]} width={branchAccentLength} color={ACCENT_PURPLE} />
          {/* Floor center walkway strip (X axis, matching Corridor 1) */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[branchCenterX, 0.005, -43]}>
            <planeGeometry args={[branchLength, 3]} />
            <meshStandardMaterial color="#3a2c59" roughness={0.86} metalness={0.04} />
          </mesh>
          {/* Edge accent lines along walkway */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[branchCenterX, 0.006, -41.4]}>
            <planeGeometry args={[branchLength, 0.05]} />
            <meshBasicMaterial color="#D27A92" />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[branchCenterX, 0.006, -44.6]}>
            <planeGeometry args={[branchLength, 0.05]} />
            <meshBasicMaterial color="#D27A92" />
          </mesh>
          {/* Lights */}
          <PulsingOrb        position={[branchLightX1, 3.5,  -43]} color={ACCENT_PINK}   intensity={4} />
          <PulsingOrb        position={[branchLightX2, 3.5,  -43]} color={ACCENT_PURPLE} intensity={4} />
          <CeilingDiscoLight position={[branchLightX1, 4.72, -43]} color={ACCENT_PINK}   intensity={0.9} />
          <CeilingDiscoLight position={[branchLightX2, 4.72, -43]} color={ACCENT_PINK}   intensity={0.9} />

          {/* ── Corridor 3 — LEFT (X: -8..-58, Z: -35..-51) ── */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-branchCenterX, 0.003, -43]}>
            <planeGeometry args={[branchLength, 16]} />
            <meshStandardMaterial color="#2b2241" roughness={0.88} metalness={0.04} />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[-branchCenterX, 5, -43]}>
            <planeGeometry args={[branchLength, 16]} />
            <meshStandardMaterial color={CEILING_COLOR} roughness={0.9} />
          </mesh>
          {/* Long walls */}
          <WallSegment position={[-branchCenterX, 2.5, -35]} width={branchLength} />
          <WallSegment position={[-branchCenterX, 2.5, -51]} width={branchLength} />
          {/* End cap */}
          <WallSegment position={[-branchEndX, 2.5, -43]} width={16} rotation={[0, Math.PI / 2, 0]} />
          {/* Wall accent strips — only outer 42 units */}
          <AccentStrip position={[-branchAccentCenterX, 0.15, -35.2]} width={branchAccentLength} />
          <AccentStrip position={[-branchAccentCenterX, 0.15, -50.8]} width={branchAccentLength} />
          <AccentStrip position={[-branchAccentCenterX, 4.85, -35.2]} width={branchAccentLength} color={ACCENT_PURPLE} />
          <AccentStrip position={[-branchAccentCenterX, 4.85, -50.8]} width={branchAccentLength} color={ACCENT_PURPLE} />
          {/* Floor center walkway strip (X axis, matching Corridor 1) */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-branchCenterX, 0.005, -43]}>
            <planeGeometry args={[branchLength, 3]} />
            <meshStandardMaterial color="#3a2c59" roughness={0.86} metalness={0.04} />
          </mesh>
          {/* Edge accent lines along walkway */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-branchCenterX, 0.006, -41.4]}>
            <planeGeometry args={[branchLength, 0.05]} />
            <meshBasicMaterial color="#D27A92" />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-branchCenterX, 0.006, -44.6]}>
            <planeGeometry args={[branchLength, 0.05]} />
            <meshBasicMaterial color="#D27A92" />
          </mesh>
          {/* Lights */}
          <PulsingOrb        position={[-branchLightX1, 3.5,  -43]} color={ACCENT_PINK}   intensity={4} />
          <PulsingOrb        position={[-branchLightX2, 3.5,  -43]} color={ACCENT_PURPLE} intensity={4} />
          <CeilingDiscoLight position={[-branchLightX1, 4.72, -43]} color={ACCENT_PINK}   intensity={0.9} />
          <CeilingDiscoLight position={[-branchLightX2, 4.72, -43]} color={ACCENT_PINK}   intensity={0.9} />

          {/* ── Corridor signs — hanging neon panels below ceiling ──
                Lowered to Y=3.15, and text is duplicated on back faces
                so signage remains readable after passing underneath. ── */}

          {/* CORRIDOR 1 — hangs in the middle of main corridor at Z=-30,
              facing toward entrance (positive Z direction) */}
          <group position={[0, 4.1, -30]}>
            {/* Outer neon border */}
            <mesh position={[0, 0, 0]}>
              <boxGeometry args={[2.4, 0.56, 0.05]} />
              <meshBasicMaterial color={ACCENT_PINK} />
            </mesh>
            {/* Inner panel */}
            <mesh position={[0, 0, 0.04]}>
              <boxGeometry args={[2.15, 0.38, 0.05]} />
              <meshStandardMaterial color="#140822" emissive={ACCENT_PINK} emissiveIntensity={0.3} roughness={0.3} />
            </mesh>
            <Text position={[0, 0.1, 0.08]} fontSize={0.17} color="#ffffff" anchorX="center" anchorY="middle" letterSpacing={0.06}>
              CORRIDOR 1
            </Text>
            <Text position={[0, 0.1, -0.08]} rotation={[0, Math.PI, 0]} fontSize={0.17} color="#ffffff" anchorX="center" anchorY="middle" letterSpacing={0.06}>
              CORRIDOR 1
            </Text>
            <Text position={[0, -0.1, 0.08]} fontSize={0.14} color={ACCENT_PINK} anchorX="center" anchorY="middle" letterSpacing={0.03}>
              ▲
            </Text>
            <Text position={[0, -0.1, -0.08]} rotation={[0, Math.PI, 0]} fontSize={0.14} color={ACCENT_PINK} anchorX="center" anchorY="middle" letterSpacing={0.03}>
              ▼
            </Text>
          </group>

          {/* CORRIDOR 2 (RIGHT) — hangs at the right opening (X=+8), facing into main corridor (facing -X).
              Panel is rotated 90° so it faces the player walking along Z. */}
          <group position={[8, 4.1, -43]} rotation={[0, -Math.PI / 2, 0]}>
            <mesh position={[0, 0, 0]}>
              <boxGeometry args={[2.4, 0.56, 0.05]} />
              <meshBasicMaterial color={ACCENT_PINK} />
            </mesh>
            <mesh position={[0, 0, 0.04]}>
              <boxGeometry args={[2.15, 0.38, 0.05]} />
              <meshStandardMaterial color="#140822" emissive={ACCENT_PINK} emissiveIntensity={0.3} roughness={0.3} />
            </mesh>
            <Text position={[0, 0.1, 0.08]} fontSize={0.17} color="#ffffff" anchorX="center" anchorY="middle" letterSpacing={0.06}>
              CORRIDOR 2
            </Text>
            <Text position={[0, 0.1, -0.08]} rotation={[0, Math.PI, 0]} fontSize={0.17} color="#ffffff" anchorX="center" anchorY="middle" letterSpacing={0.06}>
              CORRIDOR 2
            </Text>
            <Text position={[0, -0.1, 0.08]} fontSize={0.14} color={ACCENT_PINK} anchorX="center" anchorY="middle" letterSpacing={0.03}>
              ▶
            </Text>
            <Text position={[0, -0.1, -0.08]} rotation={[0, Math.PI, 0]} fontSize={0.14} color={ACCENT_PINK} anchorX="center" anchorY="middle" letterSpacing={0.03}>
              ◀
            </Text>
          </group>

          {/* CORRIDOR 3 (LEFT) — hangs at the left opening (X=-8), facing into main corridor (facing +X). */}
          <group position={[-8, 4.1, -43]} rotation={[0, Math.PI / 2, 0]}>
            <mesh position={[0, 0, 0]}>
              <boxGeometry args={[2.4, 0.56, 0.05]} />
              <meshBasicMaterial color={ACCENT_PINK} />
            </mesh>
            <mesh position={[0, 0, 0.04]}>
              <boxGeometry args={[2.15, 0.38, 0.05]} />
              <meshStandardMaterial color="#140822" emissive={ACCENT_PINK} emissiveIntensity={0.3} roughness={0.3} />
            </mesh>
            <Text position={[0, 0.1, 0.08]} fontSize={0.17} color="#ffffff" anchorX="center" anchorY="middle" letterSpacing={0.06}>
              CORRIDOR 3
            </Text>
            <Text position={[0, 0.1, -0.08]} rotation={[0, Math.PI, 0]} fontSize={0.17} color="#ffffff" anchorX="center" anchorY="middle" letterSpacing={0.06}>
              CORRIDOR 3
            </Text>
            <Text position={[0, -0.1, 0.08]} fontSize={0.14} color={ACCENT_PINK} anchorX="center" anchorY="middle" letterSpacing={0.03}>
              ◀
            </Text>
            <Text position={[0, -0.1, -0.08]} rotation={[0, Math.PI, 0]} fontSize={0.14} color={ACCENT_PINK} anchorX="center" anchorY="middle" letterSpacing={0.03}>
              ▶
            </Text>
          </group>
        </>
      )}

      {/* Disco-ball ceiling lights — visual only, no real light */}
      <CeilingDiscoLight position={[0, 4.72, -7]} color={ACCENT_PINK} intensity={0.9} />
      <CeilingDiscoLight position={[0, 4.72, -21]} color={ACCENT_PINK} intensity={0.9} />
      <CeilingDiscoLight position={[0, 4.72, -35]} color={ACCENT_PINK} intensity={0.9} />
      <CeilingDiscoLight position={[0, 4.72, -48]} color={ACCENT_PINK} intensity={0.9} />

      {/* 3 point lights for entire SFW corridor (was 10+5+5=20) */}
      <PulsingOrb position={[0, 3.5, -5]} color={ACCENT_PINK} intensity={5} />
      <PulsingOrb position={[0, 3.5, -25]} color={ACCENT_PURPLE} intensity={4} />
      <PulsingOrb position={[0, 3.5, -45]} color={ACCENT_PINK} intensity={5} />

      {/* Wall-wash point lights removed */}

      {/* === DIVIDER (NSFW arch) — after side corridors === */}
      <DividerArch zPos={-58} />

      {/* === NSFW MAIN CORRIDOR (extended) ===
          Main run: Z -58 .. -147
          End T-junction opening zone: Z -123 .. -139
      */}
      {/* Split side walls to create end T-junction openings at Z=-131 */}
      <WallSegment position={[-8, 2.5, -90.5]} width={65} rotation={[0, Math.PI / 2, 0]} />
      <WallSegment position={[-8, 2.5, -143]} width={16} rotation={[0, Math.PI / 2, 0]} />
      <WallSegment position={[8, 2.5, -90.5]} width={65} rotation={[0, Math.PI / 2, 0]} />
      <WallSegment position={[8, 2.5, -143]} width={16} rotation={[0, Math.PI / 2, 0]} />
      {/* End cap */}
      <WallSegment position={[0, 2.5, -147]} width={16} />

      {/* NSFW accent strips along split walls */}
      <AccentStrip position={[-7.8, 0.15, -90.5]} width={65} rotation={[0, Math.PI / 2, 0]} color={NSFW_ACCENT} />
      <AccentStrip position={[7.8,  0.15, -90.5]} width={65} rotation={[0, Math.PI / 2, 0]} color={NSFW_ACCENT} />
      <AccentStrip position={[-7.8, 4.85, -90.5]} width={65} rotation={[0, Math.PI / 2, 0]} color={NSFW_ACCENT} />
      <AccentStrip position={[7.8,  4.85, -90.5]} width={65} rotation={[0, Math.PI / 2, 0]} color={NSFW_ACCENT} />
      <AccentStrip position={[-7.8, 0.15, -143]} width={16} rotation={[0, Math.PI / 2, 0]} color={NSFW_ACCENT} />
      <AccentStrip position={[7.8,  0.15, -143]} width={16} rotation={[0, Math.PI / 2, 0]} color={NSFW_ACCENT} />
      <AccentStrip position={[-7.8, 4.85, -143]} width={16} rotation={[0, Math.PI / 2, 0]} color={NSFW_ACCENT} />
      <AccentStrip position={[7.8,  4.85, -143]} width={16} rotation={[0, Math.PI / 2, 0]} color={NSFW_ACCENT} />

      {/* End-junction arch headers on left/right openings */}
      {([-8, 8] as number[]).map((x) => (
        <group key={`nsfw-end-open-${x}`}>
          <mesh position={[x, 4.55, -131]}>
            <boxGeometry args={[0.34, 0.5, 16.2]} />
            <meshStandardMaterial color="#12101a" roughness={0.6} metalness={0.2} />
          </mesh>
          <mesh position={[x, 4.78, -131]}>
            <boxGeometry args={[0.37, 0.06, 16.2]} />
            <meshBasicMaterial color={NSFW_ACCENT} />
          </mesh>
        </group>
      ))}

      {/* NSFW disco-ball lights */}
      <CeilingDiscoLight position={[0, 4.72, -72]} color={NSFW_ACCENT} intensity={1} />
      <CeilingDiscoLight position={[0, 4.72, -92]} color={NSFW_ACCENT} intensity={1} />
      <CeilingDiscoLight position={[0, 4.72, -112]} color={NSFW_ACCENT} intensity={1} />
      <CeilingDiscoLight position={[0, 4.72, -142]} color={NSFW_ACCENT} intensity={1} />

      {/* Point lights for NSFW corridor */}
      <PulsingOrb position={[0, 3.5, -76]} color={NSFW_ACCENT}   intensity={5} />
      <PulsingOrb position={[0, 3.5, -106]} color={ACCENT_PURPLE} intensity={4} />
      <PulsingOrb position={[0, 3.5, -136]} color={NSFW_ACCENT} intensity={4} />

      {/* === NSFW END BRANCHES (T-junction) ===
          Centered at Z=-131, width 16 (Z:-123..-139), X: ±8..±50
      */}
      {/* Right branch */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[29, 0.003, -131]}>
        <planeGeometry args={[42, 16]} />
        <meshStandardMaterial color="#2b2241" roughness={0.88} metalness={0.04} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[29, 5, -131]}>
        <planeGeometry args={[42, 16]} />
        <meshStandardMaterial color={CEILING_COLOR} roughness={0.9} />
      </mesh>
      <WallSegment position={[29, 2.5, -123]} width={42} />
      <WallSegment position={[29, 2.5, -139]} width={42} />
      <WallSegment position={[50, 2.5, -131]} width={16} rotation={[0, Math.PI / 2, 0]} />
      <AccentStrip position={[29, 0.15, -123.2]} width={42} color={NSFW_ACCENT} />
      <AccentStrip position={[29, 0.15, -138.8]} width={42} color={NSFW_ACCENT} />
      <AccentStrip position={[29, 4.85, -123.2]} width={42} color={NSFW_ACCENT} />
      <AccentStrip position={[29, 4.85, -138.8]} width={42} color={NSFW_ACCENT} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[29, 0.005, -131]}>
        <planeGeometry args={[42, 3]} />
        <meshStandardMaterial color="#3a2c59" roughness={0.86} metalness={0.04} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[29, 0.006, -129.4]}>
        <planeGeometry args={[42, 0.05]} />
        <meshBasicMaterial color={NSFW_ACCENT} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[29, 0.006, -132.6]}>
        <planeGeometry args={[42, 0.05]} />
        <meshBasicMaterial color={NSFW_ACCENT} />
      </mesh>

      {/* Left branch */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-29, 0.003, -131]}>
        <planeGeometry args={[42, 16]} />
        <meshStandardMaterial color="#2b2241" roughness={0.88} metalness={0.04} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[-29, 5, -131]}>
        <planeGeometry args={[42, 16]} />
        <meshStandardMaterial color={CEILING_COLOR} roughness={0.9} />
      </mesh>
      <WallSegment position={[-29, 2.5, -123]} width={42} />
      <WallSegment position={[-29, 2.5, -139]} width={42} />
      <WallSegment position={[-50, 2.5, -131]} width={16} rotation={[0, Math.PI / 2, 0]} />
      <AccentStrip position={[-29, 0.15, -123.2]} width={42} color={NSFW_ACCENT} />
      <AccentStrip position={[-29, 0.15, -138.8]} width={42} color={NSFW_ACCENT} />
      <AccentStrip position={[-29, 4.85, -123.2]} width={42} color={NSFW_ACCENT} />
      <AccentStrip position={[-29, 4.85, -138.8]} width={42} color={NSFW_ACCENT} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-29, 0.005, -131]}>
        <planeGeometry args={[42, 3]} />
        <meshStandardMaterial color="#3a2c59" roughness={0.86} metalness={0.04} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-29, 0.006, -129.4]}>
        <planeGeometry args={[42, 0.05]} />
        <meshBasicMaterial color={NSFW_ACCENT} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-29, 0.006, -132.6]}>
        <planeGeometry args={[42, 0.05]} />
        <meshBasicMaterial color={NSFW_ACCENT} />
      </mesh>

      {/* NSFW end-junction signs */}
      <group position={[0, 4.08, -120]}>
        <mesh>
          <boxGeometry args={[2.4, 0.56, 0.05]} />
          <meshBasicMaterial color={NSFW_ACCENT} />
        </mesh>
        <mesh position={[0, 0, 0.04]}>
          <boxGeometry args={[2.15, 0.38, 0.05]} />
          <meshStandardMaterial color="#1b0a12" emissive={NSFW_ACCENT} emissiveIntensity={0.28} roughness={0.32} />
        </mesh>
        <Text position={[0, 0.1, 0.08]} fontSize={0.17} color="#ffd8e7" anchorX="center" anchorY="middle" letterSpacing={0.06}>
          CORRIDOR 1
        </Text>
        <Text position={[0, -0.1, 0.08]} fontSize={0.14} color={NSFW_ACCENT} anchorX="center" anchorY="middle" letterSpacing={0.03}>
          ▲
        </Text>
      </group>
      <group position={[8, 4.08, -131]} rotation={[0, -Math.PI / 2, 0]}>
        <mesh>
          <boxGeometry args={[2.4, 0.56, 0.05]} />
          <meshBasicMaterial color={NSFW_ACCENT} />
        </mesh>
        <mesh position={[0, 0, 0.04]}>
          <boxGeometry args={[2.15, 0.38, 0.05]} />
          <meshStandardMaterial color="#1b0a12" emissive={NSFW_ACCENT} emissiveIntensity={0.28} roughness={0.32} />
        </mesh>
        <Text position={[0, 0.1, 0.08]} fontSize={0.17} color="#ffd8e7" anchorX="center" anchorY="middle" letterSpacing={0.06}>
          CORRIDOR 4
        </Text>
        <Text position={[0, -0.1, 0.08]} fontSize={0.14} color={NSFW_ACCENT} anchorX="center" anchorY="middle" letterSpacing={0.03}>
          ▶
        </Text>
      </group>
      <group position={[-8, 4.08, -131]} rotation={[0, Math.PI / 2, 0]}>
        <mesh>
          <boxGeometry args={[2.4, 0.56, 0.05]} />
          <meshBasicMaterial color={NSFW_ACCENT} />
        </mesh>
        <mesh position={[0, 0, 0.04]}>
          <boxGeometry args={[2.15, 0.38, 0.05]} />
          <meshStandardMaterial color="#1b0a12" emissive={NSFW_ACCENT} emissiveIntensity={0.28} roughness={0.32} />
        </mesh>
        <Text position={[0, 0.1, 0.08]} fontSize={0.17} color="#ffd8e7" anchorX="center" anchorY="middle" letterSpacing={0.06}>
          CORRIDOR 5
        </Text>
        <Text position={[0, -0.1, 0.08]} fontSize={0.14} color={NSFW_ACCENT} anchorX="center" anchorY="middle" letterSpacing={0.03}>
          ◀
        </Text>
      </group>

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
