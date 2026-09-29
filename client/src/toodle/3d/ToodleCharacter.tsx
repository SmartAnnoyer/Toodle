import { useMemo, useRef, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { CanvasTexture, type Group, type Mesh } from 'three';
import type { DanceStyle, ToodleProp } from '../animations';
import { ToodleAnimationController, type BoneName } from './ToodleAnimationController';
import { faceFor } from './ToodleExpressionController';
import { propAnchor, ToodlePropMesh } from './ToodleProps';
import type { ToodleCharacterState } from './state';

function Fur() {
  return <meshStandardMaterial color="#f6f8ff" roughness={0.74} metalness={0.02} emissive="#e0f2fe" emissiveIntensity={0.05} />;
}

function Hoodie() {
  return <meshStandardMaterial color="#3b82f6" roughness={0.58} metalness={0.04} emissive="#1d4ed8" emissiveIntensity={0.06} />;
}

function useHoodieLabel() {
  return useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 96;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 58px Nunito, Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Toodle', 128, 52);
    const texture = new CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, []);
}

function Ear({ flop }: { flop: number }) {
  return (
    <group rotation={[0.1, 0, flop]}>
      <mesh position={[0, 0.34, 0]}>
        <capsuleGeometry args={[0.08, 0.42, 4, 8]} />
        <Fur />
      </mesh>
      <mesh position={[0, 0.2, 0.035]} scale={[0.55, 0.72, 0.25]}>
        <capsuleGeometry args={[0.07, 0.22, 4, 8]} />
        <meshStandardMaterial color="#f9a8d4" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.4, 0.01]}>
        <sphereGeometry args={[0.08, 12, 10]} />
        <meshStandardMaterial color="#7dd3fc" roughness={0.45} emissive="#38bdf8" emissiveIntensity={0.12} />
      </mesh>
    </group>
  );
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
  const label = useHoodieLabel();
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
  const irisL = useRef<Mesh>(null);
  const irisR = useRef<Mesh>(null);
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
      if (name === 'root') group.position.set(part.x, part.y + 0.08, part.z);
      group.rotation.set(part.rx, part.ry, part.rz);
    });
    const face = faceFor(frame.expression, frame.blink, frame.wink);
    const eyeY = face.eyeScale * face.narrow;
    if (eyeL.current) eyeL.current.scale.y = eyeY;
    if (eyeR.current) eyeR.current.scale.y = face.eyeScale * (frame.wink ? 0.08 : face.narrow);
    if (irisL.current) irisL.current.scale.y = eyeY;
    if (irisR.current) irisR.current.scale.y = face.eyeScale * (frame.wink ? 0.08 : face.narrow);
    if (pupilL.current) pupilL.current.position.x = -0.12 + face.pupilX;
    if (pupilR.current) pupilR.current.position.x = 0.12 + face.pupilX;
    if (lidL.current) lidL.current.scale.y = 0.08 + face.lid * 1.2;
    if (lidR.current) lidR.current.scale.y = 0.08 + Math.max(face.lid, frame.wink ? 1 : 0) * 1.2;
    if (browL.current) browL.current.position.y = 0.24 + face.browL;
    if (browR.current) browR.current.position.y = 0.24 + face.browR;
    if (mouth.current) {
      mouth.current.scale.set(1.05 * face.mouthWide, 0.45 + face.mouthOpen * 1.3, 1);
      mouth.current.position.y = -0.16 - face.mouthDrop;
    }
    if (cheekL.current) cheekL.current.scale.setScalar(0.65 + face.cheek * 0.7);
    if (cheekR.current) cheekR.current.scale.setScalar(0.65 + face.cheek * 0.7);
  });

  const slot = propAnchor(prop);

  return (
    <group ref={root} scale={0.82}>
      <group ref={hips} position={[0, 0.72, 0]}>
        <mesh position={[0, 0.02, 0.02]} scale={[1.05, 0.92, 0.86]}>
          <sphereGeometry args={[0.26, 28, 20]} />
          <Hoodie />
        </mesh>
        <mesh position={[0, 0.02, 0.2]} scale={[0.7, 0.62, 0.28]}>
          <sphereGeometry args={[0.16, 16, 12]} />
          <meshStandardMaterial color="#ffffff" roughness={0.5} />
        </mesh>
        <group position={[0, 0.05, 0.24]}>
          <mesh position={[-0.035, 0.02, 0]}>
            <sphereGeometry args={[0.042, 12, 10]} />
            <meshStandardMaterial color="#ffffff" roughness={0.4} />
          </mesh>
          <mesh position={[0.035, 0.02, 0]}>
            <sphereGeometry args={[0.042, 12, 10]} />
            <meshStandardMaterial color="#ffffff" roughness={0.4} />
          </mesh>
          <mesh position={[0, -0.025, 0]} scale={[0.72, 0.85, 0.7]}>
            <sphereGeometry args={[0.042, 12, 10]} />
            <meshStandardMaterial color="#ffffff" roughness={0.4} />
          </mesh>
        </group>
        {label ? (
          <mesh position={[0, -0.08, 0.26]}>
            <planeGeometry args={[0.28, 0.1]} />
            <meshBasicMaterial map={label} transparent depthWrite={false} />
          </mesh>
        ) : null}
        <group position={[0, -0.05, -0.24]} rotation={[0.4, 0, 0.2]}>
          <mesh>
            <sphereGeometry args={[0.13, 16, 12]} />
            <Fur />
          </mesh>
          <mesh position={[0.05, 0.04, -0.06]}>
            <sphereGeometry args={[0.065, 12, 10]} />
            <meshStandardMaterial color="#7dd3fc" roughness={0.45} emissive="#38bdf8" emissiveIntensity={0.15} />
          </mesh>
        </group>
        <group ref={spine}>
          <mesh position={[0, 0.28, 0.02]} scale={[1.15, 0.7, 0.9]}>
            <sphereGeometry args={[0.16, 16, 12]} />
            <Hoodie />
          </mesh>
          <group ref={head} position={[0, 0.58, 0.02]}>
            <mesh position={[0, -0.32, -0.04]} scale={[1.18, 0.38, 0.82]}>
              <sphereGeometry args={[0.42, 20, 14]} />
              <Hoodie />
            </mesh>
            <mesh scale={[1.05, 0.98, 0.98]}>
              <sphereGeometry args={[0.4, 32, 24]} />
              <Fur />
            </mesh>
            <group position={[-0.18, 0.28, -0.02]}>
              <Ear flop={0.55} />
            </group>
            <group position={[0.18, 0.32, -0.02]}>
              <Ear flop={-0.28} />
            </group>
            <mesh ref={eyeL} position={[-0.12, 0.05, 0.32]}>
              <sphereGeometry args={[0.105, 18, 14]} />
              <meshStandardMaterial color="#ffffff" roughness={0.18} />
            </mesh>
            <mesh ref={eyeR} position={[0.12, 0.05, 0.32]}>
              <sphereGeometry args={[0.105, 18, 14]} />
              <meshStandardMaterial color="#ffffff" roughness={0.18} />
            </mesh>
            <mesh ref={irisL} position={[-0.12, 0.045, 0.36]}>
              <sphereGeometry args={[0.09, 16, 12]} />
              <meshStandardMaterial color="#2563eb" emissive="#1d4ed8" emissiveIntensity={0.35} roughness={0.2} />
            </mesh>
            <mesh ref={irisR} position={[0.12, 0.045, 0.36]}>
              <sphereGeometry args={[0.09, 16, 12]} />
              <meshStandardMaterial color="#2563eb" emissive="#1d4ed8" emissiveIntensity={0.35} roughness={0.2} />
            </mesh>
            <mesh ref={pupilL} position={[-0.12, 0.035, 0.43]}>
              <sphereGeometry args={[0.038, 12, 10]} />
              <meshStandardMaterial color="#0b1220" roughness={0.25} />
            </mesh>
            <mesh ref={pupilR} position={[0.12, 0.035, 0.43]}>
              <sphereGeometry args={[0.038, 12, 10]} />
              <meshStandardMaterial color="#0b1220" roughness={0.25} />
            </mesh>
            <mesh position={[-0.14, 0.07, 0.45]}>
              <sphereGeometry args={[0.016, 8, 8]} />
              <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.9} />
            </mesh>
            <mesh position={[0.1, 0.07, 0.45]}>
              <sphereGeometry args={[0.016, 8, 8]} />
              <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.9} />
            </mesh>
            <mesh ref={lidL} position={[-0.12, 0.12, 0.36]} scale={[1.1, 0.08, 1]}>
              <sphereGeometry args={[0.1, 14, 10]} />
              <Fur />
            </mesh>
            <mesh ref={lidR} position={[0.12, 0.12, 0.36]} scale={[1.1, 0.08, 1]}>
              <sphereGeometry args={[0.1, 14, 10]} />
              <Fur />
            </mesh>
            <group ref={browL} position={[-0.12, 0.24, 0.36]} rotation={[0, 0, 0.2]}>
              <mesh rotation={[0, 0, Math.PI / 2]}>
                <capsuleGeometry args={[0.012, 0.09, 3, 6]} />
                <meshStandardMaterial color="#64748b" roughness={0.5} />
              </mesh>
            </group>
            <group ref={browR} position={[0.12, 0.24, 0.36]} rotation={[0, 0, -0.2]}>
              <mesh rotation={[0, 0, Math.PI / 2]}>
                <capsuleGeometry args={[0.012, 0.09, 3, 6]} />
                <meshStandardMaterial color="#64748b" roughness={0.5} />
              </mesh>
            </group>
            <mesh position={[0, -0.05, 0.4]} scale={[1.1, 0.7, 0.55]}>
              <sphereGeometry args={[0.028, 10, 8]} />
              <meshStandardMaterial color="#fb7185" roughness={0.4} />
            </mesh>
            <mesh ref={mouth} position={[0, -0.16, 0.34]} scale={[1.05, 0.55, 0.7]}>
              <sphereGeometry args={[0.07, 16, 12]} />
              <meshStandardMaterial color="#9f1239" roughness={0.45} />
            </mesh>
            <mesh position={[0, -0.15, 0.39]} scale={[0.7, 0.35, 0.4]}>
              <sphereGeometry args={[0.04, 10, 8]} />
              <meshStandardMaterial color="#fda4af" roughness={0.4} />
            </mesh>
            <mesh ref={cheekL} position={[-0.22, -0.04, 0.26]}>
              <sphereGeometry args={[0.06, 12, 10]} />
              <meshStandardMaterial color="#fb7185" transparent opacity={0.38} roughness={0.6} />
            </mesh>
            <mesh ref={cheekR} position={[0.22, -0.04, 0.26]}>
              <sphereGeometry args={[0.06, 12, 10]} />
              <meshStandardMaterial color="#fb7185" transparent opacity={0.38} roughness={0.6} />
            </mesh>
            {slot === 'face' && prop ? <ToodlePropMesh prop={prop} /> : null}
            {slot === 'head' && prop ? <ToodlePropMesh prop={prop} /> : null}
          </group>
          <group ref={armL} position={[-0.28, 0.08, 0.02]}>
            <mesh position={[-0.02, -0.12, 0]}>
              <capsuleGeometry args={[0.065, 0.1, 4, 8]} />
              <Hoodie />
            </mesh>
            <group ref={foreL} position={[0, -0.26, 0]}>
              <mesh position={[0, -0.08, 0]}>
                <sphereGeometry args={[0.075, 14, 12]} />
                <Fur />
              </mesh>
            </group>
          </group>
          <group ref={armR} position={[0.28, 0.08, 0.02]}>
            <mesh position={[0.02, -0.12, 0]}>
              <capsuleGeometry args={[0.065, 0.1, 4, 8]} />
              <Hoodie />
            </mesh>
            <group ref={foreR} position={[0, -0.26, 0]}>
              <mesh position={[0, -0.08, 0]}>
                <sphereGeometry args={[0.075, 14, 12]} />
                <Fur />
              </mesh>
              {slot === 'hand' && prop ? <group position={[0.04, -0.1, 0.08]}><ToodlePropMesh prop={prop} /></group> : null}
            </group>
          </group>
        </group>
        {slot === 'back' && prop ? <ToodlePropMesh prop={prop} /> : null}
        <group ref={legL} position={[-0.1, -0.16, 0.02]}>
          <mesh position={[0, -0.1, 0]}>
            <capsuleGeometry args={[0.055, 0.08, 4, 8]} />
            <Fur />
          </mesh>
          <group ref={shinL} position={[0, -0.2, 0]}>
            <mesh position={[0, -0.06, 0.03]} scale={[1.15, 0.65, 1.4]}>
              <sphereGeometry args={[0.07, 12, 10]} />
              <Hoodie />
            </mesh>
          </group>
        </group>
        <group ref={legR} position={[0.1, -0.16, 0.02]}>
          <mesh position={[0, -0.1, 0]}>
            <capsuleGeometry args={[0.055, 0.08, 4, 8]} />
            <Fur />
          </mesh>
          <group ref={shinR} position={[0, -0.2, 0]}>
            <mesh position={[0, -0.06, 0.03]} scale={[1.15, 0.65, 1.4]}>
              <sphereGeometry args={[0.07, 12, 10]} />
              <Hoodie />
            </mesh>
          </group>
        </group>
      </group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <circleGeometry args={[0.38, 24]} />
        <meshBasicMaterial color="#0f172a" transparent opacity={0.22} />
      </mesh>
    </group>
  );
}
