"use client";
/**
 * R3FViewer (modularized)
 * ------------------------------------------------------------
 * Structure:
 *  - Furniture & placement logic extracted to /viewer/furniture.tsx
 *  - First person walking & frame capture to /viewer/movement.tsx
 *  - Tour state & automation (original orbit logic) to /viewer/tour.tsx (kept here for now for nav prototype)
 *  - This file now also hosts experimental automatic navigation path generation (wall detection heuristic)
 *
 * Auto Navigation (experimental):
 *  - Generates per-floor walk paths by:
 *      1. Collecting wall-like meshes (tall & relatively thin in one horizontal axis)
 *      2. Creating a 1m grid across model bounds; marking blocked cells overlapping wall boxes
 *      3. BFS flood from center-nearest walkable cell -> ordered cell list -> looped path
 *  - Stored in window.__navPaths : Record<floorIndex, THREE.Vector3[]>
 *  - Interior & full tours now attempt path-based walking. If no path, fallback to orbit.
 *  - Limitations: Heuristic only; thin furniture might be misclassified; no door awareness; path may snake arbitrarily.
 *  - Future Improvements Ideas:
 *      * Replace BFS order with corridor skeleton or shortest Hamiltonian approximation
 *      * Integrate raycast collision refinement per step
 *      * Visual debug overlay (implemented toggle below)
 *      * Cache per model hash & allow user-supplied waypoints to guide ordering
 *
 * Performance Guard:
 *  - If potential grid cells exceed 4000, nav generation aborts (to avoid blocking main thread)
 *  - Provide a global flag window.__disableAutoNav = true to skip generation
 *
 * Debug Tools:
 *  - Press `N` to toggle nav path visualization (simple line + points) after generation.
 */
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
import ViewerControls from "./ViewerControls";
import { MAX_TOUR_SPEED_RPM } from "./viewer/constants";
import dynamic from "next/dynamic";
import { Line } from "@react-three/drei";

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
      const dir = new THREE.Vector3();
      camera.getWorldDirection(dir);
      const forward = new THREE.Vector3(dir.x, 0, dir.z).normalize();
      const right = new THREE.Vector3()
        .crossVectors(forward, new THREE.Vector3(0, 1, 0))
        .normalize()
        .negate();
      const speed =
        keys.current["ShiftLeft"] || keys.current["ShiftRight"]
          ? speedRef.current * 2
          : speedRef.current;
      const deltaMove = new THREE.Vector3();
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
        camera.position.x = Math.min(
          Math.max(camera.position.x, b.min[0] + 0.2),
          b.max[0] - 0.2
        );
        camera.position.z = Math.min(
          Math.max(camera.position.z, b.min[2] + 0.2),
          b.max[2] - 0.2
        );
      }
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

  // Notify parent once (and on selection change) when the group ref is ready
  useEffect(() => {
    if (groupRef.current && onReady) onReady(groupRef.current);
  }, [onReady, isSelected]);

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
              const p = e.point;
              onPlace({ x: p.x, y: h, z: p.z });
            } else {
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
      // Auto-generate navigation paths (simple heuristic-based) if not already present
  if (!(window as any).__navPaths && !(window as any).__disableAutoNav) {
        try {
          const floorsLocal = [0, 3, 6, 9, 12];
          const wallBoxes: any[] = [];
          gltf.scene.traverse((obj: any) => {
            if (!obj.isMesh) return;
            const b = new THREE.Box3().setFromObject(obj);
            const sz = b.getSize(new THREE.Vector3());
            if (sz.y > 2 && (sz.x < sz.y * 0.6 || sz.z < sz.y * 0.6)) {
              wallBoxes.push(b.clone());
            }
          });
          const navPaths: Record<number, Vector3[]> = {};
          const grid = 1; // meters
          const maxCells = 4000; // perf guard
            const minX = Math.floor(box.min.x / grid) * grid;
            const maxX = Math.ceil(box.max.x / grid) * grid;
            const minZ = Math.floor(box.min.z / grid) * grid;
            const maxZ = Math.ceil(box.max.z / grid) * grid;
          for (const fY of floorsLocal) {
            const floorIdx = floorsLocal.indexOf(fY);
            const floorTop = fY + 3;
            const cells: { x: number; z: number; blocked: boolean }[] = [];
            for (let x = minX; x <= maxX; x += grid) {
              for (let z = minZ; z <= maxZ; z += grid) {
                cells.push({ x, z, blocked: false });
                if (cells.length > maxCells) break;
              }
              if (cells.length > maxCells) break;
            }
            if (cells.length > maxCells) continue;
            for (const c of cells) {
              for (const wb of wallBoxes) {
                if (
                  wb.min.x - 0.01 <= c.x + grid * 0.5 &&
                  wb.max.x + 0.01 >= c.x - grid * 0.5 &&
                  wb.min.z - 0.01 <= c.z + grid * 0.5 &&
                  wb.max.z + 0.01 >= c.z - grid * 0.5 &&
                  wb.min.y <= floorTop &&
                  wb.max.y >= fY + 0.1
                ) {
                  c.blocked = true;
                  break;
                }
              }
            }
            const walkable = cells.filter((c) => !c.blocked);
            if (walkable.length < 4) continue;
            const start = walkable.reduce((p, c) => {
              const dc = (c.x - center.x) ** 2 + (c.z - center.z) ** 2;
              const dp = (p.x - center.x) ** 2 + (p.z - center.z) ** 2;
              return dc < dp ? c : p;
            }, walkable[0]);
            const key = (x: number, z: number) => `${x}:${z}`;
            const walkSet = new Set(walkable.map((c) => key(c.x, c.z)));
            const visited = new Set<string>();
            const queue: { x: number; z: number }[] = [
              { x: start.x, z: start.z },
            ];
            const order: { x: number; z: number }[] = [];
            while (queue.length) {
              const n = queue.shift()!;
              const k = key(n.x, n.z);
              if (visited.has(k)) continue;
              visited.add(k);
              order.push(n);
              const dirs = [
                [grid, 0],
                [-grid, 0],
                [0, grid],
                [0, -grid],
              ];
              for (const [dx, dz] of dirs) {
                const nx = n.x + dx;
                const nz = n.z + dz;
                const nk = key(nx, nz);
                if (walkSet.has(nk) && !visited.has(nk)) queue.push({ x: nx, z: nz });
              }
            }
            navPaths[floorIdx] = order.map(
              (c) => new THREE.Vector3(c.x, fY + 1.6, c.z)
            );
          }
          (window as any).__navPaths = navPaths;
        } catch (e) {
          console.warn("Nav path generation failed", e);
        }
      }
    }
  }, [gltf, camera]);

  const addFurniture = (
    modelPath: string,
    position: [number, number, number]
  ) => {
    if (!modelPath) return;
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

// Handles automated tour camera motion; must live inside <Canvas>
function TourAutomation({
  tourPlaying,
  tourMode,
  tourSpeed,
  interiorFloorIdx,
  cycleFloors,
  fullStage,
  floors,
  stopTour,
  setInteriorFloorIdx,
  setFullStage,
  tourAngleRef,
  tourTimeRef,
  rafClockRef,
  ariaRef,
  navWalkRef,
}: any) {
  useFrame(({ camera }) => {
    if (!tourPlaying) return;
    const now = performance.now();
    const dt = (now - rafClockRef.current) / 1000;
    rafClockRef.current = now;
    const bounds = (window as any).__modelBounds;
    if (!bounds) return;
    const center = new Vector3(
      bounds.center[0],
      bounds.center[1],
      bounds.center[2]
    );
    const size = new Vector3(bounds.size[0], bounds.size[1], bounds.size[2]);
    const baseRadius = Math.max(size.x, size.z) * 0.9 + 2;
    const angularSpeed = (Math.PI * 2 * tourSpeed) / 60;
    if (tourMode === "exterior") {
      tourAngleRef.current += angularSpeed * dt;
      const angle = tourAngleRef.current;
      const y = center.y + size.y * 0.4;
      camera.position.set(
        center.x + Math.cos(angle) * baseRadius,
        y,
        center.z + Math.sin(angle) * baseRadius
      );
      camera.lookAt(center.x, center.y + size.y * 0.2, center.z);
    } else if (tourMode === "interior") {
      const navPaths = (window as any).__navPaths || {};
      const path: Vector3[] = navPaths[interiorFloorIdx];
      if (path && path.length > 1) {
        const walk = navWalkRef.current;
        if (walk.floor !== interiorFloorIdx) {
          walk.floor = interiorFloorIdx;
            walk.i = 0;
            walk.t = 0;
        }
        const speedMeters = Math.max(0.5, tourSpeed * 1.2);
        const curr = path[walk.i];
        const next = path[Math.min(walk.i + 1, path.length - 1)];
        const segLen = curr.distanceTo(next) || 0.0001;
        walk.t += (speedMeters * dt) / segLen;
        if (walk.t >= 1) {
          walk.i++;
          walk.t = 0;
          if (walk.i >= path.length - 1) walk.i = 0;
        }
        const p = curr.clone().lerp(next, walk.t);
        camera.position.set(p.x, p.y, p.z);
        camera.lookAt(next.x, next.y, next.z);
      } else {
        const floorY = floors[interiorFloorIdx] + 1.6;
        tourAngleRef.current += angularSpeed * dt * 1.2;
        const r = Math.max(size.x, size.z) * 0.35;
        const angle = tourAngleRef.current;
        camera.position.set(
          center.x + Math.cos(angle) * r,
          floorY,
          center.z + Math.sin(angle) * r
        );
        camera.lookAt(center.x, floorY, center.z);
      }
      if (cycleFloors) {
        const elapsedStage = (now - tourTimeRef.current.stageStart) / 1000;
        if (elapsedStage > 12) {
          setInteriorFloorIdx((f: number) => (f + 1) % floors.length);
          tourTimeRef.current.stageStart = now;
          tourAngleRef.current = 0;
          navWalkRef.current = { floor: -1, i: 0, t: 0 };
        }
      }
    } else if (tourMode === "full") {
      const stageDuration = fullStage === 0 ? 18000 : 12000;
      const elapsed = now - tourTimeRef.current.stageStart;
      if (fullStage === 0) {
        tourAngleRef.current += angularSpeed * dt;
        const angle = tourAngleRef.current;
        const y = center.y + size.y * 0.45;
        camera.position.set(
          center.x + Math.cos(angle) * (baseRadius + 1),
          y,
          center.z + Math.sin(angle) * (baseRadius + 1)
        );
        camera.lookAt(center.x, center.y + size.y * 0.25, center.z);
      } else {
        const floorIdx = fullStage - 1;
        const navPaths = (window as any).__navPaths || {};
        const path: Vector3[] = navPaths[floorIdx];
        if (path && path.length > 1) {
          const walk = navWalkRef.current;
          if (walk.floor !== floorIdx) {
            walk.floor = floorIdx; walk.i = 0; walk.t = 0;
          }
          const speedMeters = Math.max(0.6, tourSpeed * 1.3);
          const curr = path[walk.i];
          const next = path[Math.min(walk.i + 1, path.length - 1)];
          const segLen = curr.distanceTo(next) || 0.0001;
          walk.t += (speedMeters * dt) / segLen;
          if (walk.t >= 1) {
            walk.i++; walk.t = 0;
            if (walk.i >= path.length - 1) {
              const nextStage = fullStage + 1;
              if (nextStage > floors.length) { stopTour(); return; }
              setFullStage(nextStage);
              if (nextStage > 0) setInteriorFloorIdx(nextStage - 1);
              tourTimeRef.current.stageStart = now;
              tourAngleRef.current = 0;
              navWalkRef.current = { floor: -1, i: 0, t: 0 };
              if (ariaRef.current)
                ariaRef.current.textContent =
                  nextStage === 0 ? "Exterior stage" : `Interior floor ${nextStage - 1} stage`;
              return;
            }
          }
          const p = curr.clone().lerp(next, walk.t);
          camera.position.set(p.x, p.y, p.z);
          camera.lookAt(next.x, next.y, next.z);
        } else {
          const floorY = floors[floorIdx] + 1.6;
          tourAngleRef.current += angularSpeed * dt * 1.25;
          const r = Math.max(size.x, size.z) * 0.38;
          const angle = tourAngleRef.current;
          camera.position.set(
            center.x + Math.cos(angle) * r,
            floorY,
            center.z + Math.sin(angle) * r
          );
          camera.lookAt(center.x, floorY, center.z);
        }
      }
      if (elapsed >= stageDuration) {
        const nextStage = fullStage + 1;
        if (nextStage > floors.length) {
          stopTour();
          return;
        }
        setFullStage(nextStage);
        if (nextStage > 0) setInteriorFloorIdx(nextStage - 1);
        tourTimeRef.current.stageStart = now;
        tourAngleRef.current = 0;
        navWalkRef.current = { floor: -1, i: 0, t: 0 };
        if (ariaRef.current)
          ariaRef.current.textContent =
            nextStage === 0
              ? "Exterior stage"
              : `Interior floor ${nextStage - 1} stage`;
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
  const [showNavDebug, setShowNavDebug] = useState(false);
  // Tour / camera automation state
  const [tourMode, setTourMode] = useState<
    "none" | "exterior" | "interior" | "full"
  >("none");
  const [tourPlaying, setTourPlaying] = useState(false);
  const [interiorFloorIdx, setInteriorFloorIdx] = useState(0);
  const [cycleFloors, setCycleFloors] = useState(false);
  const [tourSpeed, setTourSpeed] = useState(0.4); // revolutions per minute (exterior) or path speed scalar
  const [fullStage, setFullStage] = useState<number>(0); // 0 exterior, then floors
  const tourAngleRef = useRef(0);
  const tourTimeRef = useRef<{ start: number; stageStart: number }>({
    start: 0,
    stageStart: 0,
  });
  const rafClockRef = useRef(performance.now());
  const navWalkRef = useRef<{ floor: number; i: number; t: number }>({ floor: -1, i: 0, t: 0 });
  // Pointer lock tracking for crosshair & accessibility
  const [pointerLocked, setPointerLocked] = useState(false);
  const ariaRef = useRef<HTMLDivElement | null>(null);

  const floors = [0, 3, 6, 9, 12];
  const currentFloorY =
    Math.max(
      0,
      floors[Math.max(0, Math.min(walkFloorIdx, floors.length - 1))]
    ) + 1.6;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
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
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedFurniture) setSelectedFurniture(null);
      if (e.key === "Escape" && editMode) {
        setEditMode(false);
        setSelectedFurniture(null);
        setSelectedFurnitureModel(null);
      }
      if (firstPerson) {
        if (e.code === "PageUp")
          setWalkFloorIdx((i) => Math.min(i + 1, floors.length - 1));
        if (e.code === "PageDown") setWalkFloorIdx((i) => Math.max(i - 1, 0));
        if (e.code === "Digit0") setWalkFloorIdx(0);
      }
      if (e.code === "KeyN") {
        setShowNavDebug((v) => !v);
        if (ariaRef.current)
          ariaRef.current.textContent = `Nav path debug ${!showNavDebug ? "enabled" : "disabled"}`;
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mounted, selectedFurniture, editMode, setEditMode, firstPerson]);

  // Pointer lock listeners
  useEffect(() => {
    const handleLockChange = () => {
      const locked = document.pointerLockElement != null;
      setPointerLocked(locked);
      if (ariaRef.current) {
        ariaRef.current.textContent = locked
          ? "Pointer lock engaged"
          : "Pointer lock released";
      }
    };
    document.addEventListener("pointerlockchange", handleLockChange);
    return () => {
      document.removeEventListener("pointerlockchange", handleLockChange);
    };
  }, []);

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
      (window as any).addFurniture(selectedFurnitureModel.path, position);
      setSelectedFurnitureModel(null);
      setTransformMode("translate");
    }
  };

  useEffect(() => {
    if (onEditControlsReady) {
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
  ]);

  // ---- TOUR IMPLEMENTATION ----
  const startExteriorTour = useCallback(() => {
    setTourMode("exterior");
    setTourPlaying(true);
    tourAngleRef.current = 0;
    tourTimeRef.current.start = performance.now();
    tourTimeRef.current.stageStart = performance.now();
    if (ariaRef.current) ariaRef.current.textContent = "Exterior tour started";
  }, []);

  const startInteriorTour = useCallback(
    (floor: number) => {
      setInteriorFloorIdx(Math.max(0, Math.min(floor, floors.length - 1)));
      setTourMode("interior");
      setTourPlaying(true);
      tourAngleRef.current = 0;
      tourTimeRef.current.stageStart = performance.now();
      if (ariaRef.current)
        ariaRef.current.textContent = `Interior tour started at floor ${floor}`;
      navWalkRef.current = { floor: -1, i: 0, t: 0 };
    },
    [floors.length]
  );

  const startFullBuildingTour = useCallback(() => {
    setFullStage(0); // stage 0 = exterior
    setTourMode("full");
    setTourPlaying(true);
    tourAngleRef.current = 0;
    tourTimeRef.current.start = performance.now();
    tourTimeRef.current.stageStart = performance.now();
    if (ariaRef.current) ariaRef.current.textContent = "Full building tour started";
    navWalkRef.current = { floor: -1, i: 0, t: 0 };
  }, []);

  const stopTour = useCallback(() => {
    setTourPlaying(false);
    setTourMode("none");
    navWalkRef.current = { floor: -1, i: 0, t: 0 };
    if (ariaRef.current) ariaRef.current.textContent = "Tour stopped";
  }, []);

  const setSpeed = useCallback((v: number) => {
    if (typeof v !== "number" || isNaN(v)) return;
    const clamped = Math.min(MAX_TOUR_SPEED_RPM, Math.max(0.05, v));
    setTourSpeed(clamped);
  }, []);

  const setFloorManual = useCallback(
    (idx: number) => {
      setInteriorFloorIdx(Math.max(0, Math.min(idx, floors.length - 1)));
      if (tourMode === "interior" && tourPlaying) {
        tourAngleRef.current = 0;
        tourTimeRef.current.stageStart = performance.now();
        navWalkRef.current = { floor: -1, i: 0, t: 0 };
      }
    },
    [floors.length, tourMode, tourPlaying]
  );

  // Expose APIs globally
  useEffect(() => {
    if (typeof window === "undefined") return;
    (window as any).startExteriorTour = startExteriorTour;
    (window as any).startInteriorTour = startInteriorTour;
    (window as any).startFullBuildingTour = startFullBuildingTour;
    (window as any).stopTour = stopTour;
    (window as any).setTourSpeed = setSpeed;
    (window as any).setInteriorFloor = setFloorManual;
  }, [
    startExteriorTour,
    startInteriorTour,
    startFullBuildingTour,
    stopTour,
    setSpeed,
    setFloorManual,
  ]);

  // (moved automation into <TourAutomation />)

  return (
    <div className="w-full h-[70vh] rounded-lg overflow-hidden border relative bg-white">
      <div className="w-full h-full relative">
        <Canvas
          id="r3f-canvas"
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
            {showNavDebug && (
              <group>
                {(() => {
                  const navPaths = (typeof window !== "undefined" && (window as any).__navPaths) || {};
                  return Object.entries(navPaths).map(([floorIdx, pts]: any) => {
                    if (!pts || pts.length < 2) return null;
                    const color = ["#ff5555","#55ff55","#5555ff","#ffaa00","#aa00ff"][Number(floorIdx)%5];
                    return (
                      <group key={floorIdx}>
                        <Line points={pts.map((v: any)=>[v.x,v.y,v.z])} color={color} lineWidth={1} dashed={false} />
                        {pts.map((v: any,i: number)=>(
                          <mesh key={i} position={[v.x,v.y,v.z]}>
                            <sphereGeometry args={[0.08,8,8]} />
                            <meshBasicMaterial color={color} />
                          </mesh>
                        ))}
                      </group>
                    );
                  });
                })()}
              </group>
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
          {!firstPerson && !tourPlaying && (
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
                !(
                  typeof window !== "undefined" &&
                  (window as any).__disableOrbit
                )
              }
            />
          )}
          {firstPerson && <PointerLockControls selector="#enter-fp" />}
          <FirstPersonWalk enabled={firstPerson} floorY={currentFloorY} />
          <TourAutomation
            tourPlaying={tourPlaying}
            tourMode={tourMode}
            tourSpeed={tourSpeed}
            interiorFloorIdx={interiorFloorIdx}
            cycleFloors={cycleFloors}
            fullStage={fullStage}
            floors={floors}
            stopTour={stopTour}
            setInteriorFloorIdx={setInteriorFloorIdx}
            setFullStage={setFullStage}
            tourAngleRef={tourAngleRef}
            tourTimeRef={tourTimeRef}
            rafClockRef={rafClockRef}
            ariaRef={ariaRef}
            navWalkRef={navWalkRef}
          />
        </Canvas>
        <ViewerControls
          firstPerson={firstPerson}
          setFirstPerson={setFirstPerson}
          walkFloorIdx={walkFloorIdx}
          setWalkFloorIdx={setWalkFloorIdx}
          floors={floors}
          tourMode={tourMode}
          tourPlaying={tourPlaying}
          onStartExterior={startExteriorTour}
          onStartInterior={(f) => startInteriorTour(f)}
          onStartFull={startFullBuildingTour}
          onStop={stopTour}
          interiorFloorIdx={interiorFloorIdx}
          setInteriorFloorIdx={setFloorManual}
          cycleFloors={cycleFloors}
          setCycleFloors={setCycleFloors}
          tourSpeed={tourSpeed}
          setTourSpeed={setSpeed}
          pointerLocked={pointerLocked}
        />
        {showHints && (
          <div className="absolute left-3 bottom-16 text-[11px] text-gray-700 bg-white/90 px-3 py-2 rounded shadow border">
            Drag to look • Scroll to zoom • 360 Walk: WASD
            <br />
            Use Floor+/Floor- or PageUp/PageDown • 0 = Ground
          </div>
        )}
        {pointerLocked && (
          <div
            className="pointer-events-none select-none absolute inset-0 flex items-center justify-center"
            aria-hidden="true"
          >
            <div className="w-4 h-4 relative">
              <div className="absolute left-1/2 top-0 -translate-x-1/2 w-px h-2 bg-indigo-600" />
              <div className="absolute left-1/2 bottom-0 -translate-x-1/2 w-px h-2 bg-indigo-600" />
              <div className="absolute top-1/2 left-0 -translate-y-1/2 h-px w-2 bg-indigo-600" />
              <div className="absolute top-1/2 right-0 -translate-y-1/2 h-px w-2 bg-indigo-600" />
            </div>
          </div>
        )}
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

export default R3FViewer;
