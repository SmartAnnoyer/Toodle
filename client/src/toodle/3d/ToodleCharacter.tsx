import { useRef, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import type { Group, Mesh } from 'three';
import { toodleAudio } from '../audio/ToodleAudioEngine';
import type { DanceStyle, ToodleProp } from '../animations';
import { ToodleAnimationController, type BoneName } from './ToodleAnimationController';
import { faceFor } from './ToodleExpressionController';
import { emitSwordFight, type SwordFightHook } from './swordEvents';
import { propAnchor, ToodlePropMesh } from './ToodleProps';
import { SwordSheath, ToodleSword } from './ToodleSword';
import type { ToodleCharacterState, ToodleExpression } from './state';

function Cloth({ color = '#141414' }: { color?: string }) {
  return <meshStandardMaterial color={color} roughness={0.62} metalness={0.05} />;
}

function Skin() {
  return <meshStandardMaterial color="#f0c2a4" roughness={0.52} metalness={0} />;
}

function Hair() {
  return <meshStandardMaterial color="#120e0c" roughness={0.62} metalness={0.04} />;
}

function Spike({
  position,
  rotation,
  radius = 0.05,
  height = 0.2,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  radius?: number;
  height?: number;
}) {
  return (
    <mesh position={position} rotation={rotation}>
      <coneGeometry args={[radius, height, 5]} />
      <Hair />
    </mesh>
  );
}

function Gold() {
  return <meshStandardMaterial color="#D4A85A" roughness={0.32} metalness={0.62} />;
}

const BARE_FACE = new Set<ToodleExpression>(['embarrassed', 'shy', 'sad']);

export function ToodleCharacter({
  controller,
  danceStyle,
  prop,
  listening,
  reduced,
  onState,
}: {
  controller: ToodleAnimationController;
  danceStyle: DanceStyle;
  prop?: ToodleProp;
  listening: boolean;
  reduced: boolean;
  onState?: (state: ToodleCharacterState) => void;
}) {
  const root = useRef<Group>(null);
  const hips = useRef<Group>(null);
  const spine = useRef<Group>(null);
  const head = useRef<Group>(null);
  const armL = useRef<Group>(null);
  const armR = useRef<Group>(null);
  const foreL = useRef<Group>(null);
  const foreR = useRef<Group>(null);
  const legL = useRef<Group>(null);
  const legR = useRef<Group>(null);
  const shinL = useRef<Group>(null);
  const shinR = useRef<Group>(null);
  const eyeL = useRef<Group>(null);
  const eyeR = useRef<Group>(null);
  const pupilL = useRef<Mesh>(null);
  const pupilR = useRef<Mesh>(null);
  const smile = useRef<Mesh>(null);
  const frown = useRef<Mesh>(null);
  const gasp = useRef<Mesh>(null);
  const tearL = useRef<Mesh>(null);
  const tearR = useRef<Mesh>(null);
  const cheekL = useRef<Mesh>(null);
  const cheekR = useRef<Mesh>(null);
  const browL = useRef<Mesh>(null);
  const browR = useRef<Mesh>(null);
  const shades = useRef<Group>(null);
  const scarf = useRef<Mesh>(null);
  const sheath = useRef<Group>(null);
  const sheathed = useRef<Group>(null);
  const emptySheath = useRef<Group>(null);
  const handSword = useRef<Group>(null);
  const arc = useRef<Mesh>(null);
  const sparks = useRef<Group>(null);
  const swordClock = useRef(0);
  const swordOn = useRef(false);
  const swordMarks = useRef({ draw: false, sheath: false, complete: false, slashes: 0, impacts: 0 });
  const bones: Record<BoneName, RefObject<Group>> = {
    root, hips, spine, head, armL, armR, foreL, foreR, legL, legR, shinL, shinR,
  };

  useFrame((_, dt) => {
    controller.setDance(danceStyle);
    const frame = controller.update(dt, { listening, reduced, prop });
    toodleAudio.syncMotion(frame.state.animation, frame.state.position.x, controller.halfW, dt, reduced);
    onState?.(frame.state);
    (Object.keys(bones) as BoneName[]).forEach((name) => {
      const group = bones[name].current;
      if (!group) return;
      const part = frame.pose[name];
      if (name === 'root') group.position.set(part.x, part.y, part.z);
      if (group.rotation.order !== 'YXZ') group.rotation.order = 'YXZ';
      group.rotation.set(part.rx, part.ry, part.rz);
    });
    const breathe = reduced ? 1 : 1 + Math.sin(performance.now() / 520) * 0.012;
    const fit = 0.98;
    if (hips.current) hips.current.scale.set(fit, breathe * fit, fit);
    const face = faceFor(frame.expression, frame.blink, frame.wink);
    const turnAway = frame.state.animation === 'walkAway' || frame.state.animation === 'spin' || frame.state.animation === 'buttWiggle' || frame.state.animation === 'sword_fight';
    if (!turnAway) {
      if (root.current) root.current.rotation.y = 0;
      if (hips.current) hips.current.rotation.y = 0;
      if (spine.current) spine.current.rotation.y = 0;
      if (head.current) head.current.rotation.y = 0;
    }
    const downcast = frame.state.animation === 'fall' || frame.state.animation === 'sleep' || frame.state.animation === 'sleepy' || frame.state.animation === 'hide' || frame.state.animation === 'get_up';
    if (head.current && !downcast) head.current.rotation.x = Math.min(head.current.rotation.x, -0.04);
    const leftY = Math.max(0.55, face.narrow * (1 - face.lid * 0.75));
    const rightShut = frame.wink ? 1 : face.lid;
    const rightY = Math.max(0.55, (frame.wink ? 0.2 : face.narrow) * (1 - rightShut * 0.75));
    if (eyeL.current) eyeL.current.scale.set(1, leftY, 1);
    if (eyeR.current) eyeR.current.scale.set(1, rightY, 1);
    if (pupilL.current) pupilL.current.position.x = 0;
    if (pupilR.current) pupilR.current.position.x = 0;
    const crying = frame.expression === 'sad' || frame.state.animation === 'cry';
    const open = face.mouthOpen > 0.65;
    if (smile.current) {
      smile.current.visible = !crying && !open;
      smile.current.scale.set(0.85 + face.mouthWide * 0.35, 0.9, 1);
    }
    if (frown.current) {
      frown.current.visible = crying && !open;
      frown.current.scale.set(0.8 + face.mouthWide * 0.25, 1, 1);
    }
    if (gasp.current) {
      gasp.current.visible = open;
      gasp.current.scale.set(0.75 + face.mouthWide * 0.2, 0.4 + face.mouthOpen * 0.45, 0.5);
    }
    const drip = crying ? (Math.sin(performance.now() / 260) * 0.5 + 0.5) : 0;
    if (tearL.current) {
      tearL.current.position.y = -0.01 - drip * 0.09;
      (tearL.current.material as { opacity: number }).opacity = crying ? 0.35 + drip * 0.65 : 0;
    }
    if (tearR.current) {
      tearR.current.position.y = -0.03 - (1 - drip) * 0.07;
      (tearR.current.material as { opacity: number }).opacity = crying ? 0.25 + (1 - drip) * 0.6 : 0;
    }
    const blush = Math.min(0.8, Math.max(0, face.cheek - 0.7) * 0.7);
    if (cheekL.current) (cheekL.current.material as { opacity: number }).opacity = blush;
    if (cheekR.current) (cheekR.current.material as { opacity: number }).opacity = blush;
    const showBrows = 0.72 + Math.min(0.28, (Math.abs(face.browL) + Math.abs(face.browR)) * 0.4);
    if (browL.current) {
      browL.current.position.y = 0.15 + face.browL * 0.05;
      browL.current.rotation.z = 0.18 - face.browL * 0.8;
      (browL.current.material as { opacity: number }).opacity = showBrows;
    }
    if (browR.current) {
      browR.current.position.y = 0.15 + face.browR * 0.05;
      browR.current.rotation.z = -0.18 + face.browR * 0.8;
      (browR.current.material as { opacity: number }).opacity = showBrows;
    }
    if (shades.current) {
      const bare = prop !== 'sunglasses' && prop !== 'glasses' && (BARE_FACE.has(frame.expression) || frame.state.animation === 'cry' || frame.state.animation === 'sleep');
      const glide = Math.min(1, dt * 8);
      const y = bare ? -0.1 : 0.055;
      const notice = frame.state.animation === 'sword_fight' && frame.time < 0.55;
      const rx = bare ? 0.62 : 0.04 + (frame.state.animation === 'idle' ? Math.sin(performance.now() / 1300) * 0.05 : 0);
      const rz = notice ? 0.22 : 0;
      shades.current.position.y += (y - shades.current.position.y) * glide;
      shades.current.rotation.x += (rx - shades.current.rotation.x) * glide;
      shades.current.rotation.z += (rz - shades.current.rotation.z) * glide;
    }
    if (scarf.current && !reduced) scarf.current.rotation.z = 0.55 + Math.sin(performance.now() / 680) * 0.12;
    const fight = frame.state.animation === 'sword_fight';
    const flourish = frame.state.animation === 'sword' && prop === 'katana';
    const drawn = flourish || (fight && frame.time >= 1 && frame.time < 4.45);
    if (handSword.current) handSword.current.visible = drawn;
    if (sheathed.current) sheathed.current.visible = !drawn;
    if (emptySheath.current) emptySheath.current.visible = drawn;
    if (frame.state.animation === 'sword' || fight) {
      if (!swordOn.current) {
        swordClock.current = 0;
        swordMarks.current = { draw: false, sheath: false, complete: false, slashes: 0, impacts: 0 };
      }
      swordOn.current = true;
      swordClock.current = fight ? frame.time : swordClock.current + dt;
    } else {
      swordOn.current = false;
      swordClock.current = 0;
    }
    if (fight) {
      const marks = swordMarks.current;
      const once = (flag: 'draw' | 'sheath' | 'complete', hook: SwordFightHook, at: number) => {
        if (marks[flag] || frame.time < at) return;
        marks[flag] = true;
        emitSwordFight(hook);
      };
      once('draw', 'onSwordDraw', 1.05);
      const slashAt = [1.7, 2.55, 3.4];
      const impactAt = [1.95, 2.8, 3.65];
      if (marks.slashes < slashAt.length && frame.time >= slashAt[marks.slashes]) {
        marks.slashes += 1;
        emitSwordFight('onSwordSlash');
      }
      if (marks.impacts < impactAt.length && frame.time >= impactAt[marks.impacts]) {
        marks.impacts += 1;
        emitSwordFight('onSwordImpact');
      }
      once('sheath', 'onSwordSheath', 4.45);
      once('complete', 'onSwordComplete', 4.75);
    }
    if (arc.current) {
      const t = swordClock.current;
      const windows = fight
        ? [[1.55, 0.55], [2.15, 0.5], [2.7, 0.6], [3.35, 0.45]]
        : [[0.62, 0.4], [1.32, 0.36]];
      let flash = 0;
      let spin = 0;
      windows.forEach(([start, span], index) => {
        const wave = Math.sin(Math.min(1, Math.max(0, (t - start) / span)) * Math.PI);
        if (wave > flash) {
          flash = wave;
          spin = index;
        }
      });
      arc.current.visible = flash > 0.08;
      arc.current.rotation.z = spin % 2 === 0 ? -1.15 + flash * 2.2 : 1.1 - flash * 2;
      arc.current.scale.setScalar(0.75 + flash * 0.6);
      (arc.current.material as { opacity: number }).opacity = flash * 0.9;
      if (sparks.current) {
        sparks.current.visible = flash > 0.35;
        sparks.current.rotation.z = arc.current.rotation.z;
        const bits = sparks.current.children;
        bits.forEach((bit, index) => {
          bit.position.set(Math.cos(index) * 0.18 * flash, Math.sin(index * 1.7) * 0.12 * flash, 0.02);
          const material = (bit as Mesh).material as { opacity: number };
          material.opacity = flash * 0.8;
        });
      }
    }
  });

  const slot = propAnchor(prop);

  return (
    <group ref={root}>
      <group ref={hips} position={[0, 0.58, 0]}>
        <RoundedBox args={[0.34, 0.2, 0.22]} radius={0.07} smoothness={2} position={[0, -0.02, 0.01]}>
          <Cloth color="#101010" />
        </RoundedBox>
        <mesh position={[0, 0.08, 0.1]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.035, 0.035, 0.02, 10]} />
          <Gold />
        </mesh>

        <group ref={legL} position={[-0.1, -0.1, 0]}>
          <mesh position={[0, -0.11, 0]}>
            <capsuleGeometry args={[0.065, 0.12, 4, 8]} />
            <Cloth color="#121212" />
          </mesh>
          <group ref={shinL} position={[0, -0.22, 0]}>
            <mesh position={[0, -0.08, 0]}>
              <capsuleGeometry args={[0.055, 0.08, 4, 8]} />
              <Cloth color="#101010" />
            </mesh>
            <RoundedBox args={[0.13, 0.09, 0.18]} radius={0.03} smoothness={2} position={[0, -0.16, 0.03]}>
              <Cloth color="#0c0c0c" />
            </RoundedBox>
          </group>
        </group>
        <group ref={legR} position={[0.1, -0.1, 0]}>
          <mesh position={[0, -0.11, 0]}>
            <capsuleGeometry args={[0.065, 0.12, 4, 8]} />
            <Cloth color="#121212" />
          </mesh>
          <group ref={shinR} position={[0, -0.22, 0]}>
            <mesh position={[0, -0.08, 0]}>
              <capsuleGeometry args={[0.055, 0.08, 4, 8]} />
              <Cloth color="#101010" />
            </mesh>
            <RoundedBox args={[0.13, 0.09, 0.18]} radius={0.03} smoothness={2} position={[0, -0.16, 0.03]}>
              <Cloth color="#0c0c0c" />
            </RoundedBox>
          </group>
        </group>

        <group ref={spine}>
          <RoundedBox args={[0.52, 0.42, 0.3]} radius={0.12} smoothness={2} position={[0, 0.26, 0]}>
            <Cloth />
          </RoundedBox>
          <mesh position={[0, 0.4, 0.08]} rotation={[0.5, 0, 0]}>
            <torusGeometry args={[0.11, 0.028, 8, 14]} />
            <meshStandardMaterial color="#8B0000" roughness={0.55} />
          </mesh>
          <mesh ref={scarf} position={[0.12, 0.3, 0.14]} rotation={[0.15, 0, 0.55]}>
            <capsuleGeometry args={[0.028, 0.14, 4, 6]} />
            <meshStandardMaterial color="#B31313" roughness={0.5} />
          </mesh>

          <group ref={head} position={[0, 0.58, 0.02]}>
            <mesh position={[0, 0.17, -0.05]} scale={[1.05, 0.58, 0.9]}>
              <sphereGeometry args={[0.34, 16, 12]} />
              <Hair />
            </mesh>
            <Spike position={[-0.1, 0.42, -0.02]} rotation={[-0.25, 0, 0.55]} radius={0.055} height={0.26} />
            <Spike position={[0.02, 0.48, -0.01]} rotation={[-0.15, 0, -0.12]} radius={0.048} height={0.2} />
            <Spike position={[0.14, 0.4, 0]} rotation={[-0.08, 0, -0.7]} radius={0.05} height={0.22} />
            <Spike position={[-0.2, 0.3, 0.02]} rotation={[0.05, 0, 1.05]} radius={0.042} height={0.18} />
            <Spike position={[0.2, 0.28, 0.03]} rotation={[0.08, 0, -1]} radius={0.04} height={0.16} />
            <Spike position={[0, 0.36, -0.16]} rotation={[0.7, 0, 0.05]} radius={0.048} height={0.18} />
            <Spike position={[-0.12, 0.32, -0.14]} rotation={[0.85, 0.15, 0.4]} radius={0.04} height={0.16} />
            <Spike position={[0.12, 0.3, -0.13]} rotation={[0.75, -0.1, -0.35]} radius={0.038} height={0.15} />
            <mesh position={[-0.03, 0.22, 0.32]} rotation={[2.2, 0.08, 0.5]}>
              <coneGeometry args={[0.072, 0.22, 5]} />
              <Hair />
            </mesh>
            <mesh position={[0.09, 0.2, 0.33]} rotation={[2.35, -0.05, -0.15]}>
              <coneGeometry args={[0.048, 0.15, 5]} />
              <Hair />
            </mesh>
            <mesh position={[-0.14, 0.18, 0.3]} rotation={[2.1, 0.12, 0.75]}>
              <coneGeometry args={[0.036, 0.12, 5]} />
              <Hair />
            </mesh>
            <mesh position={[-0.3, -0.02, 0.14]} rotation={[0.1, 0.1, 0.18]}>
              <capsuleGeometry args={[0.034, 0.2, 4, 6]} />
              <Hair />
            </mesh>
            <mesh position={[0.29, 0.02, 0.16]} rotation={[0.06, -0.08, -0.16]}>
              <capsuleGeometry args={[0.03, 0.14, 4, 6]} />
              <Hair />
            </mesh>
            <mesh>
              <sphereGeometry args={[0.34, 24, 18]} />
              <Skin />
            </mesh>
            <mesh position={[0, -0.01, 0.31]}>
              <sphereGeometry args={[0.022, 8, 8]} />
              <meshStandardMaterial color="#e7b496" roughness={0.55} />
            </mesh>
            <group ref={eyeL} position={[-0.11, 0.05, 0.3]}>
              <mesh>
                <sphereGeometry args={[0.046, 14, 12]} />
                <meshStandardMaterial color="#fff8f4" roughness={0.3} />
              </mesh>
              <mesh ref={pupilL} position={[0, 0.004, 0.03]}>
                <sphereGeometry args={[0.024, 12, 10]} />
                <meshStandardMaterial color="#2a1814" roughness={0.25} />
              </mesh>
              <mesh position={[0.01, 0.012, 0.042]}>
                <sphereGeometry args={[0.008, 8, 8]} />
                <meshBasicMaterial color="#ffffff" />
              </mesh>
            </group>
            <group ref={eyeR} position={[0.11, 0.05, 0.3]}>
              <mesh>
                <sphereGeometry args={[0.046, 14, 12]} />
                <meshStandardMaterial color="#fff8f4" roughness={0.3} />
              </mesh>
              <mesh ref={pupilR} position={[0, 0.004, 0.03]}>
                <sphereGeometry args={[0.024, 12, 10]} />
                <meshStandardMaterial color="#2a1814" roughness={0.25} />
              </mesh>
              <mesh position={[0.01, 0.012, 0.042]}>
                <sphereGeometry args={[0.008, 8, 8]} />
                <meshBasicMaterial color="#ffffff" />
              </mesh>
            </group>
            <mesh ref={browL} position={[-0.11, 0.15, 0.3]} rotation={[0, 0, 0.12]}>
              <capsuleGeometry args={[0.01, 0.07, 3, 6]} />
              <meshStandardMaterial color="#120e0c" transparent opacity={0.85} />
            </mesh>
            <mesh ref={browR} position={[0.11, 0.15, 0.3]} rotation={[0, 0, -0.12]}>
              <capsuleGeometry args={[0.01, 0.07, 3, 6]} />
              <meshStandardMaterial color="#120e0c" transparent opacity={0.85} />
            </mesh>
            <group position={[0, -0.11, 0.31]}>
              <mesh ref={smile} rotation={[0.15, 0, Math.PI]}>
                <torusGeometry args={[0.042, 0.011, 8, 14, Math.PI]} />
                <meshStandardMaterial color="#c46a72" roughness={0.45} />
              </mesh>
              <mesh ref={frown} rotation={[0.15, 0, 0]} visible={false}>
                <torusGeometry args={[0.038, 0.01, 8, 12, Math.PI]} />
                <meshStandardMaterial color="#b85d68" roughness={0.45} />
              </mesh>
              <mesh ref={gasp} position={[0, -0.005, 0.008]} visible={false}>
                <sphereGeometry args={[0.028, 12, 10]} />
                <meshStandardMaterial color="#6a3040" roughness={0.5} />
              </mesh>
            </group>
            <mesh ref={tearL} position={[-0.11, -0.02, 0.33]}>
              <sphereGeometry args={[0.012, 8, 8]} />
              <meshStandardMaterial color="#d7f1ff" transparent opacity={0} />
            </mesh>
            <mesh ref={tearR} position={[0.11, -0.03, 0.33]}>
              <sphereGeometry args={[0.011, 8, 8]} />
              <meshStandardMaterial color="#d7f1ff" transparent opacity={0} />
            </mesh>
            <mesh ref={cheekL} position={[-0.16, -0.04, 0.26]}>
              <sphereGeometry args={[0.032, 8, 8]} />
              <meshStandardMaterial color="#e7a0a6" transparent opacity={0} />
            </mesh>
            <mesh ref={cheekR} position={[0.16, -0.04, 0.26]}>
              <sphereGeometry args={[0.032, 8, 8]} />
              <meshStandardMaterial color="#e7a0a6" transparent opacity={0} />
            </mesh>
            <group ref={shades} position={[0, 0.055, 0.34]}>
              <RoundedBox args={[0.18, 0.11, 0.035]} radius={0.04} smoothness={2} position={[-0.1, 0, 0]}>
                <meshPhysicalMaterial color="#070707" roughness={0.08} metalness={0.35} transparent opacity={0.82} />
              </RoundedBox>
              <RoundedBox args={[0.18, 0.11, 0.035]} radius={0.04} smoothness={2} position={[0.1, 0, 0]}>
                <meshPhysicalMaterial color="#070707" roughness={0.08} metalness={0.35} transparent opacity={0.82} />
              </RoundedBox>
              <mesh position={[0, 0.01, 0.01]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.012, 0.012, 0.045, 8]} />
                <meshStandardMaterial color="#111111" metalness={0.45} roughness={0.25} />
              </mesh>
              <mesh position={[-0.2, 0.015, -0.02]} rotation={[0, 0.4, 0]}>
                <boxGeometry args={[0.07, 0.012, 0.012]} />
                <meshStandardMaterial color="#111111" metalness={0.4} roughness={0.3} />
              </mesh>
              <mesh position={[0.2, 0.015, -0.02]} rotation={[0, -0.4, 0]}>
                <boxGeometry args={[0.07, 0.012, 0.012]} />
                <meshStandardMaterial color="#111111" metalness={0.4} roughness={0.3} />
              </mesh>
            </group>
            {slot === 'face' && prop && prop !== 'sunglasses' && prop !== 'glasses' ? <ToodlePropMesh prop={prop} /> : null}
            {slot === 'head' && prop ? <ToodlePropMesh prop={prop} /> : null}
          </group>

          <group ref={armL} position={[-0.3, 0.36, 0]}>
            <mesh position={[0, -0.1, 0]}>
              <capsuleGeometry args={[0.055, 0.1, 4, 8]} />
              <Cloth />
            </mesh>
            <group ref={foreL} position={[0, -0.2, 0]}>
              <mesh position={[0, -0.08, 0]}>
                <capsuleGeometry args={[0.045, 0.08, 4, 8]} />
                <Cloth color="#121212" />
              </mesh>
              <mesh position={[0, -0.16, 0.01]}>
                <sphereGeometry args={[0.05, 10, 8]} />
                <Skin />
              </mesh>
            </group>
          </group>
          <group ref={armR} position={[0.3, 0.36, 0]}>
            <mesh position={[0, -0.1, 0]}>
              <capsuleGeometry args={[0.055, 0.1, 4, 8]} />
              <Cloth />
            </mesh>
            <group ref={foreR} position={[0, -0.2, 0]}>
              <mesh position={[0, -0.08, 0]}>
                <capsuleGeometry args={[0.045, 0.08, 4, 8]} />
                <Cloth color="#121212" />
              </mesh>
              <mesh position={[0, -0.16, 0.01]}>
                <sphereGeometry args={[0.05, 10, 8]} />
                <Skin />
              </mesh>
              {slot === 'hand' && prop && prop !== 'katana' ? <group position={[0, -0.2, 0.02]}><ToodlePropMesh prop={prop} /></group> : null}
              <group ref={handSword} position={[0, -0.18, 0.02]} rotation={[0.25, 0.55, -1.05]} visible={false}>
                <ToodleSword drawn />
              </group>
            </group>
          </group>

          <mesh ref={arc} position={[0.02, 0.34, 0.24]} visible={false}>
            <torusGeometry args={[0.34, 0.012, 6, 20, Math.PI * 0.9]} />
            <meshStandardMaterial color="#9b1c24" emissive="#7a1218" emissiveIntensity={1.4} transparent opacity={0} depthWrite={false} />
          </mesh>
          <group ref={sparks} position={[0.02, 0.34, 0.28]} visible={false}>
            {[0, 1, 2, 3].map((index) => (
              <mesh key={index}>
                <sphereGeometry args={[0.012, 6, 6]} />
                <meshStandardMaterial color={index % 2 ? '#d4a85a' : '#c4373a'} emissive={index % 2 ? '#d4a85a' : '#c4373a'} emissiveIntensity={1.2} transparent opacity={0} depthWrite={false} />
              </mesh>
            ))}
          </group>
          {slot === 'back' && prop ? <ToodlePropMesh prop={prop} /> : null}
          <group ref={sheath} position={[0.16, 0.22, -0.16]} rotation={[0.35, 0.15, -0.7]} scale={0.85}>
            <group ref={sheathed}>
              <ToodleSword drawn={false} />
            </group>
            <group ref={emptySheath} visible={false}>
              <SwordSheath />
            </group>
          </group>
        </group>
      </group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <circleGeometry args={[0.28, 20]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.16} />
      </mesh>
    </group>
  );
}
