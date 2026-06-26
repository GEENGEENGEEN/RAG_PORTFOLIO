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

// ===========================================================================
// DANCE KEYFRAMES
// ---------------------------------------------------------------------------
// The dance is a data-driven pose timeline. Each entry is a single pose at a
// time `t` (in seconds); at runtime the rig interpolates between consecutive
// poses. This is how you build a choreography from a video: extract frames,
// estimate the joint angles for each, and add one entry per frame here.
//
// Every channel is an array of radians. Omitted channels default to neutral
// (0). Positive/negative conventions for this rig:
//   rootPos : [x, y]        sideways + vertical body offset (groove/bounce)
//   rootRot : [x, y, z]     lean(+fwd) / full-body spin / roll(+left)
//   hips    : [x, y, z]     lower-body twist (y = turn hips left/right)
//   spine   : [x, y, z]     waist bend(+fwd) / twist / side-lean(+left)
//   head    : [x, y, z]     nod(+down) / turn / tilt(+left)
//   rArm/lArm   : [x, z]    shoulder: x negative = raise forward,
//                           right z+ raises to the side, left z- raises to side
//   rElbow/lElbow : [x, z]  z bends the forearm in
//   rWrist/lWrist : [z]     wrist flick
//   rHip/lHip   : [x, z]    leg from the hip: x+ swings the leg back
//   rKnee/lKnee : [x]       knee bend: x+ folds the shin back
//
// NOTE: the first and last keyframes should match so the loop is seamless.
// Replace the demo poses below with poses traced from your video frames.
// ===========================================================================
const DEF_POSE = {
  rootPos: [0, 0],
  rootRot: [0, 0, 0],
  hips: [0, 0, 0],
  spine: [0, 0, 0],
  head: [0, 0, 0],
  rArm: [0, 0],
  rElbow: [0, 0],
  rWrist: [0],
  lArm: [0, 0],
  lElbow: [0, 0],
  lWrist: [0],
  rHip: [0, 0],
  rKnee: [0],
  lHip: [0, 0],
  lKnee: [0],
};

// Demo routine (placeholder): dab -> raise the roof -> side points -> spin.
// Swap these out for poses traced from your dance-video frames.
const RAW_KEYFRAMES = [
  {
    t: 0.0,
    spine: [0.05, 0, 0],
    rHip: [0.1, 0],
    lHip: [0.1, 0],
    rKnee: [0.2],
    lKnee: [0.2],
    rArm: [0, 0.2],
    lArm: [0, -0.2],
  },
  {
    // The dab
    t: 1.0,
    spine: [0.1, 0, 0.15],
    head: [0.3, 0, 0.45],
    rArm: [-1.1, 1.5],
    rElbow: [0, -0.15],
    lArm: [0, -2.5],
    lElbow: [0, 1.5],
    rKnee: [0.25],
    lKnee: [0.25],
  },
  {
    // Raise the roof (up)
    t: 2.5,
    spine: [-0.05, 0, 0],
    rArm: [-0.2, 2.35],
    rElbow: [0, -0.45],
    lArm: [-0.2, -2.35],
    lElbow: [0, 0.45],
    rKnee: [0.15],
    lKnee: [0.15],
  },
  {
    // Raise the roof (pump)
    t: 3.2,
    rootPos: [0, 0.08],
    spine: [-0.08, 0, 0],
    rArm: [0.0, 2.35],
    lArm: [0.0, -2.35],
    rKnee: [0.05],
    lKnee: [0.05],
  },
  {
    // Point right + hip twist + weight on right leg
    t: 4.5,
    rootPos: [0.12, 0],
    hips: [0, 0.3, 0],
    spine: [0, 0.2, 0.12],
    rArm: [-0.35, 2.1],
    rElbow: [0, -0.2],
    lArm: [-0.35, -1.2],
    lElbow: [0, 0.4],
    rHip: [-0.1, 0],
    lHip: [0.2, 0],
    rKnee: [0.1],
    lKnee: [0.4],
  },
  {
    // Point left + hip twist + weight on left leg
    t: 5.7,
    rootPos: [-0.12, 0],
    hips: [0, -0.3, 0],
    spine: [0, -0.2, -0.12],
    rArm: [-0.35, 1.2],
    rElbow: [0, 0.2],
    lArm: [-0.35, -2.1],
    lElbow: [0, -0.4],
    rHip: [0.2, 0],
    lHip: [-0.1, 0],
    rKnee: [0.4],
    lKnee: [0.1],
  },
  {
    // Spin (3/4 turn) + point up
    t: 7.0,
    rootRot: [0, Math.PI * 1.5, 0],
    spine: [-0.1, 0, 0],
    rArm: [-1.7, 0.7],
    rElbow: [0, -0.1],
    lArm: [0.1, -0.45],
    lElbow: [0, 1.2],
    rKnee: [0.1],
    lKnee: [0.1],
  },
  {
    // Resolve back to the start pose (full turn) for a seamless loop
    t: 8.0,
    rootRot: [0, Math.PI * 2, 0],
    spine: [0.05, 0, 0],
    rHip: [0.1, 0],
    lHip: [0.1, 0],
    rKnee: [0.2],
    lKnee: [0.2],
    rArm: [0, 0.2],
    lArm: [0, -0.2],
  },
];

