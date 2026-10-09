import { useEffect, useRef, useState } from 'react';
import { formatRemaining, serverNowMs } from '../lib/time';

export function useCountdown(target: string | null | undefined) {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    if (!target) {
      setLabel(null);
      return;
    }
    const tick = () => {
      const diff = new Date(target).getTime() - serverNowMs();
      setLabel(formatRemaining(diff / 1000));
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [target]);

  return label;
}

export function useTickingSeconds(seconds: number | null | undefined) {
  const anchor = useRef<{ base: number; at: number } | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (seconds == null) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [seconds]);

  if (seconds == null) {
    anchor.current = null;
    return null;
  }
  const elapsed = anchor.current ? Math.floor((now - anchor.current.at) / 1000) : 0;
  const expected = anchor.current ? anchor.current.base - elapsed : seconds;
  if (!anchor.current || Math.abs(expected - seconds) > 3) {
    anchor.current = { base: seconds, at: now };
  }
  const left = anchor.current.base - Math.floor((now - anchor.current.at) / 1000);
  return formatRemaining(Math.max(0, left));
}
