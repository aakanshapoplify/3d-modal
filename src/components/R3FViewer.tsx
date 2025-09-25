"use client";
import { Suspense, useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment, Html, useGLTF, TransformControls, PointerLockControls } from "@react-three/drei";
import { DoubleSide, Color, Vector3, Group, MOUSE } from "three";
import dynamic from "next/dynamic";

function FirstPersonWalk({ enabled, floorY }: { enabled: boolean; floorY: number }) {
  const { camera } = useThree();
  const keys = useRef<Record<string, boolean>>({});
  const speedRef = useRef(0.06);

  useEffect(() => {
    if (!enabled) {
      // Clean up when exiting first-person mode
      keys.current = {};
      return;
    }
    
    const kd = (e: KeyboardEvent) => { keys.current[e.code] = true; };
    const ku = (e: KeyboardEvent) => { keys.current[e.code] = false; };
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);
    let raf = 0;
    const loop = () => {
      if (!enabled) return;
      const THREE = require('three');
      const dir = new THREE.Vector3();
      camera.getWorldDirection(dir);
      const forward = new THREE.Vector3(dir.x, 0, dir.z).normalize();
      const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize().negate();
      const speed = (keys.current['ShiftLeft'] || keys.current['ShiftRight']) ? speedRef.current * 2 : speedRef.current;
      const deltaMove = new THREE.Vector3();
      if (keys.current['KeyW'] || keys.current['ArrowUp']) deltaMove.add(forward.multiplyScalar(speed));
      if (keys.current['KeyS'] || keys.current['ArrowDown']) deltaMove.add(forward.multiplyScalar(-speed));
      if (keys.current['KeyA'] || keys.current['ArrowLeft']) deltaMove.add(right.multiplyScalar(-speed));
      if (keys.current['KeyD'] || keys.current['ArrowRight']) deltaMove.add(right.multiplyScalar(speed));
      camera.position.add(deltaMove);

      const b = (typeof window !== 'undefined') ? (window as any).__modelBounds : undefined;
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
      window.removeEventListener('keydown', kd); 
      window.removeEventListener('keyup', ku);
      keys.current = {}; // Clear keys when component unmounts
    };
  }, [enabled, camera, floorY]);

  return null;
}

interface FurnitureModel {
  id: string;
  name: string;
  filename: string;
  path: string;
}

interface FurnitureItem {
  id: string;
  type: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  color: string;
}

