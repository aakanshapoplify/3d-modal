
"use client";
import { useEffect, useRef } from "react";
import { useThree, useFrame } from "@react-three/fiber";

export interface TourWaypoint {
  position: [number, number, number];
  lookAt: [number, number, number];
  duration?: number;
}

export default function AutoTour({
  path,
  playing,
  loop = true,
  speedFactor = 1,
  onFinish,
}: {
  path: TourWaypoint[];
  playing: boolean;
  loop?: boolean;
  speedFactor?: number;
  onFinish?: () => void;
}) {
  const { camera } = useThree();
  const controls = useThree((s) => s.controls as any);
  const segIdxRef = useRef(0);
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
    const baseDuration = b.duration ?? 4000;
    segElapsedRef.current += delta * 1000 * speedRef.current;
    const tRaw = segElapsedRef.current / baseDuration;
    const t = Math.min(1, Math.max(0, tRaw));
    const ease = t * t * (3 - 2 * t);

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
      segElapsedRef.current = 0;
      if (segIdxRef.current >= pathRef.current.length - 1) {
        if (loop) {
          segIdxRef.current = 0;
        } else {
          onFinish?.();
        }
      }
    }
  });
  return null;
}


