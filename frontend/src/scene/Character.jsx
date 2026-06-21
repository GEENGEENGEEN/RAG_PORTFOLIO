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
 * primitives with flat shading for the faceted look. Driven by the `gesture`
 * prop:
 *   - idle:    gentle breathing + head bob + sway
 *   - handing: the right arm raises forward holding a paper
 *   - wave:    the right arm raises to the side and rocks
 *   - walk:    legs and arms swing in-place at a relaxed pace
 *   - run:     faster, larger swings with a forward lean and bigger bob
 */
export default function Character({ gesture }) {
  const root = useRef();
  const head = useRef();
  const rightArm = useRef(); // shoulder pivot for the gesture
  const rightElbow = useRef(); // elbow pivot (forearm + hand)
  const rightWrist = useRef(); // wrist pivot (hand + paper)
  const leftArm = useRef();
  const leftElbow = useRef();
  const leftWrist = useRef();
  const rightLeg = useRef(); // hip pivots for walk/run
  const leftLeg = useRef();
  const paper = useRef();

  // Blend factors so action gestures ease in/out instead of snapping.
  const moveBlend = useRef(0); // walk / run
  const waveBlend = useRef(0);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;

    const run = gesture === "run";
    const walk = gesture === "walk";
    const moving = run || walk;
    const handing = gesture === "handing";
    const wave = gesture === "wave";

    // Pace/amplitude differ between walking and running.
    const freq = run ? 11 : 6;
    const legSwing = run ? 0.9 : 0.5;
    const armSwing = run ? 0.8 : 0.45;

    // Ease gestures in/out so transitions blend rather than snap.
    moveBlend.current = THREE.MathUtils.lerp(
      moveBlend.current,
      moving ? 1 : 0,
      delta * 6
    );
    waveBlend.current = THREE.MathUtils.lerp(
      waveBlend.current,
      wave ? 1 : 0,
      delta * 6
    );
    const mb = moveBlend.current;
    const wb = waveBlend.current;

    // --- Root: sway + bob, plus a forward lean while moving ----------------
    if (root.current) {
      root.current.rotation.y = Math.sin(t * 0.4) * 0.12 * (1 - mb); // slow sway
      const idleBob = Math.sin(t * 1.6) * 0.02;
      const moveBob = Math.abs(Math.sin(t * freq)) * (run ? 0.1 : 0.05);
      root.current.position.y = idleBob * (1 - mb) + moveBob * mb;
      const leanTarget = run ? 0.18 : walk ? 0.08 : 0;
      root.current.rotation.x = THREE.MathUtils.lerp(
        root.current.rotation.x,
        leanTarget,
        delta * 4
      );
    }
    if (head.current) {
      head.current.rotation.z = Math.sin(t * 0.8) * 0.04;
      head.current.rotation.x = Math.sin(t * 1.2) * 0.03;
    }

    // --- Legs: alternating swing from the hips while walking/running -------
    if (rightLeg.current) {
      rightLeg.current.rotation.x = Math.sin(t * freq) * legSwing * mb;
    }
    if (leftLeg.current) {
      leftLeg.current.rotation.x = Math.sin(t * freq + Math.PI) * legSwing * mb;
    }

    // Helper: ease a joint's rotation channel toward a target this frame.
    const ease = (obj, axis, target, rate = 8) => {
      obj.rotation[axis] = THREE.MathUtils.lerp(
        obj.rotation[axis],
        target,
        delta * rate
      );
    };

    // --- Left arm: idle sway, or counter-swing while moving ----------------
    if (leftArm.current) {
      const idle = Math.sin(t * 1.3) * 0.05;
      const swing = Math.sin(t * freq) * armSwing; // opposite phase to left leg
      leftArm.current.rotation.x = idle * (1 - mb) + swing * mb;
    }
    // Forearm follows the upper arm's swing with a slight lag/bend while moving.
    if (leftElbow.current) {
      const bend = (0.25 + Math.max(0, Math.sin(t * freq)) * 0.5) * mb;
      ease(leftElbow.current, "z", bend);
      ease(leftElbow.current, "x", 0);
    }
    if (leftWrist.current) {
      ease(leftWrist.current, "z", 0);
    }

    // --- Right arm: handing pose, wave, move counter-swing, or idle --------
    if (rightArm.current) {
      const idleX = Math.sin(t * 1.3 + 1) * 0.05;
      const swingX = Math.sin(t * freq + Math.PI) * armSwing;
      const baseX = idleX * (1 - mb) + swingX * mb;

      if (handing) {
        // Hand-off pose: arm forward holding the paper.
        ease(rightArm.current, "x", -1.45, 4);
        ease(rightArm.current, "z", 0.25, 4);
      } else {
        // Raise the upper arm to the side; the wave itself happens at the
        // elbow/wrist below.
        const targetX = baseX * (1 - wb);
        const targetZ = 2.0 * wb;
        ease(rightArm.current, "x", targetX);
        ease(rightArm.current, "z", targetZ);
      }
    }

    // Right elbow: drives the actual side-to-side wave, a slight presentation
    // bend while handing, a follow-swing while moving, else neutral.
    if (rightElbow.current) {
      let targetZ = 0;
      let targetX = 0;
      if (wb > 0.001) {
        targetZ = (0.3 + Math.sin(t * 12) * 0.6) * wb;
      } else if (handing) {
        targetZ = 0.3;
      } else if (mb > 0.001) {
        targetZ = (0.25 + Math.max(0, Math.sin(t * freq + Math.PI)) * 0.5) * mb;
      }
      ease(rightElbow.current, "z", targetZ);
      ease(rightElbow.current, "x", targetX);
    }

    // Right wrist: a subtle flick that trails the wave for a natural feel.
    if (rightWrist.current) {
      const targetZ = wb > 0.001 ? Math.sin(t * 12 + 0.5) * 0.25 * wb : 0;
      ease(rightWrist.current, "z", targetZ);
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

      {/* ---------------- Right arm (shoulder -> elbow -> wrist) -------- */}
      <group ref={rightArm} position={[0.55, 1.55, 0]}>
        {/* Upper arm (sleeve) */}
        <mesh position={[0, -0.27, 0]} castShadow>
          <boxGeometry args={[0.2, 0.5, 0.22]} />
          <meshStandardMaterial color={SHIRT} flatShading />
        </mesh>

        {/* Elbow pivot */}
        <group ref={rightElbow} position={[0, -0.54, 0]}>
          {/* Forearm */}
          <mesh position={[0, -0.25, 0]} castShadow>
            <boxGeometry args={[0.18, 0.42, 0.2]} />
            <meshStandardMaterial color={SKIN} flatShading />
          </mesh>

          {/* Wrist pivot */}
          <group ref={rightWrist} position={[0, -0.5, 0]}>
            {/* Hand */}
            <mesh position={[0, -0.13, 0]} castShadow>
              <boxGeometry args={[0.2, 0.2, 0.22]} />
              <meshStandardMaterial color={SKIN} flatShading />
            </mesh>

            {/* Paper held in the hand; appears during the handing gesture. */}
            <group ref={paper} position={[0, -0.2, 0.18]} scale={0}>
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
        </group>
      </group>

      {/* ---------------- Left arm (shoulder -> elbow -> wrist) -------- */}
      <group ref={leftArm} position={[-0.55, 1.55, 0]}>
        {/* Upper arm (sleeve) */}
        <mesh position={[0, -0.27, 0]} castShadow>
          <boxGeometry args={[0.2, 0.5, 0.22]} />
          <meshStandardMaterial color={SHIRT} flatShading />
        </mesh>

        {/* Elbow pivot */}
        <group ref={leftElbow} position={[0, -0.54, 0]}>
          {/* Forearm */}
          <mesh position={[0, -0.25, 0]} castShadow>
            <boxGeometry args={[0.18, 0.42, 0.2]} />
            <meshStandardMaterial color={SKIN} flatShading />
          </mesh>

          {/* Wrist pivot */}
          <group ref={leftWrist} position={[0, -0.5, 0]}>
            {/* Hand */}
            <mesh position={[0, -0.13, 0]} castShadow>
              <boxGeometry args={[0.2, 0.2, 0.22]} />
              <meshStandardMaterial color={SKIN} flatShading />
            </mesh>
          </group>
        </group>
      </group>

      {/* ---------------- Legs (hip pivots for walk/run) ---------------- */}
      <group ref={rightLeg} position={[0.22, 0.42, 0]}>
        <mesh position={[0, -0.2, 0]} castShadow>
          <boxGeometry args={[0.26, 0.84, 0.28]} />
          <meshStandardMaterial color={PANTS} flatShading />
        </mesh>
        <mesh position={[0, -0.68, 0.06]} castShadow>
          <boxGeometry args={[0.28, 0.16, 0.42]} />
          <meshStandardMaterial color={SHOES} flatShading />
        </mesh>
      </group>
      <group ref={leftLeg} position={[-0.22, 0.42, 0]}>
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
