import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { toodleSound } from '../toodle/audio/ToodleSoundManager';
import { readStoredTheme, type ThemeMode } from './themeTypes';

const ThemeContext = createContext<{ theme: ThemeMode; setTheme: (theme: ThemeMode) => void }>({
  theme: 'dark',
  setTheme: () => undefined,
});

function reducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(readStoredTheme);
  const [slash, setSlash] = useState<'in' | 'out' | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme !== 'light');
    root.dataset.theme = theme;
    const color = theme === 'og' ? '#090909' : theme === 'dark' ? '#0b0614' : '#f4f0fb';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color);
    localStorage.setItem('toodle-theme', theme);
  }, [theme]);

  function setTheme(next: ThemeMode) {
    if (next === theme) return;
    const cinematic = !reducedMotion() && (next === 'og' || theme === 'og');
    if (cinematic) {
      setSlash(next === 'og' ? 'in' : 'out');
      if (next === 'og') toodleSound.play('shing', { priority: 48, reason: 'og-theme' });
      window.setTimeout(() => setThemeState(next), 220);
      window.setTimeout(() => setSlash(null), 880);
      return;
    }
    setThemeState(next);
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
      {slash ? (
        <div className={`og-transition og-transition-${slash}`} aria-hidden>
          <div className="og-veil" />
          <div className="og-slash" />
        </div>
      ) : null}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
