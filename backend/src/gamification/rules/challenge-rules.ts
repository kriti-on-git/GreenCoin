export interface ChallengeRule {
  id: string;
  name: string;
  description: string;
  criteria: {
    type: 'DEVICES_SCANNED' | 'WEIGHT_SUBMITTED' | 'STREAK_DAYS';
    targetCount?: number;
    targetWeight?: number;
  };
  rewardCoins: number;
  rewardBadgeId?: string;
  startDate?: Date;
  endDate?: Date;
}

export const challengeRules: ChallengeRule[] = [];
