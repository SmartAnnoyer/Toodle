import type { MusicEnergy, MusicMood, MusicSnapshot, ToodleMusicEvent } from '../../music/MusicTypes';
import type { ToodleAnimation, ToodleProp } from '../animations';
import type { ToodleBeat, ToodlePose } from '../types';

const COOLDOWN: Partial<Record<ToodleMusicEvent, number>> = {
  music_started: 30_000,
  music_paused: 30_000,
  music_resumed: 20_000,
  music_changed: 20_000,
  music_seeked: 45_000,
  music_near_end: 60_000,
  music_finished: 20_000,
  music_long_play: 120_000,
  music_idle: 45_000,
};

const CHANCE: Partial<Record<ToodleMusicEvent, number>> = {
  music_started: 1,
  music_paused: 0.35,
  music_resumed: 0.45,
  music_changed: 0.6,
  music_seeked: 0.08,
  music_near_end: 0.15,
  music_finished: 0.35,
  music_long_play: 0.4,
  music_idle: 0.05,
};

function pick<T>(items: T[], random: number): T {
  return items[Math.min(items.length - 1, Math.floor(random * items.length))] ?? items[0];
}

function beat(
  animation: ToodleAnimation,
  pose: ToodlePose,
  ms: number,
  priority: number,
  extra: Partial<ToodleBeat> = {},
): ToodleBeat {
  return { event: 'HEARD', pose, animation, spot: 'composer', ms, priority, ...extra };
}

function vibeAnimation(energy: MusicEnergy, mood?: MusicMood): ToodleAnimation {
  if (mood === 'dramatic') return 'dramatic';
  if (mood === 'sad') return 'listen';
  if (mood === 'romantic') return 'blush';
  if (mood === 'chill') return 'listen';
  if (energy === 'chaotic') return 'spin';
  if (energy === 'energetic' || mood === 'energetic' || mood === 'happy') return 'dance';
  if (energy === 'calm') return 'listen';
  return 'bounce';
}

export function ambientVibeBeat(music: MusicSnapshot): ToodleBeat {
  return beat(vibeAnimation(music.energy, music.mood), 'happy', 16_000, 28, {
    reactionId: 'music-ambient',
    prop: music.energy === 'calm' ? undefined : 'headphones',
  });
}

export function decideMusicReaction(input: {
  event: ToodleMusicEvent;
  energy: MusicEnergy;
  mood?: MusicMood;
  now: number;
  random: number;
  cooldowns: Map<string, number>;
  performing: number;
}): ToodleBeat[] | null {
  if (input.performing >= 60) return null;
  const until = input.cooldowns.get(input.event) ?? 0;
  if (input.now < until) return null;
  if (input.random > (CHANCE[input.event] ?? 0)) return null;
  input.cooldowns.set(input.event, input.now + (COOLDOWN[input.event] ?? 30_000));
  const dance = vibeAnimation(input.energy, input.mood);
  const roll = input.random;
  if (input.event === 'music_started') {
    return [
      beat('shocked', 'shocked', 650, 58, { reactionId: 'music_start', sound: 'tap' }),
      beat(dance, 'happy', 1600, 58, {
        reactionId: 'music_start',
        prop: 'headphones',
        line: pick(['Okayyy... 👀', "Let's vibe.", 'Finally, some music.'], roll),
        sound: 'boop',
      }),
    ];
  }
  if (input.event === 'music_paused') {
    return [beat('confused', 'confused', 1400, 42, {
      reactionId: 'music_pause',
      line: pick(['Why did we stop?', 'Who paused?', 'Excuse me?', 'That was getting good.'], roll),
      sound: 'tap',
    })];
  }
  if (input.event === 'music_resumed') {
    return [beat(dance, 'happy', 1200, 50, {
      reactionId: 'music_resume',
      prop: 'headphones',
      line: pick(["We're back.", "Okay let's go.", 'Round two.', 'Continue.'], roll),
      sound: 'boop',
    })];
  }
  if (input.event === 'music_changed') {
    return [
      beat('shocked', 'shocked', 500, 55, { reactionId: 'music_change' }),
      beat('confused', 'confused', 900, 55, {
        reactionId: 'music_change',
        line: pick(['New vibe?', 'Okay... interesting.', 'Hmm 👀', 'I can work with this.', 'WAIT THIS ONE.'], roll),
      }),
      beat(dance, 'happy', 1200, 55, { reactionId: 'music_change', prop: 'headphones' }),
    ];
  }
  if (input.event === 'music_finished') {
    return [beat(roll < 0.5 ? 'celebrate' : 'listen', 'happy', 1200, 40, {
      reactionId: 'music_finished',
      line: pick(['Again?', 'Next song?', 'That was nice.'], roll),
      sound: 'success',
    })];
  }
  if (input.event === 'music_long_play') {
    return [
      beat('sleepy', 'sleeping', 1400, 36, { reactionId: 'music_sleepy', prop: 'headphones', sound: 'yawn' }),
      beat('sleepy', 'sleeping', 1800, 36, { reactionId: 'music_sleepy', prop: 'headphones', sound: 'snore' }),
    ];
  }
  if (input.event === 'music_near_end') {
    return [beat('listen', 'thinking', 900, 34, { reactionId: 'music_near_end' })];
  }
  if (input.event === 'music_seeked') {
    return [beat('confused', 'confused', 700, 32, { reactionId: 'music_seek' })];
  }
  return [beat(dance, 'happy', 1100, 30, { reactionId: 'music_idle', prop: roll < 0.2 ? 'sunglasses' : 'headphones' })];
}

