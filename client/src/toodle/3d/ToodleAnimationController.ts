import type { DanceStyle } from '../animations';
import { expressionFor, moodFor } from './ToodleExpressionController';
import type { ToodleCharacterState, ToodleExpression } from './state';

export const BONES = ['root', 'hips', 'spine', 'head', 'armL', 'armR', 'foreL', 'foreR', 'legL', 'legR', 'shinL', 'shinR'] as const;
export type BoneName = (typeof BONES)[number];

export interface BonePose {
  x: number;
  y: number;
  z: number;
  rx: number;
  ry: number;
  rz: number;
}

export type Pose = Record<BoneName, BonePose>;

function bone(partial: Partial<BonePose> = {}): BonePose {
  return { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, ...partial };
}

function pose(over: Partial<Record<BoneName, Partial<BonePose>>> = {}): Pose {
  const next = {} as Pose;
  for (const name of BONES) next[name] = bone(over[name]);
  return next;
}

function lerpBone(a: BonePose, b: BonePose, t: number): BonePose {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: a.z + (b.z - a.z) * t,
    rx: a.rx + (b.rx - a.rx) * t,
    ry: a.ry + (b.ry - a.ry) * t,
    rz: a.rz + (b.rz - a.rz) * t,
  };
}

function lerpPose(a: Pose, b: Pose, t: number): Pose {
  const next = {} as Pose;
  for (const name of BONES) next[name] = lerpBone(a[name], b[name], t);
  return next;
}

