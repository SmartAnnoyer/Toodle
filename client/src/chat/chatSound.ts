let audio: AudioContext | null = null;

function context() {
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  if (!audio) audio = new Ctx();
  if (audio.state === 'suspended') void audio.resume();
  return audio;
}

function tone(freq: number, start: number, duration: number, volume: number) {
  const ctx = context();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  const at = ctx.currentTime + start;
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(volume, at + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(at);
  osc.stop(at + duration + 0.02);
}

export function unlockChatSound() {
  context();
}

export function playSend() {
  try {
    tone(740, 0, 0.06, 0.045);
    tone(1180, 0.045, 0.08, 0.035);
  } catch {
    // The phone has not unlocked sound yet.
  }
}

export function playReceive() {
  try {
    tone(520, 0, 0.07, 0.04);
    tone(780, 0.07, 0.1, 0.032);
  } catch {
    // The phone has not unlocked sound yet.
  }
}