function Furniture({ item, isSelected, onClick, onReady }: { 
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

  useEffect(() => { if (groupRef.current && onReady) onReady(groupRef.current); }, [groupRef.current, onReady]);
  useEffect(() => { if (groupRef.current && onReady) onReady(groupRef.current); }, [isSelected, onReady]);

  return (
    <group ref={groupRef} position={item.position} rotation={item.rotation} scale={item.scale} onClick={onClick}>
      {decoratedScene ? <group ref={modelRef} /> : (
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

function GroundPlanes({ onPlace, isActive, onUnselect }: { 
  onPlace: (point: { x: number; y: number; z: number }) => void; 
  isActive: boolean;
  onUnselect: () => void;
}) {
  const floors = [0, 3, 6, 9, 12];
  return (
    <>
      {floors.map((h) => (
        <mesh key={h} position={[0, h, 0]} rotation={[-Math.PI / 2, 0, 0]}
          onClick={(e: any) => {
            e.stopPropagation();
            if (isActive) {
              const p = e.point; onPlace({ x: p.x, y: h, z: p.z });
            } else { onUnselect(); }
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
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls as any);
  const viewport = useThree((s) => s.size);
  const gltf = useGLTF(url);
  const [furniture, setFurniture] = useState<FurnitureItem[]>([]);
  const [modelColor, setModelColor] = useState('#b0bec5');
  const idToObjectRef = useRef<Record<string, Group>>({});

  useEffect(() => {
    if (!gltf?.scene) return;
    gltf.scene.traverse((obj: any) => {
      if (obj.isMesh && obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach((m: any) => {
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

  useEffect(() => {
    if (!gltf?.scene || !camera) return;
    const THREE = require('three');
    const box = new THREE.Box3().setFromObject(gltf.scene);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    if (typeof window !== 'undefined') {
      (window as any).__modelBounds = {
        center: [center.x, center.y, center.z],
        size: [size.x, size.y, size.z],
        min: [box.min.x, box.min.y, box.min.z],
        max: [box.max.x, box.max.y, box.max.z]
      };
    }

    const fovDeg: number = (camera as any).fov != null ? (camera as any).fov : 60;
    const fov = fovDeg * Math.PI / 180;
    const halfY = size.y / 2;
    const halfX = size.x / 2;
    const aspect = Math.max(0.1, viewport.width / Math.max(1, viewport.height));
    const fitHeightDistance = halfY / Math.tan(fov / 2);
    const fitWidthDistance = halfX / (Math.tan(fov / 2) * aspect);
    let distance = Math.max(fitHeightDistance, fitWidthDistance) * 1.3;

    const eyeY = box.min.y + Math.min(1.7, Math.max(1.4, size.y * 0.35));
    const dir = new THREE.Vector3(1, 0, 1).normalize();
    const newPos = new THREE.Vector3(center.x, eyeY, center.z).add(dir.multiplyScalar(distance));
    camera.position.copy(newPos);
    (camera as any).near = Math.max(0.01, distance / 100);
    (camera as any).far = Math.max(500, distance * 200);
    (camera as any).updateProjectionMatrix?.();
    if (controls?.target) {
      controls.target.set(center.x, eyeY, center.z);
      if (typeof controls.minDistance === 'number') controls.minDistance = distance * 0.1;
      if (typeof controls.maxDistance === 'number') controls.maxDistance = distance * 10;
      controls.update?.();
    }
  }, [gltf, camera, controls, viewport]);

  const addFurniture = (modelPath: string, position: [number, number, number]) => {
    if (!modelPath) return;
    const newItem: FurnitureItem = {
      id: `furniture-${Date.now()}`,
      type: modelPath,
      position,
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      color: '#8B4513'
    };
    setFurniture(prev => [...prev, newItem]);
  };
  const removeFurniture = (id: string) => setFurniture(prev => prev.filter(i => i.id !== id));
  const updateFurnitureColor = (id: string, color: string) => setFurniture(prev => prev.map(i => i.id === id ? { ...i, color } : i));
  const updateFurnitureTransform = (id: string, t: { position: [number, number, number]; rotation: [number, number, number]; scale: [number, number, number] }) => {
    setFurniture(prev => prev.map(i => i.id === id ? { ...i, ...t } : i));
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).addFurniture = addFurniture;
      (window as any).removeFurniture = removeFurniture;
      (window as any).updateFurnitureColor = updateFurnitureColor;
      (window as any).updateFurnitureTransform = updateFurnitureTransform;
      (window as any).setModelColor = (c: string) => setModelColor(c);
    }
  }, []);

  return (
    <group ref={group}>
      <primitive object={gltf.scene} />
      {furniture.map(item => (
        <Furniture
          key={item.id}
          item={item}
          isSelected={selectedFurniture === item.id}
          onClick={() => onFurnitureClick(item.id)}
          onReady={(obj) => { idToObjectRef.current[item.id] = obj; }}
        />
      ))}
      {selectedFurniture && idToObjectRef.current[selectedFurniture] && transformMode !== 'none' && (
        <TransformControls
          object={idToObjectRef.current[selectedFurniture]}
          mode={transformMode}
          showX showY showZ
          translationSnap={0.25}
          rotationSnap={Math.PI / 12}
          scaleSnap={0.1}
          space="world"
          size={2}
          onMouseDown={() => { if (typeof window !== 'undefined') (window as any).__disableOrbit = true; }}
          onMouseUp={() => {
            if (typeof window !== 'undefined') (window as any).__disableOrbit = false;
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
            const obj = idToObjectRef.current[selectedFurniture];
            if (!obj) return;
            const grid = 0.25;
            obj.position.x = Math.round(obj.position.x / grid) * grid;
            obj.position.z = Math.round(obj.position.z / grid) * grid;
            const floors = [0, 3, 6, 9, 12];
            const nearestFloor = floors.reduce((p, c) => Math.abs(c - obj.position.y) < Math.abs(p - obj.position.y) ? c : p, floors[0]);
            obj.position.y = nearestFloor;
          }}
        />
      )}
    </group>
  );
}

function FrameCapture() {
  const { camera } = useThree();
  useFrame(() => {
    const THREE = require('three');
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    const look = dir.add((camera as any).position.clone());
    (window as any).__lastCameraState = {
      position: [(camera as any).position.x, (camera as any).position.y, (camera as any).position.z],
      lookAt: [look.x, look.y, look.z]
    };
  });
  return null;
}

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
  const [selectedFurniture, setSelectedFurniture] = useState<string | null>(null);
  const [selectedFurnitureModel, setSelectedFurnitureModel] = useState<FurnitureModel | null>(null);
  const [modelColor, setModelColor] = useState('#b0bec5');
  const [furnitureColor, setFurnitureColor] = useState('#8B4513');
  const [mounted, setMounted] = useState(false);
  const [furnitureModels, setFurnitureModels] = useState<FurnitureModel[]>([]);
  const [loadingFurniture, setLoadingFurniture] = useState(false);
  const [transformMode, setTransformMode] = useState<'none' | 'translate' | 'rotate' | 'scale'>('none');
  const [showHints, setShowHints] = useState(true);
  const [firstPerson, setFirstPerson] = useState(false);
  const [walkFloorIdx, setWalkFloorIdx] = useState(0);
  const ariaRef = useRef<HTMLDivElement | null>(null);

  const floors = [0, 3, 6, 9, 12];
  const currentFloorY = Math.max(0, floors[Math.max(0, Math.min(walkFloorIdx, floors.length - 1))]) + 1.6;

  useEffect(() => { setMounted(true); }, []);

  // Reset controls when exiting first-person mode
  useEffect(() => {
    if (!firstPerson && typeof window !== 'undefined') {
      // Clear any disable flags when exiting first-person mode
      (window as any).__disableOrbit = false;
    }
  }, [firstPerson]);

  useEffect(() => {
    if (!mounted) return;
    const load = async () => {
      setLoadingFurniture(true);
      try {
        const res = await fetch('/api/furniture');
        const data = await res.json();
        if (data.furniture) setFurnitureModels(data.furniture);
      } catch (e) {
        console.error('Failed to load furniture models:', e);
      } finally { setLoadingFurniture(false); }
    };
    load();
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedFurniture) setSelectedFurniture(null);
      if (e.key === 'Escape' && editMode) {
        setEditMode(false);
        setSelectedFurniture(null);
        setSelectedFurnitureModel(null);
      }
      if (firstPerson) {
        if (e.code === 'PageUp') setWalkFloorIdx((i) => Math.min(i + 1, floors.length - 1));
        if (e.code === 'PageDown') setWalkFloorIdx((i) => Math.max(i - 1, 0));
        if (e.code === 'Digit0') setWalkFloorIdx(0);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [mounted, selectedFurniture, editMode, setEditMode, firstPerson]);

  const handleFurnitureUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/furniture', { method: 'POST', body: formData });
      const data = await response.json();
      if (data.success) {
        setFurnitureModels(prev => [...prev, data.furniture]);
        setSelectedFurnitureModel(data.furniture);
      } else {
        console.error('Upload failed:', data.error);
      }
    } catch (error) {
      console.error('Upload error:', error);
    }
  }, []);

  const handleDeleteFurnitureModel = useCallback(async (model: FurnitureModel) => {
    try {
      const response = await fetch(`/api/furniture?filename=${model.filename}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        setFurnitureModels(prev => prev.filter(m => m.id !== model.id));
        if (selectedFurnitureModel?.id === model.id) setSelectedFurnitureModel(null);
      } else {
        console.error('Delete failed:', data.error);
      }
    } catch (error) {
      console.error('Delete error:', error);
    }
  }, [selectedFurnitureModel]);

  const handleModelColorChange = useCallback((color: string) => {
    setModelColor(color);
    if (typeof window !== 'undefined' && (window as any).setModelColor) (window as any).setModelColor(color);
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

  const handlePlaceAtPoint = (point: { x: number; y: number; z: number }) => {
    if (!editMode || !selectedFurnitureModel || !mounted) return;
    const grid = 0.25;
    const floorsLocal = [0, 3, 6, 9, 12];
    const nearestFloor = floorsLocal.reduce((prev, cur) => Math.abs(cur - point.y) < Math.abs(prev - point.y) ? cur : prev, floorsLocal[0]);
    const position: [number, number, number] = [
      Math.round(point.x / grid) * grid,
      nearestFloor,
      Math.round(point.z / grid) * grid
    ];
    if (typeof window !== 'undefined' && (window as any).addFurniture) {
      (window as any).addFurniture(selectedFurnitureModel.path, position);
      setSelectedFurnitureModel(null);
      setTransformMode('translate');
    }
  };

  useEffect(() => {
    if (onEditControlsReady) {
      onEditControlsReady({
        modelColor, setModelColor: handleModelColorChange,
        furnitureColor, setFurnitureColor: handleFurnitureColorChange,
        selectedFurniture, setSelectedFurniture,
        selectedFurnitureModel, setSelectedFurnitureModel,
        transformMode, setTransformMode,
        deleteSelectedFurniture,
        handleFurnitureUpload,
        handleDeleteFurnitureModel
      });
    }
  }, [
    modelColor, handleModelColorChange, furnitureColor, handleFurnitureColorChange,
    selectedFurniture, selectedFurnitureModel, transformMode,
    deleteSelectedFurniture, handleFurnitureUpload, handleDeleteFurnitureModel, onEditControlsReady
  ]);

  return (
    <div className="w-full h-[70vh] rounded-lg overflow-hidden border relative bg-white">
      <div className="w-full h-full relative">
        <Canvas 
          camera={{ position: [6, 4, 6], fov: 60 }}
          style={{ cursor: editMode && selectedFurnitureModel ? 'crosshair' : 'default' }}
          shadows
          onPointerMissed={(e) => { if (e.type === 'pointerdown' && editMode) setSelectedFurniture(null); }}
          onPointerDown={() => setShowHints(false)}
        >
          <FrameCapture />
          <ambientLight intensity={0.4} />
          <directionalLight position={[10, 20, 10]} intensity={1.2} castShadow shadow-mapSize={[2048, 2048]} shadow-camera-far={50} shadow-camera-left={-20} shadow-camera-right={20} shadow-camera-top={20} shadow-camera-bottom={-20} />
          <pointLight position={[-10, 10, -10]} intensity={0.5} />
          <hemisphereLight args={["#87CEEB", "#8B4513", 0.3]} />
          <Suspense fallback={<Html center>Loading model...</Html>}>
            <Model 
              url={url} 
              selectedFurniture={selectedFurniture}
              onFurnitureClick={setSelectedFurniture}
              transformMode={transformMode}
            />
            {editMode && (
              <GroundPlanes onPlace={handlePlaceAtPoint} isActive={!!selectedFurnitureModel} onUnselect={() => setSelectedFurniture(null)} />
            )}
            {editMode && (
              <>
                {[0, 3, 6, 9, 12].map((h) => (
                  <mesh key={`floor-${h}`} position={[0, h, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                    <planeGeometry args={[20, 20]} />
                    <meshStandardMaterial color="#f0f0f0" transparent opacity={0.3} side={DoubleSide} />
                  </mesh>
                ))}
              </>
            )}
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
              key={firstPerson ? 'disabled' : 'enabled'} // Force re-mount when switching modes
            />
          )}
          {firstPerson && (
            <PointerLockControls selector="#enter-fp" />
          )}
          <FirstPersonWalk enabled={firstPerson} floorY={currentFloorY} />
        </Canvas>
        <div className="absolute left-3 bottom-3 flex gap-3 items-center pointer-events-auto">
          <button id="enter-fp" className="px-3 py-1 text-xs rounded bg-indigo-600 text-white">{firstPerson ? 'Pointer Locked' : 'Enter 360'}</button>
          <label className="flex items-center gap-1 text-xs text-gray-700 select-none">
            <input type="checkbox" checked={firstPerson} onChange={(e) => setFirstPerson(e.target.checked)} /> 360 Walk
          </label>
          {firstPerson && (
            <>
              <button onClick={() => setWalkFloorIdx((i) => Math.max(i - 1, 0))} className="px-2 py-1 text-xs rounded bg-gray-200">Floor -</button>
              <button onClick={() => setWalkFloorIdx((i) => Math.min(i + 1, floors.length - 1))} className="px-2 py-1 text-xs rounded bg-gray-200">Floor +</button>
              <button onClick={() => setWalkFloorIdx(0)} className="px-2 py-1 text-xs rounded bg-gray-700 text-white">Ground</button>
            </>
          )}
        </div>
        {showHints && (
          <div className="absolute left-3 bottom-16 text-[11px] text-gray-700 bg-white/90 px-3 py-2 rounded shadow border">
            Drag to look • Scroll to zoom • 360 Walk: WASD
            <br />Use Floor+/Floor- or PageUp/PageDown • 0 = Ground
          </div>
        )}
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
  )
});

export default R3FViewer;



