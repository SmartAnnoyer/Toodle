import type { ToodleBeat } from '../types';
import { readChaos } from '../settings';
import { voiceForAnimation } from './reactionSounds';
import { toodleSound } from './ToodleSoundManager';
import type { SoundCue, ToodleSoundId } from './types';

const STEP_SECONDS: Record<string, number> = {
  walk: Math.PI / 8,
  run: Math.PI / 14,
  walkAway: Math.PI / 8,
};

const STEP_SOUND: Record<string, ToodleSoundId> = {
  walk: 'footsteps_soft',
  run: 'footsteps_fast',
  walkAway: 'footsteps_soft',
};

class ToodleAudioEngine {
  private timers: number[] = [];
  private stepAt = 0;
  private motion = '';
  private idleTimer: number | null = null;
  private reduced = false;

  constructor() {
    if (typeof window === 'undefined') return;
    const unlock = () => this.unlock();
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock);
    toodleSound.preload();
  }

  unlock() {
    toodleSound.unlock();
  }

  setMusicActive(active: boolean) {
    toodleSound.setMusicActive(active);
  }

  playBeat(beat: ToodleBeat | null) {
    this.clearTimers();
    if (!beat || readChaos() === 'off') return;
    const cues = beat.timeline && beat.timeline.length > 0
      ? beat.timeline
      : beat.sound
        ? [{ at: 0, sound: beat.sound, variants: beat.soundVariants }]
        : voiceForAnimation(beat.animation, beat.priority);
    this.schedule(cues, beat.priority, beat.reactionId ?? beat.event, beat.animation);
  }

  noteIncoming() {
    if (readChaos() === 'off') return;
    toodleSound.play('message_pop', { priority: 20, reason: 'incoming' });
  }

  /** Footsteps follow the gait period already used by the walk and run clips. */
  syncMotion(animation: string, x: number, halfW: number, dt: number, reduced: boolean) {
    this.reduced = reduced;
    const previous = this.motion;
    this.motion = animation;
    if (previous === 'walkAway' && animation !== 'walkAway' && animation !== 'hide') {
      toodleSound.play('boop', { priority: 40, reason: 'return', animation, pan: this.pan(x, halfW) });
    }
    const interval = STEP_SECONDS[animation];
    const sound = STEP_SOUND[animation];
    if (!interval || !sound || reduced || readChaos() === 'off') {
      this.stepAt = 0;
      return;
    }
    this.stepAt += dt;
    if (this.stepAt < interval) return;
    this.stepAt = 0;
    const away = animation === 'walkAway' ? Math.max(0.12, 1 - Math.min(1, Math.abs(x) / Math.max(0.2, halfW))) : 1;
    toodleSound.play(sound, {
      priority: 30,
      reason: animation,
      animation,
      pan: this.pan(x, halfW),
      level: away,
    });
  }

  startIdle() {
    this.stopIdle();
    const wait = () => {
      const delay = 30_000 + Math.random() * 90_000;
      this.idleTimer = window.setTimeout(() => {
        this.idleTimer = null;
        const quiet = this.motion === 'idle' || this.motion === '' || this.motion === 'listen';
        if (!this.reduced && quiet && readChaos() !== 'off' && Math.random() < 0.35) {
          const sound: ToodleSoundId = Math.random() < 0.5 ? 'sigh' : 'yawn';
          toodleSound.play(sound, { priority: 10, reason: 'idle', animation: this.motion });
        }
        wait();
      }, delay);
    };
    wait();
  }

  stopIdle() {
    if (this.idleTimer != null) window.clearTimeout(this.idleTimer);
    this.idleTimer = null;
  }

  private schedule(cues: SoundCue[], priority: number, reason: string, animation?: string) {
    for (const cue of cues) {
      const handle = window.setTimeout(() => {
        toodleSound.play(cue.sound, { priority, reason, animation, variants: cue.variants });
      }, Math.max(0, cue.at));
      this.timers.push(handle);
    }
  }

  private clearTimers() {
    for (const handle of this.timers) window.clearTimeout(handle);
    this.timers = [];
  }

  private pan(x: number, halfW: number) {
    if (halfW <= 0) return 0;
    return Math.max(-0.65, Math.min(0.65, (x / halfW) * 0.65));
  }
}

export const toodleAudio = new ToodleAudioEngine();
