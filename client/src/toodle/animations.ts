export type ToodleAnimation =
  | 'idle'
  | 'happy'
  | 'walk'
  | 'run'
  | 'dance'
  | 'laugh'
  | 'cry'
  | 'fear'
  | 'angry'
  | 'shocked'
  | 'confused'
  | 'thinking'
  | 'sleepy'
  | 'celebrate'
  | 'blush'
  | 'wink'
  | 'suspicious'
  | 'dramatic'
  | 'peek'
  | 'hide'
  | 'fall'
  | 'spin'
  | 'bounce'
  | 'legShake'
  | 'buttWiggle'
  | 'walkAway'
  | 'joke';

export type ToodleSize = 'small' | 'medium' | 'large';
export type ToodlePosition = 'floating' | 'inline' | 'peek';
export type ToodleIntensity = 'soft' | 'normal' | 'extra';
export type ToodleDirection = 'left' | 'right';
export type DanceStyle = 'bounce' | 'silly' | 'victory' | 'chaotic';

export type ToodleProp =
  | 'glasses'
  | 'sunglasses'
  | 'heart'
  | 'sparkles'
  | 'popcorn'
  | 'phone'
  | 'coffee'
  | 'blanket'
  | 'magnifyingGlass'
  | 'questionMark'
  | 'exclamation'
  | 'suitcase'
  | 'notebook'
  | 'helmet'
  | 'cake'
  | 'book'
  | 'backpack'
  | 'medicine'
  | 'party';

export const SIZE_PX: Record<ToodleSize, number> = { small: 76, medium: 104, large: 136 };

const SPRITE = {
  happy: '/toodle/happy.png',
  laughing: '/toodle/laughing.png',
  winking: '/toodle/winking.png',
  thinking: '/toodle/thinking.png',
  confused: '/toodle/confused.png',
  surprised: '/toodle/surprised.png',
  excited: '/toodle/excited.png',
  blushing: '/toodle/blushing.png',
  sleepy: '/toodle/sleepy.png',
  shocked: '/toodle/shocked.png',
  cool: '/toodle/cool.png',
  dramatic: '/toodle/dramatic.png',
  sassy: '/toodle/sassy.png',
  love: '/toodle/love.png',
  celebrating: '/toodle/celebrating.png',
  side: '/toodle/side.png',
  back: '/toodle/back.png',
} as const;

export type SpriteName = keyof typeof SPRITE;

export function spriteSrc(name: SpriteName): string {
  return SPRITE[name];
}

export interface MotionFrame {
  sprite: SpriteName;
  x?: number | number[];
  y?: number | number[];
  rotate?: number | number[];
  scale?: number | number[];
  opacity?: number | number[];
  duration: number;
  repeat?: number;
  flip?: boolean;
}

function amp(intensity: ToodleIntensity): number {
  if (intensity === 'soft') return 0.55;
  if (intensity === 'extra') return 1.2;
  return 1;
}

