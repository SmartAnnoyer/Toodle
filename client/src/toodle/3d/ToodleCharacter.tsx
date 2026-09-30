import { useRef, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import type { Group, Mesh } from 'three';
import { toodleAudio } from '../audio/ToodleAudioEngine';
import type { DanceStyle, ToodleProp } from '../animations';
import { ToodleAnimationController, type BoneName } from './ToodleAnimationController';
import { faceFor } from './ToodleExpressionController';
import { propAnchor, ToodlePropMesh } from './ToodleProps';
import type { ToodleCharacterState, ToodleExpression } from './state';

function Cloth({ color = '#141414' }: { color?: string }) {
  return <meshStandardMaterial color={color} roughness={0.62} metalness={0.05} />;
}

function Skin() {
  return <meshStandardMaterial color="#f0c2a4" roughness={0.52} metalness={0} />;
}

function Hair() {
  return <meshStandardMaterial color="#16110f" roughness={0.46} metalness={0.08} />;
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
  const eyeL = useRef<Mesh>(null);
  const eyeR = useRef<Mesh>(null);
  const mouth = useRef<Mesh>(null);
  const cheekL = useRef<Mesh>(null);
  const cheekR = useRef<Mesh>(null);
  const browL = useRef<Mesh>(null);
  const browR = useRef<Mesh>(null);
  const shades = useRef<Group>(null);
  const scarf = useRef<Mesh>(null);
  const sheath = useRef<Group>(null);
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
      group.rotation.set(part.rx, part.ry, part.rz);
    });
    const breathe = reduced ? 1 : 1 + Math.sin(performance.now() / 520) * 0.012;
    const fit = 0.98;
    if (hips.current) hips.current.scale.set(fit, breathe * fit, fit);
    const face = faceFor(frame.expression, frame.blink, frame.wink);
    const leftY = Math.max(0.16, face.eyeScale * face.narrow * (1 - face.lid * 0.88));
    const rightShut = frame.wink ? 1 : face.lid;
    const rightY = Math.max(0.16, face.eyeScale * (frame.wink ? 0.14 : face.narrow) * (1 - rightShut * 0.88));
    if (eyeL.current) eyeL.current.scale.set(face.eyeScale, leftY, 0.42);
    if (eyeR.current) eyeR.current.scale.set(face.eyeScale, rightY, 0.42);
    if (mouth.current) {
      const open = 0.55 + Math.min(face.mouthOpen, 1.2) * 0.7;
      mouth.current.scale.set(face.mouthWide, open, 0.7);
      mouth.current.position.y = -0.12 - face.mouthDrop * 0.06;
      mouth.current.rotation.z = face.mouthDrop > 0.03 ? 0.15 : Math.PI;
    }
    const blush = Math.min(1, 0.25 + face.cheek * 0.45);
    if (cheekL.current) (cheekL.current.material as { opacity: number }).opacity = blush;
    if (cheekR.current) (cheekR.current.material as { opacity: number }).opacity = blush;
    const showBrows = 0.72 + Math.min(0.28, (Math.abs(face.browL) + Math.abs(face.browR)) * 0.4);
    if (browL.current) {
      browL.current.position.y = 0.2 + face.browL * 0.08;
      browL.current.rotation.z = 0.18 - face.browL * 0.8;
      (browL.current.material as { opacity: number }).opacity = showBrows;
    }
    if (browR.current) {
      browR.current.position.y = 0.2 + face.browR * 0.08;
      browR.current.rotation.z = -0.18 + face.browR * 0.8;
      (browR.current.material as { opacity: number }).opacity = showBrows;
    }
    if (shades.current) {
      const bare = prop !== 'sunglasses' && prop !== 'glasses' && (BARE_FACE.has(frame.expression) || frame.state.animation === 'cry' || frame.state.animation === 'sleep');
      const glide = Math.min(1, dt * 8);
      const y = bare ? -0.1 : 0.05;
      const rx = bare ? 0.62 : 0.04 + (frame.state.animation === 'idle' ? Math.sin(performance.now() / 1300) * 0.05 : 0);
      shades.current.position.y += (y - shades.current.position.y) * glide;
      shades.current.rotation.x += (rx - shades.current.rotation.x) * glide;
    }
    if (scarf.current && !reduced) scarf.current.rotation.z = 0.55 + Math.sin(performance.now() / 680) * 0.12;
    if (sheath.current) sheath.current.visible = prop !== 'katana';
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
            <mesh position={[0, 0.14, -0.02]} scale={[1.02, 0.72, 0.96]}>
              <sphereGeometry args={[0.4, 18, 14]} />
              <Hair />
            </mesh>
            <mesh position={[0.14, 0.22, 0.02]} rotation={[0, 0, -0.45]} scale={[0.72, 0.42, 0.58]}>
              <sphereGeometry args={[0.28, 12, 10]} />
              <Hair />
            </mesh>
            <mesh position={[-0.1, 0.18, 0.04]} rotation={[0.1, 0, 0.4]} scale={[0.5, 0.32, 0.48]}>
              <sphereGeometry args={[0.26, 12, 10]} />
              <Hair />
            </mesh>
            <mesh>
              <sphereGeometry args={[0.34, 22, 18]} />
              <Skin />
            </mesh>
            <mesh position={[0.02, 0.12, 0.26]} scale={[1.2, 0.22, 0.28]}>
              <sphereGeometry args={[0.16, 10, 8]} />
              <Hair />
            </mesh>
            <mesh position={[0, -0.02, 0.32]}>
              <sphereGeometry args={[0.028, 8, 8]} />
              <meshStandardMaterial color="#e2ad90" roughness={0.6} />
            </mesh>
            <mesh ref={eyeL} position={[-0.12, 0.04, 0.28]}>
              <sphereGeometry args={[0.07, 14, 12]} />
              <meshStandardMaterial color="#1a120f" roughness={0.22} />
              <mesh position={[-0.02, 0.02, 0.04]}>
                <sphereGeometry args={[0.018, 8, 8]} />
                <meshBasicMaterial color="#ffffff" />
              </mesh>
            </mesh>
            <mesh ref={eyeR} position={[0.12, 0.04, 0.28]}>
              <sphereGeometry args={[0.07, 14, 12]} />
              <meshStandardMaterial color="#1a120f" roughness={0.22} />
              <mesh position={[-0.02, 0.02, 0.04]}>
                <sphereGeometry args={[0.018, 8, 8]} />
                <meshBasicMaterial color="#ffffff" />
              </mesh>
            </mesh>
            <mesh ref={browL} position={[-0.12, 0.2, 0.3]} rotation={[0, 0, 0.18]}>
              <capsuleGeometry args={[0.012, 0.08, 3, 6]} />
              <meshStandardMaterial color="#120e0c" transparent opacity={0.8} />
            </mesh>
            <mesh ref={browR} position={[0.12, 0.2, 0.3]} rotation={[0, 0, -0.18]}>
              <capsuleGeometry args={[0.012, 0.08, 3, 6]} />
              <meshStandardMaterial color="#120e0c" transparent opacity={0.8} />
            </mesh>
            <mesh ref={mouth} position={[0, -0.12, 0.3]} rotation={[0.15, 0, Math.PI]}>
              <torusGeometry args={[0.055, 0.016, 8, 14, Math.PI]} />
              <meshStandardMaterial color="#8d4a48" roughness={0.45} />
            </mesh>
            <mesh ref={cheekL} position={[-0.2, -0.04, 0.24]}>
              <sphereGeometry args={[0.045, 8, 8]} />
              <meshStandardMaterial color="#e07a86" transparent opacity={0.45} />
            </mesh>
            <mesh ref={cheekR} position={[0.2, -0.04, 0.24]}>
              <sphereGeometry args={[0.045, 8, 8]} />
              <meshStandardMaterial color="#e07a86" transparent opacity={0.45} />
            </mesh>
            <group ref={shades} position={[0, 0.05, 0.36]}>
              <RoundedBox args={[0.16, 0.1, 0.03]} radius={0.03} smoothness={2} position={[-0.1, 0, 0]}>
                <meshPhysicalMaterial color="#0a0a0a" roughness={0.08} metalness={0.2} transparent opacity={0.78} emissive="#3a1014" emissiveIntensity={0.18} />
              </RoundedBox>
              <RoundedBox args={[0.16, 0.1, 0.03]} radius={0.03} smoothness={2} position={[0.1, 0, 0]}>
                <meshPhysicalMaterial color="#0a0a0a" roughness={0.08} metalness={0.2} transparent opacity={0.78} emissive="#3a1014" emissiveIntensity={0.18} />
              </RoundedBox>
              <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.012, 0.012, 0.06, 8]} />
                <meshStandardMaterial color="#111111" metalness={0.5} roughness={0.25} />
              </mesh>
              <mesh position={[-0.2, 0.01, -0.04]} rotation={[0, 0.5, 0]}>
                <boxGeometry args={[0.08, 0.012, 0.012]} />
                <meshStandardMaterial color="#111111" metalness={0.4} roughness={0.3} />
              </mesh>
              <mesh position={[0.2, 0.01, -0.04]} rotation={[0, -0.5, 0]}>
                <boxGeometry args={[0.08, 0.012, 0.012]} />
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
              {slot === 'hand' && prop ? <group position={[0.02, -0.12, 0.06]}><ToodlePropMesh prop={prop} /></group> : null}
            </group>
          </group>

          {slot === 'back' && prop ? <ToodlePropMesh prop={prop} /> : null}
          <group ref={sheath} position={[0.16, 0.22, -0.18]} rotation={[0.25, 0.1, -0.8]}>
            <mesh position={[0, -0.16, 0]}>
              <capsuleGeometry args={[0.022, 0.32, 4, 8]} />
              <meshStandardMaterial color="#1a1a1a" roughness={0.38} metalness={0.4} />
            </mesh>
            <mesh position={[0, 0.04, 0]}>
              <boxGeometry args={[0.07, 0.016, 0.028]} />
              <Gold />
            </mesh>
            <mesh position={[0, 0.12, 0]}>
              <cylinderGeometry args={[0.016, 0.018, 0.1, 8]} />
              <meshStandardMaterial color="#2a1214" roughness={0.45} />
            </mesh>
            <mesh position={[0, 0.08, 0]}>
              <torusGeometry args={[0.018, 0.005, 6, 8]} />
              <meshStandardMaterial color="#E32626" roughness={0.4} />
            </mesh>
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
