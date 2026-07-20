"use client";

import { useEffect, useMemo, useState } from "react";
import { Text } from "@react-three/drei";
import * as THREE from "three";

const LIME = "#D7FF00";
const INK = "#22261e";
const STONE = "#4a4a36";
const WALL = "#4a4b39";
const BRASS = "#81734b";

function StoneFloor({ length, centerZ }: { length: number; centerZ: number }) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 512;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#20211c";
    ctx.fillRect(0, 0, 512, 512);
    for (let y = 0; y < 8; y += 1) {
      for (let x = 0; x < 8; x += 1) {
        const shade = 28 + ((x * 17 + y * 11) % 9);
        ctx.fillStyle = `hsl(72 7% ${shade}%)`;
        ctx.fillRect(x * 64 + 1, y * 64 + 1, 62, 62);
      }
    }
    for (let i = 0; i < 1400; i += 1) {
      const alpha = 0.015 + ((i * 13) % 9) / 500;
      ctx.fillStyle = `rgba(255,255,235,${alpha})`;
      ctx.fillRect((i * 37) % 512, (i * 71) % 512, 1, 1);
    }
    const result = new THREE.CanvasTexture(canvas);
    result.wrapS = result.wrapT = THREE.RepeatWrapping;
    result.repeat.set(7, 7);
    result.colorSpace = THREE.SRGBColorSpace;
    result.anisotropy = 2;
    return result;
  }, []);

  useEffect(() => () => texture?.dispose(), [texture]);

  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, centerZ]} receiveShadow>
        <planeGeometry args={[44, length]} />
        <meshStandardMaterial map={texture ?? undefined} color={STONE} roughness={0.72} metalness={0.13} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, centerZ]}>
        <planeGeometry args={[11, Math.max(0, length - 4)]} />
        <meshStandardMaterial color="#282820" roughness={0.76} metalness={0.08} />
      </mesh>
      {[-5.65, 5.65].map((x) => (
        <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.025, centerZ]}>
          <planeGeometry args={[0.045, Math.max(0, length - 4)]} />
          <meshBasicMaterial color={LIME} transparent opacity={0.5} />
        </mesh>
      ))}
    </>
  );
}

function WallBlock({
  position,
  size,
  color = WALL,
}: {
  position: [number, number, number];
  size: [number, number, number];
  color?: string;
}) {
  return (
    <mesh position={position} receiveShadow castShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.67} metalness={0.16} />
    </mesh>
  );
}

function Plinth({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[0.68, 0.8, 1.08, 8]} />
        <meshStandardMaterial color="#454035" roughness={0.48} metalness={0.45} />
      </mesh>
      <mesh position={[0, 0.67, 0]} castShadow>
        <icosahedronGeometry args={[0.34, 2]} />
        <meshStandardMaterial color={LIME} emissive={LIME} emissiveIntensity={0.18} metalness={0.72} roughness={0.22} />
      </mesh>
    </group>
  );
}

function Lounge() {
  return (
    <group position={[0, 0, -3]}>
      <mesh position={[0, 0.26, 1.1]} castShadow receiveShadow>
        <boxGeometry args={[5.6, 0.52, 1.2]} />
        <meshStandardMaterial color="#34342b" roughness={0.56} metalness={0.15} />
      </mesh>
      <mesh position={[0, 0.8, 1.55]} castShadow receiveShadow>
        <boxGeometry args={[5.6, 0.72, 0.28]} />
        <meshStandardMaterial color="#2b2c25" roughness={0.63} metalness={0.1} />
      </mesh>
      <mesh position={[0, 0.58, -1.45]} castShadow>
        <cylinderGeometry args={[1.25, 1.25, 0.16, 32]} />
        <meshPhysicalMaterial color="#5b553e" roughness={0.22} metalness={0.72} clearcoat={0.55} />
      </mesh>
      <mesh position={[0, 0.1, -1.45]}>
        <cylinderGeometry args={[0.62, 0.75, 0.7, 6]} />
        <meshStandardMaterial color="#201f1b" roughness={0.42} metalness={0.7} />
      </mesh>
    </group>
  );
}

