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
  PointerLockControls,
  ContactShadows,
  Sky,
  Cloud,
} from "@react-three/drei";
import { DoubleSide, Color, Vector3, MOUSE } from "three";
import { EffectComposer, Bloom, Vignette, SSAO } from "@react-three/postprocessing";
import dynamic from "next/dynamic";
import { SketchPicker } from "react-color";

import { FLOORS } from "./r3f-viewer/constants";
import { type FurnitureModel, type TourWaypoint } from "./r3f-viewer/types";
import FirstPersonWalk from "./r3f-viewer/FirstPersonWalk";
import FirstPersonLook from "./r3f-viewer/FirstPersonLook";
import FrameCapture from "./r3f-viewer/FrameCapture";
import GroundPlanes from "./r3f-viewer/GroundPlanes";
import Model from "./r3f-viewer/Model";
import AutoTour from "./r3f-viewer/AutoTour";

/* modularized: FLOORS, FirstPersonWalk imported */
/* removed inline FirstPersonWalk */

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
  const [wallColor, setWallColor] = useState("#FFFFFF");
  const [floorColor, setFloorColor] = useState("#90A955");
  const [furnitureColor, setFurnitureColor] = useState("#8B4513");
  const [mounted, setMounted] = useState(false);
  const [selectedMesh, setSelectedMesh] = useState<any>(null);
  const [pickerPosition, setPickerPosition] = useState<[number, number] | null>(null);
  const [pickerColor, setPickerColor] = useState("#FFFFFF");
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
    
    // Close color picker when entering first-person mode
    setSelectedMesh(null);
    setPickerPosition(null);
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
        const radius = Math.max(sx, sz) * 2.0 + 1.0;
        const eyeY = b.center[1] + Math.min(3.0, sy * 0.6);
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
      const baseFloorY =
        FLOORS[Math.max(0, Math.min(floorIdx, FLOORS.length - 1))];
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

  const floors = FLOORS;
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
    const floorsLocal = FLOORS;
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
    <div className="w-full h-full relative group">
      {/* Decorative Frame Elements */}
      <div className="absolute inset-0 pointer-events-none z-30">
        {/* Corner Accents */}
        <div className="absolute top-0 left-0 w-20 h-20 border-t-2 border-l-2 border-blue-500/30"></div>
        <div className="absolute top-0 right-0 w-20 h-20 border-t-2 border-r-2 border-purple-500/30"></div>
        <div className="absolute bottom-0 left-0 w-20 h-20 border-b-2 border-l-2 border-purple-500/30"></div>
        <div className="absolute bottom-0 right-0 w-20 h-20 border-b-2 border-r-2 border-blue-500/30"></div>
        
        {/* Subtle Grid Overlay */}
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: `
            linear-gradient(rgba(99, 102, 241, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(99, 102, 241, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }}></div>
      </div>

      {/* Main Viewer Container */}
      <div className="w-full h-full relative rounded-2xl overflow-hidden shadow-2xl border border-gray-200/50 bg-gradient-to-br from-slate-50 via-white to-gray-50">
        {/* Ambient Glow Effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 pointer-events-none"></div>
        <Canvas
          camera={{ position: [6, 4, 6], fov: 60 }}
          style={{
            cursor:
              editMode && selectedFurnitureModel ? "crosshair" : "default",
          }}
          shadows
          gl={{ 
            antialias: true, 
            alpha: true,
            powerPreference: "high-performance",
            preserveDrawingBuffer: true,
          }}
          dpr={[1, 2]}
          onPointerMissed={(e) => {
            if (e.type === "pointerdown" && editMode)
              setSelectedFurniture(null);
          }}
          onPointerDown={() => setShowHints(false)}
        >
          {/* Enhanced Lighting Setup */}
          <color attach="background" args={["#87CEEB"]} />
          <FrameCapture />
          
          {/* Advanced Lighting */}
          <ambientLight intensity={0.5} />
          
          {/* Key Light - Main directional light */}
          <directionalLight
            position={[10, 20, 10]}
            intensity={1.5}
            castShadow
            shadow-mapSize={[4096, 4096]}
            shadow-camera-far={50}
            shadow-camera-left={-20}
            shadow-camera-right={20}
            shadow-camera-top={20}
            shadow-camera-bottom={-20}
            shadow-bias={-0.0001}
          />
          
          {/* Fill Light - Softer secondary light */}
          <directionalLight
            position={[-5, 10, -5]}
            intensity={0.4}
            color="#b8d4ff"
          />
          
          {/* Rim Light - Adds depth */}
          <spotLight
            position={[0, 15, -10]}
            angle={0.3}
            penumbra={1}
            intensity={0.5}
            castShadow
            color="#ffd4a3"
          />
          
          {/* Accent Lights */}
          <pointLight position={[-10, 5, -10]} intensity={0.3} color="#ff9a76" distance={20} />
          <pointLight position={[10, 5, 10]} intensity={0.3} color="#76b6ff" distance={20} />
          
          {/* Hemisphere for natural ambient */}
          <hemisphereLight args={["#ffffff", "#8B7355", 0.4]} />
          <Suspense fallback={<Html center>Loading model...</Html>}>
            <Model
              url={url}
              selectedFurniture={selectedFurniture}
              onFurnitureClick={setSelectedFurniture}
              transformMode={transformMode}
              wallColor={wallColor}
              floorColor={floorColor}
              onMeshClick={!firstPerson ? (mesh: any, point: [number, number, number]) => {
                // When a mesh is double-clicked, show the color picker (only when not in first-person mode)
                setSelectedMesh(mesh);
                // Get current mesh color
                const currentColor = mesh.material?.color ? 
                  `#${mesh.material.color.getHexString()}` : "#FFFFFF";
                setPickerColor(currentColor);
                // Position picker at center of screen for easy access
                const centerX = window.innerWidth / 2;
                const centerY = window.innerHeight / 2;
                setPickerPosition([centerX, centerY]);
              } : undefined}
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
                      const floorsArr = FLOORS;
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
                      const floorsArr = FLOORS;
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
                {FLOORS.map((h) => (
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
            {/* Ground Plane */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
              <planeGeometry args={[100, 100]} />
              <meshStandardMaterial 
                color={floorColor}
                roughness={0.8}
                metalness={0.2}
              />
            </mesh>
            
            {/* Enhanced Environment & Shadows */}
            <Environment 
              preset="sunset"
              background={false}
              blur={0}
            />
            
            {/* Ground Shadows for realism */}
            <ContactShadows
              position={[0, 0, 0]}
              opacity={0.5}
              scale={50}
              blur={2.5}
              far={10}
              resolution={512}
              color="#000000"
            />
            
            {/* Restored Sky & Cloud decorative environment */}
            <Sky
              distance={450000}
              sunPosition={[120, 30, 100]}
              inclination={0.47}
              azimuth={0.25}
              turbidity={6}
              rayleigh={1.2}
              mieCoefficient={0.004}
              mieDirectionalG={0.65}
            />
            {/* Lightweight cloud layer (reduced count to minimize perf impact) */}
            <Cloud
              opacity={0.4}
              speed={0.2}
              segments={18}
              position={[-15, 18, -25]}
            />
            <Cloud
              opacity={0.35}
              speed={0.18}
              segments={16}
              position={[20, 16, -30]}
            />
          </Suspense>
          
          {/* Post-processing Effects - Optimized for clarity */}
          <EffectComposer multisampling={4}>
            <Bloom
              intensity={0.15}
              luminanceThreshold={0.95}
              luminanceSmoothing={0.7}
            />
            <SSAO
              intensity={15}
              radius={3}
              luminanceInfluence={0.3}
              // Use Color object to satisfy typing vs raw string
              color={new Color(0x000000)}
            />
            <Vignette
              offset={0.5}
              darkness={0.3}
              eskil={false}
            />
          </EffectComposer>
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
        {/* Status Bar */}
        <div className="absolute top-0 left-0 right-0 h-12 bg-gradient-to-b from-black/20 to-transparent pointer-events-none z-20 flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse shadow-lg shadow-green-400/50"></div>
              <span className="text-white text-xs font-medium drop-shadow-lg">Live View</span>
            </div>
            {isTourPlaying && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/80 backdrop-blur-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>
                <span className="text-white text-xs font-medium">Tour Active</span>
              </div>
            )}
            {firstPerson && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/80 backdrop-blur-sm">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="text-white text-xs font-medium">First Person</span>
              </div>
            )}
          </div>
        </div>

        {/* Remote Control Panel Toggle Button */}
        <button
          onClick={() => setControlPanelOpen((o) => !o)}
          aria-label={controlPanelOpen ? "Hide controls" : "Show controls"}
          className="absolute top-4 right-4 z-20 rounded-xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 text-white shadow-xl hover:shadow-2xl transition-all duration-300 w-12 h-12 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-400 hover:scale-110 group/btn"
        >
          <div className="absolute inset-0 rounded-xl bg-white/20 opacity-0 group-hover/btn:opacity-100 transition-opacity"></div>
          <span className="relative text-lg font-light">{controlPanelOpen ? "×" : "≡"}</span>
        </button>
        {/* Enhanced Control Panel */}
        {controlPanelOpen && (
          <div
            className="absolute top-20 right-4 z-10 w-80 max-h-[calc(100%-6rem)] overflow-hidden rounded-2xl backdrop-blur-xl bg-white/90 border border-white/60 shadow-2xl flex flex-col text-xs text-gray-800 animate-in slide-in-from-right duration-300"
            role="region"
            aria-label="3D Viewer Controls"
          >
            {/* Panel Header with Gradient */}
            <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-white tracking-wide flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                  Camera Controls
                </h3>
                {isTourPlaying && (
                  <span className="px-2 py-1 rounded-full bg-white/20 text-white text-[10px] font-medium animate-pulse backdrop-blur-sm">
                    ● Recording
                  </span>
                )}
              </div>
              <p className="text-white/80 text-[10px] font-light">Navigate and explore your 3D space</p>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto p-4 flex flex-col gap-4 max-h-[calc(100vh-20rem)]">
            {/* View Modes Section */}
            <div className="space-y-3">
              <h4 className="text-[10px] uppercase tracking-wider font-bold text-gray-500 flex items-center gap-2">
                <div className="w-1 h-4 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></div>
                View Modes
              </h4>
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
            </div>

            {/* Tour Controls Section */}
            <div className="space-y-3 pt-3 border-t border-gray-200">
              <h4 className="text-[10px] uppercase tracking-wider font-bold text-gray-500 flex items-center gap-2">
                <div className="w-1 h-4 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full"></div>
                Automated Tours
              </h4>
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
            </div>

            {/* Speed Control Section */}
            <div className="space-y-2 pt-3 border-t border-gray-200">
              <h4 className="text-[10px] uppercase tracking-wider font-bold text-gray-500 flex items-center gap-2">
                <div className="w-1 h-4 bg-gradient-to-b from-pink-500 to-rose-500 rounded-full"></div>
                Playback Speed
              </h4>
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
            </div>

            {/* Floor Navigation Section */}
            {firstPerson && !isTourPlaying && (
              <div className="space-y-2 pt-3 border-t border-gray-200">
                <h4 className="text-[10px] uppercase tracking-wider font-bold text-gray-500 flex items-center gap-2">
                  <div className="w-1 h-4 bg-gradient-to-b from-green-500 to-emerald-500 rounded-full"></div>
                  Floor Navigation
                </h4>
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
              </div>
            )}

            {/* Keyboard Shortcuts Section */}
            <div className="space-y-2 pt-3 border-t border-gray-200">
              <h4 className="text-[10px] uppercase tracking-wider font-bold text-gray-500 flex items-center gap-2">
                <div className="w-1 h-4 bg-gradient-to-b from-gray-500 to-slate-500 rounded-full"></div>
                Keyboard Shortcuts
              </h4>
              <div className="flex flex-col gap-1 text-[10px] text-gray-600 leading-relaxed bg-gray-50 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <kbd className="px-1.5 py-0.5 bg-white rounded text-[9px] font-mono border border-gray-300 shadow-sm">WASD</kbd>
                <span className="flex-1">Move in first-person mode</span>
              </div>
              <div className="flex items-start gap-2">
                <kbd className="px-1.5 py-0.5 bg-white rounded text-[9px] font-mono border border-gray-300 shadow-sm">Drag</kbd>
                <span className="flex-1">Rotate camera view</span>
              </div>
              <div className="flex items-start gap-2">
                <kbd className="px-1.5 py-0.5 bg-white rounded text-[9px] font-mono border border-gray-300 shadow-sm">Scroll</kbd>
                <span className="flex-1">Zoom in/out</span>
              </div>
              <div className="flex items-start gap-2">
                <kbd className="px-1.5 py-0.5 bg-white rounded text-[9px] font-mono border border-gray-300 shadow-sm">PgUp/PgDn</kbd>
                <span className="flex-1">Change floor level</span>
              </div>
              <div className="flex items-start gap-2">
                <kbd className="px-1.5 py-0.5 bg-white rounded text-[9px] font-mono border border-gray-300 shadow-sm">ESC</kbd>
                <span className="flex-1">Cancel selection</span>
              </div>
              </div>
            </div>

            {/* Color Customization Section */}
            <div className="space-y-3 pt-3 border-t border-gray-200">
              <h4 className="text-[10px] uppercase tracking-wider font-bold text-gray-500 flex items-center gap-2">
                <div className="w-1 h-4 bg-gradient-to-b from-pink-500 to-rose-500 rounded-full"></div>
                Color Customization
              </h4>
              
              {/* Wall Color */}
              <div className="space-y-2">
                <label className="text-[11px] font-medium text-gray-600 flex items-center justify-between">
                  Wall Color
                  <div 
                    className="w-6 h-6 rounded border border-gray-300 cursor-pointer shadow-sm"
                    style={{ backgroundColor: wallColor }}
                  />
                </label>
                <input
                  type="color"
                  value={wallColor}
                  onChange={(e) => setWallColor(e.target.value)}
                  className="w-full h-8 rounded cursor-pointer border border-gray-300"
                />
                <div className="grid grid-cols-5 gap-1">
                  {["#FFFFFF", "#F5F5F5", "#E0E0E0", "#E3F2FD", "#E8F5E8", "#FCE4EC", "#FFFDE7", "#FFF8DC", "#F5F5DC", "#F3E5F5"].map((color) => (
                    <button
                      key={color}
                      onClick={() => setWallColor(color)}
                      className="w-full h-6 rounded border border-gray-300 hover:scale-110 transition-transform"
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>

              {/* Floor Color */}
              <div className="space-y-2">
                <label className="text-[11px] font-medium text-gray-600 flex items-center justify-between">
                  Floor Color
                  <div 
                    className="w-6 h-6 rounded border border-gray-300 cursor-pointer shadow-sm"
                    style={{ backgroundColor: floorColor }}
                  />
                </label>
                <input
                  type="color"
                  value={floorColor}
                  onChange={(e) => setFloorColor(e.target.value)}
                  className="w-full h-8 rounded cursor-pointer border border-gray-300"
                />
                <div className="grid grid-cols-5 gap-1">
                  {["#90A955", "#8B4513", "#654321", "#D2B48C", "#C19A6B", "#DEB887", "#F5DEB3", "#E6D7B8", "#A0826D", "#8B7355"].map((color) => (
                    <button
                      key={color}
                      onClick={() => setFloorColor(color)}
                      className="w-full h-6 rounded border border-gray-300 hover:scale-110 transition-transform"
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>
            </div>
            </div>
          </div>
        )}

        {/* Mesh Color Picker - Shows when double-clicking on walls/floors (disabled in first-person mode) */}
        {selectedMesh && pickerPosition && !firstPerson && (
          <div 
            className="absolute z-50 animate-in fade-in zoom-in-95 duration-200"
            style={{
              left: `${pickerPosition[0]}px`,
              top: `${pickerPosition[1]}px`,
              transform: 'translate(-50%, -50%)'
            }}
          >
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-4">
              {/* Header */}
              <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-200">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Customize Surface</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {selectedMesh.name || 'Surface'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSelectedMesh(null);
                    setPickerPosition(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-lg"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Color Picker */}
              <SketchPicker
                color={pickerColor}
                onChange={(color) => {
                  setPickerColor(color.hex);
                  // Apply color to the mesh immediately
                  if (selectedMesh && (window as any).updateMeshColor) {
                    (window as any).updateMeshColor(selectedMesh.uuid, color.hex);
                  }
                }}
                presetColors={[
                  '#FFFFFF', '#F5F5F5', '#E0E0E0', '#CCCCCC',
                  '#E3F2FD', '#BBDEFB', '#90CAF9', '#64B5F6',
                  '#E8F5E8', '#C8E6C9', '#A5D6A7', '#81C784',
                  '#FCE4EC', '#F8BBD0', '#F48FB1', '#F06292',
                  '#FFFDE7', '#FFF9C4', '#FFF59D', '#FFF176',
                  '#FFF8DC', '#FAEBD7', '#FFE4B5', '#FFDAB9',
                  '#F5F5DC', '#EEE8AA', '#F0E68C', '#BDB76B',
                  '#90A955', '#8B4513', '#654321', '#D2B48C',
                ]}
              />

              {/* Quick Actions */}
              <div className="mt-3 pt-3 border-t border-gray-200 flex gap-2">
                <button
                  onClick={() => {
                    setPickerColor('#FFFFFF');
                    if (selectedMesh && (window as any).updateMeshColor) {
                      (window as any).updateMeshColor(selectedMesh.uuid, '#FFFFFF');
                    }
                  }}
                  className="flex-1 px-3 py-2 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Reset
                </button>
                <button
                  onClick={() => {
                    setSelectedMesh(null);
                    setPickerPosition(null);
                  }}
                  className="flex-1 px-3 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Floating Hints */}
        {showHints && (
          <div className="absolute left-6 bottom-6 z-10 max-w-xs animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-gradient-to-br from-gray-900/95 to-gray-800/95 backdrop-blur-xl text-white px-5 py-4 rounded-2xl shadow-2xl border border-white/10">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h5 className="font-semibold text-sm mb-2">Quick Start</h5>
                  <div className="text-xs text-gray-300 space-y-1">
                    <p>• <strong>Double-click walls/floors</strong> to change colors</p>
                    <p>• <strong>Drag</strong> to rotate • <strong>Scroll</strong> to zoom</p>
                    <p>• <strong>WASD</strong> for 360° walk mode</p>
                    <p>• <strong>PageUp/Down</strong> to change floors</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowHints(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Info Bar */}
        <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-black/20 to-transparent pointer-events-none z-20 flex items-end justify-center pb-2">
          <div className="flex items-center gap-4 text-white/60 text-[10px] font-medium">
            <div className="flex items-center gap-1.5">
              <div className="w-1 h-1 rounded-full bg-white/40"></div>
              <span>3D Architectural Viewer</span>
            </div>
            <div className="w-px h-3 bg-white/20"></div>
            <div className="flex items-center gap-1.5">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Real-time Rendering</span>
            </div>
          </div>
        </div>
        {/* Enhanced Crosshair for Pointer Lock */}
        {pointerLocked && firstPerson && !isTourPlaying && (
          <div
            className="pointer-events-none select-none absolute inset-0 flex items-center justify-center z-10"
            aria-hidden="true"
          >
            <div className="relative">
              {/* Crosshair */}
              <div className="w-6 h-6 relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-1 h-1 rounded-full bg-white shadow-lg"></div>
                </div>
                <div className="absolute top-0 left-1/2 w-px h-2 bg-white/60 -translate-x-1/2"></div>
                <div className="absolute bottom-0 left-1/2 w-px h-2 bg-white/60 -translate-x-1/2"></div>
                <div className="absolute left-0 top-1/2 h-px w-2 bg-white/60 -translate-y-1/2"></div>
                <div className="absolute right-0 top-1/2 h-px w-2 bg-white/60 -translate-y-1/2"></div>
              </div>
              {/* Outer ring */}
              <div className="absolute inset-0 w-6 h-6 rounded-full border border-white/30 animate-ping"></div>
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
