"use client";

function FirstPersonWalk({ enabled }: { enabled: boolean }) {
  const { camera } = useThree();
  const keys = useRef<Record<string, boolean>>({});
  const floorYRef = useRef(0);
  const speedRef = useRef(0.06);
  useEffect(() => {
    const b = (typeof window !== 'undefined') ? (window as any).__modelBounds : undefined;
    if (b?.min) floorYRef.current = b.min[1] + 1.6;
  }, []);
  useEffect(() => {
    if (!enabled) return;
    const kd = (e: KeyboardEvent) => { keys.current[e.code] = true; };
    const ku = (e: KeyboardEvent) => { keys.current[e.code] = false; };
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);
    let raf = 0;
    const loop = () => {
      if (!enabled) return;
      const THREE = require('three');
      const v = new THREE.Vector3();
      camera.getWorldDirection(v);
      const forward = new THREE.Vector3(v.x, 0, v.z).normalize();
      const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0,1,0)).normalize().negate();
      const speed = (keys.current['ShiftLeft'] || keys.current['ShiftRight']) ? speedRef.current * 2 : speedRef.current;
      const move = new THREE.Vector3();
      if (keys.current['KeyW'] || keys.current['ArrowUp']) move.add(forward.multiplyScalar(speed));
      if (keys.current['KeyS'] || keys.current['ArrowDown']) move.add(forward.multiplyScalar(-speed));
      if (keys.current['KeyA'] || keys.current['ArrowLeft']) move.add(right.multiplyScalar(-speed));
      if (keys.current['KeyD'] || keys.current['ArrowRight']) move.add(right.multiplyScalar(speed));
      camera.position.add(move);
      const b = (typeof window !== 'undefined') ? (window as any).__modelBounds : undefined;
      if (b?.min && b?.max) {
        camera.position.x = Math.min(Math.max(camera.position.x, b.min[0] + 0.2), b.max[0] - 0.2);
        camera.position.z = Math.min(Math.max(camera.position.z, b.min[2] + 0.2), b.max[2] - 0.2);
      }
      camera.position.y = floorYRef.current || camera.position.y;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); };
  }, [enabled, camera]);
  return null;
}
import { Suspense, useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment, Html, useGLTF, Text, TransformControls, PointerLockControls } from "@react-three/drei";
import { DoubleSide, Color, Vector3, Mesh, Group, MOUSE } from "three";
import dynamic from "next/dynamic";
type TourPoint = {
  id: string;
  position: [number, number, number];
  lookAt: [number, number, number];
};

// Simplified: remove custom mouse/first-person controls; use Orbit only for stability

function TourCameraController({ activePoint, isPlaying, onArrive, duration = 2.0 }: { activePoint: TourPoint | null; isPlaying: boolean; onArrive?: () => void; duration?: number }) {
  const { camera } = useThree();
  const startRef = useRef<{ pos: any; look: any } | null>(null);
  const targetRef = useRef<{ pos: any; look: any } | null>(null);
  const progressRef = useRef(0);
  const arrivedRef = useRef(false);

  useEffect(() => {
    if (!activePoint || !isPlaying) return;
    const THREE = require('three');
    startRef.current = {
      pos: camera.position.clone(),
      look: camera.getWorldDirection(new THREE.Vector3()).add(camera.position.clone())
    };
    targetRef.current = {
      pos: new THREE.Vector3(...activePoint.position),
      look: new THREE.Vector3(...activePoint.lookAt)
    };
    progressRef.current = 0;
    arrivedRef.current = false;
  }, [activePoint, isPlaying, camera]);

  useFrame((_, delta) => {
    if (!activePoint || !isPlaying || !startRef.current || !targetRef.current) return;
    const THREE = require('three');
    progressRef.current = Math.min(1, progressRef.current + delta / duration);
    const t = 1 - Math.pow(1 - progressRef.current, 3); // easeOutCubic

    const pos = new THREE.Vector3().lerpVectors(startRef.current.pos, targetRef.current.pos, t);
    const look = new THREE.Vector3().lerpVectors(startRef.current.look, targetRef.current.look, t);
    camera.position.copy(pos);
    camera.lookAt(look);

    if (progressRef.current >= 1 && onArrive && !arrivedRef.current) {
      arrivedRef.current = true;
      onArrive();
    }
  });

  return null;
}

