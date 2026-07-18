import { calculateReward, initializeRewardEngine } from './reward-engine';
import { BaseCoinValues } from '../rules/reward-rules';
import { PickupVerifiedPayload, EventType } from '../events/event-types';
import { gamificationEventBus } from '../events/event-bus';

// Mock dependencies
jest.mock('../models/user-stats.model', () => ({
  UserStats: {
    findOne: jest.fn()
  }
}));
jest.mock('../events/event-dispatcher', () => ({
  dispatchEvent: jest.fn()
}));

import { UserStats } from '../models/user-stats.model';
import { dispatchEvent } from '../events/event-dispatcher';

describe('Reward Engine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    gamificationEventBus.removeAllListeners();
  });

  describe('calculateReward (Pure Function)', () => {
    it('should calculate base reward correctly with no multipliers', async () => {
      const payload: PickupVerifiedPayload = {
        userId: 'u1',
        pickupId: 'p1',
        collectorId: 'c1',
        category: 'Laptop',
        weight: 1, // <= 2, weight mult 1.0
        timestamp: new Date()
      };
      const userStats = { currentStreak: 1 }; // < 3, streak mult 1.0

      const reward = await calculateReward(payload, userStats as any);
      expect(reward).toBe(BaseCoinValues['Laptop']); // 150 * 1 * 1 * 1 = 150
    });

    it('should apply weight and streak multipliers', async () => {
      const payload: PickupVerifiedPayload = {
        userId: 'u1',
        pickupId: 'p1',
        collectorId: 'c1',
        category: 'Phone',
        weight: 6, // > 5, weight mult 1.3
        timestamp: new Date()
      };
      const userStats = { currentStreak: 8 }; // >= 7, streak mult 1.2

      const reward = await calculateReward(payload, userStats as any);
      // Base 'Phone' = 50. 50 * 1.3 (weight) * 1.0 (campaign) * 1.2 (streak) = 78
      expect(reward).toBe(Math.round(50 * 1.3 * 1.2));
    });

    it('should fallback to Other for unknown category', async () => {
       const payload: PickupVerifiedPayload = {
        userId: 'u1',
        pickupId: 'p1',
        collectorId: 'c1',
        category: 'UnknownCategory',
        weight: 1,
        timestamp: new Date()
      };
      const userStats = { currentStreak: 0 };
      
      const reward = await calculateReward(payload, userStats as any);
      expect(reward).toBe(BaseCoinValues['Other']);
    });
  });

  describe('Event Subscription Integration', () => {
    it('should calculate reward and dispatch REWARD_CALCULATED event on PICKUP_VERIFIED', async () => {
      initializeRewardEngine();
      
      const payload: PickupVerifiedPayload = {
        userId: 'user_123',
        pickupId: 'pickup_abc',
        collectorId: 'col_1',
        category: 'Laptop',
        weight: 3, // > 2, mult 1.1
        timestamp: new Date()
      };

      (UserStats.findOne as jest.Mock).mockResolvedValue({ currentStreak: 4 }); // >= 3, mult 1.1

      gamificationEventBus.emit(EventType.PICKUP_VERIFIED, payload);

      // Wait for the async event handler to finish
      await new Promise(process.nextTick);

      expect(UserStats.findOne).toHaveBeenCalledWith({ userId: 'user_123' });
      
      // Expected coins: 150 (Laptop) * 1.1 (weight) * 1.0 * 1.1 (streak) = 181.5 -> 182
      expect(dispatchEvent).toHaveBeenCalledWith(EventType.REWARD_CALCULATED, expect.objectContaining({
        userId: 'user_123',
        coins: 182,
        reason: 'Pickup Verified',
        referenceId: 'pickup_abc'
      }));
    });
  });
});
