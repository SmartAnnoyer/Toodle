import { useRef, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group, Mesh } from 'three';
import type { DanceStyle, ToodleProp } from '../animations';
import { ToodleAnimationController, type BoneName } from './ToodleAnimationController';
import { faceFor } from './ToodleExpressionController';
import { propAnchor, ToodlePropMesh } from './ToodleProps';
import type { ToodleCharacterState } from './state';

function Skin() {
  return <meshStandardMaterial color="#f6d3bf" roughness={0.55} metalness={0.02} emissive="#fdba74" emissiveIntensity={0.04} />;
}

function Onesie() {
  return <meshStandardMaterial color="#7c3aed" roughness={0.48} metalness={0.05} emissive="#6d28d9" emissiveIntensity={0.08} />;
}

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
  const pupilL = useRef<Mesh>(null);
  const pupilR = useRef<Mesh>(null);
  const lidL = useRef<Mesh>(null);
  const lidR = useRef<Mesh>(null);
  const eyeL = useRef<Mesh>(null);
  const eyeR = useRef<Mesh>(null);
  const browL = useRef<Group>(null);
  const browR = useRef<Group>(null);
  const mouth = useRef<Mesh>(null);
  const tongue = useRef<Mesh>(null);
  const cheekL = useRef<Mesh>(null);
  const cheekR = useRef<Mesh>(null);
  const bones: Record<BoneName, RefObject<Group>> = {
    root, hips, spine, head, armL, armR, foreL, foreR, legL, legR, shinL, shinR,
  };

  useFrame((_, dt) => {
    controller.setDance(danceStyle);
    const frame = controller.update(dt, { listening, reduced, prop });
    onState?.(frame.state);
    (Object.keys(bones) as BoneName[]).forEach((name) => {
      const group = bones[name].current;
      if (!group) return;
      const part = frame.pose[name];
      if (name === 'root') group.position.set(part.x, part.y + 0.06, part.z);
      group.rotation.set(part.rx, part.ry, part.rz);
    });
    const face = faceFor(frame.expression, frame.blink, frame.wink);
    const leftY = face.eyeScale * face.narrow * (1 - face.lid * 0.92);
    const rightY = face.eyeScale * (frame.wink ? 0.08 : face.narrow) * (1 - Math.max(face.lid, frame.wink ? 1 : 0) * 0.92);
    if (eyeL.current) eyeL.current.scale.set(0.9 * face.eyeScale, Math.max(0.08, leftY), 0.55);
    if (eyeR.current) eyeR.current.scale.set(0.9 * face.eyeScale, Math.max(0.08, rightY), 0.55);
    if (pupilL.current) pupilL.current.position.x = -0.13 + face.pupilX * 1.6;
    if (pupilR.current) pupilR.current.position.x = 0.13 + face.pupilX * 1.6;
    if (lidL.current) lidL.current.scale.y = 0.05 + face.lid;
    if (lidR.current) lidR.current.scale.y = 0.05 + (frame.wink ? 1 : face.lid);
    if (browL.current) {
      browL.current.position.y = 0.22 + face.browL * 0.55;
      browL.current.rotation.z = 0.15 + face.browL * 0.8;
    }
    if (browR.current) {
      browR.current.position.y = 0.22 + face.browR * 0.55;
      browR.current.rotation.z = -0.15 - face.browR * 0.8;
    }
    if (mouth.current) {
      mouth.current.scale.set(face.mouthWide * 1.15, 0.22 + face.mouthOpen * 0.7, 0.35);
      mouth.current.position.y = -0.16 - face.mouthDrop;
    }
    if (tongue.current) tongue.current.scale.y = 0.2 + face.mouthOpen * 0.9;
    if (cheekL.current) cheekL.current.scale.setScalar(0.55 + face.cheek);
    if (cheekR.current) cheekR.current.scale.setScalar(0.55 + face.cheek);
  });

  const slot = propAnchor(prop);

  return (
    <group ref={root} scale={0.9}>
      <group ref={hips} position={[0, 0.42, 0]}>
        <mesh scale={[1, 0.86, 0.82]}>
          <sphereGeometry args={[0.24, 28, 20]} />
          <Onesie />
        </mesh>
        <group position={[0, 0.04, 0.18]}>
          <mesh position={[-0.04, 0.025, 0]}>
            <sphereGeometry args={[0.045, 12, 10]} />
            <meshStandardMaterial color="#fff7fb" roughness={0.4} />
          </mesh>
          <mesh position={[0.04, 0.025, 0]}>
            <sphereGeometry args={[0.045, 12, 10]} />
            <meshStandardMaterial color="#fff7fb" roughness={0.4} />
          </mesh>
          <mesh position={[0, -0.03, 0]} scale={[0.75, 0.9, 0.7]}>
            <sphereGeometry args={[0.045, 12, 10]} />
            <meshStandardMaterial color="#fff7fb" roughness={0.4} />
          </mesh>
        </group>
        <group ref={spine}>
          <group ref={head} position={[0, 0.5, 0]}>
            <mesh>
              <sphereGeometry args={[0.48, 36, 28]} />
              <Skin />
            </mesh>
            <mesh ref={eyeL} position={[-0.15, 0.06, 0.46]} scale={[1, 1.25, 0.45]}>
              <sphereGeometry args={[0.125, 18, 14]} />
              <meshStandardMaterial color="#1a1024" roughness={0.25} />
            </mesh>
            <mesh ref={eyeR} position={[0.15, 0.06, 0.46]} scale={[1, 1.25, 0.45]}>
              <sphereGeometry args={[0.125, 18, 14]} />
              <meshStandardMaterial color="#1a1024" roughness={0.25} />
            </mesh>
            <mesh ref={pupilL} position={[-0.17, 0.12, 0.54]}>
              <sphereGeometry args={[0.022, 8, 8]} />
              <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.95} />
            </mesh>
            <mesh ref={pupilR} position={[0.13, 0.12, 0.54]}>
              <sphereGeometry args={[0.022, 8, 8]} />
              <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.95} />
            </mesh>
            <mesh ref={lidL} position={[-0.15, 0.12, 0.5]} scale={[1.15, 0.05, 0.35]}>
              <sphereGeometry args={[0.09, 12, 8]} />
              <Skin />
            </mesh>
            <mesh ref={lidR} position={[0.15, 0.12, 0.5]} scale={[1.15, 0.05, 0.35]}>
              <sphereGeometry args={[0.09, 12, 8]} />
              <Skin />
            </mesh>
            <group ref={browL} position={[-0.15, 0.24, 0.48]}>
              <mesh rotation={[0, 0, Math.PI / 2]}>
                <capsuleGeometry args={[0.012, 0.09, 3, 6]} />
                <meshStandardMaterial color="#c4a08a" roughness={0.5} />
              </mesh>
            </group>
            <group ref={browR} position={[0.15, 0.24, 0.48]}>
              <mesh rotation={[0, 0, Math.PI / 2]}>
                <capsuleGeometry args={[0.012, 0.09, 3, 6]} />
                <meshStandardMaterial color="#c4a08a" roughness={0.5} />
              </mesh>
            </group>
            <mesh ref={mouth} position={[0, -0.14, 0.48]} scale={[1, 0.55, 0.55]}>
              <sphereGeometry args={[0.095, 16, 12]} />
              <meshStandardMaterial color="#e11d48" roughness={0.4} />
            </mesh>
            <mesh ref={tongue} position={[0, -0.17, 0.54]} scale={[0.7, 0.45, 0.3]}>
              <sphereGeometry args={[0.04, 10, 8]} />
              <meshStandardMaterial color="#fb7185" roughness={0.35} />
            </mesh>
            <mesh ref={cheekL} position={[-0.26, -0.02, 0.36]}>
              <sphereGeometry args={[0.07, 12, 10]} />
              <meshStandardMaterial color="#fb7185" transparent opacity={0.55} roughness={0.55} />
            </mesh>
            <mesh ref={cheekR} position={[0.26, -0.02, 0.36]}>
              <sphereGeometry args={[0.07, 12, 10]} />
              <meshStandardMaterial color="#fb7185" transparent opacity={0.55} roughness={0.55} />
            </mesh>
            {slot === 'face' && prop ? <ToodlePropMesh prop={prop} /> : null}
            {slot === 'head' && prop ? <ToodlePropMesh prop={prop} /> : null}
          </group>
          <group ref={armL} position={[-0.26, 0.16, 0.02]}>
            <mesh position={[-0.02, -0.1, 0]}>
              <capsuleGeometry args={[0.055, 0.08, 4, 8]} />
              <Onesie />
            </mesh>
            <group ref={foreL} position={[0, -0.2, 0]}>
              <mesh position={[0, -0.02, 0]}>
                <sphereGeometry args={[0.07, 12, 10]} />
                <Skin />
              </mesh>
            </group>
          </group>
          <group ref={armR} position={[0.26, 0.16, 0.02]}>
            <mesh position={[0.02, -0.1, 0]}>
              <capsuleGeometry args={[0.055, 0.08, 4, 8]} />
              <Onesie />
            </mesh>
            <group ref={foreR} position={[0, -0.2, 0]}>
              <mesh position={[0, -0.02, 0]}>
                <sphereGeometry args={[0.07, 12, 10]} />
                <Skin />
              </mesh>
              {slot === 'hand' && prop ? <group position={[0.02, -0.04, 0.08]}><ToodlePropMesh prop={prop} /></group> : null}
            </group>
          </group>
        </group>
        {slot === 'back' && prop ? <ToodlePropMesh prop={prop} /> : null}
        <group ref={legL} position={[-0.09, -0.16, 0.02]}>
          <mesh position={[0, -0.06, 0]}>
            <capsuleGeometry args={[0.05, 0.05, 4, 8]} />
            <Onesie />
          </mesh>
          <group ref={shinL} position={[0, -0.12, 0]}>
            <mesh position={[0, -0.02, 0.02]} scale={[1.1, 0.7, 1.25]}>
              <sphereGeometry args={[0.055, 10, 8]} />
              <Skin />
            </mesh>
          </group>
        </group>
        <group ref={legR} position={[0.09, -0.16, 0.02]}>
          <mesh position={[0, -0.06, 0]}>
            <capsuleGeometry args={[0.05, 0.05, 4, 8]} />
            <Onesie />
          </mesh>
          <group ref={shinR} position={[0, -0.12, 0]}>
            <mesh position={[0, -0.02, 0.02]} scale={[1.1, 0.7, 1.25]}>
              <sphereGeometry args={[0.055, 10, 8]} />
              <Skin />
            </mesh>
          </group>
        </group>
      </group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <circleGeometry args={[0.34, 24]} />
        <meshBasicMaterial color="#1b1228" transparent opacity={0.2} />
      </mesh>
    </group>
  );
}