// Normalize: fill missing channels with neutral defaults.
const DANCE_KEYFRAMES = RAW_KEYFRAMES.map((kf) => ({ ...DEF_POSE, ...kf }));
const ROUTINE_DURATION = DANCE_KEYFRAMES[DANCE_KEYFRAMES.length - 1].t || 1;

// Return an interpolated pose (all channels) for a given time into the routine.
function poseAt(time) {
  const f = DANCE_KEYFRAMES;
  const tt = ((time % ROUTINE_DURATION) + ROUTINE_DURATION) % ROUTINE_DURATION;

  let a = f[0];
  let b = f[f.length - 1];
  for (let i = 0; i < f.length - 1; i++) {
    if (tt >= f[i].t && tt <= f[i + 1].t) {
      a = f[i];
      b = f[i + 1];
      break;
    }
  }

  const span = b.t - a.t || 1;
  let k = (tt - a.t) / span;
  k = k * k * (3 - 2 * k); // smoothstep for softer transitions

  const mix = {};
  for (const key in DEF_POSE) {
    mix[key] = a[key].map((v, i) => v + (b[key][i] - v) * k);
  }
  return mix;
}

/**
 * A procedurally built low-poly humanoid. Everything is made of Three.js
 * primitives with flat shading for the faceted look. Driven by the `gesture`
 * prop:
 *   - idle:    gentle breathing + head bob + sway
 *   - handing: the right arm raises forward holding a paper
 *   - wave:    the right arm raises to the side and rocks
 *   - walk:    legs and arms swing in-place at a relaxed pace
 *   - run:     faster, larger swings with a forward lean and bigger bob
 *   - dance:   plays the keyframe routine above (built from video frames)
 *
 * Rig joints (pivots): root, hips (lower-body twist), spine (waist), head,
 * shoulders -> elbows -> wrists, and hips -> knees for each leg.
 */
