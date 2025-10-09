"use client";
import { FLOORS } from "./constants";

// Tracks the ground planes for placing objects.
// Tracks the surface coordinates 
export default function GroundPlanes({
  onPlace,
  isActive,
  onUnselect,
}: {
  onPlace: (point: { x: number; y: number; z: number }) => void;
  isActive: boolean;
  onUnselect: () => void;
}) {
  const floors = FLOORS;
  return (
    <>
      {floors.map((h) => (
        <mesh
          key={h}
          position={[0, h, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          onClick={(e: any) => {
            e.stopPropagation();
            if (isActive) {
              const p = e.point;
              onPlace({ x: p.x, y: h, z: p.z });
            } else {
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



