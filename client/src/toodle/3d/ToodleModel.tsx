import type { DanceStyle, ToodleProp } from '../animations';
import type { ToodleAnimationController } from './ToodleAnimationController';
import { ToodleCharacter } from './ToodleCharacter';
import type { ToodleCharacterState } from './state';

/**
 * Drop a rigged replacement at client/public/toodle/toodle.glb.
 * The live character is this procedural full-body rig until that file is authored.
 * Do not point this at a PNG, GIF, or sprite sheet.
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
