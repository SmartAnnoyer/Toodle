import { Canvas, useFrame } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import type { PerspectiveCamera } from 'three';
import type { DanceStyle, ToodleProp } from '../animations';
import { followToodle } from './ToodleCamera';
import { ToodleAnimationController } from './ToodleAnimationController';
import { ToodleLighting } from './ToodleLighting';
import { ToodleModel } from './ToodleModel';

function CameraRig({
  controller,
  glance,
  animation,
  onPlace,
}: {
  controller: ToodleAnimationController;
  glance: 'left' | 'right' | 'center';
  animation: string | null;
  onPlace?: (x: number) => void;
}) {
  useFrame((state, dt) => {
    controller.setHalfWidth(state.viewport.width / 2);
    controller.setGlance(glance);
    followToodle(state.camera, dt, controller.focusX, animation === 'sword_fight' ? 4.7 : 3.85);
    const cam = state.camera as PerspectiveCamera;
    const { width, height } = state.size;
    if (width > 0 && height > 0) cam.setViewOffset(width, height, width * 0.24, 0, width, height);
    if (!onPlace) return;
    const nudge = glance === 'right' ? 0.06 : glance === 'left' ? -0.04 : 0;
    onPlace(Math.min(0.4, Math.max(0.16, 0.26 + nudge)));
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
  glance,
  onPlace,
}: {
  animation: string | null;
  playId: string;
  danceStyle: DanceStyle;
  prop?: ToodleProp;
  listening: boolean;
  reduced: boolean;
  paused: boolean;
  glance: 'left' | 'right' | 'center';
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
      gl={{ alpha: true, antialias: true, premultipliedAlpha: false, powerPreference: 'high-performance' }}
      camera={{ position: [0, 0.92, 4.7], fov: 30, near: 0.1, far: 30 }}
      style={{ width: '100%', height: '100%', background: 'transparent', pointerEvents: 'none', touchAction: 'auto' }}
      onCreated={({ gl, scene }) => {
        scene.background = null;
        gl.setClearColor(0x000000, 0);
        gl.domElement.style.background = 'transparent';
      }}
    >
      <ToodleLighting />
      <CameraRig controller={controller} glance={glance} animation={animation} onPlace={onPlace} />
      <ToodleModel controller={controller} danceStyle={danceStyle} prop={prop} listening={listening} reduced={reduced} />
    </Canvas>
  );
}
