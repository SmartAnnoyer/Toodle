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

const IDLE_LIFE = ['wink', 'laugh', 'happy', 'blush', 'shocked', 'confused', 'celebrate', 'thinking', 'bounce', 'wave'] as const;

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

function gait(t: number, speed: number, stride: number, localX = 0, faceAway = false): Pose {
  const s = Math.sin(t * speed);
  const bob = Math.abs(Math.sin(t * speed));
  return pose({
    root: { x: localX, y: bob * 0.045, ry: faceAway ? Math.PI : 0 },
    hips: { ry: s * 0.08 },
    spine: { rx: 0.08, ry: s * 0.05 },
    head: { rx: -0.04, ry: -s * 0.1 },
    armL: { rx: -s * stride * 0.7 },
    armR: { rx: s * stride * 0.7 },
    foreL: { rx: -0.28 },
    foreR: { rx: -0.28 },
    legL: { rx: s * stride },
    legR: { rx: -s * stride },
    shinL: { rx: Math.max(0, -s) * stride * 1.05 },
    shinR: { rx: Math.max(0, s) * stride * 1.05 },
  });
}

function dancePose(t: number, style: DanceStyle): Pose {
  const s = Math.sin(t * 7);
  const c = Math.cos(t * 7);
  if (style === 'victory') {
    return pose({
      root: { y: Math.max(0, Math.sin(t * 6)) * 0.16 },
      spine: { rx: -0.08 },
      head: { rx: -0.1, rz: s * 0.08 },
      armL: { rx: -2.5, rz: 0.25 + s * 0.15 },
      armR: { rx: -2.5, rz: -0.25 - s * 0.15 },
      foreL: { rx: -0.3 },
      foreR: { rx: -0.3 },
      legL: { rx: -0.15 },
      legR: { rx: 0.2 },
    });
  }
  if (style === 'chaotic') {
    return pose({
      root: { y: Math.abs(s) * 0.08, rz: s * 0.12 },
      hips: { ry: s * 0.35 },
      spine: { rx: c * 0.15, rz: s * 0.2 },
      head: { rz: -s * 0.25, ry: c * 0.2 },
      armL: { rx: -1.2 + s * 0.8, rz: 0.6 },
      armR: { rx: -0.4 - s * 0.9, rz: -0.8 },
      foreL: { rx: -0.8 },
      foreR: { rx: -1.1 },
      legL: { rx: s * 0.45 },
      legR: { rx: -c * 0.45 },
    });
  }
  if (style === 'silly') {
    return pose({
      root: { y: Math.abs(s) * 0.05 },
      hips: { rz: s * 0.18 },
      head: { rz: -s * 0.22, rx: 0.12 },
      armL: { rx: -0.4, rz: 0.9 + s * 0.3 },
      armR: { rx: -1.6, rz: -0.2 },
      foreL: { rx: -0.5 },
      foreR: { rx: -0.9 },
      legL: { rx: 0.2 },
      shinL: { rx: 0.35 },
      legR: { rx: -0.15 },
    });
  }
  return pose({
    root: { y: Math.abs(s) * 0.07 },
    hips: { ry: s * 0.2 },
    spine: { rx: 0.05 },
    head: { rz: s * 0.12 },
    armL: { rx: -0.9 + s * 0.45, rz: 0.35 },
    armR: { rx: -0.9 - s * 0.45, rz: -0.35 },
    foreL: { rx: -0.55 },
    foreR: { rx: -0.55 },
    legL: { rx: -s * 0.25 },
    legR: { rx: s * 0.25 },
  });
}

