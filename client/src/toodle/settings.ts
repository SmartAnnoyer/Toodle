import type { ChaosLevel } from './types';

const KEY = 'toodle-chaos';

export const CHAOS_OPTIONS: { id: ChaosLevel; label: string }[] = [
  { id: 'full', label: '✨ Full Chaos' },
  { id: 'normal', label: '🙂 Normal' },
  { id: 'quiet', label: '🫥 Quiet' },
  { id: 'off', label: '🔕 Off' },
];

/** Forced off for everyone until the mascot is ready. The profile control stays hidden. */
export function readChaos(): ChaosLevel {
  return 'off';
}

export function writeChaos(level: ChaosLevel) {
  localStorage.setItem(KEY, level);
}