// Dynamic furniture types
interface FurnitureModel {
  id: string;
  name: string;
  filename: string;
  path: string;
}

interface FurnitureItem {
  id: string;
  type: string; // Now dynamic - uses model id
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  color: string;
}

// Furniture component
function Furniture({ item, isSelected, onClick, onReady }: { 
  item: FurnitureItem; 
  isSelected: boolean; 
  onClick: () => void;
  onReady?: (group: Group) => void;
}) {
  const groupRef = useRef<Group>(null);
  const modelRef = useRef<Group>(null);
  
  // Load the GLB model (do not wrap hooks in try/catch). Error boundary handled by Suspense/console.
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

  // Center pivot and place object on ground for intuitive transforms
  useEffect(() => {
    if (!decoratedScene || !modelRef.current) return;
    const THREE = require("three");
    const box = new THREE.Box3().setFromObject(decoratedScene);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    
    // Clear any existing children first
    modelRef.current.clear();
    
    // Create a new group to hold the centered model
    const centeredGroup = new THREE.Group();
    
    // Move the model so its center is at (0,0,0) relative to the group
    decoratedScene.position.sub(center);
    // Then lift so base sits on ground (y = 0)
    decoratedScene.position.y = size.y / 2;
    
    // Add the model to the centered group
    centeredGroup.add(decoratedScene);
    
    // Add the centered group to the model ref
    modelRef.current.add(centeredGroup);
  }, [decoratedScene]);

  // Expose the underlying group to parent so it can attach TransformControls
  useEffect(() => {
    if (groupRef.current && onReady) {
      onReady(groupRef.current);
    }
  }, [groupRef.current, onReady]);

  // Force update when selection changes
  useEffect(() => {
    if (groupRef.current && onReady) {
      onReady(groupRef.current);
    }
  }, [isSelected, onReady]);

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
          {/* Show center point for debugging */}
          <mesh position={[0, 0, 0]}>
            <sphereGeometry args={[0.05, 8, 8]} />
            <meshBasicMaterial color="yellow" />
          </mesh>
        </>
      )}
    </group>
  );
}

