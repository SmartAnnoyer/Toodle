import type { FacePose, ToodleExpression, ToodleMood } from './state';

const FACE: Record<ToodleExpression, FacePose> = {
  neutral: { eyeScale: 1, narrow: 1, pupilX: 0, browL: 0, browR: 0, mouthOpen: 0.35, mouthWide: 1, mouthDrop: 0, cheek: 0.7, lid: 0, wink: 0 },
  happy: { eyeScale: 1.05, narrow: 0.22, pupilX: 0, browL: 0.16, browR: 0.16, mouthOpen: 0.85, mouthWide: 1.35, mouthDrop: -0.02, cheek: 1.2, lid: 0, wink: 0 },
  sad: { eyeScale: 0.95, narrow: 0.7, pupilX: 0, browL: -0.28, browR: -0.28, mouthOpen: 0.08, mouthWide: 0.75, mouthDrop: 0.06, cheek: 0.25, lid: 0.45, wink: 0 },
  angry: { eyeScale: 0.9, narrow: 0.35, pupilX: 0, browL: -0.42, browR: -0.42, mouthOpen: 0.2, mouthWide: 0.65, mouthDrop: 0.03, cheek: 0.35, lid: 0.1, wink: 0 },
  annoyed: { eyeScale: 0.95, narrow: 0.4, pupilX: 0.08, browL: -0.3, browR: 0.18, mouthOpen: 0.12, mouthWide: 0.7, mouthDrop: 0.03, cheek: 0.4, lid: 0.15, wink: 0 },
  confused: { eyeScale: 1.15, narrow: 1, pupilX: 0.1, browL: 0.34, browR: -0.2, mouthOpen: 0.25, mouthWide: 0.65, mouthDrop: 0, cheek: 0.55, lid: 0, wink: 0 },
  curious: { eyeScale: 1.18, narrow: 1.05, pupilX: 0.06, browL: 0.28, browR: 0.28, mouthOpen: 0.2, mouthWide: 0.8, mouthDrop: 0, cheek: 0.6, lid: 0, wink: 0 },
  surprised: { eyeScale: 1.55, narrow: 1.25, pupilX: 0, browL: 0.42, browR: 0.42, mouthOpen: 1.15, mouthWide: 0.9, mouthDrop: 0, cheek: 0.5, lid: 0, wink: 0 },
  scared: { eyeScale: 1.45, narrow: 1.2, pupilX: 0, browL: 0.38, browR: 0.38, mouthOpen: 0.9, mouthWide: 0.75, mouthDrop: 0.02, cheek: 0.2, lid: 0, wink: 0 },
  sleepy: { eyeScale: 1, narrow: 0.12, pupilX: 0, browL: -0.08, browR: -0.08, mouthOpen: 0.45, mouthWide: 0.85, mouthDrop: 0.02, cheek: 0.45, lid: 0.85, wink: 0 },
  excited: { eyeScale: 1.2, narrow: 0.28, pupilX: 0, browL: 0.22, browR: 0.22, mouthOpen: 1.2, mouthWide: 1.5, mouthDrop: -0.03, cheek: 1.35, lid: 0, wink: 0 },
  embarrassed: { eyeScale: 0.95, narrow: 0.3, pupilX: -0.06, browL: 0.08, browR: 0.08, mouthOpen: 0.2, mouthWide: 0.85, mouthDrop: 0, cheek: 1.6, lid: 0.25, wink: 0 },
  shy: { eyeScale: 0.9, narrow: 0.45, pupilX: -0.1, browL: 0.06, browR: 0.06, mouthOpen: 0.15, mouthWide: 0.8, mouthDrop: 0, cheek: 1.4, lid: 0.4, wink: 0 },
  proud: { eyeScale: 1.05, narrow: 0.55, pupilX: 0, browL: 0.14, browR: 0.14, mouthOpen: 0.4, mouthWide: 1.15, mouthDrop: -0.02, cheek: 0.8, lid: 0, wink: 0 },
  dramatic: { eyeScale: 1.1, narrow: 0.5, pupilX: 0, browL: 0.36, browR: -0.28, mouthOpen: 0.7, mouthWide: 1.05, mouthDrop: 0, cheek: 0.7, lid: 0, wink: 0 },
  suspicious: { eyeScale: 0.95, narrow: 0.32, pupilX: 0.12, browL: 0.4, browR: -0.32, mouthOpen: 0.08, mouthWide: 0.65, mouthDrop: 0.02, cheek: 0.3, lid: 0.05, wink: 0 },
};

export function faceFor(expression: ToodleExpression, blink: number, wink: boolean): FacePose {
  const face = FACE[expression];
  return { ...face, lid: Math.min(1, face.lid + blink), wink: wink ? 1 : face.wink };
}

export function moodFor(expression: ToodleExpression): ToodleMood {
  if (expression === 'angry' || expression === 'annoyed') return 'angry';
  if (expression === 'sad') return 'sad';
  if (expression === 'scared') return 'scared';
  if (expression === 'sleepy') return 'sleepy';
  if (expression === 'excited' || expression === 'happy') return expression === 'excited' ? 'excited' : 'happy';
  if (expression === 'dramatic' || expression === 'suspicious') return 'dramatic';
  if (expression === 'curious' || expression === 'confused' || expression === 'surprised') return 'curious';
  return 'happy';
}

export function expressionFor(animation: string): ToodleExpression {
  switch (animation) {
    case 'happy':
    case 'bounce':
    case 'wave':
      return 'happy';
    case 'dance':
    case 'celebrate':
    case 'laugh':
    case 'joke':
    case 'spin':
      return 'excited';
    case 'blush':
      return 'embarrassed';
    case 'cry':
      return 'sad';
    case 'angry':
      return 'angry';
    case 'walkAway':
      return 'annoyed';
    case 'fear':
    case 'fall':
      return 'scared';
    case 'shocked':
      return 'surprised';
    case 'confused':
      return 'confused';
    case 'thinking':
    case 'listen':
    case 'peek':
      return 'curious';
    case 'sleepy':
    case 'sleep':
      return 'sleepy';
    case 'wink':
      return 'happy';
    case 'suspicious':
      return 'suspicious';
    case 'dramatic':
      return 'dramatic';
    case 'hide':
      return 'shy';
    case 'notice':
      return 'surprised';
    default:
      return 'neutral';
  }
}
