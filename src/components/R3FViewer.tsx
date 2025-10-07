"use client";
// R3FViewer.tsx
// High-level overview:
// This file implements a configurable 3D viewer/editor using React Three Fiber (R3F) with:
// 1. Loading a base architectural / room GLTF model.
// 2. Adding, selecting, transforming (translate/rotate/scale) furniture models placed on discrete floors & grid.
// 3. Switching between orbit (inspect) mode and a constrained first-person walking mode across multiple floors.
// 4. Dynamic color customization for the base model and furniture.
// 5. Accessible external imperative helpers (attached to window) for integration with other UI panels.
// 6. Persisting transient camera state & model bounds globally (window namespace) for cross-component access.
//
// Components summary:
// - FirstPersonWalk: Keyboard-driven movement (WASD / arrows + Shift) with clamped bounds & fixed eye height.
// - Furniture: Loads an individual GLTF furniture item, recolors materials, centers pivot, shows selection gizmos.
// - GroundPlanes: Invisible large click-planes at each floor height to place furniture precisely.
// - Model: Loads the main GLTF, normalizes materials, auto-frames camera, manages furniture collection & transform controls.
// - FrameCapture: Copies camera position and look target each frame to window for external usage.
// - R3FViewerComponent: Orchestrates editor state, API loading (furniture catalog), color & transform modes, UI overlay.
//
// Notable global window keys used:
// __modelBounds, __lastCameraState, __disableOrbit
// addFurniture, removeFurniture, updateFurnitureColor, updateFurnitureTransform, setModelColor
//
// Design constraints:
// - Furniture placement & transform snapping uses a 0.25m grid and discrete floor heights [0,3,6,9,12].
// - First person camera Y is always floor height + 1.6 to simulate eye level.
// - TransformControls disables orbit interaction while active (flag on window).
// - Material adjustments force semi-transparent standard materials for consistent lighting.
//
// Future extension ideas:
// - Persist layout to backend (serialize furniture list with transforms).
// - Add collision / raycast floor detection instead of fixed floor array.
// - Add gizmo for floor switching or mini-map.
// - Integrate color/material library picker.
// - Support multi-select + group transforms.
// -----------------------------------------------------------------------------
import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import {
  OrbitControls,
  Environment,
  Html,
  useGLTF,
  TransformControls,
  PointerLockControls,
} from "@react-three/drei";
import { DoubleSide, Color, Vector3, Group, MOUSE } from "three";
import dynamic from "next/dynamic";

function FirstPersonWalk({
  enabled,
  floorY,
}: {
  enabled: boolean;
  floorY: number;
}) {
  const { camera } = useThree();
  const keys = useRef<Record<string, boolean>>({});
  const speedRef = useRef(0.06);

  useEffect(() => {
    if (!enabled) return;
    // Register key state listeners only when first-person mode is enabled.
    const kd = (e: KeyboardEvent) => {
      keys.current[e.code] = true;
    };
    const ku = (e: KeyboardEvent) => {
      keys.current[e.code] = false;
    };
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    let raf = 0;
    const loop = () => {
      if (!enabled) return;
      const THREE = require("three");
      // Determine forward direction (ignore pitch) & right vector for strafing.
      const dir = new THREE.Vector3();
      camera.getWorldDirection(dir);
      const forward = new THREE.Vector3(dir.x, 0, dir.z).normalize();
      const right = new THREE.Vector3()
        .crossVectors(forward, new THREE.Vector3(0, 1, 0))
        .normalize()
        .negate();
      // Shift doubles movement speed.
      const speed =
        keys.current["ShiftLeft"] || keys.current["ShiftRight"]
          ? speedRef.current * 2
          : speedRef.current;
      const deltaMove = new THREE.Vector3();
      // Accumulate directional movement (WASD / Arrows) - forward/back & strafe.
      if (keys.current["KeyW"] || keys.current["ArrowUp"])
        deltaMove.add(forward.multiplyScalar(speed));
      if (keys.current["KeyS"] || keys.current["ArrowDown"])
        deltaMove.add(forward.multiplyScalar(-speed));
      if (keys.current["KeyA"] || keys.current["ArrowLeft"])
        deltaMove.add(right.multiplyScalar(-speed));
      if (keys.current["KeyD"] || keys.current["ArrowRight"])
        deltaMove.add(right.multiplyScalar(speed));
      camera.position.add(deltaMove);

      const b =
        typeof window !== "undefined"
          ? (window as any).__modelBounds
          : undefined;
      if (b?.min && b?.max) {
        // Clamp movement inside loaded model bounding box with small margin.
        camera.position.x = Math.min(
          Math.max(camera.position.x, b.min[0] + 0.2),
          b.max[0] - 0.2
        );
        camera.position.z = Math.min(
          Math.max(camera.position.z, b.min[2] + 0.2),
          b.max[2] - 0.2
        );
      }
      // Eye height is locked per floor for a comfortable viewing level.
      camera.position.y = floorY;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
    };
  }, [enabled, camera, floorY]);

  return null;
}

interface FurnitureModel {
  id: string;
  name: string;
  filename: string;
  path: string;
}

interface FurnitureItem {
  id: string;
  type: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  color: string;
}

function Furniture({
  item,
  isSelected,
  onClick,
  onReady,
}: {
  item: FurnitureItem;
  isSelected: boolean;
  onClick: () => void;
  onReady?: (group: Group) => void;
}) {
  const groupRef = useRef<Group>(null);
  const modelRef = useRef<Group>(null);
  const gltf: any = useGLTF(item.type);
  const decoratedScene = useMemo(() => {
    if (!gltf?.scene) return null;
    // Clone the scene so we can safely recolor materials without mutating cache.
    const cloned = gltf.scene.clone(true);
    cloned.traverse((obj: any) => {
      if (obj.isMesh && obj.material) {
        const mats = Array.isArray(obj.material)
          ? obj.material
          : [obj.material];
        mats.forEach((m: any) => {
          if (m?.color) {
            m.color = new Color(item.color);
          }
        });
      }
    });
    return cloned;
  }, [gltf, item.color]);

  useEffect(() => {
    if (!decoratedScene || !modelRef.current) return;
    // Re-center pivot so rotations & scaling behave intuitively around object center.
    const box = new (require("three").Box3)().setFromObject(decoratedScene);
    const size = box.getSize(new Vector3());
    const center = box.getCenter(new Vector3());
    modelRef.current.clear();
    const centered = new (require("three").Group)();
    decoratedScene.position.sub(center);
    decoratedScene.position.y = size.y / 2;
    centered.add(decoratedScene);
    modelRef.current.add(centered);
  }, [decoratedScene]);

  useEffect(() => {
    if (groupRef.current && onReady) onReady(groupRef.current);
  }, [groupRef.current, onReady]);
  useEffect(() => {
    if (groupRef.current && onReady) onReady(groupRef.current);
  }, [isSelected, onReady]);

  return (
    <group
      ref={groupRef}
      position={item.position}
      rotation={item.rotation}
      scale={item.scale}
      onClick={onClick}
    >
      {decoratedScene ? (
        <group ref={modelRef} />
      ) : (
        <mesh>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color={item.color} />
        </mesh>
      )}
      {isSelected && (
        <>
          {/* Simple visual gizmos / markers when selected (can be replaced by bounding box helper). */}
          <mesh position={[0, 1, 0]}>
            <boxGeometry args={[0.1, 0.1, 0.1]} />
            <meshBasicMaterial color="red" />
          </mesh>
          <mesh position={[0, 0, 0]}>
            <sphereGeometry args={[0.05, 8, 8]} />
            <meshBasicMaterial color="yellow" />
          </mesh>
        </>
      )}
    </group>
  );
}

