"use client";
import { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";

export default function FirstPersonWalk({
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
      const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0));
      let move = new THREE.Vector3();
      const spd = speedRef.current * (keys.current["ShiftLeft"] ? 2 : 1);
      if (keys.current["KeyW"] || keys.current["ArrowUp"]) move.add(forward);
      if (keys.current["KeyS"] || keys.current["ArrowDown"]) move.sub(forward);
      if (keys.current["KeyA"] || keys.current["ArrowLeft"]) move.sub(right);
      if (keys.current["KeyD"] || keys.current["ArrowRight"]) move.add(right);
      if (move.lengthSq() > 0) {
        move.normalize().multiplyScalar(spd);
        camera.position.add(move);
      }
      const b = (window as any)?.__modelBounds;
      if (b?.min && b?.max) {
        camera.position.x = Math.min(Math.max(camera.position.x, b.min[0] + 0.2), b.max[0] - 0.2);
        camera.position.z = Math.min(Math.max(camera.position.z, b.min[2] + 0.2), b.max[2] - 0.2);
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