const COMBO_LINES: Record<string, string[]> = {
  trip: ['TRIP + MUSIC = YES.'],
  food: ['Music + food = perfect.'],
  study: ['Focus bro.'],
  office: ['Corporate life ruined the vibe 😭'],
  deadline: ['Panic, but make it a beat.'],
  birthday: ['Birthday AND a soundtrack.'],
  movie: ['Movie night, but louder.'],
  love: ['Soft. Okay.'],
  bro: ['BRO?'],
  hmm: ['What are you thinking? 👀'],
  okay: ['Okay okay.'],
  enjoy: ['Enjoy enjoy.'],
};

function comboKind(reactionId: string): string | null {
  if (reactionId === 'name' || reactionId === 'name-ask' || reactionId === 'name-shrug' || reactionId === 'amma' || reactionId === 'nanna') return null;
  if (reactionId === 'trip' || reactionId === 'plan') return 'trip';
  if (reactionId === 'food') return 'food';
  if (reactionId === 'study' || reactionId === 'exam') return 'study';
  if (reactionId === 'office') return 'office';
  if (reactionId === 'deadline') return 'deadline';
  if (reactionId === 'birthday') return 'birthday';
  if (reactionId === 'movie') return 'movie';
  if (reactionId === 'romance' || reactionId === 'heroine') return 'love';
  if (reactionId.startsWith('bro-') || reactionId === 'name-bro') return 'bro';
  if (reactionId.startsWith('hmm-')) return 'hmm';
  if (reactionId.includes('okay')) return 'okay';
  if (reactionId === 'enjoy' || reactionId === 'happy-ga') return 'enjoy';
  return null;
}

const COMBO_PROP: Record<string, ToodleProp | undefined> = {
  trip: 'suitcase',
  food: 'popcorn',
  study: 'book',
  office: 'coffee',
  deadline: 'phone',
  birthday: 'cake',
  movie: 'popcorn',
  love: 'heart',
  enjoy: 'sunglasses',
};

export function musicComboBeat(reactionId: string | undefined, music: MusicSnapshot | null, random: number): ToodleBeat | null {
  if (!music || music.status !== 'playing' || !reactionId) return null;
  const kind = comboKind(reactionId);
  if (!kind) return null;
  const lines = COMBO_LINES[kind] ?? [];
  return beat(vibeAnimation(music.energy, music.mood), 'excited', 1400, 36, {
    reactionId: `music-combo-${kind}`,
    prop: COMBO_PROP[kind] ?? 'headphones',
    line: random < 0.55 ? lines[0] : undefined,
    sound: kind === 'enjoy' ? 'sparkle' : undefined,
  });
}