function GalleryBench({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.42, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.6, 0.3, 0.72]} />
        <meshStandardMaterial color="#292b25" roughness={0.5} metalness={0.24} />
      </mesh>
      <mesh position={[0, 0.74, -0.28]} castShadow receiveShadow>
        <boxGeometry args={[3.6, 0.46, 0.16]} />
        <meshStandardMaterial color="#20211c" roughness={0.62} metalness={0.16} />
      </mesh>
      {[-1.42, 1.42].map((x) => (
        <mesh key={x} position={[x, 0.2, 0]} castShadow>
          <boxGeometry args={[0.13, 0.42, 0.56]} />
          <meshStandardMaterial color={BRASS} roughness={0.3} metalness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

function GalleryPlant({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.32, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.46, 0.6, 0.64, 16]} />
        <meshStandardMaterial color="#39372a" roughness={0.42} metalness={0.52} />
      </mesh>
      <mesh position={[0, 1.2, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.1, 1.25, 8]} />
        <meshStandardMaterial color="#565337" roughness={0.85} />
      </mesh>
      {Array.from({ length: 7 }, (_, index) => {
        const angle = (index / 7) * Math.PI * 2;
        return (
          <mesh key={index} position={[Math.cos(angle) * 0.38, 1.54 + (index % 2) * 0.13, Math.sin(angle) * 0.38]} rotation={[0, -angle, 0.42]} castShadow>
            <coneGeometry args={[0.25, 0.95, 5]} />
            <meshStandardMaterial color={index % 2 ? "#677344" : "#536137"} roughness={0.7} metalness={0.06} />
          </mesh>
        );
      })}
    </group>
  );
}

function FloorLamp({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.34, 0.34, 0.1, 20]} />
        <meshStandardMaterial color={BRASS} metalness={0.84} roughness={0.22} />
      </mesh>
      <mesh position={[0, 1.34, 0]}>
        <cylinderGeometry args={[0.045, 0.055, 2.55, 10]} />
        <meshStandardMaterial color={BRASS} metalness={0.88} roughness={0.18} />
      </mesh>
      <mesh position={[0, 2.65, 0]}>
        <coneGeometry args={[0.48, 0.42, 24, 1, true]} />
        <meshStandardMaterial color="#d8d5ae" emissive="#fff7bd" emissiveIntensity={0.28} side={THREE.DoubleSide} />
      </mesh>
      <pointLight position={[0, 2.45, 0]} intensity={1.5} distance={5} color="#fff5cb" />
    </group>
  );
}

function RoomDressing({ room }: { room: number }) {
  const z = -room * 38;
  return (
    <group>
      <mesh position={[0, 0.035, 10.4 + z]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[4.5, 48]} />
        <meshStandardMaterial color="#343326" roughness={0.86} metalness={0.08} />
      </mesh>
      <GalleryBench position={[0, 0, 10.4 + z]} />
      <GalleryPlant position={[-3.7, 0, 10.7 + z]} scale={0.9} />
      <GalleryPlant position={[3.7, 0, 10.7 + z]} scale={0.9} />
      <FloorLamp position={[-5.25, 0, 10.4 + z]} />
      <FloorLamp position={[5.25, 0, 10.4 + z]} />
    </group>
  );
}

function FeaturedNixiePortrait({ src, position, caption }: { src: string; position: [number, number, number]; caption: string }) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    let cancelled = false;
    let currentTexture: THREE.Texture | null = null;
    const loader = new THREE.TextureLoader();
    loader.load(
      src,
      (loaded) => {
        if (cancelled) {
          loaded.dispose();
          return;
        }
        loaded.colorSpace = THREE.SRGBColorSpace;
        loaded.minFilter = THREE.LinearFilter;
        loaded.magFilter = THREE.LinearFilter;
        loaded.generateMipmaps = false;
        currentTexture = loaded;
        setTexture((prev) => {
          prev?.dispose();
          return loaded;
        });
      },
      undefined,
      () => {
        if (!cancelled) setTexture((prev) => {
          prev?.dispose();
          return null;
        });
      },
    );
    return () => {
      cancelled = true;
      currentTexture?.dispose();
    };
  }, [src]);

  return (
    <group position={position}>
      <mesh position={[0, 2.55, 0]} castShadow receiveShadow>
        <boxGeometry args={[4.15, 5.35, 0.2]} />
        <meshStandardMaterial color="#090a08" roughness={0.28} metalness={0.72} />
      </mesh>
      <mesh position={[0, 2.55, 0.115]}>
        <planeGeometry args={[3.67, 4.87]} />
        {texture ? (
          <meshBasicMaterial map={texture} toneMapped={false} />
        ) : (
          <meshBasicMaterial color="#2a2040" />
        )}
      </mesh>
      <mesh position={[0, 0.19, 0.135]}>
        <boxGeometry args={[4.15, 0.05, 0.08]} />
        <meshBasicMaterial color={LIME} />
      </mesh>
      <Text fontSize={0.15} color="#f6f3df" anchorX="center" anchorY="middle" letterSpacing={0.08} position={[0, -0.38, 0.14]}>
        {caption}
      </Text>
    </group>
  );
}