function GroundPlanes({
  onPlace,
  isActive,
  onUnselect,
}: {
  onPlace: (point: { x: number; y: number; z: number }) => void;
  isActive: boolean;
  onUnselect: () => void;
}) {
  const floors = [0, 3, 6, 9, 12];
  return (
    <>
      {floors.map((h) => (
        <mesh
          key={h}
          position={[0, h, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          onClick={(e: any) => {
            e.stopPropagation();
            if (isActive) {
              // When in placement mode, clicking plane places furniture at snapped point.
              const p = e.point;
              onPlace({ x: p.x, y: h, z: p.z });
            } else {
              // If not active, clicking deselects furniture (prevents event leaking to model).
              onUnselect();
            }
          }}
        >
          <planeGeometry args={[1000, 1000, 1, 1]} />
          <meshBasicMaterial visible={false} />
        </mesh>
      ))}
    </>
  );
}

function Model({
  url,
  selectedFurniture,
  onFurnitureClick,
  transformMode,
}: {
  url: string;
  selectedFurniture: string | null;
  onFurnitureClick: (id: string) => void;
  transformMode: "none" | "translate" | "rotate" | "scale";
}) {
  const group = useRef<any>(null);
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls as any);
  const viewport = useThree((s) => s.size);
  const gltf = useGLTF(url);
  const [furniture, setFurniture] = useState<FurnitureItem[]>([]);
  const [modelColor, setModelColor] = useState("#b0bec5");
  const idToObjectRef = useRef<Record<string, Group>>({});

  useEffect(() => {
    if (!gltf?.scene) return;
    // Normalize all mesh materials to MeshStandardMaterial & unify surface appearance.
    gltf.scene.traverse((obj: any) => {
      if (obj.isMesh && obj.material) {
        const mats = Array.isArray(obj.material)
          ? obj.material
          : [obj.material];
        mats.forEach((m: any) => {
          if (!m.isMeshStandardMaterial) {
            const newMaterial = new (require("three").MeshStandardMaterial)({
              color: m.color || new Color(modelColor),
              metalness: 0.1,
              roughness: 0.8,
              transparent: true,
              opacity: 0.85,
              side: DoubleSide,
              depthWrite: true,
            });
            obj.material = newMaterial;
          } else {
            if (m?.color) m.color = new Color(modelColor);
            m.metalness = 0.1;
            m.roughness = 0.8;
            m.transparent = true;
            m.opacity = 0.85;
            m.side = DoubleSide;
            m.depthWrite = true;
          }
        });
      }
    });
  }, [gltf, modelColor]);

  useEffect(() => {
    if (!gltf?.scene || !camera) return;
    // Compute model bounds to: frame camera, clamp first-person movement, and store globally.
    const THREE = require("three");
    const box = new THREE.Box3().setFromObject(gltf.scene);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    if (typeof window !== "undefined") {
      (window as any).__modelBounds = {
        center: [center.x, center.y, center.z],
        size: [size.x, size.y, size.z],
        min: [box.min.x, box.min.y, box.min.z],
        max: [box.max.x, box.max.y, box.max.z],
      };
    }

    const fovDeg: number =
      (camera as any).fov != null ? (camera as any).fov : 60;
    const fov = (fovDeg * Math.PI) / 180;
    const halfY = size.y / 2;
    const halfX = size.x / 2;
    const aspect = Math.max(0.1, viewport.width / Math.max(1, viewport.height));
    const fitHeightDistance = halfY / Math.tan(fov / 2);
    const fitWidthDistance = halfX / (Math.tan(fov / 2) * aspect);
    let distance = Math.max(fitHeightDistance, fitWidthDistance) * 1.3;

    const eyeY = box.min.y + Math.min(1.7, Math.max(1.4, size.y * 0.35));
    const dir = new THREE.Vector3(1, 0, 1).normalize();
    const newPos = new THREE.Vector3(center.x, eyeY, center.z).add(
      dir.multiplyScalar(distance)
    );
    // Position camera diagonally above the model and adjust clipping planes.
    camera.position.copy(newPos);
    (camera as any).near = Math.max(0.01, distance / 100);
    (camera as any).far = Math.max(500, distance * 200);
    (camera as any).updateProjectionMatrix?.();
    if (controls?.target) {
      controls.target.set(center.x, eyeY, center.z);
      if (typeof controls.minDistance === "number")
        controls.minDistance = distance * 0.1;
      if (typeof controls.maxDistance === "number")
        controls.maxDistance = distance * 10;
      controls.update?.();
    }
  }, [gltf, camera, controls, viewport]);

  const addFurniture = (
    modelPath: string,
    position: [number, number, number]
  ) => {
    if (!modelPath) return;
    // Create new furniture entry with default orientation & color.
    const newItem: FurnitureItem = {
      id: `furniture-${Date.now()}`,
      type: modelPath,
      position,
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      color: "#8B4513",
    };
    setFurniture((prev) => [...prev, newItem]);
  };
  const removeFurniture = (id: string) =>
    setFurniture((prev) => prev.filter((i) => i.id !== id));
  const updateFurnitureColor = (id: string, color: string) =>
    setFurniture((prev) =>
      prev.map((i) => (i.id === id ? { ...i, color } : i))
    );
  const updateFurnitureTransform = (
    id: string,
    t: {
      position: [number, number, number];
      rotation: [number, number, number];
      scale: [number, number, number];
    }
  ) => {
    setFurniture((prev) => prev.map((i) => (i.id === id ? { ...i, ...t } : i)));
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      // Expose mutator helpers for external UI (e.g., side panels / color pickers).
      (window as any).addFurniture = addFurniture;
      (window as any).removeFurniture = removeFurniture;
      (window as any).updateFurnitureColor = updateFurnitureColor;
      (window as any).updateFurnitureTransform = updateFurnitureTransform;
      (window as any).setModelColor = (c: string) => setModelColor(c);
    }
  }, []);

  return (
    <group ref={group}>
      <primitive object={gltf.scene} />
      {furniture.map((item) => (
        <Furniture
          key={item.id}
          item={item}
          isSelected={selectedFurniture === item.id}
          onClick={() => onFurnitureClick(item.id)}
          onReady={(obj) => {
            idToObjectRef.current[item.id] = obj;
          }}
        />
      ))}
      {selectedFurniture &&
        idToObjectRef.current[selectedFurniture] &&
        transformMode !== "none" && (
          <TransformControls
            object={idToObjectRef.current[selectedFurniture]}
            mode={transformMode}
            showX
            showY
            showZ
            translationSnap={0.25}
            rotationSnap={Math.PI / 12}
            scaleSnap={0.1}
            space="world"
            size={2}
            onMouseDown={() => {
              if (typeof window !== "undefined")
                (window as any).__disableOrbit = true;
            }}
            onMouseUp={() => {
              if (typeof window !== "undefined")
                (window as any).__disableOrbit = false;
              const obj = idToObjectRef.current[selectedFurniture];
              if (
                obj &&
                typeof window !== "undefined" &&
                (window as any).updateFurnitureTransform
              ) {
                // Persist final transform back to state via global helper.
                (window as any).updateFurnitureTransform(selectedFurniture, {
                  position: [obj.position.x, obj.position.y, obj.position.z],
                  rotation: [obj.rotation.x, obj.rotation.y, obj.rotation.z],
                  scale: [obj.scale.x, obj.scale.y, obj.scale.z],
                });
              }
            }}
            onChange={() => {
              const obj = idToObjectRef.current[selectedFurniture];
              if (!obj) return;
              // Snap X/Z to grid & Y to nearest discrete floor while moving.
              const grid = 0.25;
              obj.position.x = Math.round(obj.position.x / grid) * grid;
              obj.position.z = Math.round(obj.position.z / grid) * grid;
              const floors = [0, 3, 6, 9, 12];
              const nearestFloor = floors.reduce(
                (p, c) =>
                  Math.abs(c - obj.position.y) < Math.abs(p - obj.position.y)
                    ? c
                    : p,
                floors[0]
              );
              obj.position.y = nearestFloor;
            }}
          />
        )}
    </group>
  );
}

