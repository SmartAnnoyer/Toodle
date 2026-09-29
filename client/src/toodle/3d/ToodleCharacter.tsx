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
    wash.addColorStop(0, '#fff7fb');
    wash.addColorStop(0.38, '#ffd6ea');
    wash.addColorStop(0.7, '#e9d5ff');
    wash.addColorStop(1, '#bfdbfe');
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
      color="#ffe4f1"
      roughness={0.18}
      metalness={0.02}
      clearcoat={1}
      clearcoatRoughness={0.08}
      emissive="#f9a8d4"
      emissiveIntensity={0.08}
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
    const leftY = Math.max(0.14, face.eyeScale * face.narrow * (1 - face.lid * 0.85));
    const rightShut = frame.wink ? 1 : face.lid;
    const rightY = Math.max(0.14, face.eyeScale * (frame.wink ? 0.16 : face.narrow) * (1 - rightShut * 0.85));
    if (eyeL.current) eyeL.current.scale.set(face.eyeScale * 0.92, leftY * 1.15, 0.42);
    if (eyeR.current) eyeR.current.scale.set(face.eyeScale * 0.92, rightY * 1.15, 0.42);
    if (pupilL.current) pupilL.current.position.set(-0.02 + face.pupilX * 0.15, 0.045, 0.1);
    if (pupilR.current) pupilR.current.position.set(-0.02 + face.pupilX * 0.15, 0.045, 0.1);
    if (browL.current) browL.current.position.y = 0.27 + face.browL * 0.12;
    if (browR.current) browR.current.position.y = 0.27 + face.browR * 0.12;
    if (mouth.current) {
      const grin = 0.72 + Math.min(face.mouthOpen, 1) * 0.38;
      mouth.current.scale.set(1.05 * face.mouthWide, grin, 0.55);
      mouth.current.position.y = -0.16 - face.mouthDrop * 0.2;
    }
    if (tongue.current) {
      tongue.current.visible = face.mouthOpen > 0.75;
      tongue.current.position.y = -0.22 - face.mouthDrop * 0.15;
    }
    if (cheekL.current) cheekL.current.scale.setScalar(0.85 + face.cheek * 0.2);
    if (cheekR.current) cheekR.current.scale.setScalar(0.85 + face.cheek * 0.2);
  });

  const slot = propAnchor(prop);

  return (
    <group ref={root}>
      <mesh position={[0, 0.62, -0.2]} scale={[1.15, 0.9, 0.35]}>
        <sphereGeometry args={[0.62, 24, 16]} />
        <meshBasicMaterial color="#c4b5fd" transparent opacity={0.16} depthWrite={false} />
      </mesh>
      <group ref={hips} position={[0, 0.7, 0]}>
        <mesh scale={[0.98, 1.12, 0.9]}>
          <sphereGeometry args={[0.58, 48, 36]} />
          <Jelly map={jelly} />
        </mesh>
        <mesh position={[-0.16, 0.34, 0.38]} scale={[0.55, 0.32, 0.12]}>
          <sphereGeometry args={[0.16, 16, 12]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.7} />
        </mesh>
        <group ref={spine}>
          <group ref={head} position={[0, 0.08, 0.36]}>
            <mesh ref={eyeL} position={[-0.2, 0.14, 0.2]} scale={[0.9, 1.25, 0.38]}>
              <sphereGeometry args={[0.135, 20, 16]} />
              <meshStandardMaterial color="#1a1024" roughness={0.25} />
              <mesh ref={pupilL} position={[-0.02, 0.045, 0.1]}>
                <sphereGeometry args={[0.045, 10, 8]} />
                <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={1.2} />
              </mesh>
            </mesh>
            <mesh ref={eyeR} position={[0.2, 0.14, 0.2]} scale={[0.9, 1.25, 0.38]}>
              <sphereGeometry args={[0.135, 20, 16]} />
              <meshStandardMaterial color="#1a1024" roughness={0.25} />
              <mesh ref={pupilR} position={[-0.02, 0.045, 0.1]}>
                <sphereGeometry args={[0.045, 10, 8]} />
                <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={1.2} />
              </mesh>
            </mesh>
            <group ref={browL} position={[-0.2, 0.34, 0.16]}>
              <mesh rotation={[0, 0, 0.15]}>
                <capsuleGeometry args={[0.008, 0.07, 3, 6]} />
                <meshStandardMaterial color="#9d174d" roughness={0.45} />
              </mesh>
            </group>
            <group ref={browR} position={[0.2, 0.34, 0.16]}>
              <mesh rotation={[0, 0, -0.15]}>
                <capsuleGeometry args={[0.008, 0.07, 3, 6]} />
                <meshStandardMaterial color="#9d174d" roughness={0.45} />
              </mesh>
            </group>
            <mesh ref={mouth} position={[0, -0.16, 0.28]} rotation={[0.25, 0, Math.PI]} scale={[1.2, 0.85, 0.5]}>
              <torusGeometry args={[0.12, 0.028, 12, 22, Math.PI * 1.05]} />
              <meshStandardMaterial color="#3b1028" roughness={0.4} />
            </mesh>
            <mesh ref={tongue} position={[0, -0.22, 0.3]} scale={[0.7, 0.28, 0.18]} visible={false}>
              <sphereGeometry args={[0.04, 12, 8]} />
              <meshStandardMaterial color="#fb7185" />
            </mesh>
            <mesh ref={cheekL} position={[-0.34, 0.04, 0.12]}>
              <sphereGeometry args={[0.05, 12, 10]} />
              <meshStandardMaterial color="#fda4af" transparent opacity={0.5} roughness={0.45} />
            </mesh>
            <mesh ref={cheekR} position={[0.34, 0.04, 0.12]}>
              <sphereGeometry args={[0.05, 12, 10]} />
              <meshStandardMaterial color="#fda4af" transparent opacity={0.5} roughness={0.45} />
            </mesh>
            {slot === 'face' && prop ? <ToodlePropMesh prop={prop} /> : null}
            {slot === 'head' && prop ? <ToodlePropMesh prop={prop} /> : null}
          </group>
          <group ref={armL} position={[-0.5, -0.18, 0.08]}>
            <mesh>
              <sphereGeometry args={[0.1, 16, 12]} />
              <Jelly map={jelly} />
            </mesh>
            <group ref={foreL} />
          </group>
          <group ref={armR} position={[0.5, -0.08, 0.12]}>
            <mesh>
              <sphereGeometry args={[0.11, 16, 12]} />
              <Jelly map={jelly} />
            </mesh>
            <group ref={foreR}>
              {slot === 'hand' && prop ? <group position={[0.08, -0.02, 0.12]}><ToodlePropMesh prop={prop} /></group> : null}
            </group>
          </group>
        </group>
        {slot === 'back' && prop ? <ToodlePropMesh prop={prop} /> : null}
        <group ref={legL} position={[-0.2, -0.58, 0.06]}>
          <mesh>
            <sphereGeometry args={[0.13, 16, 12]} />
            <meshStandardMaterial color="#93c5fd" roughness={0.22} emissive="#60a5fa" emissiveIntensity={0.18} />
          </mesh>
          <group ref={shinL} />
        </group>
        <group ref={legR} position={[0.2, -0.58, 0.06]}>
          <mesh>
            <sphereGeometry args={[0.13, 16, 12]} />
            <meshStandardMaterial color="#93c5fd" roughness={0.22} emissive="#60a5fa" emissiveIntensity={0.18} />
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