// Multiple ground planes at different heights for multi-floor placement
function GroundPlanes({ onPlace, isActive, onUnselect }: { 
  onPlace: (point: { x: number; y: number; z: number }) => void; 
  isActive: boolean;
  onUnselect: () => void;
}) {
  const floors = [0, 3, 6, 9, 12]; // Different floor heights
  
  return (
    <>
      {floors.map((height) => (
        <mesh
          key={height}
          position={[0, height, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          onClick={(e: any) => {
            e.stopPropagation();
            if (isActive) {
              // Place furniture at the clicked floor height
              const p = e.point;
              onPlace({ x: p.x, y: height, z: p.z });
            } else {
              // Unselect when clicking empty space
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

function Model({ url, selectedFurniture, onFurnitureClick, transformMode }: { 
  url: string; 
  selectedFurniture: string | null;
  onFurnitureClick: (id: string) => void;
  transformMode: 'none' | 'translate' | 'rotate' | 'scale';
}) {
  const group = useRef<any>(null);
  const camera = useThree((state) => state.camera);
  const controls = useThree((state) => state.controls as any);
  const viewport = useThree((state) => state.size);
  const gltf = useGLTF(url);
  const [furniture, setFurniture] = useState<FurnitureItem[]>([]);
  const [modelColor, setModelColor] = useState('#b0bec5');
  const selectedObjectRef = useRef<Group | null>(null);
  const idToObjectRef = useRef<Record<string, Group>>({});

  // Make materials more realistic with better lighting and materials
  useEffect(() => {
    if (!gltf?.scene) return;
    gltf.scene.traverse((obj: any) => {
      if (obj.isMesh && obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach((m: any) => {
          // Convert to MeshStandardMaterial for realistic lighting
          if (!m.isMeshStandardMaterial) {
            const newMaterial = new (require("three").MeshStandardMaterial)({
              color: m.color || new Color(modelColor),
              metalness: 0.1,
              roughness: 0.8,
              transparent: true,
              opacity: 0.85,
              side: DoubleSide,
              depthWrite: true
            });
            obj.material = newMaterial;
          } else {
            // Update existing standard material
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

  // Fit camera to model on load and expose bounds for parent utilities (position at eye height inside if possible)
  useEffect(() => {
    if (!gltf?.scene || !camera) return;
    const THREE = require('three');
    const box = new THREE.Box3().setFromObject(gltf.scene);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    // Save bounds for parent
    if (typeof window !== 'undefined') {
      (window as any).__modelBounds = {
        center: [center.x, center.y, center.z],
        size: [size.x, size.y, size.z],
        min: [box.min.x, box.min.y, box.min.z],
        max: [box.max.x, box.max.y, box.max.z]
      };
    }

    // Compute distance to fit BOTH height and width considering aspect
    const fov = (camera.fov || 60) * Math.PI / 180;
    const halfY = size.y / 2;
    const halfX = size.x / 2;
    const aspect = Math.max(0.1, viewport.width / Math.max(1, viewport.height));
    // distance required to fit height
    const fitHeightDistance = halfY / Math.tan(fov / 2);
    // distance required to fit width maps to vertical FOV scaled by aspect
    const fitWidthDistance = halfX / (Math.tan(fov / 2) * aspect);
    let distance = Math.max(fitHeightDistance, fitWidthDistance) * 1.3; // add padding

    const eyeY = box.min.y + Math.min(1.7, Math.max(1.4, size.y * 0.35));
    const dir = new THREE.Vector3(1, 0, 1).normalize();
    const newPos = new THREE.Vector3(center.x, eyeY, center.z).add(dir.multiplyScalar(distance));
    camera.position.copy(newPos);
    camera.near = Math.max(0.01, distance / 100);
    camera.far = Math.max(500, distance * 200);
    camera.updateProjectionMatrix();
    if (controls?.target) {
      controls.target.set(center.x, eyeY, center.z);
      if (typeof controls.minDistance === 'number') controls.minDistance = distance * 0.1;
      if (typeof controls.maxDistance === 'number') controls.maxDistance = distance * 10;
      controls.update?.();
    }
  }, [gltf, camera, controls, viewport]);

  // Removed auto-suggest tour nodes; tour paths are user-driven (Auto Tour/Record/Add Point)

  const addFurniture = (modelPath: string, position: [number, number, number]) => {
    if (!modelPath) return;
    const newItem: FurnitureItem = {
      id: `furniture-${Date.now()}`,
      type: modelPath, // Store the full path
      position,
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      color: '#8B4513' // Brown color
    };
    setFurniture(prev => [...prev, newItem]);
  };

  const removeFurniture = (id: string) => {
    setFurniture(prev => prev.filter(item => item.id !== id));
  };

  const updateFurnitureColor = (id: string, color: string) => {
    setFurniture(prev => prev.map(item => 
      item.id === id ? { ...item, color } : item
    ));
  };

  const updateFurnitureTransform = (id: string, transform: { position: [number, number, number]; rotation: [number, number, number]; scale: [number, number, number] }) => {
    setFurniture(prev => prev.map(item => 
      item.id === id ? { 
        ...item, 
        position: transform.position,
        rotation: transform.rotation,
        scale: transform.scale
      } : item
    ));
  };

  // Expose functions to parent
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).addFurniture = addFurniture;
      (window as any).removeFurniture = removeFurniture;
      (window as any).updateFurnitureColor = updateFurnitureColor;
      (window as any).updateFurnitureTransform = updateFurnitureTransform;
      (window as any).setModelColor = setModelColor;
    }
  }, []);

  return (
    <group ref={group}>
      <primitive object={gltf.scene} />
      {/* Ground plane only when editing to place items */}
      {transformMode && (
        <></>
      )}
      {furniture.map(item => (
        <Furniture
          key={item.id}
          item={item}
          isSelected={selectedFurniture === item.id}
          onClick={() => onFurnitureClick(item.id)}
          onReady={(obj) => {
            idToObjectRef.current[item.id] = obj;
            if (selectedFurniture === item.id) {
              selectedObjectRef.current = obj;
            }
          }}
        />
      ))}
      {selectedFurniture && idToObjectRef.current[selectedFurniture] && transformMode !== 'none' && (
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
            // Disable orbit while dragging via global flag
            if (typeof window !== 'undefined') {
              (window as any).__disableOrbit = true;
            }
          }}
          onMouseUp={() => {
            if (typeof window !== 'undefined') {
              (window as any).__disableOrbit = false;
            }
            // Persist final transform
            const obj = idToObjectRef.current[selectedFurniture];
            if (obj && typeof window !== 'undefined' && (window as any).updateFurnitureTransform) {
              (window as any).updateFurnitureTransform(selectedFurniture, {
                position: [obj.position.x, obj.position.y, obj.position.z],
                rotation: [obj.rotation.x, obj.rotation.y, obj.rotation.z],
                scale: [obj.scale.x, obj.scale.y, obj.scale.z]
              });
            }
          }}
          onChange={() => {
            // Constrain to XZ plane with grid snap and lock Y to nearest floor
            const obj = idToObjectRef.current[selectedFurniture];
            if (!obj) return;
            const grid = 0.25;
            obj.position.x = Math.round(obj.position.x / grid) * grid;
            obj.position.z = Math.round(obj.position.z / grid) * grid;
            const floors = [0, 3, 6, 9, 12];
            const nearestFloor = floors.reduce((prev, cur) => Math.abs(cur - obj.position.y) < Math.abs(prev - obj.position.y) ? cur : prev, floors[0]);
            obj.position.y = nearestFloor;
          }}
        />
      )}
    </group>
  );
}

// Walk/360 mode removed to keep a single guided tour mode

function R3FViewerComponent({ 
  url, 
  editMode, 
  setEditMode,
  onEditControlsReady
}: { 
  url: string;
  editMode: boolean;
  setEditMode: (mode: boolean) => void;
  onEditControlsReady?: (controls: any) => void;
}) {
  // Walk mode removed
  const [selectedFurniture, setSelectedFurniture] = useState<string | null>(null);
  const [selectedFurnitureModel, setSelectedFurnitureModel] = useState<FurnitureModel | null>(null);
  const [modelColor, setModelColor] = useState('#b0bec5');
  const [furnitureColor, setFurnitureColor] = useState('#8B4513');
  const [mounted, setMounted] = useState(false);
  const [furnitureModels, setFurnitureModels] = useState<FurnitureModel[]>([]);
  const [loadingFurniture, setLoadingFurniture] = useState(false);
  const [transformMode, setTransformMode] = useState<'none' | 'translate' | 'rotate' | 'scale'>('none');
  const [disableOrbit, setDisableOrbit] = useState(false);
  const [tourPoints, setTourPoints] = useState<TourPoint[]>([]);
  const [activeTourIndex, setActiveTourIndex] = useState<number>(-1);
  const [isTourPlaying, setIsTourPlaying] = useState(false);
  // Tour system removed for simplicity
  const [showHints, setShowHints] = useState(true);
  const ariaRef = useRef<HTMLDivElement | null>(null);
  // Controls: Orbit by default; optional 360 Walk (first-person)
  const [firstPerson, setFirstPerson] = useState(false);
  const setInteriorView = useCallback(() => {
    const THREE = require('three');
    const cam = (window as any).__lastCameraState as undefined | { position: [number, number, number]; lookAt: [number, number, number] };
    const bounds = (window as any).__modelBounds as undefined | { center: [number, number, number]; size: [number, number, number] };
    if (!bounds) return;
    const center = new THREE.Vector3(...bounds.center);
    const size = new THREE.Vector3(...bounds.size);
    const eyeY = Math.max(1.3, Math.min(1.8, size.y * 0.4));
    const distance = Math.max(2, Math.min(6, Math.max(size.x, size.z) * 0.35));
    const from = new THREE.Vector3(center.x - distance, eyeY, center.z - distance);
    (window as any).__lastCameraState = { position: [from.x, from.y, from.z], lookAt: [center.x, eyeY, center.z] };
    // also nudge current controls target if available
    const three = (require('@react-three/fiber') as any);
  }, []);
  const generateFloorTour = useCallback(() => {
    // Deterministic floor-only tour at 1.6m around the actual model center, INSIDE the bounds
    const bounds = (typeof window !== 'undefined') ? (window as any).__modelBounds as undefined | { center: [number, number, number]; size: [number, number, number]; min: [number, number, number]; max: [number, number, number] } : undefined;
    const center = bounds?.center || [0, 0, 0];
    const size = bounds?.size || [6, 3, 6];
    const min = bounds?.min || [-3, 0, -3];
    const max = bounds?.max || [3, 3, 3];
    const margin = 0.6; // keep camera inside by this margin
    const cx = center[0];
    const cz = center[2];
    const eyeY = (min[1] ?? 0) + 1.6;

    const halfXInside = Math.max(1, (size[0] / 2) - margin);
    const halfZInside = Math.max(1, (size[2] / 2) - margin);

    const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

    const nodes: TourPoint[] = [
      { id: `ft-0`, position: [clamp(cx - halfXInside, min[0] + margin, max[0] - margin), eyeY, clamp(cz - halfZInside, min[2] + margin, max[2] - margin)], lookAt: [cx, eyeY, cz] },
      { id: `ft-1`, position: [clamp(cx + halfXInside, min[0] + margin, max[0] - margin), eyeY, clamp(cz - halfZInside, min[2] + margin, max[2] - margin)], lookAt: [cx, eyeY, cz] },
      { id: `ft-2`, position: [clamp(cx + halfXInside, min[0] + margin, max[0] - margin), eyeY, clamp(cz + halfZInside, min[2] + margin, max[2] - margin)], lookAt: [cx, eyeY, cz] },
      { id: `ft-3`, position: [clamp(cx - halfXInside, min[0] + margin, max[0] - margin), eyeY, clamp(cz + halfZInside, min[2] + margin, max[2] - margin)], lookAt: [cx, eyeY, cz] }
    ];
    setTourPoints(nodes);
    setActiveTourIndex(0);
    setIsTourPlaying(true);
  }, []);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Load available furniture models
  useEffect(() => {
    if (!mounted) return;
    
    const loadFurnitureModels = async () => {
      setLoadingFurniture(true);
      try {
        const response = await fetch('/api/furniture');
        const data = await response.json();
        if (data.furniture) {
          setFurnitureModels(data.furniture);
        }
      } catch (error) {
        console.error('Failed to load furniture models:', error);
      } finally {
        setLoadingFurniture(false);
      }
    };

    loadFurnitureModels();
  }, [mounted]);

  // Define all callbacks before any conditional returns
  const handleFurnitureUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/furniture', {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Add the new furniture to the list
        setFurnitureModels(prev => [...prev, data.furniture]);
        setSelectedFurnitureModel(data.furniture);
        console.log('Furniture uploaded successfully:', data.furniture);
      } else {
        console.error('Upload failed:', data.error);
      }
    } catch (error) {
      console.error('Upload error:', error);
    }
  }, []);

  const handleDeleteFurnitureModel = useCallback(async (model: FurnitureModel) => {
    try {
      const response = await fetch(`/api/furniture?filename=${model.filename}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Remove from the list
        setFurnitureModels(prev => prev.filter(m => m.id !== model.id));
        if (selectedFurnitureModel?.id === model.id) {
          setSelectedFurnitureModel(null);
        }
        console.log('Furniture model deleted successfully');
      } else {
        console.error('Delete failed:', data.error);
      }
    } catch (error) {
      console.error('Delete error:', error);
    }
  }, [selectedFurnitureModel]);

  const handleModelColorChange = useCallback((color: string) => {
    setModelColor(color);
    if (typeof window !== 'undefined' && (window as any).setModelColor) {
      (window as any).setModelColor(color);
    }
  }, []);

  const handleFurnitureColorChange = useCallback((color: string) => {
    setFurnitureColor(color);
    if (selectedFurniture && typeof window !== 'undefined' && (window as any).updateFurnitureColor) {
      (window as any).updateFurnitureColor(selectedFurniture, color);
    }
  }, [selectedFurniture]);

  const deleteSelectedFurniture = useCallback(() => {
    if (selectedFurniture && typeof window !== 'undefined' && (window as any).removeFurniture) {
      (window as any).removeFurniture(selectedFurniture);
      setSelectedFurniture(null);
    }
  }, [selectedFurniture]);

  // Keyboard shortcuts for unselecting
  useEffect(() => {
    if (!mounted) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && selectedFurniture) {
        setSelectedFurniture(null);
      }
      if (event.key === 'Escape' && editMode) {
        setEditMode(false);
        setSelectedFurniture(null);
        setSelectedFurnitureModel(null);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [mounted, selectedFurniture, editMode]);

  // Do not early-return before hooks; show loader conditionally in JSX instead

  const toggleEditMode = () => setEditMode((v) => !v);

  const getCameraState = (): { position: [number, number, number]; lookAt: [number, number, number] } => {
    const def = { position: [3, 2, 3] as [number, number, number], lookAt: [0, 1.5, 0] as [number, number, number] };
    if (typeof window === 'undefined') return def as any;
    const cam = (window as any).__lastCameraState as undefined | { position: [number, number, number]; lookAt: [number, number, number] };
    if (!cam) return def;
    return cam;
  };

  const addTourPointFromCamera = () => {
    const cam = getCameraState();
    setTourPoints(prev => [...prev, { id: `tp-${Date.now()}`, position: cam.position, lookAt: cam.lookAt }]);
  };

  const createAutoTour = () => {
    // Create a comprehensive tour around the model
    // Use last camera state as center reference
    const cam = getCameraState();
    const center: [number, number, number] = [0, 0, 0];
    const eyeY = cam.position[1];
    const radius = 4; // conservative default
    const angles = [0, Math.PI/2, Math.PI, 3*Math.PI/2];
    const autoPoints = angles.map((a, i) => ({
      id: `auto-${Date.now()}-${i}`,
      position: [center[0] + Math.cos(a) * radius, eyeY, center[2] + Math.sin(a) * radius] as [number, number, number],
      lookAt: center
    }));

    setTourPoints(autoPoints);
    setActiveTourIndex(0);
    setIsTourPlaying(true);
  };

  const ensureSeedPoint = () => {
    if (tourPoints.length > 0) return true;
    const cam = getCameraState();
    setTourPoints([{ id: `tp-${Date.now()}`, position: cam.position, lookAt: cam.lookAt }]);
    return false; // seeded asynchronously; user can press Play again immediately
  };

  const startTourAt = (index: number) => {
    if (tourPoints.length < 2) {
      const seeded = ensureSeedPoint();
      if (!seeded) return; // wait for next click
      // Require at least 2 points for motion
      if (tourPoints.length + 1 < 2) return;
    }
    const i = Math.max(0, Math.min(index, tourPoints.length - 1));
    setActiveTourIndex(i);
    setIsTourPlaying(true);
  };

  const gotoNext = () => {
    if (tourPoints.length === 0) return;
    const last = tourPoints.length - 1;
    if (activeTourIndex >= last) {
      if (isTourLoop) return startTourAt(0);
      setIsTourPlaying(false);
      return;
    }
    startTourAt(activeTourIndex + 1);
  };
  const gotoPrev = () => {
    if (tourPoints.length === 0) return;
    if (activeTourIndex <= 0) {
      if (isTourLoop) return startTourAt(tourPoints.length - 1);
      setIsTourPlaying(false);
      return;
    }
    startTourAt(activeTourIndex - 1);
  };

  // Placement via 3D ground plane click (more reliable than DOM coords)
  const handlePlaceAtPoint = (point: { x: number; y: number; z: number }) => {
    if (!editMode || !selectedFurnitureModel || !mounted) return;
    const grid = 0.25;
    const floors = [0, 3, 6, 9, 12];
    const nearestFloor = floors.reduce((prev, cur) => Math.abs(cur - point.y) < Math.abs(prev - point.y) ? cur : prev, floors[0]);
    const position: [number, number, number] = [
      Math.round(point.x / grid) * grid,
      nearestFloor,
      Math.round(point.z / grid) * grid
    ];
    if (typeof window !== 'undefined' && (window as any).addFurniture) {
      (window as any).addFurniture(selectedFurnitureModel.path, position);
      console.log(`Placed ${selectedFurnitureModel.name} at:`, position);
      // Clear selection after placing one item
      setSelectedFurnitureModel(null);
      setTransformMode('translate');
    }
  };

  // Expose edit control functions to parent
  useEffect(() => {
    if (onEditControlsReady) {
      onEditControlsReady({
        modelColor,
        setModelColor,
        furnitureColor,
        setFurnitureColor,
        selectedFurniture,
        setSelectedFurniture,
        selectedFurnitureModel,
        setSelectedFurnitureModel,
        transformMode,
        setTransformMode,
        deleteSelectedFurniture,
        handleFurnitureUpload,
        handleDeleteFurnitureModel
      });
    }
  }, [
    modelColor, setModelColor, furnitureColor, setFurnitureColor,
    selectedFurniture, setSelectedFurniture, selectedFurnitureModel, setSelectedFurnitureModel,
    transformMode, setTransformMode, onEditControlsReady, deleteSelectedFurniture, handleFurnitureUpload, handleDeleteFurnitureModel
  ]);

  return (
    <div className="w-full h-[70vh] rounded-lg overflow-hidden border relative bg-white">
      {/* Main 3D View Area */}
      <div className="w-full h-full relative">
        {/* Control Buttons (walk removed) */}
        <div className="absolute z-10 right-3 top-3 flex gap-2"></div>

        {/* Walk mode removed */}

        {/* Edit Mode Status */}
        {editMode && (
          <div className="absolute z-10 left-3 top-12 bg-blue-50 border border-blue-200 px-3 py-2 rounded text-sm">
            <span className="text-blue-800 font-medium">Edit Mode Active</span>
            <p className="text-xs text-blue-600 mt-1">
              Click furniture to select • Use sidebar to edit
            </p>
          </div>
        )}

        <Canvas 
          camera={{ position: [6, 4, 6], fov: 60 }}
          style={{ cursor: editMode && selectedFurnitureModel ? 'crosshair' : 'default' }}
          shadows
          onPointerMissed={(e) => {
            if (e.type === 'pointerdown' && editMode) setSelectedFurniture(null);
          }}
          onPointerDown={() => setShowHints(false)}
        >
          {/* Keep latest camera state */}
          <FrameCapture />
          {/* Enhanced lighting for realistic rendering */}
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
          <hemisphereLight 
            args={["#87CEEB", "#8B4513", 0.3]} 
          />
          <Suspense fallback={<Html center>Loading model...</Html>}>
            <Model 
              url={url} 
              selectedFurniture={selectedFurniture}
              onFurnitureClick={setSelectedFurniture}
              transformMode={transformMode}
            />
            {/* Ground planes to place furniture accurately on multiple floors */}
            {editMode && (
              <GroundPlanes 
                onPlace={handlePlaceAtPoint} 
                isActive={!!selectedFurnitureModel}
                onUnselect={() => setSelectedFurniture(null)}
              />
            )}
                            
            {/* Visual floor indicators */}
            {editMode && (
              <>
                {[0, 3, 6, 9, 12].map((height) => (
                  <mesh
                    key={`floor-${height}`}
                    position={[0, height, 0]}
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
            {/* Tour removed */}
            <Environment preset="city" />
          </Suspense>
          {!firstPerson && (
          <OrbitControls 
              enableDamping 
              makeDefault 
              autoRotate={false}
            enableZoom={true}
            enableRotate={true} 
              mouseButtons={{ LEFT: MOUSE.ROTATE, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.PAN }}
              zoomSpeed={1.0}
            minDistance={0.2}
            maxDistance={200}
            enabled={!(typeof window !== 'undefined' && (window as any).__disableOrbit)}
          />)}
          {firstPerson && (
            <PointerLockControls selector="#enter-fp" />
          )}
          <FirstPersonWalk enabled={firstPerson} />
        </Canvas>
        {/* Simple controls */}
        <div className="absolute left-3 bottom-3 flex gap-3 items-center pointer-events-auto">
          <button id="enter-fp" className="px-3 py-1 text-xs rounded bg-indigo-600 text-white">{firstPerson ? 'Pointer Locked' : 'Enter 360'}</button>
          <label className="flex items-center gap-1 text-xs text-gray-700 select-none">
            <input type="checkbox" checked={firstPerson} onChange={(e) => setFirstPerson(e.target.checked)} /> 360 Walk
          </label>
          <button onClick={setInteriorView} className="px-3 py-1 text-xs rounded bg-gray-700 text-white">Reset View</button>
        </div>
        {/* Hints overlay */}
        {showHints && (
          <div className="absolute left-3 bottom-16 text-[11px] text-gray-700 bg-white/90 px-3 py-2 rounded shadow border">
            Drag to look • Click hotspots to move • Scroll to zoom
          </div>
        )}
        {/* ARIA live region for accessibility */}
        <div ref={ariaRef as any} aria-live="polite" className="sr-only" />
      </div>
    </div>
  );
}

function FrameCapture() {
  const { camera } = useThree();
  useFrame(() => {
    const THREE = require('three');
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    const look = dir.add(camera.position.clone());
    (window as any).__lastCameraState = {
      position: [camera.position.x, camera.position.y, camera.position.z],
      lookAt: [look.x, look.y, look.z]
    };
  });
  return null;
}

function AutoRecorder({ onTick }: { onTick: (state: { position: [number, number, number]; lookAt: [number, number, number] }) => void }) {
  const { camera } = useThree();
  const acc = useRef(0);
  useFrame((_, delta) => {
    acc.current += delta;
    if (acc.current >= 1.0) { // capture every 1s
      acc.current = 0;
      const THREE = require('three');
      const dir = new THREE.Vector3();
      camera.getWorldDirection(dir);
      const look = dir.add(camera.position.clone());
      onTick({
        position: [camera.position.x, camera.position.y, camera.position.z],
        lookAt: [look.x, look.y, look.z]
      });
    }
  });
  return null;
}

// Export with dynamic import to prevent SSR issues
const R3FViewer = dynamic(() => Promise.resolve(R3FViewerComponent), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[70vh] rounded-lg overflow-hidden border relative flex items-center justify-center bg-gray-100">
      <div className="text-gray-500">Loading 3D Viewer...</div>
    </div>
  )
});

export default R3FViewer;



