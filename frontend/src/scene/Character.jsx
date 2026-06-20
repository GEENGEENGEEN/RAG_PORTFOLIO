import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// Palette for the low-poly figure. Tweak to restyle the avatar.
const SKIN = "#e8b58c";
const HAIR = "#3a2a22";
const SHIRT = "#5b8def";
const PANTS = "#34406b";
const SHOES = "#222838";
const PAPER = "#fdf6e3";

/**
 * A procedurally built low-poly humanoid. Everything is made of Three.js
 * primitives with flat shading for the faceted look. Two animations:
 *   - idle: gentle breathing + head bob + sway
 *   - handing: the right arm raises forward holding a paper (gesture prop)
 */
export default function Character({ gesture }) {
  const root = useRef();
  const head = useRef();
  const rightArm = useRef(); // shoulder pivot for the gesture
  const leftArm = useRef();
  const paper = useRef();

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;

    // --- Idle motion -------------------------------------------------------
    if (root.current) {
      root.current.rotation.y = Math.sin(t * 0.4) * 0.12; // slow sway
      root.current.position.y = Math.sin(t * 1.6) * 0.02; // subtle bob
    }
    if (head.current) {
      head.current.rotation.z = Math.sin(t * 0.8) * 0.04;
      head.current.rotation.x = Math.sin(t * 1.2) * 0.03;
    }
    if (leftArm.current) {
      leftArm.current.rotation.x = Math.sin(t * 1.3) * 0.05;
    }

    // --- Gesture: extend the right arm to "hand a paper" -------------------
    const handing = gesture === "handing";
    if (rightArm.current) {
      // Arm hangs at ~0 when idle; rotates forward (~ -1.4 rad) when handing.
      const targetX = handing ? -1.45 : Math.sin(t * 1.3 + 1) * 0.05;
      const targetZ = handing ? 0.25 : 0;
      rightArm.current.rotation.x = THREE.MathUtils.lerp(
        rightArm.current.rotation.x,
        targetX,
        delta * 4
      );
      rightArm.current.rotation.z = THREE.MathUtils.lerp(
        rightArm.current.rotation.z,
        targetZ,
        delta * 4
      );
    }

    // Fade/scale the paper in only while handing.
    if (paper.current) {
      const target = handing ? 1 : 0;
      const s = THREE.MathUtils.lerp(paper.current.scale.x, target, delta * 6);
      paper.current.scale.setScalar(s);
      paper.current.visible = s > 0.02;
    }
  });

  return (
    <group ref={root} position={[0, 0.06, 0]}>
      {/* ---------------- Head ---------------- */}
      <group ref={head} position={[0, 2.05, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.62, 0.66, 0.6]} />
          <meshStandardMaterial color={SKIN} flatShading />
        </mesh>
        {/* Hair cap */}
        <mesh position={[0, 0.28, -0.02]} castShadow>
          <boxGeometry args={[0.66, 0.28, 0.66]} />
          <meshStandardMaterial color={HAIR} flatShading />
        </mesh>
        {/* Eyes */}
        <mesh position={[0.16, 0.02, 0.31]}>
          <boxGeometry args={[0.1, 0.1, 0.04]} />
          <meshStandardMaterial color="#1b1b25" flatShading />
        </mesh>
        <mesh position={[-0.16, 0.02, 0.31]}>
          <boxGeometry args={[0.1, 0.1, 0.04]} />
          <meshStandardMaterial color="#1b1b25" flatShading />
        </mesh>
      </group>

      {/* ---------------- Neck ---------------- */}
      <mesh position={[0, 1.66, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.14, 0.18, 6]} />
        <meshStandardMaterial color={SKIN} flatShading />
      </mesh>

      {/* ---------------- Torso ---------------- */}
      <mesh position={[0, 1.18, 0]} castShadow>
        <boxGeometry args={[0.86, 0.92, 0.5]} />
        <meshStandardMaterial color={SHIRT} flatShading />
      </mesh>
      {/* Hips */}
      <mesh position={[0, 0.62, 0]} castShadow>
        <boxGeometry args={[0.8, 0.34, 0.48]} />
        <meshStandardMaterial color={PANTS} flatShading />
      </mesh>

      {/* ---------------- Right arm (gesture pivot at shoulder) -------- */}
      <group ref={rightArm} position={[0.55, 1.55, 0]}>
        {/* Upper + forearm extend downward from the pivot. */}
        <mesh position={[0, -0.42, 0]} castShadow>
          <boxGeometry args={[0.2, 0.84, 0.22]} />
          <meshStandardMaterial color={SHIRT} flatShading />
        </mesh>
        <mesh position={[0, -0.92, 0]} castShadow>
          <boxGeometry args={[0.18, 0.36, 0.2]} />
          <meshStandardMaterial color={SKIN} flatShading />
        </mesh>
        {/* Hand */}
        <mesh position={[0, -1.14, 0]} castShadow>
          <boxGeometry args={[0.2, 0.2, 0.22]} />
          <meshStandardMaterial color={SKIN} flatShading />
        </mesh>
        {/* Paper held in the hand; appears during the handing gesture. */}
        <group ref={paper} position={[0, -1.2, 0.18]} scale={0}>
          <mesh rotation={[Math.PI / 2.4, 0, 0]}>
            <planeGeometry args={[0.5, 0.66]} />
            <meshStandardMaterial
              color={PAPER}
              side={THREE.DoubleSide}
              flatShading
            />
          </mesh>
          {/* a couple of "text" lines on the paper */}
          <mesh position={[0, 0.04, 0.18]} rotation={[Math.PI / 2.4, 0, 0]}>
            <planeGeometry args={[0.34, 0.03]} />
            <meshStandardMaterial color="#888" side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, -0.04, 0.12]} rotation={[Math.PI / 2.4, 0, 0]}>
            <planeGeometry args={[0.34, 0.03]} />
            <meshStandardMaterial color="#888" side={THREE.DoubleSide} />
          </mesh>
        </group>
      </group>

      {/* ---------------- Left arm ---------------- */}
      <group ref={leftArm} position={[-0.55, 1.55, 0]}>
        <mesh position={[0, -0.42, 0]} castShadow>
          <boxGeometry args={[0.2, 0.84, 0.22]} />
          <meshStandardMaterial color={SHIRT} flatShading />
        </mesh>
        <mesh position={[0, -0.92, 0]} castShadow>
          <boxGeometry args={[0.18, 0.36, 0.2]} />
          <meshStandardMaterial color={SKIN} flatShading />
        </mesh>
        <mesh position={[0, -1.14, 0]} castShadow>
          <boxGeometry args={[0.2, 0.2, 0.22]} />
          <meshStandardMaterial color={SKIN} flatShading />
        </mesh>
      </group>

      {/* ---------------- Legs ---------------- */}
      <group position={[0.22, 0.42, 0]}>
        <mesh position={[0, -0.2, 0]} castShadow>
          <boxGeometry args={[0.26, 0.84, 0.28]} />
          <meshStandardMaterial color={PANTS} flatShading />
        </mesh>
        <mesh position={[0, -0.68, 0.06]} castShadow>
          <boxGeometry args={[0.28, 0.16, 0.42]} />
          <meshStandardMaterial color={SHOES} flatShading />
        </mesh>
      </group>
      <group position={[-0.22, 0.42, 0]}>
        <mesh position={[0, -0.2, 0]} castShadow>
          <boxGeometry args={[0.26, 0.84, 0.28]} />
          <meshStandardMaterial color={PANTS} flatShading />
        </mesh>
        <mesh position={[0, -0.68, 0.06]} castShadow>
          <boxGeometry args={[0.28, 0.16, 0.42]} />
          <meshStandardMaterial color={SHOES} flatShading />
        </mesh>
      </group>
    </group>
  );
}
