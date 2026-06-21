import { Canvas } from "@react-three/fiber";
import { OrbitControls, ContactShadows, Environment } from "@react-three/drei";
import Character from "./Character.jsx";

export default function Scene({ gesture }) {
  return (
    <Canvas
      className="scene-canvas"
      shadows
      dpr={[1, 2]}
      camera={{ position: [0, 1.6, 5], fov: 42 }}
    >
      {/* Lighting: soft ambient fill + a key light that casts shadows. */}
      <ambientLight intensity={0.55} />
      <hemisphereLight args={["#bcd4ff", "#2a1d3a", 0.5]} />
      <directionalLight
        position={[4, 6, 4]}
        intensity={1.6}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <directionalLight position={[-5, 3, -2]} intensity={0.4} color="#6fd6ff" />

      {/* The star of the show. */}
      <group position={[0, -1, 0]}>
        <Character gesture={gesture} />

        {/* Soft ground shadow so the figure feels grounded. */}
        <ContactShadows
          position={[0, 0.01, 0]}
          opacity={0.5}
          scale={8}
          blur={2.4}
          far={4}
        />
      </group>

      <Environment preset="city" />

      <OrbitControls
        enablePan={false}
        minDistance={3}
        maxDistance={8}
        minPolarAngle={0.4}
        maxPolarAngle={Math.PI / 2}
        target={[0, 0.6, 0]}
      />
    </Canvas>
  );
}
