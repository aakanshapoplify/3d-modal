"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useThree } from "@react-three/fiber";
import { DoubleSide, Color, Group } from "three";
import { useGLTF, TransformControls } from "@react-three/drei";
import { FLOORS } from "./constants";
import Furniture from "./Furniture";
import { FurnitureItem } from "./types";

export default function Model({
  url,
  selectedFurniture,
  onFurnitureClick,
  transformMode,
  wallColor,
  floorColor,
  onMeshClick,
}: {
  url: string;
  selectedFurniture: string | null;
  onFurnitureClick: (id: string) => void;
  transformMode: "none" | "translate" | "rotate" | "scale";
  wallColor: string;
  floorColor: string;
  onMeshClick?: (mesh: any, point: [number, number, number]) => void;
}) {
  const group = useRef<any>(null);
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls as any);
  const viewport = useThree((s) => s.size);
  const gltf = useGLTF(url);
  const [furniture, setFurniture] = useState<FurnitureItem[]>([]);
  const [modelColor, setModelColor] = useState("#b0bec5");
  const idToObjectRef = useRef<Record<string, Group>>({});
  const [meshColors, setMeshColors] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    if (!gltf?.scene) return;
    gltf.scene.traverse((obj: any) => {
      if (obj.isMesh && obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach((m: any) => {
          const name = obj.name.toLowerCase();
          const isFloor = name.includes('floor') || name.includes('ground') || name.includes('base');
          const customColor = meshColors.get(obj.uuid);
          const colorToUse = customColor || (isFloor ? floorColor : wallColor);
          if (!m.isMeshStandardMaterial) {
            const newMaterial = new (require("three").MeshStandardMaterial)({
              color: m.color || new Color(colorToUse),
              metalness: 0.1,
              roughness: 0.8,
              transparent: true,
              opacity: 0.85,
              side: DoubleSide,
              depthWrite: true,
            });
            obj.material = newMaterial;
          } else {
            if (m?.color) m.color = new Color(colorToUse);
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
  }, [gltf, modelColor, wallColor, floorColor, meshColors]);

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

    const fovDeg: number = (camera as any).fov != null ? (camera as any).fov : 60;
    const fov = (fovDeg * Math.PI) / 180;
    const halfY = size.y / 2;
    const halfX = size.x / 2;
    const aspect = Math.max(0.1, viewport.width / Math.max(1, viewport.height));
    const fitHeightDistance = halfY / Math.tan(fov / 2);
    const fitWidthDistance = halfX / (Math.tan(fov / 2) * aspect);
    let distance = Math.max(fitHeightDistance, fitWidthDistance) * 2.5;

    const eyeY = box.min.y + Math.min(1.7, Math.max(1.4, size.y * 0.4));
    const dir = new (require("three").Vector3)(1, 0, 1).normalize();
    const newPos = new (require("three").Vector3)(center.x, eyeY, center.z).add(dir.multiplyScalar(distance));
    camera.position.copy(newPos);
    (camera as any).near = Math.max(0.01, distance / 100);
    (camera as any).far = Math.max(500, distance * 200);
    (camera as any).updateProjectionMatrix?.();
    if (controls?.target) {
      controls.target.set(center.x, eyeY, center.z);
      if (typeof controls.minDistance === "number") controls.minDistance = distance * 0.1;
      if (typeof controls.maxDistance === "number") controls.maxDistance = distance * 10;
      controls.update?.();
    }
  }, [gltf, camera, controls, viewport]);

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
  const removeFurniture = (id: string) => setFurniture((prev) => prev.filter((i) => i.id !== id));
  const updateFurnitureColor = (id: string, color: string) => setFurniture((prev) => prev.map((i) => (i.id === id ? { ...i, color } : i)));
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
      (window as any).updateMeshColor = (meshUuid: string, color: string) => {
        setMeshColors((prev) => {
          const newMap = new Map(prev);
          newMap.set(meshUuid, color);
          return newMap;
        });
      };
    }
  }, []);

  const handleDoubleClick = useCallback((event: any) => {
    if (!onMeshClick) return;
    event.stopPropagation();
    const mesh = event.object;
    if (mesh && mesh.isMesh) {
      const point = event.point;
      onMeshClick(mesh, [point.x, point.y, point.z]);
    }
  }, [onMeshClick]);

  return (
    <group ref={group}>
      <primitive object={gltf.scene} onDoubleClick={handleDoubleClick} />
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
              if (typeof window !== "undefined") (window as any).__disableOrbit = true;
            }}
            onMouseUp={() => {
              if (typeof window !== "undefined") (window as any).__disableOrbit = false;
              const obj = idToObjectRef.current[selectedFurniture];
              if (obj && typeof window !== "undefined" && (window as any).updateFurnitureTransform) {
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
              const nearestFloor = FLOORS.reduce(
                (p, c) => (Math.abs(c - obj.position.y) < Math.abs(p - obj.position.y) ? c : p),
                FLOORS[0]
              );
              obj.position.y = nearestFloor;
            }}
          />
        )}
    </group>
  );
}



