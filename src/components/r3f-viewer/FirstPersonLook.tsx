"use client";
import { useFrame, useThree } from "@react-three/fiber";
import { Vector3 } from "three";

export default function FirstPersonLook({
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
}) {
  useFrame(() => {
    if (!active) return;
    if (!pointerLocked && !draggingRef.current) return;
    const camera = r3fCameraRef.current;
    if (!camera) return;
    const maxPitch = Math.PI / 2 - 0.05;
    pitchRef.current = Math.min(maxPitch, Math.max(-maxPitch, pitchRef.current));
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
}