export default function Character({ gesture }) {
  const root = useRef();
  const hips = useRef(); // lower-body twist pivot (hips + legs)
  const spine = useRef(); // waist pivot (whole upper body)
  const head = useRef();
  const rightArm = useRef(); // shoulder pivot
  const rightElbow = useRef();
  const rightWrist = useRef();
  const leftArm = useRef();
  const leftElbow = useRef();
  const leftWrist = useRef();
  const rightLeg = useRef(); // right hip pivot
  const rightKnee = useRef();
  const leftLeg = useRef(); // left hip pivot
  const leftKnee = useRef();
  const paper = useRef();

  // Blend factors so action gestures ease in/out instead of snapping.
  const moveBlend = useRef(0); // walk / run
  const waveBlend = useRef(0);

  // Track when the dance started so the routine always begins at keyframe 0.
  const danceStart = useRef(0);
  const wasDancing = useRef(false);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;

    const run = gesture === "run";
    const walk = gesture === "walk";
    const moving = run || walk;
    const handing = gesture === "handing";
    const wave = gesture === "wave";
    const dancing = gesture === "dance";

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

    // Helper: ease a joint's rotation channel toward a target this frame.
    const ease = (obj, axis, target, rate = 8) => {
      obj.rotation[axis] = THREE.MathUtils.lerp(
        obj.rotation[axis],
        target,
        delta * rate
      );
    };

    // Reset the rising edge so the routine plays from the first keyframe.
    if (dancing && !wasDancing.current) danceStart.current = t;
    wasDancing.current = dancing;

    if (dancing) {
      // ===================== KEYFRAME PLAYBACK =======================
      const P = poseAt(t - danceStart.current);
      const R = 16; // ease rate: high enough to track the timeline crisply

      if (root.current) {
        root.current.position.x = THREE.MathUtils.lerp(
          root.current.position.x,
          P.rootPos[0],
          delta * R
        );
        root.current.position.y = THREE.MathUtils.lerp(
          root.current.position.y,
          P.rootPos[1],
          delta * R
        );
        ease(root.current, "x", P.rootRot[0], R);
        root.current.rotation.y = P.rootRot[1]; // direct: spin (2pi == 0)
        ease(root.current, "z", P.rootRot[2], R);
      }
      if (hips.current) {
        ease(hips.current, "x", P.hips[0], R);
        ease(hips.current, "y", P.hips[1], R);
        ease(hips.current, "z", P.hips[2], R);
      }
      if (spine.current) {
        ease(spine.current, "x", P.spine[0], R);
        ease(spine.current, "y", P.spine[1], R);
        ease(spine.current, "z", P.spine[2], R);
      }
      if (head.current) {
        ease(head.current, "x", P.head[0], R);
        ease(head.current, "y", P.head[1], R);
        ease(head.current, "z", P.head[2], R);
      }
      if (rightArm.current) {
        ease(rightArm.current, "x", P.rArm[0], R);
        ease(rightArm.current, "z", P.rArm[1], R);
      }
      if (rightElbow.current) {
        ease(rightElbow.current, "x", P.rElbow[0], R);
        ease(rightElbow.current, "z", P.rElbow[1], R);
      }
      if (rightWrist.current) ease(rightWrist.current, "z", P.rWrist[0], R);
      if (leftArm.current) {
        ease(leftArm.current, "x", P.lArm[0], R);
        ease(leftArm.current, "z", P.lArm[1], R);
      }
      if (leftElbow.current) {
        ease(leftElbow.current, "x", P.lElbow[0], R);
        ease(leftElbow.current, "z", P.lElbow[1], R);
      }
      if (leftWrist.current) ease(leftWrist.current, "z", P.lWrist[0], R);
      if (rightLeg.current) {
        ease(rightLeg.current, "x", P.rHip[0], R);
        ease(rightLeg.current, "z", P.rHip[1], R);
      }
      if (rightKnee.current) ease(rightKnee.current, "x", P.rKnee[0], R);
      if (leftLeg.current) {
        ease(leftLeg.current, "x", P.lHip[0], R);
        ease(leftLeg.current, "z", P.lHip[1], R);
      }
      if (leftKnee.current) ease(leftKnee.current, "x", P.lKnee[0], R);
    } else {
      // Reset dance-only joints back to neutral when not dancing.
      if (spine.current) {
        ease(spine.current, "x", 0, 6);
        ease(spine.current, "y", 0, 6);
        ease(spine.current, "z", 0, 6);
      }
      if (hips.current) {
        ease(hips.current, "x", 0, 6);
        ease(hips.current, "y", 0, 6);
        ease(hips.current, "z", 0, 6);
      }
      if (rightKnee.current) ease(rightKnee.current, "x", 0, 6);
      if (leftKnee.current) ease(leftKnee.current, "x", 0, 6);

      // --- Root: sway + bob, plus a forward lean while moving ------------
      if (root.current) {
        root.current.rotation.y = Math.sin(t * 0.4) * 0.12 * (1 - mb); // slow sway
        root.current.rotation.z = THREE.MathUtils.lerp(
          root.current.rotation.z,
          0,
          delta * 6
        );
        root.current.position.x = THREE.MathUtils.lerp(
          root.current.position.x,
          0,
          delta * 6
        );
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
        ease(head.current, "y", 0, 6);
        head.current.rotation.z = Math.sin(t * 0.8) * 0.04;
        head.current.rotation.x = Math.sin(t * 1.2) * 0.03;
      }

      // --- Legs: alternating swing from the hips while walking/running ---
      if (rightLeg.current) {
        rightLeg.current.rotation.x = Math.sin(t * freq) * legSwing * mb;
        ease(rightLeg.current, "z", 0, 6);
      }
      if (leftLeg.current) {
        leftLeg.current.rotation.x =
          Math.sin(t * freq + Math.PI) * legSwing * mb;
        ease(leftLeg.current, "z", 0, 6);
      }

      // --- Left arm: idle sway, or counter-swing while moving -----------
      if (leftArm.current) {
        const idle = Math.sin(t * 1.3) * 0.05;
        const swing = Math.sin(t * freq) * armSwing; // opposite phase to left leg
        leftArm.current.rotation.x = idle * (1 - mb) + swing * mb;
        ease(leftArm.current, "z", 0, 6);
      }
      // Forearm follows the upper arm's swing with a slight bend while moving.
      if (leftElbow.current) {
        const bend = (0.25 + Math.max(0, Math.sin(t * freq)) * 0.5) * mb;
        ease(leftElbow.current, "z", bend);
        ease(leftElbow.current, "x", 0);
      }
      if (leftWrist.current) {
        ease(leftWrist.current, "z", 0);
      }

      // --- Right arm: handing pose, wave, move counter-swing, or idle ---
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

      // Right elbow: drives the actual side-to-side wave, a slight
      // presentation bend while handing, a follow-swing while moving.
      if (rightElbow.current) {
        let targetZ = 0;
        const targetX = 0;
        if (wb > 0.001) {
          targetZ = (0.3 + Math.sin(t * 12) * 0.6) * wb;
        } else if (handing) {
          targetZ = 0.3;
        } else if (mb > 0.001) {
          targetZ =
            (0.25 + Math.max(0, Math.sin(t * freq + Math.PI)) * 0.5) * mb;
        }
        ease(rightElbow.current, "z", targetZ);
        ease(rightElbow.current, "x", targetX);
      }

      // Right wrist: a subtle flick that trails the wave for a natural feel.
      if (rightWrist.current) {
        const targetZ = wb > 0.001 ? Math.sin(t * 12 + 0.5) * 0.25 * wb : 0;
        ease(rightWrist.current, "z", targetZ);
      }
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
      {/* ============== Lower body: hips + legs (twist pivot) ========== */}
      <group ref={hips}>
        {/* Hips */}
        <mesh position={[0, 0.62, 0]} castShadow>
          <boxGeometry args={[0.8, 0.34, 0.48]} />
          <meshStandardMaterial color={PANTS} flatShading />
        </mesh>

        {/* Right leg: hip -> knee -> shin/shoe */}
        <group ref={rightLeg} position={[0.22, 0.42, 0]}>
          <mesh position={[0, 0.01, 0]} castShadow>
            <boxGeometry args={[0.26, 0.42, 0.28]} />
            <meshStandardMaterial color={PANTS} flatShading />
          </mesh>
          <group ref={rightKnee} position={[0, -0.2, 0]}>
            <mesh position={[0, -0.21, 0]} castShadow>
              <boxGeometry args={[0.24, 0.42, 0.26]} />
              <meshStandardMaterial color={PANTS} flatShading />
            </mesh>
            <mesh position={[0, -0.48, 0.06]} castShadow>
              <boxGeometry args={[0.28, 0.16, 0.42]} />
              <meshStandardMaterial color={SHOES} flatShading />
            </mesh>
          </group>
        </group>

        {/* Left leg: hip -> knee -> shin/shoe */}
        <group ref={leftLeg} position={[-0.22, 0.42, 0]}>
          <mesh position={[0, 0.01, 0]} castShadow>
            <boxGeometry args={[0.26, 0.42, 0.28]} />
            <meshStandardMaterial color={PANTS} flatShading />
          </mesh>
          <group ref={leftKnee} position={[0, -0.2, 0]}>
            <mesh position={[0, -0.21, 0]} castShadow>
              <boxGeometry args={[0.24, 0.42, 0.26]} />
              <meshStandardMaterial color={PANTS} flatShading />
            </mesh>
            <mesh position={[0, -0.48, 0.06]} castShadow>
              <boxGeometry args={[0.28, 0.16, 0.42]} />
              <meshStandardMaterial color={SHOES} flatShading />
            </mesh>
          </group>
        </group>
      </group>

      {/* ============== Upper body: pivots at the waist =============== */}
      <group ref={spine} position={[0, 0.8, 0]}>
        {/* Torso */}
        <mesh position={[0, 0.38, 0]} castShadow>
          <boxGeometry args={[0.86, 0.92, 0.5]} />
          <meshStandardMaterial color={SHIRT} flatShading />
        </mesh>

        {/* Neck */}
        <mesh position={[0, 0.86, 0]} castShadow>
          <cylinderGeometry args={[0.12, 0.14, 0.18, 6]} />
          <meshStandardMaterial color={SKIN} flatShading />
        </mesh>

        {/* Head */}
        <group ref={head} position={[0, 1.25, 0]}>
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

        {/* Right arm (shoulder -> elbow -> wrist) */}
        <group ref={rightArm} position={[0.55, 0.75, 0]}>
          <mesh position={[0, -0.27, 0]} castShadow>
            <boxGeometry args={[0.2, 0.5, 0.22]} />
            <meshStandardMaterial color={SHIRT} flatShading />
          </mesh>

          <group ref={rightElbow} position={[0, -0.54, 0]}>
            <mesh position={[0, -0.25, 0]} castShadow>
              <boxGeometry args={[0.18, 0.42, 0.2]} />
              <meshStandardMaterial color={SKIN} flatShading />
            </mesh>

            <group ref={rightWrist} position={[0, -0.5, 0]}>
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
                <mesh position={[0, 0.04, 0.18]} rotation={[Math.PI / 2.4, 0, 0]}>
                  <planeGeometry args={[0.34, 0.03]} />
                  <meshStandardMaterial color="#888" side={THREE.DoubleSide} />
                </mesh>
                <mesh
                  position={[0, -0.04, 0.12]}
                  rotation={[Math.PI / 2.4, 0, 0]}
                >
                  <planeGeometry args={[0.34, 0.03]} />
                  <meshStandardMaterial color="#888" side={THREE.DoubleSide} />
                </mesh>
              </group>
            </group>
          </group>
        </group>

        {/* Left arm (shoulder -> elbow -> wrist) */}
        <group ref={leftArm} position={[-0.55, 0.75, 0]}>
          <mesh position={[0, -0.27, 0]} castShadow>
            <boxGeometry args={[0.2, 0.5, 0.22]} />
            <meshStandardMaterial color={SHIRT} flatShading />
          </mesh>

          <group ref={leftElbow} position={[0, -0.54, 0]}>
            <mesh position={[0, -0.25, 0]} castShadow>
              <boxGeometry args={[0.18, 0.42, 0.2]} />
              <meshStandardMaterial color={SKIN} flatShading />
            </mesh>

            <group ref={leftWrist} position={[0, -0.5, 0]}>
              <mesh position={[0, -0.13, 0]} castShadow>
                <boxGeometry args={[0.2, 0.2, 0.22]} />
                <meshStandardMaterial color={SKIN} flatShading />
              </mesh>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
}