function FrameCapture() {
  const { camera } = useThree();
  useFrame(() => {
    const THREE = require("three");
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    const look = dir.add((camera as any).position.clone());
    // Share latest camera eye & lookAt each frame for UI overlays / state sync.
    (window as any).__lastCameraState = {
      position: [
        (camera as any).position.x,
        (camera as any).position.y,
        (camera as any).position.z,
      ],
      lookAt: [look.x, look.y, look.z],
    };
  });
  return null;
}

// -----------------------------------------------------------------------------
// AutoTour: Smoothly animates camera along a generated set of waypoints.
// Waypoints contain: position, lookAt, duration (ms) per segment.
// Interpolates position & target (OrbitControls target) with a smoothstep easing.
// -----------------------------------------------------------------------------
interface TourWaypoint {
  position: [number, number, number];
  lookAt: [number, number, number];
  // duration to next waypoint (ms)
  duration?: number;
}

function AutoTour({
  path,
  playing,
  loop = true,
  speedFactor = 1,
  onFinish,
}: {
  path: TourWaypoint[];
  playing: boolean;
  loop?: boolean;
  speedFactor?: number; // >= 0.05 (values < 1 slow down, > 1 speed up)
  onFinish?: () => void;
}) {
  const { camera } = useThree();
  const controls = useThree((s) => s.controls as any);
  const segIdxRef = useRef(0);
  // Accumulated elapsed time (ms) inside current segment (scaled by speedFactor each frame)
  const segElapsedRef = useRef(0);
  const pathRef = useRef<TourWaypoint[]>(path);
  const speedRef = useRef(speedFactor);

  useEffect(() => {
    speedRef.current = Math.max(0.05, speedFactor || 1);
  }, [speedFactor]);

  useEffect(() => {
    pathRef.current = path;
  }, [path]);

  useEffect(() => {
    if (playing && path.length > 1) {
      segIdxRef.current = 0;
      segElapsedRef.current = 0;
    }
  }, [playing, path]);

  useFrame((_, delta) => {
    if (!playing || pathRef.current.length < 2) return;
    const seg = segIdxRef.current;
    const a = pathRef.current[seg];
    const b = pathRef.current[(seg + 1) % pathRef.current.length];
    const baseDuration = b.duration ?? 4000; // ms (unscaled reference)
    // Advance elapsed time scaled by current speed factor.
    segElapsedRef.current += delta * 1000 * speedRef.current;
    const tRaw = segElapsedRef.current / baseDuration;
    const t = Math.min(1, Math.max(0, tRaw));
    // Smoothstep ease
    const ease = t * t * (3 - 2 * t);

    // Lerp position
    const lerp = (aNum: number, bNum: number) => aNum + (bNum - aNum) * ease;
    camera.position.set(
      lerp(a.position[0], b.position[0]),
      lerp(a.position[1], b.position[1]),
      lerp(a.position[2], b.position[2])
    );

    const targetX = lerp(a.lookAt[0], b.lookAt[0]);
    const targetY = lerp(a.lookAt[1], b.lookAt[1]);
    const targetZ = lerp(a.lookAt[2], b.lookAt[2]);
    if (controls?.target) {
      controls.target.set(targetX, targetY, targetZ);
      controls.update?.();
    } else {
      camera.lookAt(targetX, targetY, targetZ);
    }

    if (tRaw >= 1) {
      segIdxRef.current += 1;
      segElapsedRef.current = 0; // reset for next segment
      if (segIdxRef.current >= pathRef.current.length - 1) {
        if (loop) {
          segIdxRef.current = 0;
        } else {
          // Finish tour
          onFinish?.();
        }
      }
    }
  });
  return null;
}

