import { gamificationEventBus } from '../events/event-bus';
import { EventType, BaseEventPayload } from '../events/event-types';
import { BADGE_RULES } from '../rules/badge-rules';
import { UserStats } from '../models/user-stats.model';
import { UserBadge } from '../badges/user-badge.model';
import { dispatchEvent } from '../events/event-dispatcher';
import mongoose from 'mongoose';

export class BadgeEngine {
  public static init() {
    const eventsToWatch = [
      EventType.STATS_UPDATED,
      EventType.REFERRAL_SUCCESS,
      EventType.STREAK_UPDATED,
      // Add other relevant events here based on your rules
    ];

    for (const eventName of eventsToWatch) {
      gamificationEventBus.on(eventName, async (payload: BaseEventPayload) => {
        await BadgeEngine.checkAndAwardBadges(payload.userId);
      });
    }
  }

  public static async checkAndAwardBadges(userIdStr: string) {
    try {
      const stats = await UserStats.findOne({ userId: userIdStr as any });
      if (!stats) return;

      // Fetch existing user badges to avoid re-awarding
      const existingBadges = await UserBadge.find({ userId: userIdStr as any }).select('badgeId').lean();
      const existingBadgeIds = new Set(existingBadges.map(b => b.badgeId));

      for (const rule of BADGE_RULES) {
        if (!existingBadgeIds.has(rule.id) && rule.criteria(stats)) {
          // Award badge
          await UserBadge.create({
            userId: userIdStr as any,
            badgeId: rule.id,
            earnedAt: new Date()
          });

          // Dispatch BADGE_EARNED event
          dispatchEvent(EventType.BADGE_EARNED, {
            userId: userIdStr,
            timestamp: new Date(),
            badgeId: rule.id
          });
        }
      }
    } catch (error) {
      console.error(`[BadgeEngine] Error checking badges for user ${userIdStr}:`, error);
    }
  }
}
