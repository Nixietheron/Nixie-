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
const PITCH_MIN = 0.05;
const PITCH_MAX = 1.0;
const SCROLL_ZOOM_SPEED = 0.8;
const MIN_DISTANCE = 2.5;
const MAX_DISTANCE = 12;
const DESIRED_HEIGHT = 1.7;

const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _move = new THREE.Vector3();
const _idealCam = new THREE.Vector3();
const _lookTarget = new THREE.Vector3();

function CharacterModel({
  groupRef,
  movingRef,
}: {
  groupRef: React.RefObject<THREE.Group>;
  movingRef: React.MutableRefObject<boolean>;
}) {
  const containerRef = useRef<THREE.Group>(null!);
  const { scene, animations } = useGLTF("/api/museum-avatar?v=2");
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

export function MuseumCharacterController() {
  const characterRef = useRef<THREE.Group>(null!);
  const movingRef = useRef(false);
  const { camera, gl } = useThree();
  const keysRef = useRef({ w: false, s: false, a: false, d: false });

  const orbitRef = useRef({
    yaw: Math.PI,
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
      orbitRef.current.yaw += e.movementX * MOUSE_SENSITIVITY;
      orbitRef.current.pitch = THREE.MathUtils.clamp(
        orbitRef.current.pitch + e.movementY * MOUSE_SENSITIVITY,
        PITCH_MIN,
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

  useFrame((_, delta) => {
    if (!characterRef.current) return;
    const char = characterRef.current;
    const keys = keysRef.current;
    const orbit = orbitRef.current;
    const dt = Math.min(delta, 0.05);

    const camYaw = orbit.yaw;
    _forward.set(-Math.sin(camYaw), 0, -Math.cos(camYaw)).normalize();
    _right.set(-_forward.z, 0, _forward.x);

    _move.set(0, 0, 0);
    if (keys.w) _move.add(_forward);
    if (keys.s) _move.sub(_forward);
    if (keys.a) _move.sub(_right);
    if (keys.d) _move.add(_right);

    const isMoving = _move.lengthSq() > 0;
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

    char.position.x = THREE.MathUtils.clamp(char.position.x, -7.5, 7.5);
    char.position.z = THREE.MathUtils.clamp(char.position.z, -93, 4);
    char.position.y = 0;

    const dist = orbit.distance;
    const horizDist = dist * Math.cos(orbit.pitch);
    const vertOffset = dist * Math.sin(orbit.pitch);

    let camX = char.position.x + Math.sin(camYaw) * horizDist;
    let camZ = char.position.z + Math.cos(camYaw) * horizDist;
    let camY = CAMERA_LOOK_HEIGHT + vertOffset;

    camX = THREE.MathUtils.clamp(camX, -7.2, 7.2);
    camZ = THREE.MathUtils.clamp(camZ, -93.2, 4.2);
    camY = THREE.MathUtils.clamp(camY, 0.5, 4.5);

    _idealCam.set(camX, camY, camZ);
    _lookTarget.set(char.position.x, CAMERA_LOOK_HEIGHT, char.position.z);

    camera.position.lerp(_idealCam, LERP_CAM);
    camera.lookAt(_lookTarget);
  });

  return <CharacterModel groupRef={characterRef} movingRef={movingRef} />;
}

useGLTF.preload("/api/museum-avatar?v=2");
