import { useSyncExternalStore } from 'react';
import { audioDebugEnabled } from './ToodleAudioState';
import { getAudioDebugSnap, subscribeAudioDebug } from './ToodleSoundManager';

export function ToodleAudioDebug() {
  const snap = useSyncExternalStore(subscribeAudioDebug, getAudioDebugSnap, getAudioDebugSnap);
  if (!import.meta.env.DEV || !audioDebugEnabled()) return null;
  return (
    <div className="pointer-events-none absolute right-2 top-1 z-10 rounded-xl bg-elevated/90 px-2 py-1 text-[10px] leading-4 text-muted">
      <p>TOODLE AUDIO DEBUG</p>
      <p>Current sound: {snap.sound}</p>
      <p>Channel: {snap.channel}</p>
      <p>Volume: {snap.volume}</p>
      <p>Cooldown: {snap.cooldown}</p>
      <p>Reason: {snap.reason}</p>
      <p>Animation: {snap.animation}</p>
    </div>
  );
}
