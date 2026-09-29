import { useRef, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group, Mesh } from 'three';
import type { DanceStyle, ToodleProp } from '../animations';
import { ToodleAnimationController, type BoneName } from './ToodleAnimationController';
import { faceFor } from './ToodleExpressionController';
import { propAnchor, ToodlePropMesh } from './ToodleProps';
import type { ToodleCharacterState } from './state';

function Skin({ color, emissive = '#ff8fb8' }: { color: string; emissive?: string }) {
  return <meshStandardMaterial color={color} roughness={0.32} metalness={0.16} emissive={emissive} emissiveIntensity={0.08} />;
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
      if (name === 'root') group.position.set(part.x, part.y, part.z);
      group.rotation.set(part.rx, part.ry, part.rz);
    });
    const face = faceFor(frame.expression, frame.blink, frame.wink);
    if (eyeL.current) eyeL.current.scale.y = face.eyeScale * face.narrow;
    if (eyeR.current) eyeR.current.scale.y = face.eyeScale * (frame.wink ? 0.12 : face.narrow);
    if (pupilL.current) pupilL.current.position.x = -0.13 + face.pupilX;
    if (pupilR.current) pupilR.current.position.x = 0.13 + face.pupilX;
    if (lidL.current) lidL.current.scale.y = 0.15 + face.lid * 1.15;
    if (lidR.current) lidR.current.scale.y = 0.15 + Math.max(face.lid, frame.wink ? 1 : 0) * 1.15;
    if (browL.current) browL.current.position.y = 0.2 + face.browL;
    if (browR.current) browR.current.position.y = 0.2 + face.browR;
    if (mouth.current) {
      mouth.current.scale.set(0.9 * face.mouthWide, 0.35 + face.mouthOpen, 1);
      mouth.current.position.y = -0.12 - face.mouthDrop;
    }
    if (cheekL.current) cheekL.current.scale.setScalar(0.7 + face.cheek);
    if (cheekR.current) cheekR.current.scale.setScalar(0.7 + face.cheek);
  });

  const slot = propAnchor(prop);

  return (
    <group ref={root} position={[0, 0.08, 0]} scale={0.86}>
      <group ref={hips} position={[0, 0.78, 0]}>
        <mesh position={[0, 0.08, 0]} scale={[1, 0.88, 0.78]}>
          <sphereGeometry args={[0.22, 24, 18]} />
          <Skin color="#f0abfc" emissive="#e879f9" />
        </mesh>
        <mesh position={[0, -0.02, 0.12]} scale={[0.72, 0.62, 0.4]}>
          <sphereGeometry args={[0.2, 18, 14]} />
          <Skin color="#ffe4f3" emissive="#fda4af" />
        </mesh>
        <group ref={spine}>
          <mesh position={[0, 0.34, 0]}>
            <sphereGeometry args={[0.09, 12, 10]} />
            <Skin color="#ffd0c8" />
          </mesh>
          <group ref={head} position={[0, 0.62, 0]}>
            <mesh scale={[1.12, 0.98, 1]}>
              <sphereGeometry args={[0.42, 32, 24]} />
              <Skin color="#ffd0c4" emissive="#fb7185" />
            </mesh>
            <mesh position={[-0.08, -0.28, -0.02]} rotation={[0.2, 0, 0.7]} scale={[0.55, 0.85, 0.45]}>
              <sphereGeometry args={[0.12, 12, 10]} />
              <Skin color="#ffc4d6" emissive="#fb7185" />
            </mesh>
            <mesh ref={eyeL} position={[-0.13, 0.04, 0.32]} scale={[1, 1.15, 0.7]}>
              <sphereGeometry args={[0.09, 16, 12]} />
              <meshStandardMaterial color="#fffaf8" roughness={0.2} />
            </mesh>
            <mesh ref={eyeR} position={[0.13, 0.04, 0.32]} scale={[1, 1.15, 0.7]}>
              <sphereGeometry args={[0.09, 16, 12]} />
              <meshStandardMaterial color="#fffaf8" roughness={0.2} />
            </mesh>
            <mesh ref={pupilL} position={[-0.13, 0.03, 0.38]}>
              <sphereGeometry args={[0.045, 12, 10]} />
              <meshStandardMaterial color="#1b1228" roughness={0.3} />
            </mesh>
            <mesh ref={pupilR} position={[0.13, 0.03, 0.38]}>
              <sphereGeometry args={[0.045, 12, 10]} />
              <meshStandardMaterial color="#1b1228" roughness={0.3} />
            </mesh>
            <mesh position={[-0.15, 0.05, 0.4]}>
              <sphereGeometry args={[0.012, 8, 8]} />
              <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.8} />
            </mesh>
            <mesh position={[0.11, 0.05, 0.4]}>
              <sphereGeometry args={[0.012, 8, 8]} />
              <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.8} />
            </mesh>
            <mesh ref={lidL} position={[-0.13, 0.1, 0.34]} scale={[1, 0.15, 1]}>
              <sphereGeometry args={[0.082, 14, 10]} />
              <Skin color="#ffd0c4" />
            </mesh>
            <mesh ref={lidR} position={[0.13, 0.1, 0.34]} scale={[1, 0.15, 1]}>
              <sphereGeometry args={[0.082, 14, 10]} />
              <Skin color="#ffd0c4" />
            </mesh>
            <group ref={browL} position={[-0.13, 0.18, 0.34]} rotation={[0, 0, 0.15]}>
              <mesh rotation={[0, 0, Math.PI / 2]}>
                <capsuleGeometry args={[0.012, 0.08, 3, 6]} />
                <Skin color="#d4a0a8" emissive="#fb7185" />
              </mesh>
            </group>
            <group ref={browR} position={[0.13, 0.18, 0.34]} rotation={[0, 0, -0.15]}>
              <mesh rotation={[0, 0, Math.PI / 2]}>
                <capsuleGeometry args={[0.012, 0.08, 3, 6]} />
                <Skin color="#d4a0a8" emissive="#fb7185" />
              </mesh>
            </group>
            <mesh ref={mouth} position={[0, -0.14, 0.36]} rotation={[0.4, 0, 0]} scale={[1, 0.7, 0.6]}>
              <torusGeometry args={[0.055, 0.016, 8, 16, Math.PI]} />
              <meshStandardMaterial color="#e11d48" roughness={0.35} />
            </mesh>
            <mesh ref={cheekL} position={[-0.2, -0.04, 0.24]}>
              <sphereGeometry args={[0.055, 12, 10]} />
              <meshStandardMaterial color="#fb7185" transparent opacity={0.55} roughness={0.45} />
            </mesh>
            <mesh ref={cheekR} position={[0.2, -0.04, 0.24]}>
              <sphereGeometry args={[0.055, 12, 10]} />
              <meshStandardMaterial color="#fb7185" transparent opacity={0.55} roughness={0.45} />
            </mesh>
            {slot === 'face' && prop ? <ToodlePropMesh prop={prop} /> : null}
            {slot === 'head' && prop ? <ToodlePropMesh prop={prop} /> : null}
          </group>
          <group ref={armL} position={[-0.24, 0.12, 0]}>
            <mesh position={[0, -0.14, 0]}>
              <capsuleGeometry args={[0.07, 0.12, 4, 8]} />
              <Skin color="#f9a8d4" />
            </mesh>
            <group ref={foreL} position={[0, -0.32, 0]}>
              <mesh position={[0, -0.13, 0]}>
                <capsuleGeometry args={[0.048, 0.12, 4, 8]} />
                <Skin color="#ffd0c4" />
              </mesh>
              <mesh position={[0, -0.26, 0]}>
                <sphereGeometry args={[0.06, 12, 10]} />
                <Skin color="#ffd0c4" />
              </mesh>
            </group>
          </group>
          <group ref={armR} position={[0.24, 0.12, 0]}>
            <mesh position={[0, -0.14, 0]}>
              <capsuleGeometry args={[0.07, 0.12, 4, 8]} />
              <Skin color="#f9a8d4" />
            </mesh>
            <group ref={foreR} position={[0, -0.32, 0]}>
              <mesh position={[0, -0.13, 0]}>
                <capsuleGeometry args={[0.048, 0.12, 4, 8]} />
                <Skin color="#ffd0c4" />
              </mesh>
              <mesh position={[0, -0.26, 0]}>
                <sphereGeometry args={[0.06, 12, 10]} />
                <Skin color="#ffd0c4" />
              </mesh>
              {slot === 'hand' && prop ? <group position={[0, -0.28, 0.02]}><ToodlePropMesh prop={prop} /></group> : null}
            </group>
          </group>
        </group>
        {slot === 'back' && prop ? <ToodlePropMesh prop={prop} /> : null}
        <group ref={legL} position={[-0.12, -0.2, 0]}>
          <mesh position={[0, -0.15, 0]}>
            <capsuleGeometry args={[0.06, 0.14, 4, 8]} />
            <Skin color="#e9a0dc" />
          </mesh>
          <group ref={shinL} position={[0, -0.3, 0]}>
            <mesh position={[0, -0.13, 0]}>
              <capsuleGeometry args={[0.05, 0.12, 4, 8]} />
              <Skin color="#ffd0c4" />
            </mesh>
            <mesh position={[0, -0.26, 0.04]} scale={[1.15, 0.55, 1.45]}>
              <sphereGeometry args={[0.07, 12, 10]} />
              <Skin color="#c084fc" emissive="#a855f7" />
            </mesh>
          </group>
        </group>
        <group ref={legR} position={[0.12, -0.2, 0]}>
          <mesh position={[0, -0.15, 0]}>
            <capsuleGeometry args={[0.06, 0.14, 4, 8]} />
            <Skin color="#e9a0dc" />
          </mesh>
          <group ref={shinR} position={[0, -0.3, 0]}>
            <mesh position={[0, -0.13, 0]}>
              <capsuleGeometry args={[0.05, 0.12, 4, 8]} />
              <Skin color="#ffd0c4" />
            </mesh>
            <mesh position={[0, -0.26, 0.04]} scale={[1.15, 0.55, 1.45]}>
              <sphereGeometry args={[0.07, 12, 10]} />
              <Skin color="#c084fc" emissive="#a855f7" />
            </mesh>
          </group>
        </group>
      </group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <circleGeometry args={[0.42, 24]} />
        <meshBasicMaterial color="#1b1228" transparent opacity={0.28} />
      </mesh>
    </group>
  );
}
