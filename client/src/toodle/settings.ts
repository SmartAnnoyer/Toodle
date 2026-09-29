import type { ChaosLevel } from './types';

const KEY = 'toodle-chaos';

export const CHAOS_OPTIONS: { id: ChaosLevel; label: string }[] = [
  { id: 'full', label: '✨ Full Chaos' },
  { id: 'normal', label: '🙂 Normal' },
  { id: 'quiet', label: '🫥 Quiet' },
  { id: 'off', label: '🔕 Off' },
];

export function readChaos(): ChaosLevel {
  if (typeof localStorage === 'undefined') return 'normal';
  const stored = localStorage.getItem(KEY);
  if (stored === 'full' || stored === 'normal' || stored === 'quiet' || stored === 'off') return stored;
  return 'normal';
}

export function writeChaos(level: ChaosLevel) {
  localStorage.setItem(KEY, level);
}
