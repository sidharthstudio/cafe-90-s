import { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Sparkles } from "@react-three/drei";
import type { Group } from "three";

function Blob({ color, position, radius, roughness = 0.28, metalness = 0.45 }: {
  color: string;
  position: [number, number, number];
  radius: number;
  roughness?: number;
  metalness?: number;
}) {
  return (
    <Float speed={1.4} rotationIntensity={0.5} floatIntensity={1.1}>
      <mesh position={position} castShadow>
        <sphereGeometry args={[radius, 48, 48]} />
        <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} />
      </mesh>
    </Float>
  );
}

function Scene() {
  const group = useRef<Group>(null);

  useFrame((state, delta) => {
    if (!group.current) return;
    group.current.rotation.y += delta * 0.18;
    const px = state.pointer.x * 0.35;
    const py = state.pointer.y * 0.28;
    group.current.rotation.x += (py - group.current.rotation.x) * 0.05;
    group.current.position.x += (px - group.current.position.x) * 0.05;
  });

  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight position={[4, 6, 5]} intensity={2.1} color="#ffe6bf" />
      <directionalLight position={[-5, -2, 3]} intensity={1.1} color="#ff8fb0" />
      <pointLight position={[0, -3, 2]} intensity={2.2} color="#27c2b3" distance={9} />

      <group ref={group}>
        <Float speed={1.1} rotationIntensity={0.7} floatIntensity={0.8}>
          <mesh rotation={[0.7, 0.3, 0.2]}>
            <torusGeometry args={[1.45, 0.45, 48, 96]} />
            <meshStandardMaterial color="#f0a63c" roughness={0.3} metalness={0.65} />
          </mesh>
        </Float>
        <Blob color="#e2542c" position={[-1.9, -1.15, 0.4]} radius={0.62} metalness={0.3} />
        <Blob color="#24c0b0" position={[1.85, 1.15, -0.4]} radius={0.42} roughness={0.15} metalness={0.7} />
        <Blob color="#fff3dd" position={[1.5, -1.5, 0.8]} radius={0.28} roughness={0.55} metalness={0.1} />

        <Float speed={2} rotationIntensity={1.4} floatIntensity={1.4}>
          <mesh position={[-1.55, 1.55, 0.2]} rotation={[0.9, 0.2, 0.4]}>
            <torusGeometry args={[0.34, 0.12, 24, 64]} />
            <meshStandardMaterial color="#ff4f87" roughness={0.25} metalness={0.5} />
          </mesh>
        </Float>
      </group>

      <Sparkles count={38} scale={7} size={2.6} speed={0.32} color="#ffd39b" opacity={0.7} />
    </>
  );
}

const CanvasFallback = () => (
  <div className="absolute inset-0 grid place-items-center">
    <div className="h-56 w-56 rounded-full bg-gradient-to-br from-amber via-chili to-pink opacity-70 blur-2xl" />
  </div>
);

export default function Hero3D() {
  return (
    <div className="absolute inset-0" aria-hidden="true">
      <Suspense fallback={<CanvasFallback />}>
        <Canvas
          dpr={[1, 1.7]}
          camera={{ position: [0, 0, 6.4], fov: 42 }}
          gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
          style={{ background: "transparent" }}
        >
          <Scene />
        </Canvas>
      </Suspense>
    </div>
  );
}

