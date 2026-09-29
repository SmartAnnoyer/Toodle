import { useMemo, useRef, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { CanvasTexture, ExtrudeGeometry, Shape, type Group, type Mesh } from 'three';
import type { DanceStyle, ToodleProp } from '../animations';
import { ToodleAnimationController, type BoneName } from './ToodleAnimationController';
import { faceFor } from './ToodleExpressionController';
import { propAnchor, ToodlePropMesh } from './ToodleProps';
import type { ToodleCharacterState } from './state';

/** Horizontal speech-bubble outline. The tail is part of the silhouette, matching the Toodle logo. */
function speechBubbleShape() {
  const shape = new Shape();
  const rx = 0.86;
  const ry = 0.7;
  const n = 2.2;
  const steps = 140;
  const tailAt = Math.PI * 1.22;
  const tailSpan = 0.46;
  const points: [number, number][] = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = (i / steps) * Math.PI * 2;
    const c = Math.cos(t);
    const s = Math.sin(t);
    let x = Math.sign(c || 1) * rx * Math.abs(c) ** (2 / n);
    let y = Math.sign(s || 1) * ry * Math.abs(s) ** (2 / n);
    let delta = Math.abs(t - tailAt);
    delta = Math.min(delta, Math.PI * 2 - delta);
    if (delta < tailSpan) {
      const u = delta / tailSpan;
      const lobe = Math.cos(u * Math.PI * 0.5) ** 0.85;
      x += -0.2 * lobe;
      y += -0.48 * lobe;
    }
    points.push([x, y]);
  }
  shape.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i += 1) shape.lineTo(points[i][0], points[i][1]);
  shape.closePath();
  return shape;
}

function useBubbleTexture() {
  return useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const wash = ctx.createLinearGradient(20, 10, 230, 250);
    wash.addColorStop(0, '#fff1e4');
    wash.addColorStop(0.28, '#ffd0b8');
    wash.addColorStop(0.52, '#ff9ec8');
    wash.addColorStop(0.78, '#e9b4ff');
    wash.addColorStop(1, '#b9c6ff');
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, 256, 256);
    const shine = ctx.createRadialGradient(78, 62, 6, 90, 78, 120);
    shine.addColorStop(0, 'rgba(255,255,255,0.92)');
    shine.addColorStop(0.35, 'rgba(255,255,255,0.28)');
    shine.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = shine;
    ctx.fillRect(0, 0, 256, 256);
    const texture = new CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, []);
}

