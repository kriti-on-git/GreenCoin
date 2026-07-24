import { EventType } from '../events/event-types';

export interface StreakReward {
  type: 'COINS' | 'BADGE_CRITERIA';
  value: number | string;
}

export const STREAK_REWARD_TIERS: Record<number, StreakReward> = {
  3: { type: 'COINS', value: 20 },
  7: { type: 'COINS', value: 100 },
  30: { type: 'BADGE_CRITERIA', value: '30_DAY_STREAK' },
};

/**
 * Evaluates the current streak and returns the reward if a milestone is reached
 * for the first time (range-based).
 *
 * A reward triggers only once — when `currentStreak` crosses a milestone that
 * `previousStreak` had not yet reached.
 *
 * @param currentStreak  The user's current streak in days.
 * @param previousStreak The user's streak before this update (defaults to 0).
 * @returns The highest applicable StreakReward if a new milestone is crossed, otherwise null.
 */
export function evaluateStreakReward(
  currentStreak: number,
  previousStreak: number = 0,
): StreakReward | null {
  // Check milestones from highest to lowest — return the first new crossing
  if (currentStreak >= 30 && previousStreak < 30) {
    return STREAK_REWARD_TIERS[30];
  }
  if (currentStreak >= 7 && previousStreak < 7) {
    return STREAK_REWARD_TIERS[7];
  }
  if (currentStreak >= 3 && previousStreak < 3) {
    return STREAK_REWARD_TIERS[3];
  }
  return null;
}
