import { Canvas, useFrame } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import type { DanceStyle, ToodleProp } from '../animations';
import { followToodle } from './ToodleCamera';
import { ToodleAnimationController } from './ToodleAnimationController';
import { ToodleLighting } from './ToodleLighting';
import { ToodleModel } from './ToodleModel';

function CameraRig({ controller }: { controller: ToodleAnimationController }) {
  useFrame((state, dt) => {
    followToodle(state.camera, controller.focusX, dt);
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
}: {
  animation: string | null;
  playId: string;
  danceStyle: DanceStyle;
  prop?: ToodleProp;
  listening: boolean;
  reduced: boolean;
  paused: boolean;
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
      camera={{ position: [0, 0.86, 5.1], fov: 26, near: 0.1, far: 30 }}
      style={{ width: '100%', height: '100%', pointerEvents: 'none', touchAction: 'auto' }}
      onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
    >
      <ToodleLighting />
      <CameraRig controller={controller} />
      <ToodleModel controller={controller} danceStyle={danceStyle} prop={prop} listening={listening} reduced={reduced} />
    </Canvas>
  );
}