function Gloss({ map }: { map: CanvasTexture | null }) {
  return (
    <meshPhysicalMaterial
      map={map ?? undefined}
      color="#ffe4f2"
      roughness={0.18}
      metalness={0.02}
      clearcoat={1}
      clearcoatRoughness={0.08}
      emissive="#f0abfc"
      emissiveIntensity={0.12}
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
  const map = useBubbleTexture();
  const body = useMemo(() => {
    const geo = new ExtrudeGeometry(speechBubbleShape(), {
      depth: 0.42,
      bevelEnabled: true,
      bevelThickness: 0.18,
      bevelSize: 0.16,
      bevelSegments: 8,
      curveSegments: 4,
    });
    geo.computeVertexNormals();
    geo.translate(0, 0.16, -0.3);
    return geo;
  }, []);
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
    const breathe = reduced ? 1 : 1 + Math.sin(performance.now() / 480) * 0.028;
    const fit = 0.58;
    if (hips.current) hips.current.scale.set((1.05 / breathe) * fit, breathe * fit, fit);
    const face = faceFor(frame.expression, frame.blink, frame.wink);
    const leftY = Math.max(0.12, face.eyeScale * face.narrow * (1 - face.lid * 0.9));
    const rightShut = frame.wink ? 1 : face.lid;
    const rightY = Math.max(0.12, face.eyeScale * (frame.wink ? 0.12 : face.narrow) * (1 - rightShut * 0.9));
    if (eyeL.current) eyeL.current.scale.set(face.eyeScale * 0.92, leftY, 0.5);
    if (eyeR.current) eyeR.current.scale.set(face.eyeScale * 0.92, rightY, 0.5);
    if (mouth.current) {
      const open = 0.62 + Math.min(face.mouthOpen, 1.2) * 0.55;
      mouth.current.scale.set(face.mouthWide, open, 0.7);
      mouth.current.position.y = -0.2 - face.mouthDrop * 0.12;
      mouth.current.rotation.z = face.mouthDrop > 0.03 ? 0 : Math.PI;
    }
    const blush = 0.75 + face.cheek * 0.4;
    if (cheekL.current) cheekL.current.scale.set(1.15, blush * 0.7, 0.4);
    if (cheekR.current) cheekR.current.scale.set(1.15, blush * 0.7, 0.4);
    const showBrows = Math.min(1, (Math.abs(face.browL) + Math.abs(face.browR)) * 1.35);
    if (browL.current) {
      browL.current.position.y = 0.32 + face.browL * 0.1;
      browL.current.rotation.z = 0.4 - face.browL;
      (browL.current.material as { opacity: number }).opacity = showBrows;
    }
    if (browR.current) {
      browR.current.position.y = 0.32 + face.browR * 0.1;
      browR.current.rotation.z = -0.4 + face.browR;
      (browR.current.material as { opacity: number }).opacity = showBrows;
    }
  });

  const slot = propAnchor(prop);

  return (
    <group ref={root}>
      <mesh position={[0, 0.72, -0.35]} scale={[1.35, 1.05, 0.2]}>
        <sphereGeometry args={[0.62, 20, 12]} />
        <meshBasicMaterial color="#c4b5fd" transparent opacity={0.2} depthWrite={false} />
      </mesh>
      <group ref={hips} position={[0, 0.62, 0]}>
        <mesh geometry={body}>
          <Gloss map={map} />
        </mesh>
        <group ref={spine}>
          <group ref={head} position={[0.02, 0.28, 0.46]}>
            <mesh ref={eyeL} position={[-0.26, 0.08, 0]}>
              <sphereGeometry args={[0.12, 16, 12]} />
              <meshStandardMaterial color="#1a1024" roughness={0.25} />
              <mesh position={[-0.03, 0.04, 0.07]}>
                <sphereGeometry args={[0.03, 8, 8]} />
                <meshBasicMaterial color="#ffffff" />
              </mesh>
            </mesh>
            <mesh ref={eyeR} position={[0.26, 0.08, 0]}>
              <sphereGeometry args={[0.12, 16, 12]} />
              <meshStandardMaterial color="#1a1024" roughness={0.25} />
              <mesh position={[-0.03, 0.04, 0.07]}>
                <sphereGeometry args={[0.03, 8, 8]} />
                <meshBasicMaterial color="#ffffff" />
              </mesh>
            </mesh>
            <mesh ref={browL} position={[-0.26, 0.34, 0.02]} rotation={[0, 0, 0.4]}>
              <capsuleGeometry args={[0.018, 0.12, 4, 6]} />
              <meshStandardMaterial color="#3b2030" transparent opacity={0.25} />
            </mesh>
            <mesh ref={browR} position={[0.26, 0.34, 0.02]} rotation={[0, 0, -0.4]}>
              <capsuleGeometry args={[0.018, 0.12, 4, 6]} />
              <meshStandardMaterial color="#3b2030" transparent opacity={0.25} />
            </mesh>
            <mesh ref={mouth} position={[0, -0.22, 0.05]} rotation={[0.15, 0, Math.PI]}>
              <torusGeometry args={[0.115, 0.03, 8, 18, Math.PI]} />
              <meshStandardMaterial color="#4a1530" roughness={0.4} />
            </mesh>
            <mesh ref={cheekL} position={[-0.42, -0.02, 0.02]}>
              <sphereGeometry args={[0.055, 10, 8]} />
              <meshStandardMaterial color="#fb7185" transparent opacity={0.55} />
            </mesh>
            <mesh ref={cheekR} position={[0.42, -0.02, 0.02]}>
              <sphereGeometry args={[0.055, 10, 8]} />
              <meshStandardMaterial color="#fb7185" transparent opacity={0.55} />
            </mesh>
            {slot === 'face' && prop ? <ToodlePropMesh prop={prop} /> : null}
            {slot === 'head' && prop ? <ToodlePropMesh prop={prop} /> : null}
          </group>
          <group ref={armL} position={[-1.02, 0.22, 0.16]}>
            <mesh>
              <sphereGeometry args={[0.075, 12, 10]} />
              <Gloss map={map} />
            </mesh>
            <group ref={foreL} />
          </group>
          <group ref={armR} position={[0.98, 0.1, 0.16]}>
            <mesh>
              <sphereGeometry args={[0.075, 12, 10]} />
              <Gloss map={map} />
            </mesh>
            <group ref={foreR}>
              {slot === 'hand' && prop ? <group position={[0.08, 0, 0.06]}><ToodlePropMesh prop={prop} /></group> : null}
            </group>
          </group>
        </group>
        {slot === 'back' && prop ? <ToodlePropMesh prop={prop} /> : null}
        <group ref={legL} />
        <group ref={legR}>
          <group ref={shinL} />
          <group ref={shinR} />
        </group>
      </group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <circleGeometry args={[0.46, 24]} />
        <meshBasicMaterial color="#c084fc" transparent opacity={0.22} />
      </mesh>
    </group>
  );
}
