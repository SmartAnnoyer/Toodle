import { admit, audioDebugEnabled, pickVariant, readSoundPrefs, type ChannelSlot } from './ToodleAudioState';
import { PRELOAD_IDS, soundDef } from './ToodleSoundRegistry';
import { playSynth } from './sounds/synth';
import type { AudioChannel, ToodleSoundId } from './types';

export interface AudioDebugSnap {
  sound: string;
  channel: string;
  volume: string;
  cooldown: string;
  reason: string;
  animation: string;
}

type Listener = () => void;

const listeners = new Set<Listener>();
let snap: AudioDebugSnap = {
  sound: '—',
  channel: '—',
  volume: '0.65',
  cooldown: 'clear',
  reason: '—',
  animation: '—',
};

export function subscribeAudioDebug(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getAudioDebugSnap() {
  return snap;
}

function publish(next: AudioDebugSnap) {
  snap = next;
  if (import.meta.env.DEV && audioDebugEnabled()) {
    console.info('[toodle audio]', next);
  }
  for (const listener of listeners) listener();
}

interface Live {
  stop: () => void;
}

function audioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctx = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  return new Ctx();
}

class ToodleSoundManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private groups: Partial<Record<'ui' | 'toodle' | 'effects', GainNode>> = {};
  private slots: Partial<Record<AudioChannel, ChannelSlot>> = {};
  private live: Partial<Record<AudioChannel, Live>> = {};
  private cooled = new Map<ToodleSoundId, number>();
  private files = new Set<string>();
  private buffers = new Map<string, AudioBuffer>();
  private missing = new Set<string>();
  private booted = false;

  unlock() {
    try {
      const ctx = this.context();
      if (ctx && ctx.state === 'suspended') void ctx.resume().catch(() => undefined);
    } catch {
      /* audio is optional */
    }
  }

  preload() {
    if (this.booted || typeof fetch === 'undefined') return;
    this.booted = true;
    void this.loadManifest();
  }

  play(id: ToodleSoundId, options: { priority?: number; reason?: string; animation?: string; pan?: number; level?: number; variants?: ToodleSoundId[] } = {}) {
    try {
      const prefs = readSoundPrefs();
      const chosen = pickVariant(id, options.variants ?? soundDef(id).variants, Math.random());
      const spec = soundDef(chosen);
      const now = Date.now();
      const decision = admit({
        enabled: prefs.enabled && prefs.volume > 0,
        channel: spec.channel,
        priority: options.priority ?? spec.priority,
        now,
        cooldownUntil: this.cooled.get(chosen) ?? 0,
        slots: this.slots,
      });
      if (!decision.ok) {
        this.debug(chosen, spec.channel, prefs.volume, decision.reason, options.reason ?? '—', options.animation ?? '—');
        return;
      }
      const ctx = this.context();
      if (!ctx || ctx.state === 'suspended') {
        this.debug(chosen, spec.channel, prefs.volume, 'blocked', options.reason ?? '—', options.animation ?? '—');
        return;
      }
      const dest = this.output(spec.group, options.pan ?? 0, prefs.volume * spec.gain * (options.level ?? 1));
      if (!dest) return;
      this.live[spec.channel]?.stop();
      const file = this.files.has(spec.file) ? spec.file : null;
      const voice = file ? this.playFile(ctx, dest, file, spec.holdMs) : playSynth(ctx, dest, chosen, spec.gain);
      this.live[spec.channel] = voice;
      this.slots[spec.channel] = { priority: options.priority ?? spec.priority, until: now + Math.max(spec.holdMs, voice.ms) };
      this.cooled.set(chosen, now + spec.cooldownMs);
      this.debug(chosen, spec.channel, prefs.volume, 'playing', options.reason ?? '—', options.animation ?? '—');
    } catch (error) {
      if (import.meta.env.DEV) console.info('[toodle audio] skipped', error);
    }
  }

  private debug(sound: string, channel: string, volume: number, cooldown: string, reason: string, animation: string) {
    publish({
      sound,
      channel,
      volume: volume.toFixed(2),
      cooldown,
      reason,
      animation,
    });
  }

  private context() {
    if (this.ctx) return this.ctx;
    this.ctx = audioContext();
    if (!this.ctx) return null;
    this.master = this.ctx.createGain();
    this.master.gain.value = 1;
    this.master.connect(this.ctx.destination);
    return this.ctx;
  }

  private output(group: 'ui' | 'toodle' | 'effects', pan: number, level: number) {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return null;
    let bus = this.groups[group];
    if (!bus) {
      bus = ctx.createGain();
      bus.connect(master);
      this.groups[group] = bus;
    }
    const gain = ctx.createGain();
    gain.gain.value = Math.max(0, Math.min(1, level));
    if (typeof ctx.createStereoPanner === 'function') {
      const panner = ctx.createStereoPanner();
      panner.pan.value = Math.max(-1, Math.min(1, pan));
      gain.connect(panner);
      panner.connect(bus);
    } else {
      gain.connect(bus);
    }
    return gain;
  }

  private playFile(ctx: AudioContext, dest: AudioNode, file: string, holdMs: number): Live & { ms: number } {
    const cached = this.buffers.get(file);
    if (!cached) {
      void this.fetchBuffer(file);
      return playSynth(ctx, dest, 'boop', 0.2);
    }
    const src = ctx.createBufferSource();
    src.buffer = cached;
    src.connect(dest);
    src.start();
    return {
      ms: holdMs,
      stop: () => {
        try { src.stop(); } catch { /* already stopped */ }
      },
    };
  }

  private async loadManifest() {
    try {
      const response = await fetch('/audio/toodle/manifest.json');
      if (!response.ok) return;
      const body = await response.json() as { files?: string[] };
      for (const file of body.files ?? []) this.files.add(file);
      for (const id of PRELOAD_IDS) {
        const file = soundDef(id).file;
        if (this.files.has(file)) void this.fetchBuffer(file);
      }
    } catch {
      /* missing manifest just means the original tones stay on */
    }
  }

  private async fetchBuffer(file: string) {
    if (this.buffers.has(file) || this.missing.has(file)) return;
    const ctx = this.context();
    if (!ctx) return;
    try {
      const response = await fetch(`/audio/toodle/${file}`);
      if (!response.ok) {
        this.missing.add(file);
        return;
      }
      const data = await response.arrayBuffer();
      const buffer = await ctx.decodeAudioData(data);
      this.buffers.set(file, buffer);
    } catch {
      this.missing.add(file);
    }
  }
}

export const toodleSound = new ToodleSoundManager();
