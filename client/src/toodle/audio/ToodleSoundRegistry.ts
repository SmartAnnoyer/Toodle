import type { SoundDef, ToodleSoundId } from './types';

/**
 * Real clips are optional. There are none in the repo yet.
 * Drop a file at public/audio/toodle/<file> and add that relative path to
 * public/audio/toodle/manifest.json. Until then the engine plays a short
 * original tone for the same id, and a missing file never breaks chat.
 *
 * public/audio/toodle/
 *   ui/            tap, message-pop, notification-soft
 *   reactions/     hmm, huh, giggle, laugh, surprise, confused, angry, sad, cry, sigh, yawn
 *   movement/      footsteps-soft, footsteps-fast, jump, fall, land, whoosh, run
 *   props/         suitcase-open, suitcase-close, page-flip, pen, popcorn, phone, bike, helmet, clock
 *   expressions/   snore, sleep, celebration, sparkle, pop, impact
 */
const def = (entry: SoundDef): SoundDef => entry;

export const SOUND_REGISTRY: Record<ToodleSoundId, SoundDef> = {
  message_pop: def({ id: 'message_pop', file: 'ui/message-pop.mp3', channel: 'interaction', group: 'ui', priority: 20, cooldownMs: 300, holdMs: 120, gain: 0.35 }),
  notification_soft: def({ id: 'notification_soft', file: 'ui/notification-soft.mp3', channel: 'interaction', group: 'ui', priority: 20, cooldownMs: 800, holdMs: 180, gain: 0.28 }),
  tap: def({ id: 'tap', file: 'ui/tap.mp3', channel: 'interaction', group: 'ui', priority: 55, cooldownMs: 280, holdMs: 120, gain: 0.45 }),
  boop: def({ id: 'boop', file: 'reactions/boop.mp3', channel: 'interaction', group: 'toodle', priority: 50, cooldownMs: 500, holdMs: 160, gain: 0.5 }),
  hmm: def({ id: 'hmm', file: 'reactions/hmm.mp3', channel: 'voice', group: 'toodle', priority: 40, cooldownMs: 3000, holdMs: 420, gain: 0.4, variants: ['hmm', 'huh'] }),
  huh: def({ id: 'huh', file: 'reactions/huh.mp3', channel: 'voice', group: 'toodle', priority: 45, cooldownMs: 3000, holdMs: 280, gain: 0.42 }),
  giggle: def({ id: 'giggle', file: 'reactions/giggle.mp3', channel: 'voice', group: 'toodle', priority: 60, cooldownMs: 4000, holdMs: 520, gain: 0.48, variants: ['giggle', 'laugh'] }),
  laugh: def({ id: 'laugh', file: 'reactions/laugh.mp3', channel: 'voice', group: 'toodle', priority: 70, cooldownMs: 5000, holdMs: 700, gain: 0.5 }),
  surprise: def({ id: 'surprise', file: 'reactions/surprise.mp3', channel: 'voice', group: 'toodle', priority: 75, cooldownMs: 2000, holdMs: 280, gain: 0.5 }),
  confused: def({ id: 'confused', file: 'reactions/confused.mp3', channel: 'voice', group: 'toodle', priority: 50, cooldownMs: 2500, holdMs: 360, gain: 0.4, variants: ['hmm', 'huh', 'confused'] }),
  angry: def({ id: 'angry', file: 'reactions/angry.mp3', channel: 'voice', group: 'toodle', priority: 70, cooldownMs: 2500, holdMs: 320, gain: 0.42 }),
  sad: def({ id: 'sad', file: 'reactions/sad.mp3', channel: 'voice', group: 'toodle', priority: 55, cooldownMs: 4000, holdMs: 480, gain: 0.36 }),
  cry: def({ id: 'cry', file: 'reactions/cry.mp3', channel: 'voice', group: 'toodle', priority: 70, cooldownMs: 5000, holdMs: 640, gain: 0.38 }),
  sleep: def({ id: 'sleep', file: 'expressions/sleep.mp3', channel: 'ambient', group: 'toodle', priority: 15, cooldownMs: 8000, holdMs: 700, gain: 0.22 }),
  snore: def({ id: 'snore', file: 'expressions/snore.mp3', channel: 'ambient', group: 'toodle', priority: 25, cooldownMs: 8000, holdMs: 600, gain: 0.28 }),
  sigh: def({ id: 'sigh', file: 'reactions/sigh.mp3', channel: 'voice', group: 'toodle', priority: 35, cooldownMs: 6000, holdMs: 500, gain: 0.32 }),
  yawn: def({ id: 'yawn', file: 'reactions/yawn.mp3', channel: 'voice', group: 'toodle', priority: 30, cooldownMs: 8000, holdMs: 640, gain: 0.3 }),
  footsteps_soft: def({ id: 'footsteps_soft', file: 'movement/footsteps-soft.mp3', channel: 'movement', group: 'effects', priority: 30, cooldownMs: 180, holdMs: 90, gain: 0.32 }),
  footsteps_fast: def({ id: 'footsteps_fast', file: 'movement/footsteps-fast.mp3', channel: 'movement', group: 'effects', priority: 35, cooldownMs: 110, holdMs: 70, gain: 0.36 }),
  run: def({ id: 'run', file: 'movement/run.mp3', channel: 'movement', group: 'effects', priority: 35, cooldownMs: 400, holdMs: 200, gain: 0.3 }),
  jump: def({ id: 'jump', file: 'movement/jump.mp3', channel: 'movement', group: 'effects', priority: 50, cooldownMs: 400, holdMs: 220, gain: 0.4 }),
  fall: def({ id: 'fall', file: 'movement/fall.mp3', channel: 'movement', group: 'effects', priority: 60, cooldownMs: 600, holdMs: 280, gain: 0.42 }),
  land: def({ id: 'land', file: 'movement/land.mp3', channel: 'movement', group: 'effects', priority: 60, cooldownMs: 400, holdMs: 160, gain: 0.4 }),
  double_tap: def({ id: 'double_tap', file: 'ui/double-tap.mp3', channel: 'interaction', group: 'ui', priority: 60, cooldownMs: 400, holdMs: 140, gain: 0.4 }),
  triple_tap: def({ id: 'triple_tap', file: 'ui/triple-tap.mp3', channel: 'interaction', group: 'ui', priority: 80, cooldownMs: 500, holdMs: 160, gain: 0.45 }),
  pop: def({ id: 'pop', file: 'expressions/pop.mp3', channel: 'prop', group: 'effects', priority: 40, cooldownMs: 250, holdMs: 120, gain: 0.4 }),
  sparkle: def({ id: 'sparkle', file: 'expressions/sparkle.mp3', channel: 'prop', group: 'effects', priority: 35, cooldownMs: 700, holdMs: 280, gain: 0.36 }),
  success: def({ id: 'success', file: 'expressions/success.mp3', channel: 'prop', group: 'effects', priority: 45, cooldownMs: 1200, holdMs: 320, gain: 0.4 }),
  celebration: def({ id: 'celebration', file: 'expressions/celebration.mp3', channel: 'prop', group: 'effects', priority: 65, cooldownMs: 4000, holdMs: 700, gain: 0.45 }),
  suitcase_open: def({ id: 'suitcase_open', file: 'props/suitcase-open.mp3', channel: 'prop', group: 'effects', priority: 55, cooldownMs: 500, holdMs: 280, gain: 0.42 }),
  suitcase_close: def({ id: 'suitcase_close', file: 'props/suitcase-close.mp3', channel: 'prop', group: 'effects', priority: 55, cooldownMs: 500, holdMs: 180, gain: 0.42 }),
  page_flip: def({ id: 'page_flip', file: 'props/page-flip.mp3', channel: 'prop', group: 'effects', priority: 40, cooldownMs: 400, holdMs: 220, gain: 0.36 }),
  pen: def({ id: 'pen', file: 'props/pen.mp3', channel: 'prop', group: 'effects', priority: 30, cooldownMs: 350, holdMs: 180, gain: 0.28 }),
  typing_fast: def({ id: 'typing_fast', file: 'props/typing-fast.mp3', channel: 'prop', group: 'effects', priority: 35, cooldownMs: 600, holdMs: 360, gain: 0.3 }),
  clock: def({ id: 'clock', file: 'props/clock.mp3', channel: 'prop', group: 'effects', priority: 40, cooldownMs: 700, holdMs: 160, gain: 0.34 }),
  camera: def({ id: 'camera', file: 'props/camera.mp3', channel: 'prop', group: 'effects', priority: 40, cooldownMs: 500, holdMs: 140, gain: 0.36 }),
  phone: def({ id: 'phone', file: 'props/phone.mp3', channel: 'prop', group: 'effects', priority: 40, cooldownMs: 800, holdMs: 200, gain: 0.34 }),
  bike: def({ id: 'bike', file: 'props/bike.mp3', channel: 'prop', group: 'effects', priority: 45, cooldownMs: 900, holdMs: 320, gain: 0.32 }),
  helmet: def({ id: 'helmet', file: 'props/helmet.mp3', channel: 'prop', group: 'effects', priority: 45, cooldownMs: 700, holdMs: 140, gain: 0.4 }),
  whoosh: def({ id: 'whoosh', file: 'movement/whoosh.mp3', channel: 'movement', group: 'effects', priority: 40, cooldownMs: 700, holdMs: 280, gain: 0.34 }),
  popcorn: def({ id: 'popcorn', file: 'props/popcorn.mp3', channel: 'prop', group: 'effects', priority: 35, cooldownMs: 800, holdMs: 260, gain: 0.32 }),
  impact: def({ id: 'impact', file: 'expressions/impact.mp3', channel: 'interaction', group: 'effects', priority: 85, cooldownMs: 400, holdMs: 180, gain: 0.5 }),
};

export const PRELOAD_IDS: ToodleSoundId[] = [
  'tap', 'message_pop', 'boop', 'hmm', 'huh', 'footsteps_soft', 'footsteps_fast', 'surprise', 'giggle',
];

export function soundDef(id: ToodleSoundId): SoundDef {
  return SOUND_REGISTRY[id];
}
