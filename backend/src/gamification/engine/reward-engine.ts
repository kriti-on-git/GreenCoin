import { gamificationEventBus } from '../events/event-bus';
import { dispatchEvent } from '../events/event-dispatcher';
import { EventType, PickupVerifiedPayload } from '../events/event-types';
import { UserStats, IUserStats } from '../models/user-stats.model';
import { BaseCoinValues, getWeightMultiplier, getCampaignMultiplier, getStreakMultiplier, getCategoryMultiplier, getBonusMultiplier } from '../rules/reward-rules';
import { logger } from '../../utils/logger';

/**
 * Pure function to calculate the reward based on the formula:
 * Base × Weight × Category × Campaign × Streak × Bonus
 */
export const calculateReward = async (payload: PickupVerifiedPayload, userStats: Pick<IUserStats, 'currentStreak'> | null): Promise<number> => {
  const baseValue = BaseCoinValues[payload.category] || BaseCoinValues['Other'];
  const weightMult = getWeightMultiplier(payload.weight);
  const campaignMult = await getCampaignMultiplier();
  
  const currentStreak = userStats?.currentStreak || 0;
  const streakMult = getStreakMultiplier(currentStreak);

  const categoryMult = getCategoryMultiplier(payload.category);
  const bonusMult = getBonusMultiplier(payload);

  // Use Math.round to ensure coins are integers
  return Math.round(baseValue * weightMult * categoryMult * campaignMult * streakMult * bonusMult);
};

export const initializeRewardEngine = () => {
  gamificationEventBus.on(EventType.PICKUP_VERIFIED, async (payload: PickupVerifiedPayload) => {
    try {
      const userStats = await UserStats.findOne({ userId: payload.userId } as any);
      
      const coins = await calculateReward(payload, userStats);
      
      dispatchEvent(EventType.REWARD_CALCULATED, {
        userId: payload.userId,
        timestamp: new Date(),
        coins,
        reason: 'Pickup Verified',
        referenceId: payload.pickupId
      });
    } catch (error) {
      logger.error('Error calculating reward for PICKUP_VERIFIED', { error, userId: payload.userId });
    }
  });
};
