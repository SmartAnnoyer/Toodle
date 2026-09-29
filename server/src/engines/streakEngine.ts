import { addDaysUtc, secondsUntilUtcMidnight, utcDateString } from '../utils/time.js';

export interface StreakState {
  currentCount: number;
  longestCount: number;
  lastCompletedOn: string | null;
  activity: Record<string, string>;
}

export interface StreakView {
  count: number;
  atRisk: boolean;
  expiresInSeconds: number | null;
  lost: boolean;
}

export interface StreakUpdate {
  state: StreakState;
  increased: boolean;
  lost: boolean;
}

function onUtcDay(timestamp: string | undefined, day: string): boolean {
  if (!timestamp) return false;
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) return false;
  return utcDateString(parsed) === day;
}

export function recordMessage(
  state: StreakState,
  memberIds: string[],
  senderId: string,
  now: Date,
): StreakUpdate {
  const today = utcDateString(now);
  const yesterday = addDaysUtc(today, -1);
  const activity = { ...state.activity, [senderId]: now.toISOString() };

  let currentCount = state.currentCount;
  let lastCompletedOn = state.lastCompletedOn;
  let lost = false;

  if (lastCompletedOn && lastCompletedOn < yesterday) {
    if (currentCount > 0) lost = true;
    currentCount = 0;
    lastCompletedOn = null;
  }

  const bothToday = memberIds.length >= 2 && memberIds.every((id) => onUtcDay(activity[id], today));
  let increased = false;

  if (bothToday && lastCompletedOn !== today) {
    if (lastCompletedOn === yesterday) {
      currentCount += 1;
    } else {
      currentCount = 1;
    }
    lastCompletedOn = today;
    increased = true;
    lost = false;
  }

  return {
    state: {
      currentCount,
      longestCount: Math.max(state.longestCount, currentCount),
      lastCompletedOn,
      activity,
    },
    increased,
    lost,
  };
}

export function viewStreak(state: StreakState, memberIds: string[], now: Date): StreakView {
  const today = utcDateString(now);
  const yesterday = addDaysUtc(today, -1);

  if (!state.lastCompletedOn || state.currentCount <= 0) {
    return { count: 0, atRisk: false, expiresInSeconds: null, lost: false };
  }

  if (state.lastCompletedOn < yesterday) {
    return { count: 0, atRisk: false, expiresInSeconds: null, lost: true };
  }

  if (state.lastCompletedOn === today) {
    return { count: state.currentCount, atRisk: false, expiresInSeconds: null, lost: false };
  }

  const bothToday = memberIds.length >= 2 && memberIds.every((id) => onUtcDay(state.activity[id], today));
  if (bothToday) {
    return { count: state.currentCount, atRisk: false, expiresInSeconds: null, lost: false };
  }

  return {
    count: state.currentCount,
    atRisk: true,
    expiresInSeconds: secondsUntilUtcMidnight(now),
    lost: false,
  };
}
