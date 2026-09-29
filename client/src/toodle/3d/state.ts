import type { ToodleProp } from '../animations';

export type ToodleExpression =
  | 'neutral'
  | 'happy'
  | 'sad'
  | 'angry'
  | 'annoyed'
  | 'confused'
  | 'curious'
  | 'surprised'
  | 'scared'
  | 'sleepy'
  | 'excited'
  | 'embarrassed'
  | 'shy'
  | 'proud'
  | 'dramatic'
  | 'suspicious';

export type ToodleMood =
  | 'happy'
  | 'curious'
  | 'sleepy'
  | 'excited'
  | 'angry'
  | 'sad'
  | 'scared'
  | 'dramatic';

export type ToodleClip =
  | 'idle'
  | 'blink'
  | 'walk'
  | 'run'
  | 'jump'
  | 'dance'
  | 'sit'
  | 'sleep'
  | 'wake'
  | 'laugh'
  | 'cry'
  | 'angry'
  | 'scared'
  | 'surprised'
  | 'thinking'
  | 'peek'
  | 'hide'
  | 'wave'
  | 'fall'
  | 'get_up'
  | 'listen'
  | 'notice';

export interface ToodleCharacterState {
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  animation: string;
  mood: ToodleMood;
  expression: ToodleExpression;
  currentProp?: ToodleProp;
  isMoving: boolean;
  isInteractive: boolean;
}

export interface FacePose {
  eyeScale: number;
  narrow: number;
  pupilX: number;
  browL: number;
  browR: number;
  mouthOpen: number;
  mouthWide: number;
  mouthDrop: number;
  cheek: number;
  lid: number;
  wink: number;
}