function R3FViewerComponent({
  url,
  editMode,
  setEditMode,
  onEditControlsReady,
}: {
  url: string;
  editMode: boolean;
  setEditMode: (mode: boolean) => void;
  onEditControlsReady?: (controls: any) => void;
}) {
  const [selectedFurniture, setSelectedFurniture] = useState<string | null>(
    null
  );
  const [selectedFurnitureModel, setSelectedFurnitureModel] =
    useState<FurnitureModel | null>(null);
  const [modelColor, setModelColor] = useState("#b0bec5");
  const [furnitureColor, setFurnitureColor] = useState("#8B4513");
  const [mounted, setMounted] = useState(false);
  const [furnitureModels, setFurnitureModels] = useState<FurnitureModel[]>([]);
  const [loadingFurniture, setLoadingFurniture] = useState(false);
  const [transformMode, setTransformMode] = useState<
    "none" | "translate" | "rotate" | "scale"
  >("none");
  const [showHints, setShowHints] = useState(true);
  const [firstPerson, setFirstPerson] = useState(false);
  const [walkFloorIdx, setWalkFloorIdx] = useState(0);
  const ariaRef = useRef<HTMLDivElement | null>(null);

  // -------------------- Auto Tour State --------------------
  const [isTourPlaying, setIsTourPlaying] = useState(false);
  const [tourPath, setTourPath] = useState<
    {
      position: [number, number, number];
      lookAt: [number, number, number];
      duration?: number;
    }[]
  >([]);
  const [tourLoop, setTourLoop] = useState(true);
  // Speed multiplier for automatic tours (1 = normal, <1 slower, >1 faster)
  const [tourSpeed, setTourSpeed] = useState(1);
  // Tour mode: 'orbit' = outside circular + overview, 'interior' = inside rectangular path per floor.
  const [tourMode, setTourMode] = useState<"orbit" | "interior">("orbit");
  // Interior tour specific: which floor index (from floors array) and whether to cycle floors automatically.
  const [interiorFloorIdx, setInteriorFloorIdx] = useState(0);
  const [interiorCycleFloors, setInteriorCycleFloors] = useState(false);
  // Full building tour state: runs one exterior orbit then sequential interior floors.
  const [fullBuildingTour, setFullBuildingTour] = useState(false);
  const [fullTourStage, setFullTourStage] = useState<
    "idle" | "orbit" | "interior"
  >("idle");
  // Remote control style panel visibility
  const [controlPanelOpen, setControlPanelOpen] = useState(true);
  // Pointer lock explicit state (separate from firstPerson toggle)
  const [pointerLocked, setPointerLocked] = useState(false);
  const plcRef = useRef<any>(null);
  // Track pending lock intent to retry after entering first-person
  const [pendingPointerLock, setPendingPointerLock] = useState(false);
  // Yaw/pitch for custom mouselook
  const yawRef = useRef(0);
  const pitchRef = useRef(0);
  const sensitivityRef = useRef(0.0025); // base mouse sensitivity
  const draggingRef = useRef(false); // right button drag fallback
  const prevClientRef = useRef<{ x: number; y: number } | null>(null);
  const r3fCameraRef = useRef<any>(null);
  // Capture camera ref via a helper component once.
  const CameraRefCatcher = () => {
    const cam = useThree((s) => s.camera);
    useEffect(() => {
      r3fCameraRef.current = cam;
    }, [cam]);
    return null;
  };

  // Apply custom yaw/pitch orientation each frame via a Canvas child component.
  const FirstPersonLook = ({
    active,
    pointerLocked,
    draggingRef,
    yawRef,
    pitchRef,
    r3fCameraRef,
  }: {
    active: boolean;
    pointerLocked: boolean;
    draggingRef: any;
    yawRef: any;
    pitchRef: any;
    r3fCameraRef: any;
  }) => {
    useFrame(() => {
      if (!active) return;
      // Only rotate camera when pointer locked OR user is actively right-dragging.
      if (!pointerLocked && !draggingRef.current) return;
      const camera = r3fCameraRef.current;
      if (!camera) return;
      // Clamp pitch to prevent flipping.
      const maxPitch = Math.PI / 2 - 0.05;
      pitchRef.current = Math.min(
        maxPitch,
        Math.max(-maxPitch, pitchRef.current)
      );
      // Construct direction from yaw/pitch.
      const dir = new Vector3(
        Math.cos(pitchRef.current) * Math.sin(yawRef.current),
        Math.sin(pitchRef.current),
        Math.cos(pitchRef.current) * Math.cos(yawRef.current)
      );
      const pos = (camera as any).position.clone();
      const target = pos.clone().add(dir);
      (camera as any).lookAt(target);
    });
    return null;
  };

  // Listen for mouse movement to update yaw/pitch (only in first-person & not touring)
  useEffect(() => {
    if (!firstPerson || isTourPlaying) return;
    const handleMove = (e: MouseEvent) => {
      if (pointerLocked) {
        yawRef.current -= e.movementX * sensitivityRef.current;
        pitchRef.current -= e.movementY * sensitivityRef.current;
        return;
      }
      if (draggingRef.current && prevClientRef.current) {
        const dx = e.clientX - prevClientRef.current.x;
        const dy = e.clientY - prevClientRef.current.y;
        prevClientRef.current = { x: e.clientX, y: e.clientY };
        yawRef.current -= dx * sensitivityRef.current;
        pitchRef.current -= dy * sensitivityRef.current;
      }
    };
    const handleDown = (e: MouseEvent) => {
      // Right button drag fallback when not locked.
      if (!pointerLocked && e.button === 2) {
        draggingRef.current = true;
        prevClientRef.current = { x: e.clientX, y: e.clientY };
      }
    };
    const handleUp = (e: MouseEvent) => {
      if (e.button === 2) {
        draggingRef.current = false;
        prevClientRef.current = null;
      }
    };
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mousedown", handleDown);
    window.addEventListener("mouseup", handleUp);
    window.addEventListener(
      "contextmenu",
      (e) => {
        if (draggingRef.current) e.preventDefault();
      },
      { passive: false }
    );
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mousedown", handleDown);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [firstPerson, isTourPlaying, pointerLocked]);

  // When entering first-person initialize yaw/pitch based on current camera direction.
  useEffect(() => {
    if (!firstPerson) return;
    const camera = r3fCameraRef.current;
    if (!camera) return;
    const THREE = require("three");
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    // yaw = angle around Y, pitch = arcsin(y)
    yawRef.current = Math.atan2(dir.x, dir.z);
    pitchRef.current = Math.asin(Math.max(-0.999, Math.min(0.999, dir.y)));
  }, [firstPerson]);

  // Attempt deferred pointer lock after first-person becomes active.
  useEffect(() => {
    if (firstPerson && pendingPointerLock && !pointerLocked && plcRef.current) {
      // Use rAF to ensure controls are mounted.
      requestAnimationFrame(() => {
        try {
          plcRef.current?.lock?.();
        } catch {}
      });
    }
  }, [firstPerson, pendingPointerLock, pointerLocked]);

  // Generate a tour path based on current tour mode & (optionally) interior floor.
  const generateTourPath = useCallback(
    (mode: "orbit" | "interior", floorIdx: number) => {
      if (typeof window === "undefined" || !(window as any).__modelBounds)
        return [] as TourWaypoint[];
      const b = (window as any).__modelBounds as {
        center: [number, number, number];
        size: [number, number, number];
        min: [number, number, number];
        max: [number, number, number];
      };
      const [cx, cy, cz] = b.center;
      const [sx, sy, sz] = b.size;
      if (mode === "orbit") {
        const radius = Math.max(sx, sz) * 1.4 + 0.5;
        const eyeY = b.center[1] + Math.min(2.5, sy * 0.5);
        const angles = [45, 135, 225, 315];
        const base: TourWaypoint[] = angles.map((deg) => {
          const rad = (deg * Math.PI) / 180;
          return {
            position: [
              cx + Math.cos(rad) * radius,
              eyeY,
              cz + Math.sin(rad) * radius,
            ],
            lookAt: [cx, cy + sy * 0.3, cz],
            duration: 4500,
          };
        });
        base.push({
          position: [cx + radius * 0.6, cy + sy * 1.6, cz + radius * 0.6],
          lookAt: [cx, cy + sy * 0.3, cz],
          duration: 6000,
        });
        base.push({ ...base[0], duration: 4000 });
        return base;
      }
      // Interior path: rectangle around inside perimeter on chosen floor.
      const floorHeights = [0, 3, 6, 9, 12];
      const baseFloorY =
        floorHeights[Math.max(0, Math.min(floorIdx, floorHeights.length - 1))];
      const eyeY = baseFloorY + 1.6; // eye level
      // Create an inset rectangle (avoid walls) with margin.
      const margin = Math.min(sx, sz) * 0.15;
      const halfX = sx / 2 - margin;
      const halfZ = sz / 2 - margin;
      const corners: [number, number, number][] = [
        [cx - halfX, eyeY, cz - halfZ],
        [cx + halfX, eyeY, cz - halfZ],
        [cx + halfX, eyeY, cz + halfZ],
        [cx - halfX, eyeY, cz + halfZ],
      ];
      // Look slightly toward the center, maybe a bit upward.
      const look: [number, number, number] = [cx, baseFloorY + 1.0, cz];
      const rect: TourWaypoint[] = corners.map((p) => ({
        position: p,
        lookAt: look,
        duration: 3500,
      }));
      // Close loop
      rect.push({ ...rect[0], duration: 3500 });
      return rect;
    },
    []
  );

  // startTour can accept an optional explicit floor index (used for programmatic floor-specific interior tours)
  const startTour = useCallback(
    (floorOverride?: number) => {
      setFirstPerson(false);
      setSelectedFurniture(null);
      const floorIdx = floorOverride != null ? floorOverride : interiorFloorIdx;
      const path = generateTourPath(tourMode, floorIdx);
      if (path.length > 1) {
        if (floorOverride != null && tourMode === "interior") {
          setInteriorFloorIdx(floorOverride);
        }
        setTourPath(path);
        setIsTourPlaying(true);
        if (typeof window !== "undefined")
          (window as any).__disableOrbit = true;
      }
    },
    [generateTourPath, setFirstPerson, tourMode, interiorFloorIdx]
  );

  const stopTour = useCallback(() => {
    setIsTourPlaying(false);
    setFullBuildingTour(false);
    setFullTourStage("idle");
    if (typeof window !== "undefined") (window as any).__disableOrbit = false;
    // Ensure pointer is unlocked when stopping tours just in case
    if (plcRef.current && pointerLocked) {
      try {
        plcRef.current.unlock();
      } catch {}
    }
  }, []);

  // Starts a full building tour: exterior orbit (non-loop) then each interior floor (non-loop)
  const startFullBuildingTour = useCallback(() => {
    if (isTourPlaying) return; // avoid overlapping
    setTourMode("orbit");
    setTourLoop(false); // ensure exterior does not loop
    setInteriorCycleFloors(false);
    setFullBuildingTour(true);
    setFullTourStage("orbit");
    startTour();
  }, [isTourPlaying, startTour]);

  useEffect(() => {
    // Expose tour controls for external triggers.
    if (typeof window !== "undefined") {
      (window as any).startTour = startTour; // legacy / generic
      (window as any).startFloorTour = (
        floorIndex: number,
        opts?: { cycleFloors?: boolean; loop?: boolean }
      ) => {
        if (opts?.loop !== undefined) setTourLoop(opts.loop);
        if (opts?.cycleFloors !== undefined)
          setInteriorCycleFloors(opts.cycleFloors);
        setTourMode("interior");
        startTour(floorIndex);
      };
      (window as any).stopTour = stopTour;
      (window as any).setTourMode = (m: "orbit" | "interior") => setTourMode(m);
      (window as any).setInteriorFloor = (i: number) => setInteriorFloorIdx(i);
      (window as any).setTourSpeed = (v: number) =>
        setTourSpeed(Math.max(0.05, Math.min(10, v || 1)));
      (window as any).getTourSpeed = () => tourSpeed;
      (window as any).startFullBuildingTour = startFullBuildingTour;
    }
  }, [startTour, stopTour, tourSpeed, startFullBuildingTour]);

  // Regenerate path live if parameters change while playing.
  useEffect(() => {
    if (isTourPlaying) {
      const path = generateTourPath(tourMode, interiorFloorIdx);
      if (path.length > 1) setTourPath(path);
    }
  }, [isTourPlaying, tourMode, interiorFloorIdx, generateTourPath]);

  const floors = [0, 3, 6, 9, 12];
  const currentFloorY =
    Math.max(
      0,
      floors[Math.max(0, Math.min(walkFloorIdx, floors.length - 1))]
    ) + 1.6;

  useEffect(() => {
    // Mark component as client-mounted (avoids SSR mismatches & gates fetches).
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    // Fetch available furniture model catalog from API.
    const load = async () => {
      setLoadingFurniture(true);
      try {
        const res = await fetch("/api/furniture");
        const data = await res.json();
        if (data.furniture) setFurnitureModels(data.furniture);
      } catch (e) {
        console.error("Failed to load furniture models:", e);
      } finally {
        setLoadingFurniture(false);
      }
    };
    load();
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;
    // Global key handling: Escape only clears selection (not first-person or edit mode), PageUp/PageDown to change floors in first-person.
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (selectedFurniture) {
          setSelectedFurniture(null);
          return; // do not exit modes; stay inside room
        }
        // If pointer locked, escape will naturally unlock via browser; update state soon after
        if (pointerLocked && plcRef.current) {
          try {
            plcRef.current.unlock();
          } catch {}
        }
      }
      if (firstPerson) {
        if (e.code === "PageUp")
          setWalkFloorIdx((i) => Math.min(i + 1, floors.length - 1));
        if (e.code === "PageDown") setWalkFloorIdx((i) => Math.max(i - 1, 0));
        if (e.code === "Digit0") setWalkFloorIdx(0);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mounted, selectedFurniture, firstPerson, pointerLocked]);

  const handleFurnitureUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      try {
        const formData = new FormData();
        formData.append("file", file);
        const response = await fetch("/api/furniture", {
          method: "POST",
          body: formData,
        });
        const data = await response.json();
        if (data.success) {
          // Append new uploaded model to palette & pre-select for placement.
          setFurnitureModels((prev) => [...prev, data.furniture]);
          setSelectedFurnitureModel(data.furniture);
        } else {
          console.error("Upload failed:", data.error);
        }
      } catch (error) {
        console.error("Upload error:", error);
      }
    },
    []
  );

  const handleDeleteFurnitureModel = useCallback(
    async (model: FurnitureModel) => {
      try {
        const response = await fetch(
          `/api/furniture?filename=${model.filename}`,
          { method: "DELETE" }
        );
        const data = await response.json();
        if (data.success) {
          // Remove model definition; existing placed instances remain (design choice).
          setFurnitureModels((prev) => prev.filter((m) => m.id !== model.id));
          if (selectedFurnitureModel?.id === model.id)
            setSelectedFurnitureModel(null);
        } else {
          console.error("Delete failed:", data.error);
        }
      } catch (error) {
        console.error("Delete error:", error);
      }
    },
    [selectedFurnitureModel]
  );

  const handleModelColorChange = useCallback((color: string) => {
    setModelColor(color);
    if (typeof window !== "undefined" && (window as any).setModelColor)
      (window as any).setModelColor(color);
  }, []);

  const handleFurnitureColorChange = useCallback(
    (color: string) => {
      setFurnitureColor(color);
      if (
        selectedFurniture &&
        typeof window !== "undefined" &&
        (window as any).updateFurnitureColor
      ) {
        // Update selected furniture instance color in 3D scene immediately.
        (window as any).updateFurnitureColor(selectedFurniture, color);
      }
    },
    [selectedFurniture]
  );

  const deleteSelectedFurniture = useCallback(() => {
    if (
      selectedFurniture &&
      typeof window !== "undefined" &&
      (window as any).removeFurniture
    ) {
      // Remove currently selected furniture instance from scene state.
      (window as any).removeFurniture(selectedFurniture);
      setSelectedFurniture(null);
    }
  }, [selectedFurniture]);

  const handlePlaceAtPoint = (point: { x: number; y: number; z: number }) => {
    if (!editMode || !selectedFurnitureModel || !mounted) return;
    const grid = 0.25;
    const floorsLocal = [0, 3, 6, 9, 12];
    const nearestFloor = floorsLocal.reduce(
      (prev, cur) =>
        Math.abs(cur - point.y) < Math.abs(prev - point.y) ? cur : prev,
      floorsLocal[0]
    );
    const position: [number, number, number] = [
      Math.round(point.x / grid) * grid,
      nearestFloor,
      Math.round(point.z / grid) * grid,
    ];
    if (typeof window !== "undefined" && (window as any).addFurniture) {
      // Adds new furniture instance to internal list & switches to translate mode for adjustment.
      (window as any).addFurniture(selectedFurnitureModel.path, position);
      setSelectedFurnitureModel(null);
      setTransformMode("translate");
    }
  };

  useEffect(() => {
    if (onEditControlsReady) {
      // Provide external UI (e.g., toolbar) a structured interface to mutate viewer/editor state.
      onEditControlsReady({
        modelColor,
        setModelColor: handleModelColorChange,
        furnitureColor,
        setFurnitureColor: handleFurnitureColorChange,
        selectedFurniture,
        setSelectedFurniture,
        selectedFurnitureModel,
        setSelectedFurnitureModel,
        transformMode,
        setTransformMode,
        deleteSelectedFurniture,
        handleFurnitureUpload,
        handleDeleteFurnitureModel,
        startTour,
        stopTour,
        isTourPlaying,
        tourMode,
        setTourMode,
        interiorFloorIdx,
        setInteriorFloorIdx,
        interiorCycleFloors,
        setInteriorCycleFloors,
        tourSpeed,
        setTourSpeed,
        fullBuildingTour,
        startFullBuildingTour,
        controlPanelOpen,
        setControlPanelOpen,
        pointerLocked,
        setPointerLocked,
      });
    }
  }, [
    modelColor,
    handleModelColorChange,
    furnitureColor,
    handleFurnitureColorChange,
    selectedFurniture,
    selectedFurnitureModel,
    transformMode,
    deleteSelectedFurniture,
    handleFurnitureUpload,
    handleDeleteFurnitureModel,
    onEditControlsReady,
    startTour,
    stopTour,
    isTourPlaying,
    tourMode,
    interiorFloorIdx,
    interiorCycleFloors,
    tourSpeed,
    fullBuildingTour,
    startFullBuildingTour,
    controlPanelOpen,
    pointerLocked,
  ]);

  return (
    <div className="w-full h-[70vh] rounded-lg overflow-hidden border relative bg-white">
      <div className="w-full h-full relative">
        <Canvas
          camera={{ position: [6, 4, 6], fov: 60 }}
          style={{
            cursor:
              editMode && selectedFurnitureModel ? "crosshair" : "default",
          }}
          shadows
          onPointerMissed={(e) => {
            if (e.type === "pointerdown" && editMode)
              setSelectedFurniture(null);
          }}
          onPointerDown={() => setShowHints(false)}
        >
          <FrameCapture />
          <ambientLight intensity={0.4} />
          <directionalLight
            position={[10, 20, 10]}
            intensity={1.2}
            castShadow
            shadow-mapSize={[2048, 2048]}
            shadow-camera-far={50}
            shadow-camera-left={-20}
            shadow-camera-right={20}
            shadow-camera-top={20}
            shadow-camera-bottom={-20}
          />
          <pointLight position={[-10, 10, -10]} intensity={0.5} />
          <hemisphereLight args={["#87CEEB", "#8B4513", 0.3]} />
          <Suspense fallback={<Html center>Loading model...</Html>}>
            <Model
              url={url}
              selectedFurniture={selectedFurniture}
              onFurnitureClick={setSelectedFurniture}
              transformMode={transformMode}
            />
            {/* Auto tour camera animation driver */}
            {isTourPlaying && tourPath.length > 1 && (
              <AutoTour
                path={tourPath}
                playing={isTourPlaying}
                // For interior tours we set loop=false so onFinish fires after one lap (lets us cycle floors or repeat)
                loop={tourMode === "orbit" ? tourLoop : false}
                speedFactor={tourSpeed}
                onFinish={() => {
                  // Full building tour sequencing
                  if (fullBuildingTour) {
                    if (fullTourStage === "orbit") {
                      // Move to interior stage starting at ground floor
                      setFullTourStage("interior");
                      setTourMode("interior");
                      setInteriorFloorIdx(0);
                      startTour(0);
                      return;
                    } else if (fullTourStage === "interior") {
                      const floorsArr = [0, 3, 6, 9, 12];
                      if (interiorFloorIdx < floorsArr.length - 1) {
                        const next = interiorFloorIdx + 1;
                        setInteriorFloorIdx(next);
                        startTour(next);
                        return;
                      } else {
                        // Completed last floor
                        setFullBuildingTour(false);
                        setFullTourStage("idle");
                        stopTour();
                        return;
                      }
                    }
                  }
                  // Normal orbit or interior behavior
                  if (tourMode === "orbit") {
                    if (!tourLoop) stopTour();
                  } else {
                    // Interior single-floor:
                    if (interiorCycleFloors) {
                      const floorsArr = [0, 3, 6, 9, 12];
                      const next = (interiorFloorIdx + 1) % floorsArr.length;
                      setInteriorFloorIdx(next);
                      startTour(next);
                    } else if (tourLoop) {
                      // Repeat same floor
                      startTour(interiorFloorIdx);
                    } else {
                      stopTour();
                    }
                  }
                }}
              />
            )}
            {editMode && (
              <GroundPlanes
                onPlace={handlePlaceAtPoint}
                isActive={!!selectedFurnitureModel}
                onUnselect={() => setSelectedFurniture(null)}
              />
            )}
            {editMode && (
              <>
                {[0, 3, 6, 9, 12].map((h) => (
                  <mesh
                    key={`floor-${h}`}
                    position={[0, h, 0]}
                    rotation={[-Math.PI / 2, 0, 0]}
                    receiveShadow
                  >
                    <planeGeometry args={[20, 20]} />
                    <meshStandardMaterial
                      color="#f0f0f0"
                      transparent
                      opacity={0.3}
                      side={DoubleSide}
                    />
                  </mesh>
                ))}
              </>
            )}
            <Environment preset="city" />
          </Suspense>
          {!firstPerson && (
            <OrbitControls
              enableDamping
              makeDefault
              autoRotate={false}
              enableZoom={true}
              enableRotate={true}
              mouseButtons={{
                LEFT: MOUSE.ROTATE,
                MIDDLE: MOUSE.DOLLY,
                RIGHT: MOUSE.PAN,
              }}
              zoomSpeed={1.0}
              minDistance={0.2}
              maxDistance={200}
              enabled={
                !isTourPlaying &&
                !(
                  typeof window !== "undefined" &&
                  (window as any).__disableOrbit
                )
              }
            />
          )}
          {firstPerson && !isTourPlaying && (
            <PointerLockControls
              ref={plcRef}
              onLock={() => {
                setPointerLocked(true);
              }}
              onUnlock={() => {
                setPointerLocked(false);
                setPendingPointerLock(false);
              }}
            />
          )}
          <FirstPersonWalk
            enabled={firstPerson && !isTourPlaying}
            floorY={currentFloorY}
          />
          <FirstPersonLook
            active={firstPerson && !isTourPlaying}
            pointerLocked={pointerLocked}
            draggingRef={draggingRef}
            yawRef={yawRef}
            pitchRef={pitchRef}
            r3fCameraRef={r3fCameraRef}
          />
          <CameraRefCatcher />
        </Canvas>
        {/* Remote Control Panel Toggle Button */}
        <button
          onClick={() => setControlPanelOpen((o) => !o)}
          aria-label={controlPanelOpen ? "Hide controls" : "Show controls"}
          className="absolute top-3 right-3 z-20 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white shadow-lg hover:shadow-xl transition-all w-10 h-10 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-400"
        >
          {controlPanelOpen ? "×" : "≡"}
        </button>
        {/* Control Panel */}
        {controlPanelOpen && (
          <div
            className="absolute top-16 right-3 z-10 w-72 max-h-[calc(100%-5rem)] overflow-y-auto rounded-xl backdrop-blur-md bg-white/85 border border-white/40 shadow-2xl p-4 flex flex-col gap-4 text-xs text-gray-800"
            role="region"
            aria-label="3D Viewer Controls"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] uppercase tracking-wider font-semibold text-gray-600">
                Camera / Tour
              </h3>
              {isTourPlaying && (
                <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-[10px] font-medium animate-pulse">
                  Running
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                id="enter-fp"
                onClick={() => setFirstPerson((f) => !f)}
                disabled={isTourPlaying}
                className={`group relative flex items-center justify-center gap-1 px-3 py-2 rounded-md border text-[11px] font-medium transition ${
                  firstPerson
                    ? "bg-indigo-600 text-white border-indigo-600 shadow"
                    : "bg-white hover:bg-indigo-50 border-gray-300 text-gray-700"
                }`}
                aria-pressed={firstPerson}
                aria-label="Toggle 360 walk mode"
              >
                <span>{firstPerson ? "Walking" : "Enter 360"}</span>
              </button>
              <button
                onClick={() => {
                  if (!pointerLocked) {
                    if (!firstPerson) {
                      setFirstPerson(true);
                      setPendingPointerLock(true);
                      return;
                    }
                    try {
                      plcRef.current?.lock?.();
                    } catch {}
                  } else {
                    try {
                      plcRef.current?.unlock?.();
                    } catch {}
                  }
                }}
                disabled={isTourPlaying}
                className={`flex items-center justify-center gap-1 px-3 py-2 rounded-md border text-[11px] font-medium transition ${
                  pointerLocked
                    ? "bg-blue-600 text-white border-blue-600 shadow"
                    : "bg-white hover:bg-blue-50 border-gray-300 text-gray-700"
                }`}
                aria-pressed={pointerLocked}
                aria-label={
                  pointerLocked ? "Unlock pointer view" : "Lock pointer view"
                }
                title={
                  pointerLocked
                    ? "Unlock pointer (free mouse)"
                    : "Lock pointer (capture mouse for looking)"
                }
              >
                {pointerLocked ? "Unlock View" : "Lock View"}
              </button>
              <button
                onClick={() => (isTourPlaying ? stopTour() : startTour())}
                className={`flex items-center justify-center gap-1 px-3 py-2 rounded-md border text-[11px] font-medium transition ${
                  isTourPlaying
                    ? "bg-rose-600 text-white border-rose-600 shadow"
                    : "bg-white hover:bg-rose-50 border-gray-300 text-gray-700"
                }`}
                aria-label={isTourPlaying ? "Stop tour" : "Start tour"}
              >
                {isTourPlaying
                  ? "Stop Tour"
                  : tourMode === "interior"
                  ? "Interior Tour"
                  : "Orbit Tour"}
              </button>
              <button
                onClick={() => startFullBuildingTour()}
                disabled={isTourPlaying || fullBuildingTour}
                className={`col-span-2 flex items-center justify-center gap-1 px-3 py-2 rounded-md border text-[11px] font-medium transition ${
                  fullBuildingTour
                    ? "bg-green-700 text-white border-green-700"
                    : "bg-white hover:bg-green-50 border-gray-300 text-gray-700 disabled:opacity-60"
                }`}
                aria-label="Start full building tour"
              >
                {fullBuildingTour ? "Full Tour Running" : "Full Building Tour"}
              </button>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-medium text-gray-600 flex items-center justify-between">
                Mode
                <select
                  className="ml-2 flex-1 text-[11px] border rounded px-2 py-1 bg-white"
                  value={tourMode}
                  disabled={isTourPlaying}
                  onChange={(e) =>
                    setTourMode(e.target.value as "orbit" | "interior")
                  }
                  aria-label="Select tour mode"
                >
                  <option value="orbit">Orbit</option>
                  <option value="interior">Interior</option>
                </select>
              </label>
              {isTourPlaying && tourMode === "orbit" && (
                <label className="flex items-center gap-2 text-[11px] text-gray-700 select-none">
                  <input
                    type="checkbox"
                    checked={tourLoop}
                    onChange={(e) => setTourLoop(e.target.checked)}
                    aria-label="Loop orbit tour"
                  />
                  Loop exterior
                </label>
              )}
              {tourMode === "interior" && !fullBuildingTour && (
                <div className="flex items-center gap-2">
                  <label className="text-[11px] font-medium text-gray-600">
                    Floor
                  </label>
                  <select
                    className="flex-1 text-[11px] border rounded px-2 py-1 bg-white"
                    value={interiorFloorIdx}
                    disabled={isTourPlaying && !interiorCycleFloors}
                    aria-label="Select interior tour floor"
                    onChange={(e) =>
                      setInteriorFloorIdx(Number(e.target.value))
                    }
                  >
                    {[0, 1, 2, 3, 4].map((i) => (
                      <option key={i} value={i}>
                        {i}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {tourMode === "interior" && !fullBuildingTour && (
                <label className="flex items-center gap-2 text-[11px] text-gray-700 select-none">
                  <input
                    type="checkbox"
                    checked={interiorCycleFloors}
                    onChange={(e) => setInteriorCycleFloors(e.target.checked)}
                    disabled={
                      fullBuildingTour ||
                      (isTourPlaying && !interiorCycleFloors)
                    }
                    aria-label="Cycle interior floors"
                  />
                  Cycle floors
                </label>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium text-gray-600 flex items-center justify-between">
                Speed{" "}
                <span className="text-gray-500 font-normal">
                  {tourSpeed.toFixed(2)}x
                </span>
              </label>
              <input
                type="range"
                min={0.25}
                max={3}
                step={0.05}
                value={tourSpeed}
                aria-label="Tour speed"
                onChange={(e) => setTourSpeed(parseFloat(e.target.value))}
                className="w-full accent-purple-600"
              />
            </div>
            {firstPerson && !isTourPlaying && (
              <div className="flex flex-col gap-2">
                <h4 className="text-[11px] uppercase tracking-wide text-gray-600 font-semibold">
                  Walk Floors
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setWalkFloorIdx((i) => Math.max(i - 1, 0))}
                    className="px-2 py-1 rounded-md bg-white border border-gray-300 hover:bg-gray-50 text-[11px]"
                  >
                    Down
                  </button>
                  <button
                    onClick={() =>
                      setWalkFloorIdx((i) => Math.min(i + 1, floors.length - 1))
                    }
                    className="px-2 py-1 rounded-md bg-white border border-gray-300 hover:bg-gray-50 text-[11px]"
                  >
                    Up
                  </button>
                  <button
                    onClick={() => setWalkFloorIdx(0)}
                    className="px-2 py-1 rounded-md bg-white border border-gray-300 hover:bg-gray-50 text-[11px]"
                  >
                    Ground
                  </button>
                </div>
              </div>
            )}
            <div className="mt-1 pt-2 border-t border-gray-200 flex flex-col gap-1 text-[10px] text-gray-500 leading-snug">
              <p>
                <strong>Hints:</strong> Drag = orbit • Scroll = zoom • WASD =
                walk (360)
              </p>
              <p>
                PageUp/PageDown switch walking floor • Esc cancels selection
              </p>
            </div>
          </div>
        )}
        {showHints && (
          <div className="absolute left-3 bottom-16 text-[11px] text-gray-700 bg-white/90 px-3 py-2 rounded shadow border">
            {/* Quick usage hints (hidden after first pointer interaction). */}
            Drag to look • Scroll to zoom • 360 Walk: WASD
            <br />
            Use Floor+/Floor- or PageUp/PageDown • 0 = Ground
          </div>
        )}
        {pointerLocked && firstPerson && !isTourPlaying && (
          <div
            className="pointer-events-none select-none absolute inset-0 flex items-center justify-center z-10"
            aria-hidden="true"
          >
            <div className="w-3 h-3 relative">
              <div className="absolute inset-0 rounded-full border border-white/70 bg-black/40" />
              <div className="absolute inset-[4px] rounded-full bg-white/90" />
            </div>
          </div>
        )}
        {/* Screen reader status for pointer lock */}
        <div className="sr-only" aria-live="polite">
          {pointerLocked
            ? "Pointer locked for viewing. Press Escape to release."
            : "Pointer free."}
        </div>
        {/* Reserved ARIA live region for announcing actions (selection, placement, etc.). */}
        <div className="sr-only" aria-live="polite" ref={ariaRef as any} />
      </div>
    </div>
  );
}

const R3FViewer = dynamic(() => Promise.resolve(R3FViewerComponent), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[70vh] rounded-lg overflow-hidden border relative flex items-center justify-center bg-gray-100">
      <div className="text-gray-500">Loading 3D Viewer...</div>
    </div>
  ),
});
// Export client-only dynamic viewer (SSR disabled due to WebGL / R3F requirements).
export default R3FViewer;
