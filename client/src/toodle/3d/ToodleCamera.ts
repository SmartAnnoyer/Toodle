import type { Camera } from 'three';

export function followToodle(camera: Camera, dt: number, focusX = 0, distance = 4.7) {
  const step = Math.min(1, dt * 4);
  camera.position.x += (focusX - camera.position.x) * step;
  camera.position.z += (distance - camera.position.z) * step;
  camera.lookAt(camera.position.x, 0.98, 0);
}
