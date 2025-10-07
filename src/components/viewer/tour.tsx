"use client";
import { RefObject, useCallback, useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Vector3 } from "three";
import {
  FLOORS,
  DEFAULT_TOUR_SPEED_RPM,
  INTERIOR_FLOOR_DURATION_MS,
  EXTERIOR_STAGE_DURATION_MS,
} from "./constants";
import { TourController } from "./types";

interface UseTourOpts {
  ariaRef: RefObject<HTMLDivElement | null>;
}

export function useTourController({ ariaRef }: UseTourOpts): TourController {
  const [mode, setMode] = useState<TourController["mode"]>("none");
  const [playing, setPlaying] = useState(false);
  const [interiorFloorIdx, setInteriorFloorIdx] = useState(0);
  const [cycleFloors, setCycleFloors] = useState(false);
  const [speed, setSpeed] = useState(DEFAULT_TOUR_SPEED_RPM);
  const [fullStage, setFullStage] = useState(0);
  const tourAngleRef = useRef(0);
  const tourTimeRef = useRef<{ start: number; stageStart: number }>({
    start: 0,
    stageStart: 0,
  });
  const rafClockRef = useRef(performance.now());

  const announce = (msg: string) => {
    if (ariaRef.current) ariaRef.current.textContent = msg;
  };

  const startExterior = useCallback(() => {
    setMode("exterior");
    setPlaying(true);
    tourAngleRef.current = 0;
    tourTimeRef.current.start = performance.now();
    tourTimeRef.current.stageStart = performance.now();
    announce("Exterior tour started");
  }, []);
  const startInterior = useCallback((floor: number) => {
    setInteriorFloorIdx(Math.max(0, Math.min(floor, FLOORS.length - 1)));
    setMode("interior");
    setPlaying(true);
    tourAngleRef.current = 0;
    tourTimeRef.current.stageStart = performance.now();
    announce(`Interior tour started at floor ${floor}`);
  }, []);
  const startFull = useCallback(() => {
    setFullStage(0);
    setMode("full");
    setPlaying(true);
    tourAngleRef.current = 0;
    tourTimeRef.current.start = performance.now();
    tourTimeRef.current.stageStart = performance.now();
    announce("Full building tour started");
  }, []);
  const stop = useCallback(() => {
    setPlaying(false);
    setMode("none");
    announce("Tour stopped");
  }, []);
  const setInteriorFloor = useCallback(
    (idx: number) => {
      setInteriorFloorIdx(Math.max(0, Math.min(idx, FLOORS.length - 1)));
      if (mode === "interior" && playing) {
        tourAngleRef.current = 0;
        tourTimeRef.current.stageStart = performance.now();
      }
    },
    [mode, playing]
  );

  // Expose globally once (stable refs)
  useEffect(() => {
    if (typeof window === "undefined") return;
    (window as any).startExteriorTour = startExterior;
    (window as any).startInteriorTour = startInterior;
    (window as any).startFullBuildingTour = startFull;
    (window as any).stopTour = stop;
    (window as any).setTourSpeed = setSpeed;
    (window as any).setInteriorFloor = setInteriorFloor;
  }, [startExterior, startInterior, startFull, stop, setInteriorFloor]);

  return {
    mode,
    playing,
    interiorFloorIdx,
    cycleFloors,
    speed,
    fullStage,
    startExterior,
    startInterior,
    startFull,
    stop,
    setSpeed,
    setInteriorFloor,
    setCycleFloors,
  };
}

export function TourAutomation({
  controller,
  ariaRef,
}: {
  controller: TourController;
  ariaRef: RefObject<HTMLDivElement | null>;
}) {
  const {
    mode,
    playing,
    speed,
    interiorFloorIdx,
    cycleFloors,
    fullStage,
    stop,
    setInteriorFloor,
    fullStage: fs,
  } = controller as any;
  const tourAngleRef = useRef(0);
  const stageStartRef = useRef(performance.now());
  const rafClockRef = useRef(performance.now());

  useFrame(({ camera }) => {
    if (!playing) return;
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
    const angularSpeed = (Math.PI * 2 * speed) / 60;
    if (mode === "exterior") {
      tourAngleRef.current += angularSpeed * dt;
      const angle = tourAngleRef.current;
      const y = center.y + size.y * 0.4;
      camera.position.set(
        center.x + Math.cos(angle) * baseRadius,
        y,
        center.z + Math.sin(angle) * baseRadius
      );
      camera.lookAt(center.x, center.y + size.y * 0.2, center.z);
    } else if (mode === "interior") {
      const floorY = FLOORS[interiorFloorIdx] + 1.6;
      tourAngleRef.current += angularSpeed * dt * 1.2;
      const r = Math.max(size.x, size.z) * 0.35;
      const angle = tourAngleRef.current;
      camera.position.set(
        center.x + Math.cos(angle) * r,
        floorY,
        center.z + Math.sin(angle) * r
      );
      camera.lookAt(center.x, floorY, center.z);
      if (cycleFloors) {
        const elapsed = now - stageStartRef.current;
        if (elapsed > INTERIOR_FLOOR_DURATION_MS) {
          setInteriorFloor((interiorFloorIdx + 1) % FLOORS.length);
          stageStartRef.current = now;
          tourAngleRef.current = 0;
        }
      }
    } else if (mode === "full") {
      const elapsed = now - stageStartRef.current;
      const stageDuration =
        fullStage === 0
          ? EXTERIOR_STAGE_DURATION_MS
          : INTERIOR_FLOOR_DURATION_MS;
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
        const floorY = FLOORS[floorIdx] + 1.6;
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
      if (elapsed >= stageDuration) {
        const next = fullStage + 1;
        if (next > FLOORS.length) {
          stop();
          return;
        }
        (controller as any).fullStage = next; // track stage externally if needed
        stageStartRef.current = now;
        tourAngleRef.current = 0;
        if (ariaRef.current)
          ariaRef.current.textContent =
            next === 0 ? "Exterior stage" : `Interior floor ${next - 1} stage`;
        if (next > 0) setInteriorFloor(next - 1);
      }
    }
  });
  return null;
}