const CLIPS: Record<string, { duration: number; loop: boolean; sample: (t: number, style: DanceStyle) => Pose }> = {
  idle: {
    duration: 3.2,
    loop: true,
    sample: (t) => pose({
      spine: { rx: Math.sin(t * 1.6) * 0.035 },
      head: { ry: Math.sin(t * 0.45) * 0.12, rx: Math.sin(t * 0.7) * 0.03 },
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
      return gait(t, 7.5, 0.72, step.amount * 0.92, !step.forward);
    },
  },
  run: {
    duration: 1.8,
    loop: true,
    sample: (t) => {
      const step = patrol(t, 1.8);
      const next = gait(t, 12, 1.05, step.amount, !step.forward);
      next.spine.rx = 0.28;
      next.root.y += 0.04;
      return next;
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
    duration: 0.8,
    loop: true,
    sample: (t) => pose({
      root: { y: Math.abs(Math.sin(t * 14)) * 0.05 },
      spine: { rx: 0.12 + Math.sin(t * 14) * 0.08 },
      head: { rx: -0.15, rz: Math.sin(t * 14) * 0.08 },
      armL: { rx: -1.1, rz: 0.3 },
      armR: { rx: -1.1, rz: -0.3 },
      foreL: { rx: -0.4 },
      foreR: { rx: -0.4 },
    }),
  },
  cry: {
    duration: 1.4,
    loop: true,
    sample: (t) => pose({
      spine: { rx: 0.22 },
      head: { rx: 0.35, rz: Math.sin(t * 3) * 0.05 },
      armL: { rx: -0.5, rz: 0.35 },
      armR: { rx: -0.9 },
      foreR: { rx: -1.5 },
      hips: { y: Math.sin(t * 2) * 0.01 },
    }),
  },
  angry: {
    duration: 0.8,
    loop: true,
    sample: (t) => pose({
      spine: { rx: -0.06 },
      head: { rx: 0.08 },
      armL: { rx: -0.55, rz: 0.55 },
      armR: { rx: -0.55, rz: -0.55 },
      foreL: { rx: -1.45 },
      foreR: { rx: -1.45 },
      hips: { rz: Math.sin(t * 8) * 0.03 },
    }),
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
    duration: 1,
    loop: true,
    sample: (t) => pose({
      head: { rx: 0.18, ry: -0.2 },
      armL: { rx: -0.4, rz: 0.5 },
      armR: { rx: -0.7 },
      foreR: { rx: -1.2 },
      spine: { rx: Math.sin(t * 3) * 0.03 },
    }),
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
    duration: 0.55,
    loop: false,
    sample: (t) => {
      const p = Math.min(1, t / 0.55);
      return pose({
        root: { rz: p * 1.35, y: -p * 0.42, x: p * 0.15 },
        armL: { rz: 0.8 },
        armR: { rz: -0.6 },
      });
    },
  },
  get_up: {
    duration: 0.7,
    loop: false,
    sample: (t) => {
      const p = 1 - Math.min(1, t / 0.7);
      return pose({ root: { rz: p * 1.35, y: -p * 0.42 }, head: { rx: -0.1 * (1 - p) } });
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
      spine: { rx: 0.28 },
      head: { rx: 0.22, ry: Math.sin(t * 1.5) * 0.08 },
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
  private idleClock = 0;
  private nextIdle = 1.1;
  private blinkAt = 2.4;
  private blink = 0;
  private style: DanceStyle = 'bounce';
  focusX = 0;
  halfW = 2.2;

  setHalfWidth(width: number) {
    if (Number.isFinite(width) && width > 0.3) this.halfW = width;
  }

  private placeX(local: number) {
    const home = -this.halfW + 0.92;
    const span = Math.max(0.4, this.halfW * 2 - 1.84);
    return home + local * span;
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
    const life = !this.reaction && this.current === 'idle' && this.blend > 0.95 && !options.reduced;
    if (life) {
      this.idleClock += step;
      if (options.listening && this.idleClock > 2.2) {
        this.idleClock = 0;
        this.nextIdle = 2.4 + Math.random() * 2;
        this.start('notice');
        this.queue.push('listen', 'idle');
      } else if (this.idleClock > this.nextIdle) {
        this.idleClock = 0;
        this.nextIdle = 2.2 + Math.random() * 2.4;
        const micro = IDLE_LIFE[Math.floor(Math.random() * IDLE_LIFE.length)];
        this.start(micro);
        this.queue.push('idle');
      }
    }
    this.blinkAt -= step;
    if (this.blinkAt <= 0) {
      this.blink = 1;
      this.blinkAt = 2.6 + Math.random() * 2.4;
    }
    if (this.blink > 0) this.blink = Math.max(0, this.blink - step * 7);

    const fromClip = CLIPS[this.from] ?? CLIPS.idle;
    const mixed = lerpPose(fromClip.sample(this.fromTime, this.style), clip.sample(this.time, this.style), smooth(this.blend));
    mixed.root.x = this.placeX(mixed.root.x);
    this.focusX = mixed.root.x;
    const expression = expressionFor(this.current);
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
