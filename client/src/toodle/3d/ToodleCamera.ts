import type { Camera } from 'three';

export function followToodle(camera: Camera, dt: number) {
  const step = Math.min(1, dt * 3.2);
  camera.position.x += (0 - camera.position.x) * step;
  camera.lookAt(0, 0.78, 0);
}
