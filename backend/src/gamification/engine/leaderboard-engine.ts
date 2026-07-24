import { gamificationEventBus } from '../events/event-bus';
import {
  EventType,
  XpUpdatedPayload,
  WalletUpdatedPayload,
  BadgeEarnedPayload
} from '../events/event-types';
import { GamificationProfile } from '../models/gamification-profile.model';
import { leaderboardService } from '../leaderboard/leaderboard.service';
import { Types } from 'mongoose';

export class LeaderboardEngine {
  constructor() {
    this.subscribeToEvents();
  }

  private subscribeToEvents() {
    gamificationEventBus.on(EventType.XP_UPDATED, this.handleUpdate.bind(this));
    gamificationEventBus.on(EventType.WALLET_UPDATED, this.handleUpdate.bind(this));
    gamificationEventBus.on(EventType.BADGE_EARNED, this.handleUpdate.bind(this));
  }

  private async handleUpdate(payload: XpUpdatedPayload | WalletUpdatedPayload | BadgeEarnedPayload): Promise<void> {
    try {
      const { userId } = payload;

      const profile = await GamificationProfile.findOne({ userId });
      if (!profile) {
        console.warn(`GamificationProfile not found for user ${userId}`);
        return;
      }

      const score = leaderboardService.calculateScore(
        profile.xp,
        profile.totalCoinsEarned, // using total coins earned
        profile.badgeCount,
        profile.challengesCompleted || 0
      );

      const scopes = ['global', 'city', 'college', 'company', 'campaign', 'friends'];
      await Promise.all(
        scopes.map(scope => leaderboardService.updateUserScore(userId, scope as any, score))
      );
      
      // Note: We update the score here. The rank recalculation is handled
      // in batch/nightly jobs by calling leaderboardService.recalculateLeaderboard('global')

    } catch (error) {
      console.error('Error handling event for leaderboard engine:', error);
    }
  }
}