export function framesFor(
  animation: ToodleAnimation,
  intensity: ToodleIntensity,
  direction: ToodleDirection,
  danceStyle: DanceStyle,
): MotionFrame[] {
  const a = amp(intensity);
  const travel = (direction === 'right' ? 1 : -1) * 10 * a;
  switch (animation) {
    case 'idle':
      return [{ sprite: 'happy', y: [0, -3 * a, 0], rotate: [0, -1.5, 0, 1.5, 0], duration: 2.8, repeat: Infinity }];
    case 'happy':
      return [{ sprite: 'happy', y: [6, 0], scale: [0.96, 1], duration: 0.45 }];
    case 'walk':
      return [{ sprite: 'side', x: [-travel, travel], y: [0, -4 * a, 0, -3 * a, 0], rotate: [-3, 3, -3], duration: 0.7, repeat: Infinity, flip: direction === 'left' }];
    case 'run':
      return [{ sprite: 'side', x: [-travel * 1.6, travel * 1.6], y: [0, -8 * a, 0], rotate: [-6, 5, -6], duration: 0.38, repeat: Infinity, flip: direction === 'left' }];
    case 'dance':
      return danceFrames(danceStyle, a);
    case 'laugh':
      return [
        { sprite: 'laughing', rotate: [0, -6, 7, -5, 4, 0], y: [0, -3, 0], duration: 0.7, repeat: 2 },
        { sprite: 'dramatic', rotate: [-8, 0], y: [0, 6], duration: 0.35 },
      ];
    case 'cry':
      return [
        { sprite: 'blushing', y: [0, 2, 0], duration: 0.4 },
        { sprite: 'dramatic', rotate: [-2, 2, -2], y: [0, 2, 0], duration: 0.8, repeat: 2 },
      ];
    case 'fear':
      return [
        { sprite: 'surprised', duration: 0.28 },
        { sprite: 'shocked', x: [0, -4 * a, 4 * a, -3 * a, -8 * a], duration: 0.55 },
        { sprite: 'side', x: [0, 12, -6], y: [0, -4, 0], duration: 0.4 },
        { sprite: 'dramatic', duration: 0.45 },
      ];
    case 'angry':
      return [{ sprite: 'sassy', y: [0, -3 * a, 0], rotate: [0, -2, 2, 0], duration: 0.35, repeat: 3 }];
    case 'shocked':
      return [{ sprite: 'shocked', y: [4, 0], scale: [0.94, 1.04, 1], duration: 0.4 }];
    case 'confused':
      return [{ sprite: 'confused', rotate: [0, 6, -4, 0], duration: 0.7 }];
    case 'thinking':
      return [
        { sprite: 'thinking', y: [0, -2, 0], rotate: [0, -2, 0], duration: 0.9 },
        { sprite: 'confused', rotate: [0, 5, 0], duration: 0.55 },
        { sprite: 'winking', duration: 0.45 },
      ];
    case 'sleepy':
      return [
        { sprite: 'side', x: [-14, 0], y: [0, -3, 0], duration: 0.5 },
        { sprite: 'happy', duration: 0.3 },
        { sprite: 'sleepy', y: [0, 3], rotate: [-2, -5], duration: 1.4, repeat: Infinity },
      ];
    case 'celebrate':
      return [
        { sprite: 'excited', y: [0, -14 * a, 0], duration: 0.4 },
        { sprite: 'celebrating', rotate: [0, 16, 0], duration: 0.45 },
        { sprite: 'celebrating', y: [0, -6, 0], duration: 0.35 },
      ];
    case 'blush':
      return [{ sprite: 'blushing', y: [4, 0], scale: [0.97, 1], duration: 0.45 }];
    case 'wink':
      return [{ sprite: 'winking', rotate: [0, -6, 0], duration: 0.55 }];
    case 'suspicious':
      return [
        { sprite: 'winking', duration: 0.35 },
        { sprite: 'confused', x: [-8, 0], duration: 0.5 },
        { sprite: 'sassy', rotate: [0, -3, 2, 0], duration: 0.45 },
      ];
    case 'dramatic':
      return [{ sprite: 'dramatic', rotate: [-6, 4, -2, 0], y: [8, 0], duration: 0.7 }];
    case 'peek':
      return [{ sprite: 'winking', x: [-26, -4, 0], duration: 0.55 }];
    case 'hide':
      return [{ sprite: 'sleepy', y: [0, 16], opacity: [1, 0], duration: 0.45 }];
    case 'fall':
      return [{ sprite: 'dramatic', rotate: [-12, 0], y: [-8, 8], duration: 0.45 }];
    case 'spin':
      return [{ sprite: 'celebrating', rotate: [0, 360], duration: 0.7 }];
    case 'bounce':
      return [{ sprite: 'excited', y: [0, -12 * a, 0], duration: 0.45, repeat: 2 }];
    case 'legShake':
      return [{ sprite: 'thinking', rotate: [0, -2.5, 2.5, -2.5, 2.5, 0], duration: 0.28, repeat: 4 }];
    case 'buttWiggle':
      return [
        { sprite: 'back', rotate: [0, -10, 12, -10, 12, -6, 0], duration: 0.85 },
        { sprite: 'winking', rotate: [6, 0], duration: 0.35 },
      ];
    case 'walkAway':
      return [{ sprite: 'back', x: [0, travel * 3], opacity: [1, 0], y: [0, -3, 0], duration: 0.9, flip: direction === 'left' }];
    case 'joke':
      return [
        { sprite: 'side', x: [-18, 0], y: [0, -3, 0], duration: 0.55, flip: direction === 'left' },
        { sprite: 'thinking', rotate: [0, -3, 0], duration: 0.7 },
        { sprite: 'winking', duration: 0.45 },
        { sprite: 'laughing', rotate: [0, -5, 5, 0], duration: 0.55 },
        { sprite: 'back', x: [0, 28], opacity: [1, 0], duration: 0.6 },
      ];
    default:
      return [{ sprite: 'happy', duration: 0.4 }];
  }
}

function danceFrames(style: DanceStyle, a: number): MotionFrame[] {
  if (style === 'silly') {
    return [{ sprite: 'excited', rotate: [-8, 8, -8, 8, 0], y: [0, -4, 0], duration: 0.6, repeat: 2 }];
  }
  if (style === 'victory') {
    return [
      { sprite: 'celebrating', y: [0, -16 * a, 0], duration: 0.45 },
      { sprite: 'excited', rotate: [0, 18, 0], duration: 0.4 },
      { sprite: 'celebrating', scale: [1, 1.04, 1], duration: 0.35 },
    ];
  }
  if (style === 'chaotic') {
    return [{ sprite: 'excited', rotate: [0, -10, 12, -6, 8, 0], y: [0, -8, 2, -6, 0], duration: 0.7, repeat: 1 }];
  }
  return [{ sprite: 'celebrating', y: [0, -10 * a, 0], rotate: [-4, 4, -4], duration: 0.5, repeat: 3 }];
}

export const PROP_MARK: Partial<Record<ToodleProp, string>> = {
  heart: '💗',
  sparkles: '✨',
  popcorn: '🍿',
  phone: '📱',
  coffee: '☕',
  blanket: '🛏️',
  magnifyingGlass: '🔍',
  questionMark: '❓',
  exclamation: '‼️',
  suitcase: '🧳',
  notebook: '📓',
  helmet: '🪖',
  cake: '🎂',
  book: '📖',
  backpack: '🎒',
  medicine: '💊',
  party: '🎉',
};
