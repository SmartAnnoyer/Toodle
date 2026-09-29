import { lineFor } from './lines';
import type { ChaosLevel, ToodleBeat, ToodleContext, ToodleEvent, ToodlePose } from './types';

interface Rule {
  probability: number;
  cooldown: number;
  priority: number;
  pose: ToodlePose;
  spoken: boolean;
  spot: 'composer' | 'edge';
  ms: number;
}

const RULES: Record<ToodleEvent, Rule> = {
  CHAT_OPENED: { probability: 0.35, cooldown: 600_000, priority: 30, pose: 'suspicious', spoken: true, spot: 'edge', ms: 3200 },
  USER_TYPING_TOO_LONG: { probability: 0.25, cooldown: 120_000, priority: 40, pose: 'thinking', spoken: true, spot: 'composer', ms: 4200 },
  USER_DELETED_DRAFT: { probability: 0.3, cooldown: 90_000, priority: 45, pose: 'confused', spoken: true, spot: 'composer', ms: 4200 },
  USER_SENT_MANY_MESSAGES: { probability: 0.45, cooldown: 80_000, priority: 55, pose: 'shocked', spoken: true, spot: 'composer', ms: 3600 },
  CHAT_IDLE: { probability: 0.4, cooldown: 900_000, priority: 35, pose: 'crying', spoken: true, spot: 'edge', ms: 4200 },
  CHAT_ACTIVE_LONG: { probability: 0.45, cooldown: 1_200_000, priority: 50, pose: 'dramatic', spoken: true, spot: 'edge', ms: 4600 },
  WORD_REPEATED: { probability: 0.7, cooldown: 180_000, priority: 72, pose: 'suspicious', spoken: true, spot: 'composer', ms: 7000 },
  LATE_CLAIM: { probability: 0.8, cooldown: 600_000, priority: 60, pose: 'suspicious', spoken: true, spot: 'composer', ms: 4800 },
  STREAK_INCREASED: { probability: 0.9, cooldown: 60_000, priority: 90, pose: 'celebrating', spoken: true, spot: 'edge', ms: 4600 },
  STREAK_AT_RISK: { probability: 0.75, cooldown: 1_800_000, priority: 88, pose: 'dramatic', spoken: true, spot: 'composer', ms: 4800 },
  MOOD_CHANGED: { probability: 0.8, cooldown: 30_000, priority: 65, pose: 'happy', spoken: true, spot: 'edge', ms: 4000 },
  CONVERSATION_EXPIRING: { probability: 0.8, cooldown: 600_000, priority: 86, pose: 'dramatic', spoken: true, spot: 'composer', ms: 5000 },
  GIF_SENT: { probability: 0.18, cooldown: 45_000, priority: 20, pose: 'excited', spoken: false, spot: 'composer', ms: 1600 },
  EMOJI_REACT: { probability: 0.2, cooldown: 25_000, priority: 25, pose: 'happy', spoken: false, spot: 'composer', ms: 1500 },
  LONG_MESSAGE: { probability: 0.22, cooldown: 90_000, priority: 22, pose: 'excited', spoken: false, spot: 'edge', ms: 1600 },
  MESSAGE_MILESTONE: { probability: 0.85, cooldown: 3_600_000, priority: 70, pose: 'dramatic', spoken: true, spot: 'edge', ms: 4600 },
  SHORTCUT_USED: { probability: 0.28, cooldown: 120_000, priority: 30, pose: 'chaotic', spoken: true, spot: 'composer', ms: 2800 },
  GOODNIGHT: { probability: 0.7, cooldown: 600_000, priority: 68, pose: 'sleeping', spoken: true, spot: 'composer', ms: 4200 },
  HEARD: { probability: 0, cooldown: 20_000, priority: 50, pose: 'suspicious', spoken: true, spot: 'composer', ms: 2200 },
  TOUCHED: { probability: 0, cooldown: 400, priority: 96, pose: 'happy', spoken: true, spot: 'composer', ms: 1400 },
};

const APPEAR_GAP: Record<ChaosLevel, number> = { full: 12_000, normal: 28_000, quiet: 55_000, off: Number.POSITIVE_INFINITY };
const SPEAK_GAP: Record<ChaosLevel, number> = { full: 48_000, normal: 95_000, quiet: 180_000, off: Number.POSITIVE_INFINITY };

export interface DecideInput {
  event: ToodleEvent;
  now: number;
  chaos: ChaosLevel;
  serious: boolean;
  context?: ToodleContext;
  random?: () => number;
}

export class ToodleEngine {
  private lastEvent = new Map<ToodleEvent, number>();
  private lastAppear = 0;
  private lastSpoken = 0;

  decide(input: DecideInput): ToodleBeat | null {
    const { event, now, chaos, serious } = input;
    const random = input.random ?? Math.random;
    if (chaos === 'off') return null;
    const rule = RULES[event];
    if (rule.probability <= 0) return null;
    if (serious && rule.priority < 75) return null;

    const sinceEvent = now - (this.lastEvent.get(event) ?? 0);
    if (this.lastEvent.has(event) && sinceEvent < rule.cooldown) return null;
    if (this.lastAppear && now - this.lastAppear < APPEAR_GAP[chaos]) return null;

    let probability = rule.probability;
    if (chaos === 'full') probability = Math.min(0.92, probability * 1.35);
    if (chaos === 'quiet') probability *= rule.priority >= 80 ? 0.7 : 0.28;
    if (random() > probability) return null;

    const copy = lineFor(event, input.context ?? {}, random);
    let line = rule.spoken ? copy.line : undefined;
    const suggestion = line ? copy.suggestion : undefined;
    if (line && this.lastSpoken && now - this.lastSpoken < SPEAK_GAP[chaos]) {
      if (rule.priority < 80) line = undefined;
      else return null;
    }
    if (chaos === 'quiet' && rule.priority < 80) line = undefined;

    const beat: ToodleBeat = {
      event,
      pose: copy.pose ?? rule.pose,
      line,
      suggestion: line ? suggestion : undefined,
      spot: rule.spot,
      ms: line ? rule.ms : Math.min(rule.ms, 1800),
      priority: rule.priority,
    };
    this.lastEvent.set(event, now);
    this.lastAppear = now;
    if (line) this.lastSpoken = now;
    return beat;
  }
}
