import { Canvas, useFrame } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import type { DanceStyle, ToodleProp } from '../animations';
import { followToodle } from './ToodleCamera';
import { ToodleAnimationController } from './ToodleAnimationController';
import { ToodleLighting } from './ToodleLighting';
import { ToodleModel } from './ToodleModel';

function CameraRig({ controller, onPlace }: { controller: ToodleAnimationController; onPlace?: (x: number) => void }) {
  useFrame((state, dt) => {
    controller.setHalfWidth(state.viewport.width / 2);
    followToodle(state.camera, dt);
    if (!onPlace || controller.halfW <= 0) return;
    const norm = (controller.focusX / controller.halfW + 1) / 2;
    onPlace(Math.min(0.9, Math.max(0.1, norm)));
  });
  return null;
}

export default function ToodleScene({
  animation,
  playId,
  danceStyle,
  prop,
  listening,
  reduced,
  paused,
  onPlace,
}: {
  animation: string | null;
  playId: string;
  danceStyle: DanceStyle;
  prop?: ToodleProp;
  listening: boolean;
  reduced: boolean;
  paused: boolean;
  onPlace?: (x: number) => void;
}) {
  const controller = useMemo(() => new ToodleAnimationController(), []);
  useEffect(() => {
    controller.setReaction(animation, playId);
  }, [controller, animation, playId]);

  return (
    <Canvas
      dpr={[1, 1.5]}
      frameloop={paused ? 'demand' : 'always'}
      gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
      camera={{ position: [0, 0.72, 4.15], fov: 30, near: 0.1, far: 30 }}
      style={{ width: '100%', height: '100%', pointerEvents: 'none', touchAction: 'auto' }}
      onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
    >
      <ToodleLighting />
      <CameraRig controller={controller} onPlace={onPlace} />
      <ToodleModel controller={controller} danceStyle={danceStyle} prop={prop} listening={listening} reduced={reduced} />
    </Canvas>
  );
}
