import { useEffect, useState } from 'react';
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
