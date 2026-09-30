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

function Cloth({ color = '#141414', rough = 0.72 }: { color?: string; rough?: number }) {
  return <meshStandardMaterial color={color} roughness={rough} metalness={0.04} />;
}

function Skin() {
  return <meshPhysicalMaterial color="#f3c7aa" roughness={0.58} metalness={0} sheen={0.25} sheenColor="#ffd7c2" />;
}

function HairMat() {
  return <meshStandardMaterial color="#1a120f" roughness={0.42} metalness={0.12} emissive="#3a1410" emissiveIntensity={0.18} />;
}

function Gold() {
  return <meshStandardMaterial color="#c6a15a" roughness={0.32} metalness={0.62} />;
}

function Leather() {
  return <meshStandardMaterial color="#0e0e0e" roughness={0.38} metalness={0.18} />;
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
  const scarf = useRef<Group>(null);
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
    if (scarf.current && !reduced) {
      const lively = frame.state.animation === 'walk' || frame.state.animation === 'run' || frame.state.animation === 'dance' || frame.state.animation === 'sword_fight';
      scarf.current.rotation.z = Math.sin(performance.now() / (lively ? 260 : 720)) * (lively ? 0.14 : 0.06);
    }
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
      <group ref={hips} position={[0, 0.5, 0]}>
        <RoundedBox args={[0.46, 0.22, 0.3]} radius={0.08} smoothness={3} position={[0, 0.02, 0.02]}>
          <Cloth color="#121212" rough={0.66} />
        </RoundedBox>
        <mesh position={[0, 0.06, 0.02]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.16, 0.022, 8, 16]} />
          <Leather />
        </mesh>
        <mesh position={[0, 0.06, 0.14]}>
          <cylinderGeometry args={[0.034, 0.034, 0.016, 16]} />
          <Gold />
        </mesh>
        <mesh position={[0, 0.06, 0.152]}>
          <torusGeometry args={[0.02, 0.004, 6, 12]} />
          <Gold />
        </mesh>

        <group ref={legL} position={[-0.14, -0.06, 0]}>
          <mesh position={[0, -0.12, 0]}>
            <capsuleGeometry args={[0.072, 0.1, 6, 10]} />
            <Cloth color="#161616" rough={0.7} />
          </mesh>
          <group ref={shinL} position={[0, -0.22, 0]}>
            <mesh position={[0, -0.07, 0.01]}>
              <capsuleGeometry args={[0.06, 0.07, 6, 10]} />
              <Cloth color="#121212" />
            </mesh>
            <group position={[0, -0.2, 0.04]}>
              <RoundedBox args={[0.15, 0.1, 0.14]} radius={0.035} smoothness={3} position={[0, 0.01, 0]}>
                <Leather />
              </RoundedBox>
              <RoundedBox args={[0.16, 0.04, 0.2]} radius={0.016} smoothness={2} position={[0, -0.045, 0.03]}>
                <meshStandardMaterial color="#070707" roughness={0.55} />
              </RoundedBox>
              <mesh position={[0, 0.02, 0.09]}>
                <boxGeometry args={[0.12, 0.012, 0.01]} />
                <meshStandardMaterial color="#8d1d22" roughness={0.45} />
              </mesh>
            </group>
          </group>
        </group>
        <group ref={legR} position={[0.14, -0.06, 0]}>
          <mesh position={[0, -0.12, 0]}>
            <capsuleGeometry args={[0.072, 0.1, 6, 10]} />
            <Cloth color="#161616" rough={0.7} />
          </mesh>
          <group ref={shinR} position={[0, -0.22, 0]}>
            <mesh position={[0, -0.07, 0.01]}>
              <capsuleGeometry args={[0.06, 0.07, 6, 10]} />
              <Cloth color="#121212" />
            </mesh>
            <group position={[0, -0.2, 0.04]}>
              <RoundedBox args={[0.15, 0.1, 0.14]} radius={0.035} smoothness={3} position={[0, 0.01, 0]}>
                <Leather />
              </RoundedBox>
              <RoundedBox args={[0.16, 0.04, 0.2]} radius={0.016} smoothness={2} position={[0, -0.045, 0.03]}>
                <meshStandardMaterial color="#070707" roughness={0.55} />
              </RoundedBox>
              <mesh position={[0, 0.02, 0.09]}>
                <boxGeometry args={[0.12, 0.012, 0.01]} />
                <meshStandardMaterial color="#8d1d22" roughness={0.45} />
              </mesh>
            </group>
          </group>
        </group>

        <group ref={spine}>
          <RoundedBox args={[0.56, 0.46, 0.34]} radius={0.14} smoothness={4} position={[0, 0.28, 0]}>
            <Cloth color="#161616" rough={0.68} />
          </RoundedBox>
          <RoundedBox args={[0.045, 0.28, 0.012]} radius={0.008} smoothness={2} position={[0, 0.26, 0.17]}>
            <meshStandardMaterial color="#8d151c" roughness={0.5} />
          </RoundedBox>
          <mesh position={[-0.28, 0.42, 0]} scale={[1.1, 0.7, 0.9]}>
            <sphereGeometry args={[0.09, 16, 12]} />
            <Cloth color="#141414" rough={0.66} />
          </mesh>
          <mesh position={[0.28, 0.42, 0]} scale={[1.1, 0.7, 0.9]}>
            <sphereGeometry args={[0.09, 16, 12]} />
            <Cloth color="#141414" rough={0.66} />
          </mesh>
          <group ref={scarf} position={[0, 0.46, 0.04]}>
            <mesh position={[-0.08, -0.12, 0.1]} rotation={[0.15, 0, 0.25]}>
              <capsuleGeometry args={[0.028, 0.16, 5, 8]} />
              <meshStandardMaterial color="#b3131b" roughness={0.5} />
            </mesh>
            <mesh position={[0.1, -0.16, 0.12]} rotation={[0.1, 0, -0.35]}>
              <capsuleGeometry args={[0.026, 0.22, 5, 8]} />
              <meshStandardMaterial color="#8f1418" roughness={0.5} />
            </mesh>
          </group>

          <group ref={head} position={[0, 0.66, 0.02]}>
            <mesh position={[0, 0.1, -0.05]} scale={[1.05, 0.62, 0.92]}>
              <sphereGeometry args={[0.38, 28, 20]} />
              <HairMat />
            </mesh>
            <mesh scale={[1.05, 0.98, 1.02]}>
              <sphereGeometry args={[0.34, 32, 24]} />
              <Skin />
            </mesh>
            <mesh position={[0.01, 0.16, 0.26]} rotation={[0.35, 0, -0.2]} scale={[1.2, 0.42, 0.55]}>
              <sphereGeometry args={[0.14, 16, 12]} />
              <HairMat />
            </mesh>
            <mesh position={[-0.28, -0.02, 0.06]} rotation={[0.1, 0, 0.15]}>
              <capsuleGeometry args={[0.038, 0.16, 5, 8]} />
              <HairMat />
            </mesh>
            <mesh position={[0.27, 0.01, 0.08]} rotation={[0.08, 0, -0.12]}>
              <capsuleGeometry args={[0.034, 0.12, 5, 8]} />
              <HairMat />
            </mesh>
            <mesh position={[0, -0.02, 0.33]}>
              <sphereGeometry args={[0.022, 10, 8]} />
              <Skin />
            </mesh>
            <group ref={eyeL} position={[-0.11, 0.02, 0.3]}>
              <mesh>
                <sphereGeometry args={[0.05, 16, 12]} />
                <meshStandardMaterial color="#fffaf6" roughness={0.25} />
              </mesh>
              <mesh ref={pupilL} position={[0, 0.002, 0.032]}>
                <sphereGeometry args={[0.026, 12, 10]} />
                <meshStandardMaterial color="#1c100e" roughness={0.2} />
              </mesh>
              <mesh position={[0.012, 0.012, 0.044]}>
                <sphereGeometry args={[0.008, 8, 8]} />
                <meshBasicMaterial color="#ffffff" />
              </mesh>
            </group>
            <group ref={eyeR} position={[0.11, 0.02, 0.3]}>
              <mesh>
                <sphereGeometry args={[0.05, 16, 12]} />
                <meshStandardMaterial color="#fffaf6" roughness={0.25} />
              </mesh>
              <mesh ref={pupilR} position={[0, 0.002, 0.032]}>
                <sphereGeometry args={[0.026, 12, 10]} />
                <meshStandardMaterial color="#1c100e" roughness={0.2} />
              </mesh>
              <mesh position={[0.012, 0.012, 0.044]}>
                <sphereGeometry args={[0.008, 8, 8]} />
                <meshBasicMaterial color="#ffffff" />
              </mesh>
            </group>
            <mesh ref={browL} position={[-0.11, 0.15, 0.3]} rotation={[0, 0, 0.1]}>
              <capsuleGeometry args={[0.012, 0.08, 4, 6]} />
              <meshStandardMaterial color="#120e0c" roughness={0.5} />
            </mesh>
            <mesh ref={browR} position={[0.11, 0.15, 0.3]} rotation={[0, 0, -0.1]}>
              <capsuleGeometry args={[0.012, 0.08, 4, 6]} />
              <meshStandardMaterial color="#120e0c" roughness={0.5} />
            </mesh>
            <group position={[0, -0.12, 0.32]}>
              <mesh ref={smile} rotation={[0.15, 0, Math.PI]}>
                <torusGeometry args={[0.048, 0.012, 8, 14, Math.PI]} />
                <meshStandardMaterial color="#c46a72" roughness={0.45} />
              </mesh>
              <mesh ref={frown} rotation={[0.15, 0, 0]} visible={false}>
                <torusGeometry args={[0.042, 0.01, 8, 12, Math.PI]} />
                <meshStandardMaterial color="#b85d68" roughness={0.45} />
              </mesh>
              <mesh ref={gasp} position={[0, -0.006, 0.008]} visible={false}>
                <sphereGeometry args={[0.03, 12, 10]} />
                <meshStandardMaterial color="#6a3040" roughness={0.5} />
              </mesh>
            </group>
            <mesh ref={tearL} position={[-0.11, -0.02, 0.34]}>
              <sphereGeometry args={[0.012, 8, 8]} />
              <meshStandardMaterial color="#d7f1ff" transparent opacity={0} />
            </mesh>
            <mesh ref={tearR} position={[0.11, -0.03, 0.34]}>
              <sphereGeometry args={[0.011, 8, 8]} />
              <meshStandardMaterial color="#d7f1ff" transparent opacity={0} />
            </mesh>
            <mesh ref={cheekL} position={[-0.16, -0.04, 0.28]}>
              <sphereGeometry args={[0.036, 10, 8]} />
              <meshStandardMaterial color="#e7a0a6" transparent opacity={0} />
            </mesh>
            <mesh ref={cheekR} position={[0.16, -0.04, 0.28]}>
              <sphereGeometry args={[0.036, 10, 8]} />
              <meshStandardMaterial color="#e7a0a6" transparent opacity={0} />
            </mesh>
            <group ref={shades} position={[0, 0.055, 0.36]}>
              <RoundedBox args={[0.2, 0.11, 0.04]} radius={0.045} smoothness={3} position={[-0.11, 0, 0]}>
                <meshPhysicalMaterial color="#070707" roughness={0.08} metalness={0.4} transparent opacity={0.86} clearcoat={0.8} clearcoatRoughness={0.12} />
              </RoundedBox>
              <RoundedBox args={[0.2, 0.11, 0.04]} radius={0.045} smoothness={3} position={[0.11, 0, 0]}>
                <meshPhysicalMaterial color="#070707" roughness={0.08} metalness={0.4} transparent opacity={0.86} clearcoat={0.8} clearcoatRoughness={0.12} />
              </RoundedBox>
              <mesh position={[0, 0.008, 0.008]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.012, 0.012, 0.04, 8]} />
                <meshStandardMaterial color="#111111" metalness={0.45} roughness={0.25} />
              </mesh>
              <mesh position={[-0.22, 0.012, -0.04]} rotation={[0, 0.45, 0]}>
                <boxGeometry args={[0.1, 0.012, 0.012]} />
                <meshStandardMaterial color="#111111" metalness={0.4} roughness={0.3} />
              </mesh>
              <mesh position={[0.22, 0.012, -0.04]} rotation={[0, -0.45, 0]}>
                <boxGeometry args={[0.1, 0.012, 0.012]} />
                <meshStandardMaterial color="#111111" metalness={0.4} roughness={0.3} />
              </mesh>
            </group>
            {slot === 'face' && prop && prop !== 'sunglasses' && prop !== 'glasses' ? <ToodlePropMesh prop={prop} /> : null}
            {slot === 'head' && prop ? <ToodlePropMesh prop={prop} /> : null}
          </group>

          <group ref={armL} position={[-0.32, 0.38, 0]}>
            <mesh position={[0, -0.11, 0]}>
              <capsuleGeometry args={[0.06, 0.1, 6, 10]} />
              <Cloth color="#1a1a1a" rough={0.66} />
            </mesh>
            <group ref={foreL} position={[0, -0.22, 0]}>
              <mesh position={[0, -0.09, 0]}>
                <capsuleGeometry args={[0.05, 0.08, 6, 10]} />
                <Cloth color="#121212" rough={0.6} />
              </mesh>
              <group position={[0, -0.2, 0.02]}>
                <RoundedBox args={[0.12, 0.08, 0.07]} radius={0.03} smoothness={2}>
                  <Skin />
                </RoundedBox>
                <mesh position={[-0.05, -0.01, 0.02]}>
                  <sphereGeometry args={[0.028, 10, 8]} />
                  <Skin />
                </mesh>
              </group>
            </group>
          </group>
          <group ref={armR} position={[0.32, 0.38, 0]}>
            <mesh position={[0, -0.11, 0]}>
              <capsuleGeometry args={[0.06, 0.1, 6, 10]} />
              <Cloth color="#1a1a1a" rough={0.66} />
            </mesh>
            <group ref={foreR} position={[0, -0.22, 0]}>
              <mesh position={[0, -0.09, 0]}>
                <capsuleGeometry args={[0.05, 0.08, 6, 10]} />
                <Cloth color="#121212" rough={0.6} />
              </mesh>
              <group position={[0, -0.2, 0.02]}>
                <RoundedBox args={[0.12, 0.08, 0.07]} radius={0.03} smoothness={2}>
                  <Skin />
                </RoundedBox>
                <mesh position={[0.05, -0.01, 0.02]}>
                  <sphereGeometry args={[0.028, 10, 8]} />
                  <Skin />
                </mesh>
              </group>
              {slot === 'hand' && prop && prop !== 'katana' ? <group position={[0, -0.2, 0.02]}><ToodlePropMesh prop={prop} /></group> : null}
              <group ref={handSword} position={[0, -0.22, 0.04]} rotation={[0.25, 0.55, -1.05]} visible={false}>
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
          <group ref={sheath} position={[0.22, 0.28, -0.22]} rotation={[0.4, 0.2, -0.65]} scale={0.9}>
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
        <circleGeometry args={[0.42, 24]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.16} />
      </mesh>
    </group>
  );
}
