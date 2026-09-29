import { useMemo, useRef, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { CanvasTexture, type Group, type Mesh } from 'three';
import type { DanceStyle, ToodleProp } from '../animations';
import { ToodleAnimationController, type BoneName } from './ToodleAnimationController';
import { faceFor } from './ToodleExpressionController';
import { propAnchor, ToodlePropMesh } from './ToodleProps';
import type { ToodleCharacterState } from './state';

function useJellyTexture() {
  return useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const wash = ctx.createLinearGradient(0, 0, 40, 256);
    wash.addColorStop(0, '#fff1f8');
    wash.addColorStop(0.42, '#f9a8d4');
    wash.addColorStop(0.72, '#c084fc');
    wash.addColorStop(1, '#7dd3fc');
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, 256, 256);
    const glow = ctx.createRadialGradient(92, 74, 8, 110, 90, 140);
    glow.addColorStop(0, 'rgba(255,255,255,0.92)');
    glow.addColorStop(0.35, 'rgba(255,255,255,0.18)');
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, 256, 256);
    const texture = new CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, []);
}

function Jelly({ map }: { map: CanvasTexture | null }) {
  return (
    <meshPhysicalMaterial
      map={map ?? undefined}
      color="#fbcfe8"
      roughness={0.16}
      metalness={0.04}
      clearcoat={1}
      clearcoatRoughness={0.12}
      emissive="#e879f9"
      emissiveIntensity={0.18}
    />
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
  const jelly = useJellyTexture();
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
      if (name === 'root') group.position.set(part.x, part.y, part.z);
      group.rotation.set(part.rx, part.ry, part.rz);
    });
    const face = faceFor(frame.expression, frame.blink, frame.wink);
    const leftY = Math.max(0.12, face.eyeScale * face.narrow * (1 - face.lid * 0.85));
    const rightShut = frame.wink ? 1 : face.lid;
    const rightY = Math.max(0.12, face.eyeScale * (frame.wink ? 0.16 : face.narrow) * (1 - rightShut * 0.85));
    if (eyeL.current) eyeL.current.scale.set(face.eyeScale, leftY, 0.55);
    if (eyeR.current) eyeR.current.scale.set(face.eyeScale, rightY, 0.55);
    if (pupilL.current) pupilL.current.position.x = -0.16 + face.pupilX;
    if (pupilR.current) pupilR.current.position.x = 0.1 + face.pupilX;
    if (browL.current) browL.current.position.y = 0.28 + face.browL * 0.35;
    if (browR.current) browR.current.position.y = 0.28 + face.browR * 0.35;
    if (mouth.current) {
      mouth.current.scale.set(0.9 * face.mouthWide, 0.35 + face.mouthOpen * 0.85, 0.4);
      mouth.current.position.y = -0.12 - face.mouthDrop;
    }
    if (tongue.current) tongue.current.visible = face.mouthOpen > 0.6;
    if (cheekL.current) cheekL.current.scale.setScalar(0.7 + face.cheek * 0.45);
    if (cheekR.current) cheekR.current.scale.setScalar(0.7 + face.cheek * 0.45);
  });

  const slot = propAnchor(prop);

  return (
    <group ref={root}>
      <mesh position={[0, 0.55, -0.15]} scale={[1.3, 1.05, 0.4]}>
        <sphereGeometry args={[0.7, 24, 16]} />
        <meshBasicMaterial color="#e879f9" transparent opacity={0.22} depthWrite={false} />
      </mesh>
      <group ref={hips} position={[0, 0.62, 0]}>
        <mesh scale={[1.08, 0.96, 0.92]}>
          <sphereGeometry args={[0.62, 40, 32]} />
          <Jelly map={jelly} />
        </mesh>
        <mesh position={[0.12, 0.28, 0.42]} scale={[0.7, 0.45, 0.2]}>
          <sphereGeometry args={[0.16, 16, 12]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.55} />
        </mesh>
        <group ref={spine}>
          <group ref={head} position={[0, 0.05, 0.34]}>
            <mesh ref={eyeL} position={[-0.16, 0.08, 0.28]} scale={[1, 1.15, 0.45]}>
              <sphereGeometry args={[0.11, 18, 14]} />
              <meshStandardMaterial color="#1b1228" roughness={0.2} />
            </mesh>
            <mesh ref={eyeR} position={[0.16, 0.08, 0.28]} scale={[1, 1.15, 0.45]}>
              <sphereGeometry args={[0.11, 18, 14]} />
              <meshStandardMaterial color="#1b1228" roughness={0.2} />
            </mesh>
            <mesh ref={pupilL} position={[-0.18, 0.12, 0.36]}>
              <sphereGeometry args={[0.028, 8, 8]} />
              <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={1} />
            </mesh>
            <mesh ref={pupilR} position={[0.12, 0.12, 0.36]}>
              <sphereGeometry args={[0.028, 8, 8]} />
              <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={1} />
            </mesh>
            <group ref={browL} position={[-0.16, 0.26, 0.22]}>
              <mesh rotation={[0, 0, 0.2]}>
                <capsuleGeometry args={[0.012, 0.08, 3, 6]} />
                <meshStandardMaterial color="#9d174d" roughness={0.4} />
              </mesh>
            </group>
            <group ref={browR} position={[0.16, 0.26, 0.22]}>
              <mesh rotation={[0, 0, -0.2]}>
                <capsuleGeometry args={[0.012, 0.08, 3, 6]} />
                <meshStandardMaterial color="#9d174d" roughness={0.4} />
              </mesh>
            </group>
            <mesh ref={mouth} position={[0, -0.12, 0.3]} scale={[1, 0.55, 0.4]}>
              <sphereGeometry args={[0.09, 16, 12]} />
              <meshStandardMaterial color="#be123c" roughness={0.35} />
            </mesh>
            <mesh ref={tongue} position={[0, -0.14, 0.34]} visible={false}>
              <sphereGeometry args={[0.035, 10, 8]} />
              <meshStandardMaterial color="#fb7185" />
            </mesh>
            <mesh ref={cheekL} position={[-0.28, -0.02, 0.16]}>
              <sphereGeometry args={[0.07, 12, 10]} />
              <meshStandardMaterial color="#fb7185" transparent opacity={0.72} roughness={0.4} />
            </mesh>
            <mesh ref={cheekR} position={[0.28, -0.02, 0.16]}>
              <sphereGeometry args={[0.07, 12, 10]} />
              <meshStandardMaterial color="#fb7185" transparent opacity={0.72} roughness={0.4} />
            </mesh>
            {slot === 'face' && prop ? <ToodlePropMesh prop={prop} /> : null}
            {slot === 'head' && prop ? <ToodlePropMesh prop={prop} /> : null}
          </group>
          <group ref={armL} position={[-0.58, 0.05, 0.08]}>
            <mesh>
              <sphereGeometry args={[0.11, 16, 12]} />
              <Jelly map={jelly} />
            </mesh>
            <group ref={foreL} />
          </group>
          <group ref={armR} position={[0.58, 0.12, 0.12]}>
            <mesh>
              <sphereGeometry args={[0.13, 16, 12]} />
              <Jelly map={jelly} />
            </mesh>
            <group ref={foreR}>
              {slot === 'hand' && prop ? <group position={[0.08, -0.02, 0.12]}><ToodlePropMesh prop={prop} /></group> : null}
            </group>
          </group>
        </group>
        {slot === 'back' && prop ? <ToodlePropMesh prop={prop} /> : null}
        <group ref={legL} position={[-0.22, -0.52, 0.08]}>
          <mesh>
            <sphereGeometry args={[0.12, 14, 12]} />
            <meshStandardMaterial color="#c4b5fd" roughness={0.28} emissive="#818cf8" emissiveIntensity={0.15} />
          </mesh>
          <group ref={shinL} />
        </group>
        <group ref={legR} position={[0.22, -0.52, 0.08]}>
          <mesh>
            <sphereGeometry args={[0.12, 14, 12]} />
            <meshStandardMaterial color="#c4b5fd" roughness={0.28} emissive="#818cf8" emissiveIntensity={0.15} />
          </mesh>
          <group ref={shinR} />
        </group>
      </group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <circleGeometry args={[0.55, 28]} />
        <meshBasicMaterial color="#7c3aed" transparent opacity={0.28} />
      </mesh>
    </group>
  );
}