function FeaturedCollection() {
  return (
    <group position={[0, 0, 12.7]} rotation={[0, Math.PI, 0]}>
      <FeaturedNixiePortrait src="/nixie2.webp" position={[-6.4, 0, 0]} caption="NIXIE / MIDNIGHT" />
      <FeaturedNixiePortrait src="/nixie4.webp" position={[0, 0, 0.18]} caption="NIXIE / PRIVATE EDITION" />
      <FeaturedNixiePortrait src="/nixie6.webp" position={[6.4, 0, 0]} caption="NIXIE / AFTER DARK" />
      <Text fontSize={0.25} color={LIME} anchorX="center" anchorY="middle" letterSpacing={0.18} position={[0, 5.35, 0.16]}>
        FEATURED COLLECTION
      </Text>
      <Text fontSize={0.16} color="#f5f1df" anchorX="center" anchorY="middle" letterSpacing={0.04} position={[0, 4.9, 0.16]}>
        GLAMOUR, DESIRE & DIGITAL FANTASY
      </Text>
    </group>
  );
}

function GalleryWallCopy({ room }: { room: number }) {
  const z = -26.68 - room * 38;
  const sideZ = -9 - room * 38;
  return (
    <group>
      <Text fontSize={0.26} color={LIME} anchorX="center" anchorY="middle" letterSpacing={0.14} position={[0, 5.28, z]}>
        NIXIE AFTER HOURS
      </Text>
      <Text fontSize={0.135} maxWidth={11.6} textAlign="center" color="#eeefd6" anchorX="center" anchorY="middle" lineHeight={1.45} position={[0, 4.65, z]}>
        {"A private invitation to linger after the lights go low.\nVelvet moods, slow glances, and a little digital temptation."}
      </Text>
      <Text fontSize={0.15} color="#e7ebc8" anchorX="center" anchorY="middle" letterSpacing={0.06} position={[-19.72, 5.15, sideZ]} rotation={[0, Math.PI / 2, 0]}>
        SOFT LIGHT · SHARP LOOKS · NO RUSH
      </Text>
      <Text fontSize={0.15} color="#e7ebc8" anchorX="center" anchorY="middle" letterSpacing={0.06} position={[19.72, 5.15, sideZ]} rotation={[0, -Math.PI / 2, 0]}>
        DESIRE LIVES IN THE DETAILS · KEEP LOOKING
      </Text>
    </group>
  );
}

