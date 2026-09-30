export type SwordFightHook =
  | 'onSwordDraw'
  | 'onSwordSlash'
  | 'onSwordImpact'
  | 'onSwordSheath'
  | 'onSwordComplete';

type Listener = (hook: SwordFightHook) => void;

const listeners = new Set<Listener>();

export function onSwordFight(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function emitSwordFight(hook: SwordFightHook) {
  for (const listener of listeners) listener(hook);
}
