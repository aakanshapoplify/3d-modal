"use client";
import { useEffect, useMemo, useRef } from "react";
import { Color, Group, Vector3 } from "three";
import { useGLTF } from "@react-three/drei";
import { FurnitureItem } from "./types";

export default function Furniture({
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
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
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

  useEffect(() => {
    if (groupRef.current && onReady) onReady(groupRef.current);
  }, [groupRef.current, onReady]);

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



