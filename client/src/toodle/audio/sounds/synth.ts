import type { ToodleSoundId } from '../types';

interface Voice {
  stop: () => void;
  ms: number;
}

function envGain(ctx: AudioContext, peak: number, attack: number, hold: number, release: number): { gain: GainNode; ms: number } {
  const gain = ctx.createGain();
  const now = ctx.currentTime;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.001, peak), now + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + attack + hold + release);
  return { gain, ms: Math.round((attack + hold + release) * 1000) };
}

function tone(ctx: AudioContext, dest: AudioNode, freq: number, peak: number, type: OscillatorType, attack: number, hold: number, release: number): Voice {
  const osc = ctx.createOscillator();
  const shaped = envGain(ctx, peak, attack, hold, release);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  osc.connect(shaped.gain);
  shaped.gain.connect(dest);
  osc.start();
  osc.stop(ctx.currentTime + attack + hold + release + 0.02);
  return {
    ms: shaped.ms,
    stop: () => {
      try { osc.stop(); } catch { /* already stopped */ }
    },
  };
}

function noise(ctx: AudioContext, dest: AudioNode, peak: number, ms: number, band: number): Voice {
  const length = Math.max(1, Math.floor(ctx.sampleRate * (ms / 1000)));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = band;
  filter.Q.value = 0.7;
  const shaped = envGain(ctx, peak, 0.005, ms / 1000 * 0.4, ms / 1000 * 0.5);
  src.connect(filter);
  filter.connect(shaped.gain);
  shaped.gain.connect(dest);
  src.start();
  return {
    ms,
    stop: () => {
      try { src.stop(); } catch { /* already stopped */ }
    },
  };
}

function longest(voices: Voice[]): Voice {
  return voices.reduce((best, voice) => (voice.ms > best.ms ? voice : best), voices[0]);
}

/** Original short tones. These are the voice until a real file is listed in the manifest. */
export function playSynth(ctx: AudioContext, dest: AudioNode, id: ToodleSoundId, level: number): Voice {
  const peak = Math.max(0.02, Math.min(0.2, level));
  switch (id) {
    case 'message_pop':
    case 'notification_soft':
    case 'pop':
      return tone(ctx, dest, id === 'notification_soft' ? 660 : 880, peak * 0.7, 'sine', 0.01, 0.04, 0.08);
    case 'tap':
    case 'boop':
    case 'double_tap':
      return tone(ctx, dest, id === 'double_tap' ? 420 : 520, peak, 'sine', 0.01, 0.05, 0.1);
    case 'hmm':
    case 'confused':
      return tone(ctx, dest, 230, peak * 0.8, 'sine', 0.04, 0.16, 0.18);
    case 'huh':
      return tone(ctx, dest, 360, peak * 0.75, 'triangle', 0.02, 0.08, 0.12);
    case 'giggle':
    case 'laugh':
      return longest([
        tone(ctx, dest, 620, peak * 0.7, 'sine', 0.01, 0.05, 0.06),
        tone(ctx, dest, 740, peak * 0.55, 'sine', 0.08, 0.05, 0.07),
        tone(ctx, dest, 680, peak * 0.5, 'sine', 0.16, 0.06, 0.1),
      ]);
    case 'surprise':
      return tone(ctx, dest, 740, peak, 'triangle', 0.005, 0.06, 0.12);
    case 'angry':
      return tone(ctx, dest, 160, peak * 0.7, 'square', 0.01, 0.08, 0.1);
    case 'sad':
    case 'cry':
      return tone(ctx, dest, 280, peak * 0.55, 'sine', 0.04, 0.2, 0.24);
    case 'sleep':
    case 'snore':
    case 'sigh':
    case 'yawn':
      return noise(ctx, dest, peak * 0.45, id === 'yawn' ? 420 : 280, 400);
    case 'footsteps_soft':
      return noise(ctx, dest, peak * 0.55, 50, 180);
    case 'footsteps_fast':
    case 'run':
      return noise(ctx, dest, peak * 0.6, 36, 240);
    case 'jump':
      return tone(ctx, dest, 480, peak * 0.7, 'sine', 0.01, 0.05, 0.1);
    case 'fall':
    case 'whoosh':
      return noise(ctx, dest, peak * 0.55, 180, 700);
    case 'shing':
      return longest([
        tone(ctx, dest, 1800, peak * 0.35, 'sawtooth', 0.005, 0.04, 0.12),
        noise(ctx, dest, peak * 0.45, 160, 2400),
      ]);
    case 'land':
    case 'impact':
    case 'triple_tap':
      return noise(ctx, dest, peak * 0.8, 90, 140);
    case 'sparkle':
    case 'success':
    case 'celebration':
      return longest([
        tone(ctx, dest, 880, peak * 0.45, 'sine', 0.01, 0.06, 0.12),
        tone(ctx, dest, 1320, peak * 0.28, 'sine', 0.08, 0.08, 0.16),
      ]);
    case 'suitcase_open':
    case 'page_flip':
      return noise(ctx, dest, peak * 0.5, 160, 1200);
    case 'suitcase_close':
    case 'helmet':
    case 'clock':
      return tone(ctx, dest, 210, peak * 0.6, 'square', 0.005, 0.03, 0.06);
    case 'pen':
    case 'typing_fast':
      return noise(ctx, dest, peak * 0.35, id === 'typing_fast' ? 220 : 70, 1800);
    case 'phone':
      return tone(ctx, dest, 990, peak * 0.4, 'sine', 0.01, 0.08, 0.08);
    case 'bike':
      return noise(ctx, dest, peak * 0.4, 220, 220);
    case 'popcorn':
      return noise(ctx, dest, peak * 0.45, 140, 1600);
    case 'camera':
      return noise(ctx, dest, peak * 0.5, 60, 900);
    default:
      return tone(ctx, dest, 440, peak * 0.4, 'sine', 0.01, 0.04, 0.08);
  }
}
