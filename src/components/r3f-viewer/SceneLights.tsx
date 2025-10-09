"use client";
import { Environment } from "@react-three/drei";

export default function SceneLights() {
  return (
    <>
      <ambientLight intensity={0.5} />
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
      <directionalLight position={[-5, 10, -5]} intensity={0.4} color="#b8d4ff" />
      <spotLight position={[0, 15, -10]} angle={0.3} penumbra={1} intensity={0.5} castShadow color="#ffd4a3" />
      <pointLight position={[-10, 5, -10]} intensity={0.3} color="#ff9a76" distance={20} />
      <pointLight position={[10, 5, 10]} intensity={0.3} color="#76b6ff" distance={20} />
      <hemisphereLight args={["#ffffff", "#8B7355", 0.4]} />
      <Environment preset="sunset" background={false} blur={0} />
    </>
  );
}



