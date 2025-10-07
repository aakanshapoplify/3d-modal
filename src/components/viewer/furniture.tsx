"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useGLTF, TransformControls } from "@react-three/drei";
import { Color, DoubleSide, Group, Vector3 } from "three";
import { FurnitureItem, FurnitureModel, FurnitureRefsMap } from "./types";
import { FLOORS, GRID_SIZE } from "./constants";

export function Furniture({
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
          if (m?.color) m.color = new Color(item.color);
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

export function GroundPlanes({
  onPlace,
  isActive,
  onUnselect,
}: {
  onPlace: (point: { x: number; y: number; z: number }) => void;
  isActive: boolean;
  onUnselect: () => void;
}) {
  return (
    <>
      {FLOORS.map((h) => (
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

export function useFurnitureModelColor(gltf: any, modelColor: string) {
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
}

export function useModelFit(
  gltf: any,
  camera: any,
  controls: any,
  viewport: any
) {
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
}

export function useFurnitureApi(
  setFurniture: React.Dispatch<React.SetStateAction<FurnitureItem[]>>,
  setModelColor: (c: string) => void
) {
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
      (window as any).setModelColor = setModelColor;
    }
  }, []);
  return {
    addFurniture,
    removeFurniture,
    updateFurnitureColor,
    updateFurnitureTransform,
  };
}

export function snapToGridAndFloor(obj: any) {
  const grid = GRID_SIZE;
  obj.position.x = Math.round(obj.position.x / grid) * grid;
  obj.position.z = Math.round(obj.position.z / grid) * grid;
  const nearestFloor = FLOORS.reduce(
    (p, c) =>
      Math.abs(c - obj.position.y) < Math.abs(p - obj.position.y) ? c : p,
    FLOORS[0]
  );
  obj.position.y = nearestFloor;
}
