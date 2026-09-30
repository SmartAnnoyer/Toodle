import type { DanceStyle, ToodleProp } from '../animations';
import type { ToodleAnimationController } from './ToodleAnimationController';
import { ToodleCharacter } from './ToodleCharacter';
import type { ToodleCharacterState } from './state';

/**
 * The live Toodle is the procedural OG full-body mascot in ToodleCharacter.
 * A rigged GLB can replace that mesh later at client/public/toodle/toodle.glb.
 * Do not point the character at a PNG, GIF, or sprite sheet.
 */
export const TOODLE_GLB_URL = '/toodle/toodle.glb';

export function ToodleModel({
  controller,
  danceStyle,
  prop,
  listening,
  reduced,
  onState,
}: {
  controller: ToodleAnimationController;
  danceStyle: DanceStyle;
  prop?: ToodleProp;
  listening: boolean;
  reduced: boolean;
  onState?: (state: ToodleCharacterState) => void;
}) {
  return (
    <ToodleCharacter
      controller={controller}
      danceStyle={danceStyle}
      prop={prop}
      listening={listening}
      reduced={reduced}
      onState={onState}
    />
  );
}