function Ceiling({ length, centerZ }: { length: number; centerZ: number }) {
  return (
    <group>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 6.5, centerZ]}>
        <planeGeometry args={[44, length]} />
        <meshStandardMaterial color={INK} roughness={0.86} />
      </mesh>
      {[-15, -7.5, 0, 7.5, 15].map((x) => (
        <mesh key={x} position={[x, 6.22, centerZ]}>
          <boxGeometry args={[0.22, 0.32, Math.max(0, length - 1)]} />
          <meshStandardMaterial color="#343328" metalness={0.62} roughness={0.3} />
        </mesh>
      ))}
      {[-17, -8, 1].map((z) => (
        <group key={z} position={[0, 6.06, z]}>
          <mesh>
            <cylinderGeometry args={[0.12, 0.18, 0.36, 16]} />
            <meshStandardMaterial color={BRASS} metalness={0.78} roughness={0.22} />
          </mesh>
          <mesh position={[0, -0.3, 0]}>
            <sphereGeometry args={[0.17, 16, 12]} />
            <meshStandardMaterial color="#fffce8" emissive="#fffce8" emissiveIntensity={0.85} roughness={0.3} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Skyline() {
  const buildings = useMemo(
    () => Array.from({ length: 15 }, (_, i) => ({
      x: -25 + i * 3.6,
      height: 4 + ((i * 7) % 8),
      depth: 2.5 + ((i * 3) % 3),
    })),
    [],
  );
  return (
    <group>
      <mesh position={[0, 5.15, -27.15]}>
        <boxGeometry args={[43, 2.1, 0.08]} />
        <meshStandardMaterial color="#0e120e" emissive="#132114" emissiveIntensity={0.24} roughness={0.55} />
      </mesh>
      {buildings.map((building, i) => (
        <group key={i} position={[building.x, building.height / 2, -32]}>
          <mesh>
            <boxGeometry args={[2.8, building.height, building.depth]} />
            <meshStandardMaterial color="#111610" metalness={0.42} roughness={0.62} />
          </mesh>
          {Array.from({ length: Math.max(2, Math.floor(building.height / 1.4)) }, (_, row) => (
            <mesh key={row} position={[0, -building.height / 2 + 0.7 + row * 1.35, building.depth / 2 + 0.02]}>
              <planeGeometry args={[1.75, 0.18]} />
              <meshBasicMaterial color={row % 2 ? "#9eaf68" : LIME} transparent opacity={0.38} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

function Partition({ x }: { x: number }) {
  return (
    <group>
      <WallBlock position={[x, 3.15, -2.5]} size={[5.8, 6.3, 0.28]} />
      <mesh position={[x, 0.15, -2.31]}>
        <boxGeometry args={[5.86, 0.08, 0.05]} />
        <meshBasicMaterial color={LIME} transparent opacity={0.7} />
      </mesh>
      <mesh position={[x, 6.03, -2.31]}>
        <boxGeometry args={[5.86, 0.05, 0.05]} />
        <meshBasicMaterial color={LIME} transparent opacity={0.35} />
      </mesh>
    </group>
  );
}

export function MuseumEnvironment({ galleryCount = 1 }: { galleryCount?: number }) {
  const length = 46 + (galleryCount - 1) * 38;
  const centerZ = -8 - (galleryCount - 1) * 19;
  const backZ = -27 - (galleryCount - 1) * 38;
  return (
    <group>
      <ambientLight intensity={2.1} color="#f0f1cd" />
      <hemisphereLight intensity={1.4} color="#f4ffd0" groundColor="#57583d" />
      <directionalLight position={[5, 12, 8]} intensity={2.1} color="#fff9df" castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      <fog attach="fog" args={["#313527", 65, Math.max(105, length + 34)]} />
      <StoneFloor length={length} centerZ={centerZ} />
      <Ceiling length={length} centerZ={centerZ} />
      {galleryCount === 1 && <Skyline />}

      {/* Perimeter gallery walls */}
      <WallBlock position={[-20, 3.25, centerZ]} size={[0.42, 6.5, length]} />
      <WallBlock position={[20, 3.25, centerZ]} size={[0.42, 6.5, length]} />
      <WallBlock position={[0, 3.25, backZ]} size={[44, 6.5, 0.42]} />
      <WallBlock position={[0, 3.25, 14]} size={[44, 6.5, 0.42]} />
      <FeaturedCollection />
      {Array.from({ length: galleryCount }, (_, index) => (
        <group key={index} position={[0, 0, -index * 38]}>
          <Partition x={-7} />
          <Partition x={7} />
        </group>
      ))}

      <Lounge />
      {Array.from({ length: galleryCount }, (_, index) => (
        <group key={`sculpture-room-${index}`} position={[0, 0, -index * 38]}>
          <Plinth position={[-2.2, 0.55, 7.4]} scale={0.76} />
          <Plinth position={[2.2, 0.55, 7.4]} scale={0.68} />
        </group>
      ))}
      {Array.from({ length: galleryCount }, (_, room) => <RoomDressing key={`dressing-${room}`} room={room} />)}
      {Array.from({ length: galleryCount }, (_, room) => <GalleryWallCopy key={`wall-copy-${room}`} room={room} />)}

      {Array.from({ length: galleryCount }, (_, room) => [
        [-14, 5.9, 2 - room * 38], [14, 5.9, 2 - room * 38], [-13, 5.9, -16 - room * 38], [13, 5.9, -16 - room * 38], [0, 5.9, -21 - room * 38],
      ]).flat().map(([x, y, z], index) => (
        <spotLight key={index} position={[x, y, z]} target-position={[x, 2.2, z - 3]} color={index % 2 ? "#fff4d4" : "#efffc2"} intensity={22} angle={0.42} penumbra={0.8} distance={15} decay={2} />
      ))}
    </group>
  );
}
