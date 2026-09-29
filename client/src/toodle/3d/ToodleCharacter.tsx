import { useMemo, useRef, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { CanvasTexture, ExtrudeGeometry, Shape, type Group, type Mesh } from 'three';
import type { DanceStyle, ToodleProp } from '../animations';
import { ToodleAnimationController, type BoneName } from './ToodleAnimationController';
import { faceFor } from './ToodleExpressionController';
import { propAnchor, ToodlePropMesh } from './ToodleProps';
import type { ToodleCharacterState } from './state';

function quad(a: [number, number], b: [number, number], c: [number, number], steps: number) {
  const points: [number, number][] = [];
  for (let i = 1; i <= steps; i += 1) {
    const t = i / steps;
    const u = 1 - t;
    points.push([
      u * u * a[0] + 2 * u * t * b[0] + t * t * c[0],
      u * u * a[1] + 2 * u * t * b[1] + t * t * c[1],
    ]);
  }
  return points;
}

/** The Toodle logo outline: a round speech bubble with its tail in the same contour. */
function speechBubbleShape() {
  const shape = new Shape();
  const rx = 0.84;
  const ry = 0.8;
  const leave = 1.12 * Math.PI;
  const back = 1.4 * Math.PI;
  const arc: [number, number][] = [];
  const steps = 110;
  for (let i = 0; i <= steps; i += 1) {
    const t = back + (i / steps) * (leave + Math.PI * 2 - back);
    arc.push([Math.cos(t) * rx, Math.sin(t) * ry]);
  }
  const tip: [number, number] = [-0.4, -1.12];
  const points = [
    ...arc,
    ...quad(arc[arc.length - 1], [-1.0, -0.52], tip, 24),
    ...quad(tip, [-0.48, -1.08], arc[0], 24),
  ];
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
      depth: 0.045,
      bevelEnabled: true,
      bevelThickness: 0.035,
      bevelSize: 0.028,
      bevelSegments: 3,
      curveSegments: 2,
    });
    geo.computeVertexNormals();
    geo.center();
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
    const breathe = reduced ? 1 : 1 + Math.sin(performance.now() / 480) * 0.02;
    const fit = 0.74;
    if (hips.current) hips.current.scale.set((1.03 / breathe) * fit, breathe * fit, fit * 0.85);
    const face = faceFor(frame.expression, frame.blink, frame.wink);
    const leftY = Math.max(0.12, face.eyeScale * face.narrow * (1 - face.lid * 0.9));
    const rightShut = frame.wink ? 1 : face.lid;
    const rightY = Math.max(0.12, face.eyeScale * (frame.wink ? 0.12 : face.narrow) * (1 - rightShut * 0.9));
    if (eyeL.current) eyeL.current.scale.set(face.eyeScale * 0.9, leftY, 0.28);
    if (eyeR.current) eyeR.current.scale.set(face.eyeScale * 0.9, rightY, 0.28);
    if (mouth.current) {
      const open = 0.62 + Math.min(face.mouthOpen, 1.2) * 0.55;
      mouth.current.scale.set(face.mouthWide, open, 0.7);
      mouth.current.position.y = -0.2 - face.mouthDrop * 0.1;
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
      <group ref={hips} position={[0, 0.68, 0]}>
        <mesh geometry={body}>
          <Gloss map={map} />
        </mesh>
        <group ref={spine}>
          <group ref={head} position={[0.02, 0.16, 0.1]}>
            <mesh ref={eyeL} position={[-0.26, 0.1, 0]}>
              <sphereGeometry args={[0.13, 16, 12]} />
              <meshStandardMaterial color="#1a1024" roughness={0.25} />
              <mesh position={[-0.03, 0.04, 0.07]}>
                <sphereGeometry args={[0.03, 8, 8]} />
                <meshBasicMaterial color="#ffffff" />
              </mesh>
            </mesh>
            <mesh ref={eyeR} position={[0.26, 0.1, 0]}>
              <sphereGeometry args={[0.13, 16, 12]} />
              <meshStandardMaterial color="#1a1024" roughness={0.25} />
              <mesh position={[-0.03, 0.04, 0.07]}>
                <sphereGeometry args={[0.03, 8, 8]} />
                <meshBasicMaterial color="#ffffff" />
              </mesh>
            </mesh>
            <mesh ref={browL} position={[-0.24, 0.32, 0.01]} rotation={[0, 0, 0.4]}>
              <capsuleGeometry args={[0.018, 0.12, 4, 6]} />
              <meshStandardMaterial color="#3b2030" transparent opacity={0.25} />
            </mesh>
            <mesh ref={browR} position={[0.24, 0.32, 0.01]} rotation={[0, 0, -0.4]}>
              <capsuleGeometry args={[0.018, 0.12, 4, 6]} />
              <meshStandardMaterial color="#3b2030" transparent opacity={0.25} />
            </mesh>
            <mesh ref={mouth} position={[0, -0.2, 0.02]} rotation={[0.1, 0, Math.PI]}>
              <torusGeometry args={[0.12, 0.028, 8, 18, Math.PI]} />
              <meshStandardMaterial color="#4a1530" roughness={0.4} />
            </mesh>
            <mesh ref={cheekL} position={[-0.4, -0.02, 0.01]}>
              <sphereGeometry args={[0.055, 10, 8]} />
              <meshStandardMaterial color="#fb7185" transparent opacity={0.55} />
            </mesh>
            <mesh ref={cheekR} position={[0.4, -0.02, 0.01]}>
              <sphereGeometry args={[0.055, 10, 8]} />
              <meshStandardMaterial color="#fb7185" transparent opacity={0.55} />
            </mesh>
            {slot === 'face' && prop ? <ToodlePropMesh prop={prop} /> : null}
            {slot === 'head' && prop ? <ToodlePropMesh prop={prop} /> : null}
          </group>
          <group ref={armL} position={[-0.9, 0.02, 0.04]}>
            <mesh>
              <sphereGeometry args={[0.05, 12, 10]} />
              <Gloss map={map} />
            </mesh>
            <group ref={foreL} />
          </group>
          <group ref={armR} position={[0.86, 0.06, 0.04]}>
            <mesh>
              <sphereGeometry args={[0.05, 12, 10]} />
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
