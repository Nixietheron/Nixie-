"use client";

import { useRef, useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";

const MOVE_SPEED = 6;
const CAMERA_DISTANCE = 5.5;
const CAMERA_LOOK_HEIGHT = 1.6;
const LERP_CAM = 0.1;
const LERP_ROTATION = 0.12;
const MOUSE_SENSITIVITY = 0.003;
const PITCH_MIN = -0.45;
const PITCH_MAX = 1.0;
const SCROLL_ZOOM_SPEED = 0.8;
const MIN_DISTANCE = 2.5;
const MAX_DISTANCE = 12;
const DESIRED_HEIGHT = 1.7;
const AVATAR_MODEL_URL =
  "https://raw.githubusercontent.com/Nixietheron/Nixie-/main/Mixam444444e.glb";

const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _move = new THREE.Vector3();
const _idealCam = new THREE.Vector3();
const _lookTarget = new THREE.Vector3();
const _targetMove = new THREE.Vector3();
const _hammerOffset = new THREE.Vector3(0.34, 1.08, 0.16);

type UnlockAnimationTarget = {
  artworkId: string;
  frameX: number;
  frameZ: number;
};

function CharacterModel({
  groupRef,
  movingRef,
}: {
  groupRef: React.RefObject<THREE.Group>;
  movingRef: React.MutableRefObject<boolean>;
}) {
  const containerRef = useRef<THREE.Group>(null!);
  const { scene, animations } = useGLTF(AVATAR_MODEL_URL);
  const clonedScene = useMemo(() => clone(scene), [scene]);
  const wasMoving = useRef(false);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const walkActionRef = useRef<THREE.AnimationAction | null>(null);

  const modelScale = useMemo(() => {
    const tmp = new THREE.Group();
    tmp.add(clonedScene.clone());
    tmp.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(tmp);
    const size = new THREE.Vector3();
    box.getSize(size);
    const h = size.y;
    if (h < 0.001) return 1;
    return DESIRED_HEIGHT / h;
  }, [clonedScene]);

  const yOffset = useMemo(() => {
    const tmp = new THREE.Group();
    const c = clonedScene.clone();
    c.scale.setScalar(modelScale);
    tmp.add(c);
    tmp.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(tmp);
    return -box.min.y;
  }, [clonedScene, modelScale]);

  const hipsBoneRef = useRef<THREE.Object3D | null>(null);
  const hipsRestPos = useRef<THREE.Vector3 | null>(null);
  const idlePoseRef = useRef<Map<string, { pos: THREE.Vector3; quat: THREE.Quaternion }>>(new Map());

  useEffect(() => {
    if (!animations.length) return;

    const mixer = new THREE.AnimationMixer(clonedScene);
    mixerRef.current = mixer;

    // Strip root motion (Hips translation) so WASD movement isn't fighting the clip
    const clip = animations[0].clone();
    clip.tracks = clip.tracks.filter(
      (t) => !(t.name.includes("Hips") && t.name.endsWith(".position")),
    );

    const action = mixer.clipAction(clip);
    action.loop = THREE.LoopRepeat;
    action.clampWhenFinished = false;
    walkActionRef.current = action;

    // Sample a mid-walk frame to capture a natural standing pose (arms down, legs together)
    // Frame 0 is T-pose, so we sample ~50% of the clip where arms are most relaxed
    action.play();
    action.time = clip.duration * 0.5;
    action.weight = 1;
    mixer.setTime(clip.duration * 0.5);

    // Find hips bone
    clonedScene.traverse((child) => {
      if (child.name === "mixamorig:Hips" && !hipsBoneRef.current) {
        hipsBoneRef.current = child;
        hipsRestPos.current = child.position.clone();
      }
    });

    // Store idle pose from this sampled frame
    clonedScene.traverse((child) => {
      if ((child as THREE.Bone).isBone) {
        idlePoseRef.current.set(child.name, {
          pos: child.position.clone(),
          quat: child.quaternion.clone(),
        });
      }
    });

    // Stop animation, then immediately apply the idle pose so character doesn't start in T-pose
    action.stop();
    clonedScene.traverse((child) => {
      if ((child as THREE.Bone).isBone) {
        const saved = idlePoseRef.current.get(child.name);
        if (saved) {
          child.position.copy(saved.pos);
          child.quaternion.copy(saved.quat);
        }
      }
    });

    return () => {
      mixer.stopAllAction();
      mixer.uncacheRoot(clonedScene);
    };
  }, [animations, clonedScene]);

  useFrame((_, delta) => {
    const mixer = mixerRef.current;
    const action = walkActionRef.current;
    if (!mixer || !action) return;

    const moving = movingRef.current ?? false;

    if (moving && !wasMoving.current) {
      action.reset().fadeIn(0.2).play();
    } else if (!moving && wasMoving.current) {
      action.fadeOut(0.3);
    }
    wasMoving.current = moving;

    mixer.update(delta);

    // When animation has faded out, smoothly restore idle pose
    if (!moving && !action.isRunning()) {
      clonedScene.traverse((child) => {
        if ((child as THREE.Bone).isBone) {
          const saved = idlePoseRef.current.get(child.name);
          if (saved) {
            child.quaternion.slerp(saved.quat, 0.12);
            child.position.lerp(saved.pos, 0.12);
          }
        }
      });
    }

    // Cancel any residual root motion on the hips bone
    if (hipsBoneRef.current && hipsRestPos.current) {
      hipsBoneRef.current.position.copy(hipsRestPos.current);
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, -3]} rotation={[0, Math.PI, 0]}>
      <group ref={containerRef} position={[0, yOffset, 0]}>
        <primitive object={clonedScene} scale={modelScale} />
      </group>
    </group>
  );
}

const DEFAULT_MIN_WALK_Z = -105;

export function MuseumCharacterController({
  minWalkZ = DEFAULT_MIN_WALK_Z,
  maxWalkX = 7.5,
  unlockAnimationTarget,
  onUnlockAnimationDone,
}: {
  minWalkZ?: number;
  maxWalkX?: number;
  unlockAnimationTarget?: UnlockAnimationTarget | null;
  onUnlockAnimationDone?: (artworkId: string) => void;
}) {
  const characterRef = useRef<THREE.Group>(null!);
  const movingRef = useRef(false);
  const { camera, gl } = useThree();
  const keysRef = useRef({ w: false, s: false, a: false, d: false });
  const hammerGroupRef = useRef<THREE.Group>(null);
  const unlockScriptRef = useRef<{
    artworkId: string;
    phase: "move" | "swing";
    timer: number;
    destinationX: number;
    destinationZ: number;
    faceX: number;
    faceZ: number;
  } | null>(null);
  const lastScriptedArtworkIdRef = useRef<string | null>(null);

  const orbitRef = useRef({
    yaw: 0,
    pitch: 0.3,
    distance: CAMERA_DISTANCE,
    dragging: false,
  });

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === "w" || k === "arrowup") keysRef.current.w = true;
      if (k === "s" || k === "arrowdown") keysRef.current.s = true;
      if (k === "a" || k === "arrowleft") keysRef.current.a = true;
      if (k === "d" || k === "arrowright") keysRef.current.d = true;
    };
    const onUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === "w" || k === "arrowup") keysRef.current.w = false;
      if (k === "s" || k === "arrowdown") keysRef.current.s = false;
      if (k === "a" || k === "arrowleft") keysRef.current.a = false;
      if (k === "d" || k === "arrowright") keysRef.current.d = false;
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, []);

  useEffect(() => {
    const canvas = gl.domElement;

    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 0 || e.button === 2) {
        orbitRef.current.dragging = true;
      }
    };
    const onMouseUp = () => {
      orbitRef.current.dragging = false;
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!orbitRef.current.dragging) return;
      const dynamicPitchMin =
        orbitRef.current.distance <= 4.2
          ? PITCH_MIN
          : -0.2;
      orbitRef.current.yaw -= e.movementX * MOUSE_SENSITIVITY;
      orbitRef.current.pitch = THREE.MathUtils.clamp(
        orbitRef.current.pitch + e.movementY * MOUSE_SENSITIVITY,
        dynamicPitchMin,
        PITCH_MAX,
      );
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      orbitRef.current.distance = THREE.MathUtils.clamp(
        orbitRef.current.distance + e.deltaY * 0.01 * SCROLL_ZOOM_SPEED,
        MIN_DISTANCE,
        MAX_DISTANCE,
      );
    };
    const onCtx = (e: Event) => e.preventDefault();

    canvas.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("contextmenu", onCtx);

    return () => {
      canvas.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("contextmenu", onCtx);
    };
  }, [gl]);

  useEffect(() => {
    if (!unlockAnimationTarget) return;
    if (lastScriptedArtworkIdRef.current === unlockAnimationTarget.artworkId) return;
    lastScriptedArtworkIdRef.current = unlockAnimationTarget.artworkId;
    const side = Math.sign(unlockAnimationTarget.frameX) || 1;
    const destinationX =
      Math.abs(unlockAnimationTarget.frameX) > 10
        ? THREE.MathUtils.clamp(unlockAnimationTarget.frameX - side * 2.3, -maxWalkX, maxWalkX)
        : side > 0
          ? 5.2
          : -5.2;
    unlockScriptRef.current = {
      artworkId: unlockAnimationTarget.artworkId,
      phase: "move",
      timer: 0,
      destinationX,
      destinationZ: unlockAnimationTarget.frameZ,
      faceX: unlockAnimationTarget.frameX,
      faceZ: unlockAnimationTarget.frameZ,
    };
  }, [unlockAnimationTarget, maxWalkX]);

  useFrame((_, delta) => {
    if (!characterRef.current) return;
    const char = characterRef.current;
    const keys = keysRef.current;
    const orbit = orbitRef.current;
    const dt = Math.min(delta, 0.05);
    const scripted = unlockScriptRef.current;
    const zMin = Math.min(minWalkZ, DEFAULT_MIN_WALK_Z);

    const camYaw = orbit.yaw;
    _forward.set(-Math.sin(camYaw), 0, -Math.cos(camYaw)).normalize();
    _right.set(-_forward.z, 0, _forward.x);

    _move.set(0, 0, 0);
    if (!scripted) {
      if (keys.w) _move.add(_forward);
      if (keys.s) _move.sub(_forward);
      if (keys.a) _move.sub(_right);
      if (keys.d) _move.add(_right);
    }

    let isMoving = _move.lengthSq() > 0;
    movingRef.current = isMoving;

    if (isMoving) {
      _move.normalize();
      char.position.addScaledVector(_move, MOVE_SPEED * dt);

      const targetYaw = Math.atan2(_move.x, _move.z);
      let diff = targetYaw - char.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      char.rotation.y += diff * LERP_ROTATION;
    }

    if (scripted) {
      if (scripted.phase === "move") {
        _targetMove.set(
          scripted.destinationX - char.position.x,
          0,
          scripted.destinationZ - char.position.z
        );
        const dist = _targetMove.length();
        if (dist > 0.05) {
          _targetMove.normalize();
          char.position.addScaledVector(_targetMove, MOVE_SPEED * 1.05 * dt);
          isMoving = true;
          movingRef.current = true;
        } else {
          scripted.phase = "swing";
          scripted.timer = 0;
          isMoving = false;
          movingRef.current = false;
        }

        const targetYaw = Math.atan2(
          scripted.faceX - char.position.x,
          scripted.faceZ - char.position.z
        );
        let diff = targetYaw - char.rotation.y;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        char.rotation.y += diff * 0.25;
      } else {
        scripted.timer += dt;
        const targetYaw = Math.atan2(
          scripted.faceX - char.position.x,
          scripted.faceZ - char.position.z
        );
        let diff = targetYaw - char.rotation.y;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        char.rotation.y += diff * 0.26;

        if (scripted.timer >= 1.15) {
          onUnlockAnimationDone?.(scripted.artworkId);
          unlockScriptRef.current = null;
        }
      }
    }

    // ── Corridor collision bounds ──────────────────────────────────────
    // Geometry (world space):
    //   Corridor 1 (main):  X ∈ [-7.5,+7.5],  Z free (full length)
    //   Corridor 2 (right): X ∈ [+8,+57.5],   Z ∈ [-51,-35]
    //   Corridor 3 (left):  X ∈ [-57.5,-8],   Z ∈ [-51,-35]
    //   Junction opening in Corridor 1 walls at Z ∈ [-51,-35]
    const MAIN_HALF_W     = 7.5;
    const BRANCH_OUTER_X  = maxWalkX;  // 57.5
    const JUNCTION_Z_FAR  = -51;       // back wall of side corridors
    const JUNCTION_Z_NEAR = -35;       // front wall of side corridors
    const NSFW_T_Z_FAR    = -139;      // back wall of end T branches
    const NSFW_T_Z_NEAR   = -123;      // front wall of end T branches
    const NSFW_T_OUTER_X  = 50;        // end T-branch outer wall X
    const WALL_INSET = 0.2;            // keep character off wall thickness

    const cx = char.position.x;
    const cz = char.position.z;

    const inJunctionZ = cz <= JUNCTION_Z_NEAR && cz >= JUNCTION_Z_FAR;
    const inBranchX = Math.abs(cx) > MAIN_HALF_W + WALL_INSET;
    const inNsfwTJunctionZ = cz <= NSFW_T_Z_NEAR && cz >= NSFW_T_Z_FAR;
    const inNsfwBranchX = Math.abs(cx) > MAIN_HALF_W + WALL_INSET;

    if (inJunctionZ) {
      // Junction is an open cross area: allow free crossing main <-> side corridors.
      // Keep only the global outer X bounds here.
      char.position.x = THREE.MathUtils.clamp(cx, -BRANCH_OUTER_X + WALL_INSET, BRANCH_OUTER_X - WALL_INSET);
      // If currently deep in branch X zone, keep Z inside branch walls.
      if (inBranchX) {
        char.position.z = THREE.MathUtils.clamp(
          char.position.z,
          JUNCTION_Z_FAR + WALL_INSET,
          JUNCTION_Z_NEAR - WALL_INSET,
        );
      }
    } else if (inNsfwTJunctionZ) {
      // End NSFW T-junction is also open cross-area.
      char.position.x = THREE.MathUtils.clamp(
        cx,
        -NSFW_T_OUTER_X + WALL_INSET,
        NSFW_T_OUTER_X - WALL_INSET,
      );
      if (inNsfwBranchX) {
        char.position.z = THREE.MathUtils.clamp(
          char.position.z,
          NSFW_T_Z_FAR + WALL_INSET,
          NSFW_T_Z_NEAR - WALL_INSET,
        );
      }
    } else {
      // Outside junction Z, player must remain in the main corridor width.
      char.position.x = THREE.MathUtils.clamp(cx, -MAIN_HALF_W + WALL_INSET, MAIN_HALF_W - WALL_INSET);
    }

    char.position.z = THREE.MathUtils.clamp(char.position.z, zMin, 4);
    char.position.y = 0;

    const dist = orbit.distance;
    const horizDist = dist * Math.cos(orbit.pitch);
    const vertOffset = dist * Math.sin(orbit.pitch);

    let camX = char.position.x + Math.sin(camYaw) * horizDist;
    let camZ = char.position.z + Math.cos(camYaw) * horizDist;
    let camY = CAMERA_LOOK_HEIGHT + vertOffset;

    // ── Camera wall collision ─────────────────────────────────────────
    // Mirror the same corridor geometry. CAM_INSET prevents near-clip clipping.
    const CAM_INSET = 0.35;
    const camInJunctionZ = camZ <= JUNCTION_Z_NEAR && camZ >= JUNCTION_Z_FAR;
    const camInBranchX = Math.abs(camX) > MAIN_HALF_W + CAM_INSET;
    const camInNsfwTJunctionZ = camZ <= NSFW_T_Z_NEAR && camZ >= NSFW_T_Z_FAR;
    const camInNsfwBranchX = Math.abs(camX) > MAIN_HALF_W + CAM_INSET;

    if (camInJunctionZ) {
      // Open cross junction: camera can cross freely.
      camX = THREE.MathUtils.clamp(camX, -BRANCH_OUTER_X + CAM_INSET, BRANCH_OUTER_X - CAM_INSET);
      if (camInBranchX) {
        camZ = THREE.MathUtils.clamp(camZ, JUNCTION_Z_FAR + CAM_INSET, JUNCTION_Z_NEAR - CAM_INSET);
      }
    } else if (camInNsfwTJunctionZ) {
      // End NSFW T-junction: allow left/right branches, keep camera in bounds.
      camX = THREE.MathUtils.clamp(
        camX,
        -NSFW_T_OUTER_X + CAM_INSET,
        NSFW_T_OUTER_X - CAM_INSET,
      );
      if (camInNsfwBranchX) {
        camZ = THREE.MathUtils.clamp(camZ, NSFW_T_Z_FAR + CAM_INSET, NSFW_T_Z_NEAR - CAM_INSET);
      }
    } else {
      // Outside junction, keep camera in main corridor.
      camX = THREE.MathUtils.clamp(camX, -MAIN_HALF_W + CAM_INSET, MAIN_HALF_W - CAM_INSET);
    }

    const camZMin = zMin - 0.2;
    camZ = THREE.MathUtils.clamp(camZ, camZMin, 4.2);
    camY = THREE.MathUtils.clamp(camY, 0.5, 4.5);

    _idealCam.set(camX, camY, camZ);
    _lookTarget.set(char.position.x, CAMERA_LOOK_HEIGHT, char.position.z);

    camera.position.lerp(_idealCam, LERP_CAM);
    camera.lookAt(_lookTarget);

    if (hammerGroupRef.current) {
      const runningScript = unlockScriptRef.current;
      const visible = !!runningScript;
      hammerGroupRef.current.visible = visible;
      if (visible && runningScript) {
        const offset = _hammerOffset.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), char.rotation.y);
        hammerGroupRef.current.position.set(
          char.position.x + offset.x,
          char.position.y + offset.y,
          char.position.z + offset.z
        );
        const swingT = runningScript.phase === "swing"
          ? Math.min(1, runningScript.timer / 1.05)
          : 0;
        hammerGroupRef.current.rotation.set(
          -0.25 + Math.sin(swingT * Math.PI * 3.2) * 0.85 * (1 - swingT * 0.25),
          char.rotation.y + 0.35,
          0.5
        );
      }
    }
  });

  return (
    <group>
      <CharacterModel groupRef={characterRef} movingRef={movingRef} />
      <group ref={hammerGroupRef} visible={false}>
        <mesh>
          <boxGeometry args={[0.08, 0.55, 0.08]} />
          <meshStandardMaterial color="#7b4c29" roughness={0.7} metalness={0.05} />
        </mesh>
        <mesh position={[0, 0.27, 0]}>
          <boxGeometry args={[0.24, 0.1, 0.12]} />
          <meshStandardMaterial color="#c6c0d2" roughness={0.25} metalness={0.7} />
        </mesh>
      </group>
    </group>
  );
}

useGLTF.preload(AVATAR_MODEL_URL);
