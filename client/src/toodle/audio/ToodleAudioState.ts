import type { AudioChannel, ToodleSoundId } from './types';

const ENABLED_KEY = 'toodle-sound-enabled';
const VOLUME_KEY = 'toodle-volume';

export interface SoundPrefs {
  enabled: boolean;
  /** Character loudness. 0–1. Default 0.65. */
  volume: number;
}

export interface ChannelSlot {
  priority: number;
  until: number;
}

export function readSoundPrefs(): SoundPrefs {
  if (typeof localStorage === 'undefined') return { enabled: true, volume: 0.65 };
  const enabled = localStorage.getItem(ENABLED_KEY);
  const raw = Number(localStorage.getItem(VOLUME_KEY));
  const volume = Number.isFinite(raw) ? Math.min(1, Math.max(0, raw)) : 0.65;
  return { enabled: enabled !== '0', volume };
}

export function writeSoundEnabled(enabled: boolean) {
  localStorage.setItem(ENABLED_KEY, enabled ? '1' : '0');
}

export function writeSoundVolume(volume: number) {
  localStorage.setItem(VOLUME_KEY, String(Math.min(1, Math.max(0, volume))));
}

export function audioDebugEnabled(): boolean {
  return typeof localStorage !== 'undefined' && localStorage.getItem('toodle-audio-debug') === '1';
}

export function admit(input: {
  enabled: boolean;
  channel: AudioChannel;
  priority: number;
  now: number;
  cooldownUntil: number;
  slots: Partial<Record<AudioChannel, ChannelSlot>>;
}): { ok: true } | { ok: false; reason: 'muted' | 'cooldown' | 'busy' } {
  if (!input.enabled) return { ok: false, reason: 'muted' };
  if (input.now < input.cooldownUntil) return { ok: false, reason: 'cooldown' };
  const slot = input.slots[input.channel];
  if (slot && slot.until > input.now && input.priority < slot.priority) return { ok: false, reason: 'busy' };
  if (input.channel === 'ambient' || input.channel === 'voice' && input.priority < 40) {
    const voice = input.slots.voice;
    if (voice && voice.until > input.now && voice.priority >= 40 && input.priority < voice.priority) {
      return { ok: false, reason: 'busy' };
    }
  }
  return { ok: true };
}

export function pickVariant(id: ToodleSoundId, variants: ToodleSoundId[] | undefined, random: number): ToodleSoundId {
  const pool = variants && variants.length > 0 ? variants : [id];
  const index = Math.min(pool.length - 1, Math.floor(random * pool.length));
  return pool[index] ?? id;
}

/** Soft pop only for a message that just arrived from the other person. */
export function shouldPopIncoming(input: { mine: boolean; system: boolean; alreadySeen: boolean; booted: boolean }): boolean {
  if (!input.booted || input.alreadySeen || input.mine || input.system) return false;
  return true;
}
