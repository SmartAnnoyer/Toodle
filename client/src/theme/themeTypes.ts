export type ThemeMode = 'light' | 'dark' | 'og';

export function readStoredTheme(): ThemeMode {
  if (typeof localStorage === 'undefined') return 'dark';
  const stored = localStorage.getItem('toodle-theme');
  if (stored === 'light' || stored === 'og' || stored === 'dark') return stored;
  return 'dark';
}
