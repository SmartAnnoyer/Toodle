import type { SoundCue, ToodleSoundId } from './types';

/** Extra sounds for reactions whose cues are built inline. Cue timelines win over this. */
const PLANS: Record<string, SoundCue[][]> = {
  name: [[{ at: 140, sound: 'boop' }]],
  'name-ask': [[{ at: 120, sound: 'boop' }]],
  'name-bro': [[{ at: 160, sound: 'confused' }]],
  'name-compliment': [[{ at: 180, sound: 'sparkle' }]],
  'name-follow': [[{ at: 100, sound: 'boop' }]],
  'name-shrug': [[{ at: 160, sound: 'hmm' }]],
  'bro-who': [[{ at: 200, sound: 'confused' }]],
  'bro-burst': [[{ at: 180, sound: 'confused' }]],
  'bro-siblings': [[{ at: 200, sound: 'sad' }]],
  'bro-name': [[{ at: 140, sound: 'boop' }]],
  'hmm-side': [[{ at: 80, sound: 'sigh' }, { at: 700, sound: 'whoosh' }]],
  'hmm-look': [[{ at: 100, sound: 'sigh' }]],
  'hmm-snap': [[{ at: 80, sound: 'huh' }]],
  'hmm-loop': [[{ at: 80, sound: 'sigh' }]],
  'hmm-lore': [[{ at: 100, sound: 'hmm' }]],
  'ha-look': [[{ at: 80, sound: 'sigh' }]],
  'dry-mix': [[{ at: 80, sound: 'sigh' }, { at: 650, sound: 'whoosh' }]],
  'dry-streak': [[{ at: 80, sound: 'sigh' }]],
  'fake-bye': [[{ at: 200, sound: 'whoosh' }], [{ at: 80, sound: 'boop' }]],
  best: [[{ at: 160, sound: 'sparkle' }]],
  'strong-compliment': [[{ at: 160, sound: 'sparkle' }]],
  'happy-ga': [[{ at: 140, sound: 'giggle' }]],
  bavundhi: [[{ at: 140, sound: 'sparkle' }]],
  pspk: [[{ at: 120, sound: 'celebration' }]],
  megastar: [[{ at: 120, sound: 'celebration' }]],
  amma: [[{ at: 140, sound: 'boop' }]],
  nanna: [[{ at: 140, sound: 'boop' }]],
  'trip-cancel': [[{ at: 0, sound: 'whoosh' }], [{ at: 0, sound: 'surprise' }], [{ at: 0, sound: 'fall' }, { at: 480, sound: 'land' }]],
  'trip-plan-cancel': [[{ at: 0, sound: 'whoosh' }], [{ at: 0, sound: 'surprise' }], [{ at: 0, sound: 'fall' }, { at: 480, sound: 'land' }]],
  'deadline-panic': [[{ at: 0, sound: 'surprise' }], [{ at: 80, sound: 'clock' }]],
  'exam-panic': [[{ at: 80, sound: 'page_flip' }], [{ at: 300, sound: 'yawn' }]],
  'rapido-driver': [[{ at: 60, sound: 'helmet' }]],
  'romantic-blush': [[{ at: 120, sound: 'sparkle' }]],
};

const VOICED: Partial<Record<string, ToodleSoundId>> = {
  laugh: 'giggle',
  cry: 'cry',
  sleepy: 'snore',
  angry: 'angry',
  fear: 'surprise',
  fall: 'fall',
  wake: 'huh',
};

export function timelineFor(reactionId: string | undefined, index: number): SoundCue[] | undefined {
  if (!reactionId) return undefined;
  return PLANS[reactionId]?.[index];
}

export function voiceForAnimation(animation: string | undefined, priority: number): SoundCue[] {
  if (!animation || priority < 60) return [];
  const sound = VOICED[animation];
  if (!sound) return [];
  if (sound === 'fall') return [{ at: 0, sound: 'fall' }, { at: 420, sound: 'land' }];
  return [{ at: 0, sound }];
}
