"use client";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, TransformControls, useGLTF } from "@react-three/drei";
import { useState } from "react";

function Furniture({ path }: { path: string }) {
  const { scene } = useGLTF(path);
  return <primitive object={scene} scale={1} />;
}

export default function StagingEditor() {
  const [selected, setSelected] = useState<any>(null);

  return (
    <Canvas style={{ height: "600px" }}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} />
      <Furniture path="/models/sofa.glb" />
      <Furniture path="/models/chair.glb" />
      <Furniture path="/models/table.glb" />
      {selected && <TransformControls object={selected} />}
      <OrbitControls />
    </Canvas>
  );
}
