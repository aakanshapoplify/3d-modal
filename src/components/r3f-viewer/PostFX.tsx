"use client";
import { EffectComposer, Bloom, SSAO, Vignette } from "@react-three/postprocessing";
import { Color } from "three";

export default function PostFX() {
  return (
    <EffectComposer multisampling={4}>
      <Bloom intensity={0.15} luminanceThreshold={0.95} luminanceSmoothing={0.7} />
      <SSAO intensity={15} radius={3} luminanceInfluence={0.3} color={new Color(0x000000)} />
      <Vignette offset={0.5} darkness={0.3} eskil={false} />
    </EffectComposer>
  );
}



