import { gamificationEventBus } from '../events/event-bus';
import { dispatchEvent } from '../events/event-dispatcher';
import {
  EventType,
  DailyLoginPayload,
  PickupVerifiedPayload,
  StreakUpdatedPayload,
  RewardCalculatedPayload,
  BadgeCriteriaMetPayload
} from '../events/event-types';
import { UserStats } from '../models/user-stats.model';
import { evaluateStreakReward } from '../rules/streak-rules';
import { Types } from 'mongoose';
import { logger } from '../../utils/logger';

export class StreakEngine {
  constructor() {
    this.subscribeToEvents();
  }

  private subscribeToEvents() {
    gamificationEventBus.on(EventType.DAILY_LOGIN, this.handleActivity.bind(this));
    gamificationEventBus.on(EventType.PICKUP_VERIFIED, this.handleActivity.bind(this));
  }

  private async handleActivity(payload: DailyLoginPayload | PickupVerifiedPayload): Promise<void> {
    try {
      const { userId, timestamp } = payload;
      
      const stats = await UserStats.findOne({ userId });
      if (!stats) {
        // Stats document should ideally be created on user registration, 
        // but if missing, we could initialize it or return early.
        logger.warn(`UserStats not found for user ${userId}`);
        return;
      }

      const activityDate = new Date(timestamp);
      
      // Calculate start of day in UTC for activityDate
      const activityStartOfDay = new Date(Date.UTC(activityDate.getUTCFullYear(), activityDate.getUTCMonth(), activityDate.getUTCDate()));

      let isStreakUpdated = false;

      if (!stats.lastActivityDate) {
        // First activity ever
        stats.currentStreak = 1;
        stats.longestStreak = 1;
        stats.lastActivityDate = activityDate;
        isStreakUpdated = true;
      } else {
        const lastActivityDate = new Date(stats.lastActivityDate);
        const lastStartOfDay = new Date(Date.UTC(lastActivityDate.getUTCFullYear(), lastActivityDate.getUTCMonth(), lastActivityDate.getUTCDate()));

        const diffTime = activityStartOfDay.getTime() - lastStartOfDay.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          // Consecutive day
          stats.currentStreak += 1;
          if (stats.currentStreak > stats.longestStreak) {
            stats.longestStreak = stats.currentStreak;
          }
          stats.lastActivityDate = activityDate;
          isStreakUpdated = true;
        } else if (diffDays > 1) {
          // Gap in streak, reset to 1
          stats.currentStreak = 1;
          stats.lastActivityDate = activityDate;
          isStreakUpdated = true;
        }
        // If diffDays === 0, same day activity, do nothing to streak
      }

      if (isStreakUpdated) {
        await stats.save();

        // Emit STREAK_UPDATED
        dispatchEvent(EventType.STREAK_UPDATED, {
          userId,
          timestamp: new Date(),
          streakCount: stats.currentStreak
        });

        // Evaluate streak reward
        const previousStreak = stats.currentStreak - 1;
        const reward = evaluateStreakReward(stats.currentStreak, previousStreak);
        if (reward) {
          if (reward.type === 'COINS') {
            dispatchEvent(EventType.REWARD_CALCULATED, {
              userId,
              timestamp: new Date(),
              coins: typeof reward.value === 'number' ? reward.value : parseInt(reward.value, 10),
              reason: `${stats.currentStreak}_DAY_STREAK`
            });
          } else if (reward.type === 'BADGE_CRITERIA') {
            dispatchEvent(EventType.BADGE_CRITERIA_MET, {
              userId,
              timestamp: new Date(),
              criteriaType: 'STREAK',
              value: reward.value
            });
          }
        }
      }

    } catch (error) {
      logger.error('Error handling activity for streak engine:', error);
    }
  }
}
