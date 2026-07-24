/**
 * Defines the XP thresholds for each gamification level.
 * Level 1: 0 XP
 * Level 2: 200 XP
 * Level 3: 500 XP
 * Level 4: 900 XP
 * Level 5: 1500 XP
 */
export const LEVEL_THRESHOLDS = [
  { level: 1, xp: 0 },
  { level: 2, xp: 200 },
  { level: 3, xp: 500 },
  { level: 4, xp: 900 },
  { level: 5, xp: 1500 },
];

/**
 * Calculates the user's level based on their current XP.
 * 
 * @param xp The user's current XP.
 * @returns The user's level.
 */
export function getLevelForXp(xp: number): number {
  let currentLevel = 1;
  for (const threshold of LEVEL_THRESHOLDS) {
    if (xp >= threshold.xp) {
      currentLevel = threshold.level;
    } else {
      break;
    }
  }
  return currentLevel;
}
