"use client";
import { useThree, useFrame } from "@react-three/fiber";

// tracks the camera’s position and what direction it’s looking.
// lookAt: (x, y, z) = (4,5,6)
// window.__lastCameraState = { position: [1,2,3], lookAt: [4,5,6] }
export default function FrameCapture() {
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