function smooth(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

function patrol(t: number, period: number) {
  const cycle = ((t % period) + period) % period;
  const p = cycle / period;
  const forward = p < 0.5;
  const amount = forward ? p * 2 : (1 - p) * 2;
  return { amount, forward };
}

function gait(t: number, speed: number, stride: number, localX = 0, faceAway = false, run = false): Pose {
  const s = Math.sin(t * speed);
  const bob = Math.abs(s);
  const liftL = Math.max(0, -s);
  const liftR = Math.max(0, s);
  return pose({
    root: {
      x: localX,
      y: (run ? 0.04 : 0.015) + bob * (run ? 0.12 : 0.055),
      ry: faceAway ? Math.PI : 0,
      rz: s * (run ? 0.07 : 0.045),
    },
    hips: { ry: s * (run ? 0.28 : 0.18), rz: s * 0.07 },
    spine: { rx: run ? 0.34 : 0.08, ry: -s * 0.1, rz: -s * 0.05 },
    head: { rx: run ? -0.18 : -0.12, ry: -s * 0.14, rz: s * (run ? 0.08 : 0.05) },
    armL: { rx: s * stride * (run ? 1.2 : 0.9), rz: 0.18 },
    armR: { rx: -s * stride * (run ? 1.2 : 0.9), rz: -0.18 },
    foreL: { rx: run ? -0.85 - liftR * 0.45 : -0.35 },
    foreR: { rx: run ? -0.85 - liftL * 0.45 : -0.35 },
    legL: { rx: s * stride * (run ? 1.2 : 1) },
    legR: { rx: -s * stride * (run ? 1.2 : 1) },
    shinL: { rx: liftL * stride * (run ? 1.45 : 1.15) },
    shinR: { rx: liftR * stride * (run ? 1.45 : 1.15) },
  });
}

function downed(): Pose {
  return pose({
    root: { rz: 1.2, rx: 0.32, y: -0.5, x: 0.16 },
    spine: { rx: 0.28 },
    head: { rx: 0.42, rz: 0.22 },
    armL: { rx: -0.25, rz: 1.2 },
    armR: { rx: 0.15, rz: -1.3 },
    foreL: { rx: -0.55 },
    foreR: { rx: -0.75 },
    legL: { rx: -0.5, rz: 0.3 },
    legR: { rx: 0.9 },
    shinL: { rx: 1.2 },
    shinR: { rx: 1.05 },
  });
}

function dancePose(t: number, style: DanceStyle): Pose {
  const s = Math.sin(t * 7);
  const c = Math.cos(t * 7);
  const beat = Math.abs(s);
  if (style === 'victory') {
    return pose({
      root: { y: Math.max(0, Math.sin(t * 7)) * 0.2, rz: s * 0.06 },
      spine: { rx: -0.12 },
      head: { rx: -0.18, rz: s * 0.14 },
      armL: { rx: -2.6, rz: 0.3 + s * 0.25 },
      armR: { rx: -2.6, rz: -0.3 - s * 0.25 },
      foreL: { rx: -0.25 },
      foreR: { rx: -0.25 },
      legL: { rx: -0.35 },
      legR: { rx: beat * 0.45 },
      shinR: { rx: beat * 0.4 },
    });
  }
  if (style === 'chaotic') {
    return pose({
      root: { y: beat * 0.12, rz: s * 0.18, ry: s * 0.25 },
      hips: { ry: s * 0.7, rz: c * 0.12 },
      spine: { rx: c * 0.22, rz: s * 0.28 },
      head: { rz: -s * 0.4, ry: c * 0.3, rx: -0.08 },
      armL: { rx: -1.5 + s * 1.2, rz: 0.8 },
      armR: { rx: -0.3 - s * 1.3, rz: -1.1 },
      foreL: { rx: -0.9 + c * 0.4 },
      foreR: { rx: -1.2 },
      legL: { rx: s * 0.7 },
      legR: { rx: -c * 0.7 },
      shinL: { rx: Math.max(0, -s) * 0.6 },
      shinR: { rx: Math.max(0, c) * 0.6 },
    });
  }
  if (style === 'silly') {
    return pose({
      root: { y: beat * 0.08, rz: s * 0.1 },
      hips: { rz: s * 0.28, ry: c * 0.2 },
      head: { rz: -s * 0.35, rx: 0.16 },
      armL: { rx: -0.5, rz: 1.1 + s * 0.4 },
      armR: { rx: -1.8, rz: -0.25 },
      foreL: { rx: -0.4 + c * 0.5 },
      foreR: { rx: -1.1 },
      legL: { rx: 0.25 + s * 0.2 },
      shinL: { rx: 0.45 },
      legR: { rx: -0.2 },
    });
  }
  return pose({
    root: { y: beat * 0.1, rz: s * 0.07 },
    hips: { ry: s * 0.5, rz: c * 0.06 },
    spine: { rx: 0.06, ry: -s * 0.18 },
    head: { rz: -s * 0.24, rx: -0.06 },
    armL: { rx: -1.5 + s * 0.95, rz: 0.55 },
    armR: { rx: -0.45 - s * 0.95, rz: -0.75 },
    foreL: { rx: -0.35 + c * 0.45 },
    foreR: { rx: -1.05 },
    legL: { rx: -Math.max(0, s) * 0.6 },
    legR: { rx: Math.max(0, -s) * 0.5 },
    shinL: { rx: Math.max(0, s) * 0.55 },
    shinR: { rx: Math.max(0, -s) * 0.45 },
  });
}

const CLIPS: Record<string, { duration: number; loop: boolean; sample: (t: number, style: DanceStyle) => Pose }> = {
  idle: {
    duration: 3.2,
    loop: true,
    sample: (t) => pose({
      root: { y: Math.sin(t * 1.7) * 0.03 },
      spine: { rx: Math.sin(t * 1.6) * 0.04 },
      head: { ry: 0, rx: -0.06 + Math.sin(t * 0.7) * 0.015 },
      armL: { rz: 0.12 },
      armR: { rz: -0.12 },
      foreL: { rx: -0.15 },
      foreR: { rx: -0.15 },
    }),
  },
  walk: {
    duration: 3.2,
    loop: true,
    sample: (t) => {
      const step = patrol(t, 3.2);
      return gait(t, 8, 0.9, step.amount * 0.92, !step.forward);
    },
  },
  run: {
    duration: 1.8,
    loop: true,
    sample: (t) => {
      const step = patrol(t, 1.8);
      return gait(t, 14, 1.15, step.amount * 0.85, !step.forward, true);
    },
  },
  jump: {
    duration: 0.7,
    loop: false,
    sample: (t) => {
      const p = Math.sin(Math.min(1, t / 0.7) * Math.PI);
      return pose({
        root: { y: p * 0.38 },
        legL: { rx: -0.5 * p },
        legR: { rx: -0.5 * p },
        shinL: { rx: 0.7 * p },
        shinR: { rx: 0.7 * p },
        armL: { rx: -1.4 * p },
        armR: { rx: -1.4 * p },
      });
    },
  },
  dance: { duration: 1.6, loop: true, sample: (t, style) => dancePose(t, style) },
  sit: {
    duration: 0.6,
    loop: true,
    sample: () => pose({
      root: { y: -0.28 },
      spine: { rx: 0.12 },
      legL: { rx: -1.25 },
      legR: { rx: -1.25 },
      shinL: { rx: 1.55 },
      shinR: { rx: 1.55 },
      armL: { rx: -0.35 },
      armR: { rx: -0.35 },
      foreL: { rx: -0.7 },
      foreR: { rx: -0.7 },
    }),
  },
  sleep: {
    duration: 2.4,
    loop: true,
    sample: (t) => pose({
      root: { y: -0.32 },
      spine: { rx: 0.35 + Math.sin(t * 1.2) * 0.03 },
      head: { rx: 0.55 },
      legL: { rx: -1.2 },
      legR: { rx: -1.2 },
      shinL: { rx: 1.4 },
      shinR: { rx: 1.4 },
      armL: { rx: -0.2, rz: 0.2 },
      armR: { rx: -0.2, rz: -0.2 },
    }),
  },
  sleepy: {
    duration: 2.4,
    loop: true,
    sample: (t) => CLIPS.sleep.sample(t, 'bounce'),
  },
  laugh: {
    duration: 0.9,
    loop: true,
    sample: (t) => {
      const ha = Math.sin(t * 16);
      return pose({
        root: { y: Math.abs(ha) * 0.08, rz: ha * 0.05 },
        hips: { ry: ha * 0.1 },
        spine: { rx: 0.1 + Math.abs(ha) * 0.06 },
        head: { rx: -0.16 + ha * 0.1, rz: ha * 0.1 },
        armL: { rx: -0.15, rz: 0.45 },
        armR: { rx: -1.55, rz: -0.15 },
        foreL: { rx: -0.25 },
        foreR: { rx: -0.85 + ha * 0.2 },
        legL: { rx: 0.08 },
        legR: { rx: -0.12 + Math.abs(ha) * 0.18 },
      });
    },
  },
  cry: {
    duration: 1.4,
    loop: true,
    sample: (t) => {
      const sob = Math.abs(Math.sin(t * 7));
      const hic = Math.sin(t * 3.2);
      return pose({
        root: { y: -0.08 - sob * 0.05 },
        hips: { rz: hic * 0.06 },
        spine: { rx: 0.12 + sob * 0.05 },
        head: { rx: -0.06 + hic * 0.04, rz: hic * 0.16 },
        armL: { rx: -1.35, rz: 0.5 },
        armR: { rx: -1.4, rz: -0.42 },
        foreL: { rx: -1.45 },
        foreR: { rx: -1.5 },
        legL: { rx: 0.18 },
        legR: { rx: -0.08 },
        shinL: { rx: 0.3 },
      });
    },
  },
  angry: {
    duration: 0.9,
    loop: true,
    sample: (t) => {
      const stompL = Math.max(0, Math.sin(t * 11));
      const stompR = Math.max(0, Math.sin(t * 11 + Math.PI));
      const shake = Math.sin(t * 24);
      return pose({
        root: { y: Math.max(stompL, stompR) * 0.07, rz: shake * 0.05 },
        hips: { rz: shake * 0.08 },
        spine: { rx: -0.16, ry: shake * 0.1 },
        head: { rx: -0.08, rz: shake * 0.16, ry: Math.sin(t * 9) * 0.1 },
        armL: { rx: -0.75, rz: 0.78 + shake * 0.16 },
        armR: { rx: -0.75, rz: -0.78 - shake * 0.16 },
        foreL: { rx: -1.75 },
        foreR: { rx: -1.75 },
        legL: { rx: -stompL * 0.7 },
        legR: { rx: -stompR * 0.7 },
        shinL: { rx: stompL * 0.85 },
        shinR: { rx: stompR * 0.85 },
      });
    },
  },
  fear: {
    duration: 0.6,
    loop: true,
    sample: (t) => pose({
      root: { z: -0.08, x: Math.sin(t * 18) * 0.03 },
      spine: { rx: -0.2 },
      head: { rx: -0.1 },
      armL: { rx: -2.2, rz: 0.3 },
      armR: { rx: -2.2, rz: -0.3 },
      legL: { rx: -0.15 },
      legR: { rx: 0.1 },
    }),
  },
  shocked: {
    duration: 0.45,
    loop: false,
    sample: (t) => pose({
      root: { y: Math.sin(Math.min(1, t / 0.45) * Math.PI) * 0.08 },
      spine: { rx: -0.12 },
      head: { rx: -0.08 },
      armL: { rx: -1.3, rz: 0.4 },
      armR: { rx: -1.3, rz: -0.4 },
    }),
  },
  confused: {
    duration: 1.2,
    loop: true,
    sample: (t) => pose({
      head: { rz: 0.22, ry: Math.sin(t * 2) * 0.15 },
      armR: { rx: -1.15 },
      foreR: { rx: -1.7 },
      spine: { ry: 0.08 },
    }),
  },
  thinking: {
    duration: 1.4,
    loop: true,
    sample: (t) => pose({
      head: { rz: 0.16, rx: 0.12 },
      armR: { rx: -1.35 },
      foreR: { rx: -1.85 },
      spine: { ry: Math.sin(t * 1.2) * 0.06 },
    }),
  },
  celebrate: {
    duration: 0.8,
    loop: true,
    sample: (t) => pose({
      root: { y: Math.abs(Math.sin(t * 8)) * 0.14 },
      armL: { rx: -2.6, rz: 0.2 },
      armR: { rx: -2.6, rz: -0.2 },
      head: { rx: -0.12 },
      legL: { rx: -0.2 },
      shinL: { rx: 0.35 },
    }),
  },
  blush: {
    duration: 1.1,
    loop: true,
    sample: (t) => {
      const shy = Math.sin(t * 6);
      return pose({
        root: { y: Math.abs(shy) * 0.035, ry: -0.12 },
        spine: { rx: 0.14, ry: shy * 0.16 },
        head: { rx: -0.06, ry: 0, rz: shy * 0.06 },
        armL: { rx: -1.2, rz: 0.62 },
        armR: { rx: -1.25, rz: -0.5 },
        foreL: { rx: -1.55 },
        foreR: { rx: -1.6 },
        legL: { rz: 0.14 + shy * 0.1 },
        legR: { rz: -0.1 },
      });
    },
  },
  wink: {
    duration: 0.7,
    loop: false,
    sample: () => pose({ head: { rz: -0.12, ry: 0.08 }, armR: { rz: -0.2 } }),
  },
  wave: {
    duration: 1.1,
    loop: false,
    sample: (t) => pose({
      armR: { rx: -2.4, rz: -0.15 },
      foreR: { rz: Math.sin(t * 12) * 0.45 },
      head: { ry: 0.15 },
    }),
  },
  suspicious: {
    duration: 1.1,
    loop: true,
    sample: (t) => pose({
      root: { z: -0.06 },
      spine: { rx: -0.14 },
      head: { rz: 0.2, ry: Math.sin(t * 1.4) * 0.18 },
      armL: { rx: -0.3 },
      armR: { rx: -0.45 },
    }),
  },
  dramatic: {
    duration: 1.2,
    loop: false,
    sample: (t) => {
      const p = Math.min(1, t / 1.2);
      return pose({
        spine: { rx: -0.35 + p * 0.5 },
        head: { rx: -0.2 + p * 0.25 },
        armL: { rx: -1.5, rz: 0.5 },
        armR: { rx: -0.4, rz: -0.2 },
      });
    },
  },
  peek: {
    duration: 0.9,
    loop: false,
    sample: (t) => pose({
      root: { x: -0.16 + Math.min(0.16, t * 0.22), ry: 0.35 },
      head: { ry: -0.25 },
      spine: { rx: 0.08 },
    }),
  },
  hide: {
    duration: 0.7,
    loop: true,
    sample: () => pose({
      root: { y: -0.42 },
      spine: { rx: 0.7 },
      head: { rx: 0.4 },
      legL: { rx: -1.3 },
      legR: { rx: -1.3 },
      shinL: { rx: 1.5 },
      shinR: { rx: 1.5 },
      armL: { rx: -0.8 },
      armR: { rx: -0.8 },
    }),
  },
  fall: {
    duration: 0.85,
    loop: false,
    sample: (t) => {
      const flail = Math.sin(t * 28);
      const slip = pose({
        root: { x: 0.08, y: 0.06, rz: 0.16 },
        head: { rx: -0.32, rz: flail * 0.22 },
        armL: { rx: -0.5 - flail * 1.35, rz: 0.45 },
        armR: { rx: flail * 1.45, rz: -0.55 },
        foreL: { rx: -0.65 },
        foreR: { rx: -0.85 },
        legR: { rx: 1.2 },
        shinR: { rx: 0.45 },
        legL: { rx: -0.28 },
      });
      const mid = pose({
        root: { rz: 0.7, rx: 0.2, y: 0.04, x: 0.12 },
        head: { rx: -0.12, rz: flail * 0.32 },
        armL: { rx: -1.35, rz: 1.05 },
        armR: { rx: 0.55, rz: -1.2 },
        legL: { rx: -0.95 },
        legR: { rx: 0.6 },
        shinL: { rx: 0.65 },
        shinR: { rx: 0.4 },
      });
      const splat = downed();
      splat.head.rz = 0.22 + Math.sin(Math.max(0, t - 0.55) * 14) * 0.2;
      splat.root.y = -0.5 + Math.sin(Math.min(1, Math.max(0, (t - 0.5) / 0.22)) * Math.PI) * 0.07;
      if (t < 0.22) return lerpPose(pose(), slip, smooth(t / 0.22));
      if (t < 0.42) return lerpPose(slip, mid, smooth((t - 0.22) / 0.2));
      return lerpPose(mid, splat, smooth(Math.min(1, (t - 0.42) / 0.18)));
    },
  },
  get_up: {
    duration: 0.8,
    loop: false,
    sample: (t) => {
      const p = Math.min(1, t / 0.8);
      const crouch = pose({
        root: { y: -0.3, rx: 0.42, rz: 0.12 },
        spine: { rx: 0.38 },
        head: { rx: 0.12, rz: -0.12 },
        armL: { rx: -1.15, rz: 0.28 },
        armR: { rx: -1.15, rz: -0.28 },
        foreL: { rx: -0.35 },
        foreR: { rx: -0.35 },
        legL: { rx: -1.15 },
        legR: { rx: -1.15 },
        shinL: { rx: 1.45 },
        shinR: { rx: 1.45 },
      });
      if (p < 0.5) return lerpPose(downed(), crouch, smooth(p / 0.5));
      return lerpPose(crouch, pose({ head: { rx: -0.08 }, root: { y: 0.03 } }), smooth((p - 0.5) / 0.5));
    },
  },
  secret: {
    duration: 1.6,
    loop: true,
    sample: (t) => {
      const look = Math.sin(t * 3.4);
      const tiptoe = Math.abs(Math.sin(t * 6));
      return pose({
        root: { y: tiptoe * 0.045, z: 0.05 },
        spine: { rx: 0.1, ry: look * 0.16 },
        head: { rx: -0.08, ry: look * 0.42, rz: 0.08 },
        armR: { rx: -1.3, rz: -0.4 },
        foreR: { rx: -1.4 },
        armL: { rx: -0.35, rz: 0.3 },
        legL: { rx: tiptoe * 0.25 },
        legR: { rx: -tiptoe * 0.18 },
        shinL: { rx: tiptoe * 0.35 },
      });
    },
  },
  sword: {
    duration: 2.5,
    loop: false,
    sample: (t) => {
      const face = { rx: -0.06, ry: 0 };
      const ready = pose({
        head: face,
        spine: { rx: 0.08 },
        armR: { rx: -1.05, rz: 0.95 },
        foreR: { rx: -0.45 },
      });
      const guard = pose({
        head: face,
        root: { y: 0.05 },
        armR: { rx: -2.45, rz: -0.15 },
        foreR: { rx: -0.1 },
        armL: { rx: -0.45, rz: 0.4 },
        legL: { rx: -0.12 },
        legR: { rx: 0.22 },
      });
      const cut = pose({
        head: face,
        root: { y: 0.07, x: 0.06 },
        armR: { rx: -1.45, rz: -1.35 },
        foreR: { rx: -0.15 },
        armL: { rx: -0.3, rz: 0.6 },
        legL: { rx: -0.4 },
        legR: { rx: 0.12 },
      });
      const chop = pose({
        head: face,
        root: { y: 0.02, x: -0.05 },
        armR: { rx: -0.7, rz: -0.1 },
        foreR: { rx: -0.65 },
        armL: { rx: -0.55, rz: 0.45 },
        legR: { rx: 0.5 },
        shinR: { rx: 0.45 },
      });
      const hero = pose({
        head: face,
        root: { y: 0.04 },
        armR: { rx: -2.05, rz: -0.9 },
        foreR: { rx: -0.15 },
        armL: { rx: -1.05, rz: 0.75 },
        legL: { rx: -0.22, rz: 0.12 },
        legR: { rx: 0.38 },
        shinR: { rx: 0.22 },
      });
      const away = pose({ head: face, armR: { rx: -0.45, rz: 0.35 }, foreR: { rx: -0.2 } });
      if (t < 0.32) return lerpPose(pose({ head: face }), ready, smooth(t / 0.32));
      if (t < 0.62) return lerpPose(ready, guard, smooth((t - 0.32) / 0.3));
      if (t < 1.02) return lerpPose(guard, cut, smooth((t - 0.62) / 0.22));
      if (t < 1.32) return lerpPose(cut, guard, smooth((t - 1.02) / 0.3));
      if (t < 1.68) return lerpPose(guard, chop, smooth((t - 1.32) / 0.18));
      if (t < 2.12) return lerpPose(chop, hero, smooth((t - 1.68) / 0.24));
      return lerpPose(hero, away, smooth((t - 2.12) / 0.38));
    },
  },
  spin: {
    duration: 0.8,
    loop: false,
    sample: (t) => pose({ root: { ry: Math.min(1, t / 0.8) * Math.PI * 2 }, armL: { rz: 0.6 }, armR: { rz: -0.6 } }),
  },
  bounce: {
    duration: 0.6,
    loop: true,
    sample: (t) => pose({ root: { y: Math.abs(Math.sin(t * 9)) * 0.1 }, head: { rx: -0.05 } }),
  },
  happy: {
    duration: 0.8,
    loop: true,
    sample: (t) => pose({
      root: { y: Math.abs(Math.sin(t * 6)) * 0.06 },
      head: { rz: Math.sin(t * 4) * 0.08 },
      armL: { rx: -0.4, rz: 0.25 },
      armR: { rx: -0.4, rz: -0.25 },
    }),
  },
  legShake: {
    duration: 0.5,
    loop: true,
    sample: (t) => pose({ legL: { rz: Math.sin(t * 22) * 0.18 }, hips: { rz: Math.sin(t * 22) * 0.04 } }),
  },
  buttWiggle: {
    duration: 0.9,
    loop: false,
    sample: (t) => pose({
      root: { ry: Math.PI * 0.85 },
      hips: { ry: Math.sin(t * 14) * 0.35 },
      spine: { rx: 0.15 },
    }),
  },
  walkAway: {
    duration: 1.3,
    loop: false,
    sample: (t) => {
      const p = Math.min(1, t / 1.3);
      const next = gait(t, 8, 0.7, p * 1.18, true);
      next.head.ry = 0.4;
      return next;
    },
  },
  joke: {
    duration: 2.4,
    loop: false,
    sample: (t) => {
      if (t < 0.6) return gait(t, 8, 0.6, (t / 0.6) * 0.28, false);
      if (t < 1.3) return CLIPS.thinking.sample(t, 'bounce');
      if (t < 1.9) return CLIPS.laugh.sample(t, 'bounce');
      return gait(t, 8, 0.6, 0.45 + (t - 1.9) * 0.9, true);
    },
  },
  listen: {
    duration: 1.2,
    loop: true,
    sample: (t) => pose({
      root: { y: Math.sin(t * 2.2) * 0.02 },
      spine: { rx: 0.08 },
      head: { rx: -0.08, ry: 0 },
      armL: { rx: -0.2 },
      armR: { rx: -0.25 },
    }),
  },
  notice: {
    duration: 0.35,
    loop: false,
    sample: () => pose({ head: { rx: -0.08 }, spine: { rx: -0.06 }, armL: { rx: -0.3 }, armR: { rx: -0.3 } }),
  },
  wake: {
    duration: 0.8,
    loop: false,
    sample: (t) => {
      const p = Math.min(1, t / 0.8);
      return pose({
        root: { y: -0.32 * (1 - p) },
        spine: { rx: 0.35 * (1 - p) },
        head: { rx: 0.5 * (1 - p) },
        legL: { rx: -1.2 * (1 - p) },
        legR: { rx: -1.2 * (1 - p) },
        shinL: { rx: 1.4 * (1 - p) },
        shinR: { rx: 1.4 * (1 - p) },
      });
    },
  },
};

const MOVING = new Set(['walk', 'run', 'jump', 'walkAway', 'peek', 'dance', 'spin']);

export interface AnimationFrame {
  pose: Pose;
  expression: ToodleExpression;
  blink: number;
  wink: boolean;
  state: ToodleCharacterState;
}

export class ToodleAnimationController {
  private current = 'idle';
  private from = 'idle';
  private fromTime = 0;
  private blend = 1;
  private time = 0;
  private queue: string[] = [];
  private reaction: string | null = null;
  private playId = 'idle';
  private blinkAt = 2.4;
  private blink = 0;
  private style: DanceStyle = 'bounce';
  focusX = 0;
  halfW = 2.2;
  private glance = 0;

  setHalfWidth(width: number) {
    if (Number.isFinite(width) && width > 0.3) this.halfW = width;
  }

  setGlance(side: 'left' | 'right' | 'center') {
    this.glance = side === 'left' ? -1 : side === 'right' ? 1 : 0;
  }

  private placeX(local: number) {
    const margin = 0.9;
    const left = -this.halfW + margin;
    const right = this.halfW - margin;
    const span = Math.max(0.2, right - left);
    const t = Math.min(1, Math.max(0, local));
    return left + t * span;
  }

  setDance(style: DanceStyle) {
    this.style = style;
  }

  setReaction(name: string | null, playId: string) {
    if (playId === this.playId) return;
    this.playId = playId;
    const previous = this.reaction;
    this.reaction = name;
    this.queue = [];
    if (!name && (previous === 'walkAway' || this.current === 'walkAway' || this.current === 'hide')) {
      this.start('peek');
      this.queue.push('idle');
      return;
    }
    if (!name && (previous === 'fall' || this.current === 'fall')) {
      this.start('get_up');
      this.queue.push('idle');
      return;
    }
    if (!name && (previous === 'sleepy' || this.current === 'sleepy' || this.current === 'sleep')) {
      this.start('wake');
      this.queue.push('idle');
      return;
    }
    this.start(name ?? 'idle');
  }

  update(dt: number, options: { listening: boolean; reduced: boolean; prop?: ToodleCharacterState['currentProp'] }): AnimationFrame {
    const step = Math.min(dt, 0.05);
    const clip = CLIPS[this.current] ?? CLIPS.idle;
    if (!options.reduced) this.time += step;
    this.blend = Math.min(1, this.blend + step / 0.1);
    if (!clip.loop && this.time >= clip.duration) {
      const next = this.queue.shift();
      if (next) this.start(next);
      else if (!this.reaction) this.start('idle');
      else this.time = clip.duration;
    }
    this.blinkAt -= step;
    if (this.blinkAt <= 0) {
      this.blink = 1;
      this.blinkAt = 2.6 + Math.random() * 2.4;
    }
    if (this.blink > 0) this.blink = Math.max(0, this.blink - step * 7);

    const posing = options.listening && !this.reaction && (this.current === 'idle' || this.current === 'listen');
    const clipKey = posing ? 'listen' : this.current;
    const live = CLIPS[clipKey] ?? clip;
    const fromClip = CLIPS[this.from] ?? CLIPS.idle;
    const mixed = lerpPose(fromClip.sample(this.fromTime, this.style), live.sample(this.time, this.style), smooth(this.blend));
    const margin = 0.9;
    const left = -this.halfW + margin;
    const right = this.halfW - margin;
    const shift = this.glance * Math.min(0.45, this.halfW * 0.16);
    mixed.root.x = Math.min(right, Math.max(left, this.placeX(mixed.root.x) + shift));
    this.focusX = mixed.root.x;
    const expression = expressionFor(clipKey);
    return {
      pose: mixed,
      expression,
      blink: options.reduced ? 0 : this.blink,
      wink: this.current === 'wink',
      state: {
        position: { x: mixed.root.x, y: mixed.root.y, z: mixed.root.z },
        rotation: { x: mixed.root.rx, y: mixed.root.ry, z: mixed.root.rz },
        animation: this.current,
        mood: moodFor(expression),
        expression,
        currentProp: options.prop,
        isMoving: MOVING.has(this.current),
        isInteractive: true,
      },
    };
  }

  private start(name: string) {
    this.from = this.current;
    this.fromTime = this.time;
    this.current = CLIPS[name] ? name : 'idle';
    this.time = 0;
    this.blend = 0;
  }
}
