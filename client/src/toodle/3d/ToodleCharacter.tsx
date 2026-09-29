import { useMemo, useRef, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { CanvasTexture, type Group, type Mesh } from 'three';
import type { DanceStyle, ToodleProp } from '../animations';
import { ToodleAnimationController, type BoneName } from './ToodleAnimationController';
import { faceFor } from './ToodleExpressionController';
import { propAnchor, ToodlePropMesh } from './ToodleProps';
import type { ToodleCharacterState } from './state';

function useBlobTexture() {
  return useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const wash = ctx.createLinearGradient(0, 0, 0, 128);
    wash.addColorStop(0, '#fff5f8');
    wash.addColorStop(0.45, '#ffc2dd');
    wash.addColorStop(0.78, '#d8b4fe');
    wash.addColorStop(1, '#a5b4fc');
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, 128, 128);
    const shine = ctx.createRadialGradient(42, 34, 4, 48, 42, 70);
    shine.addColorStop(0, 'rgba(255,255,255,0.85)');
    shine.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = shine;
    ctx.fillRect(0, 0, 128, 128);
    const texture = new CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, []);
}

function Blob({ map }: { map: CanvasTexture | null }) {
  return (
    <meshPhysicalMaterial
      map={map ?? undefined}
      color="#ffd0e4"
      roughness={0.2}
      metalness={0.02}
      clearcoat={1}
      clearcoatRoughness={0.12}
      emissive="#f0abfc"
      emissiveIntensity={0.1}
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
  const blob = useBlobTexture();
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
    const breathe = reduced ? 1 : 1 + Math.sin(performance.now() / 480) * 0.03;
    if (hips.current) hips.current.scale.set(1.06 / breathe, breathe, 1);
    const face = faceFor(frame.expression, frame.blink, frame.wink);
    const leftY = Math.max(0.12, face.eyeScale * face.narrow * (1 - face.lid * 0.9));
    const rightShut = frame.wink ? 1 : face.lid;
    const rightY = Math.max(0.12, face.eyeScale * (frame.wink ? 0.14 : face.narrow) * (1 - rightShut * 0.9));
    if (eyeL.current) eyeL.current.scale.set(face.eyeScale, leftY, 0.45);
    if (eyeR.current) eyeR.current.scale.set(face.eyeScale, rightY, 0.45);
    if (mouth.current) {
      const open = 0.55 + Math.min(face.mouthOpen, 1.1) * 0.45;
      mouth.current.scale.set(face.mouthWide, open, 0.6);
      mouth.current.position.y = -0.18 - face.mouthDrop * 0.15;
      mouth.current.rotation.z = face.mouthDrop > 0.03 ? 0 : Math.PI;
    }
    const blush = 0.7 + face.cheek * 0.35;
    if (cheekL.current) cheekL.current.scale.setScalar(blush);
    if (cheekR.current) cheekR.current.scale.setScalar(blush);
  });

  const slot = propAnchor(prop);

  return (
    <group ref={root}>
      <mesh position={[0, 0.62, -0.25]} scale={[1.2, 0.85, 0.3]}>
        <sphereGeometry args={[0.58, 20, 12]} />
        <meshBasicMaterial color="#c4b5fd" transparent opacity={0.18} depthWrite={false} />
      </mesh>
      <group ref={hips} position={[0, 0.68, 0]}>
        <mesh scale={[1.16, 0.92, 1]}>
          <sphereGeometry args={[0.52, 32, 24]} />
          <Blob map={blob} />
        </mesh>
        <group ref={spine}>
          <group ref={head} position={[0, 0.02, 0.38]}>
            <mesh ref={eyeL} position={[-0.16, 0.1, 0.16]}>
              <sphereGeometry args={[0.1, 16, 12]} />
              <meshStandardMaterial color="#1a1024" roughness={0.3} />
              <mesh position={[-0.02, 0.035, 0.07]}>
                <sphereGeometry args={[0.028, 8, 8]} />
                <meshBasicMaterial color="#ffffff" />
              </mesh>
            </mesh>
            <mesh ref={eyeR} position={[0.16, 0.1, 0.16]}>
              <sphereGeometry args={[0.1, 16, 12]} />
              <meshStandardMaterial color="#1a1024" roughness={0.3} />
              <mesh position={[-0.02, 0.035, 0.07]}>
                <sphereGeometry args={[0.028, 8, 8]} />
                <meshBasicMaterial color="#ffffff" />
              </mesh>
            </mesh>
            <mesh ref={mouth} position={[0, -0.18, 0.2]} rotation={[0.2, 0, Math.PI]}>
              <torusGeometry args={[0.09, 0.022, 8, 16, Math.PI]} />
              <meshStandardMaterial color="#4a1530" roughness={0.45} />
            </mesh>
            <mesh ref={cheekL} position={[-0.28, -0.02, 0.1]}>
              <sphereGeometry args={[0.045, 10, 8]} />
              <meshStandardMaterial color="#fb7185" transparent opacity={0.55} />
            </mesh>
            <mesh ref={cheekR} position={[0.28, -0.02, 0.1]}>
              <sphereGeometry args={[0.045, 10, 8]} />
              <meshStandardMaterial color="#fb7185" transparent opacity={0.55} />
            </mesh>
            {slot === 'face' && prop ? <ToodlePropMesh prop={prop} /> : null}
            {slot === 'head' && prop ? <ToodlePropMesh prop={prop} /> : null}
          </group>
          <group ref={armL} position={[-0.52, -0.08, 0.04]}>
            <mesh>
              <sphereGeometry args={[0.09, 12, 10]} />
              <Blob map={blob} />
            </mesh>
            <group ref={foreL} />
          </group>
          <group ref={armR} position={[0.52, -0.02, 0.06]}>
            <mesh>
              <sphereGeometry args={[0.09, 12, 10]} />
              <Blob map={blob} />
            </mesh>
            <group ref={foreR}>
              {slot === 'hand' && prop ? <group position={[0.06, 0, 0.08]}><ToodlePropMesh prop={prop} /></group> : null}
            </group>
          </group>
        </group>
        {slot === 'back' && prop ? <ToodlePropMesh prop={prop} /> : null}
        <group ref={legL} position={[-0.18, -0.5, 0.04]}>
          <mesh>
            <sphereGeometry args={[0.11, 12, 10]} />
            <meshStandardMaterial color="#a5b4fc" roughness={0.25} emissive="#818cf8" emissiveIntensity={0.15} />
          </mesh>
          <group ref={shinL} />
        </group>
        <group ref={legR} position={[0.18, -0.5, 0.04]}>
          <mesh>
            <sphereGeometry args={[0.11, 12, 10]} />
            <meshStandardMaterial color="#a5b4fc" roughness={0.25} emissive="#818cf8" emissiveIntensity={0.15} />
          </mesh>
          <group ref={shinR} />
        </group>
      </group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <circleGeometry args={[0.42, 20]} />
        <meshBasicMaterial color="#7c3aed" transparent opacity={0.22} />
      </mesh>
    </group>
  );
}
