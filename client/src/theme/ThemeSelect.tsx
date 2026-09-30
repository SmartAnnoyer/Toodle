import { useRef } from 'react';
import { toodleSound } from '../toodle/audio/ToodleSoundManager';
import { useTheme } from './ThemeProvider';
import type { ThemeMode } from './themeTypes';

const OPTIONS: { id: ThemeMode; mark: string; label: string; hint: string }[] = [
  { id: 'light', mark: '☀', label: 'Light', hint: 'Clean & bright' },
  { id: 'dark', mark: '🌙', label: 'Dark', hint: 'Calm & minimal' },
  { id: 'og', mark: '⚔', label: 'OG', hint: 'Cinematic' },
];

export function ThemeSelect() {
  const { theme, setTheme } = useTheme();
  const hummed = useRef(false);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm text-muted">Appearance</p>
        {theme === 'og' ? <span className="og-display text-[10px] text-primary">⚔ OG MODE</span> : null}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            aria-pressed={theme === option.id}
            onMouseEnter={() => {
              if (option.id !== 'og' || hummed.current || theme === 'og') return;
              hummed.current = true;
              toodleSound.play('shing', { priority: 30, reason: 'og-hover' });
            }}
            onMouseLeave={() => {
              if (option.id === 'og') hummed.current = false;
            }}
            onClick={() => setTheme(option.id)}
            className={`theme-choice rounded-2xl border px-2 py-3 text-center ${option.id === 'og' ? 'theme-choice-og' : ''} ${theme === option.id ? 'theme-choice-on' : 'border-line'}`}
          >
            <span className="block text-lg" aria-hidden>{option.mark}</span>
            <span className="mt-1 block text-sm font-semibold">{option.label}</span>
            <span className="mt-0.5 block text-[10px] text-muted">{option.hint}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
