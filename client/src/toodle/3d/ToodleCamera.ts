import type { Camera } from 'three';

export function followToodle(camera: Camera, focusX: number, dt: number) {
  const desired = focusX * 0.42;
  const step = Math.min(1, dt * 3.2);
  camera.position.x += (desired - camera.position.x) * step;
  camera.lookAt(camera.position.x * 0.35, 0.72, 0);
}
