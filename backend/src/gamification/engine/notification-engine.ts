import { EventType, BadgeEarnedPayload, LevelUpPayload, WalletUpdatedPayload, ChallengeCompletedPayload } from '../events/event-types';
import { gamificationEventBus } from '../events/event-bus';
import { logger } from '../../utils/logger';

export class NotificationEngine {
  static initialize() {
    gamificationEventBus.on(EventType.BADGE_EARNED, this.handleBadgeEarned.bind(this));
    gamificationEventBus.on(EventType.LEVEL_UP, this.handleLevelUp.bind(this));
    gamificationEventBus.on(EventType.WALLET_UPDATED, this.handleWalletUpdated.bind(this));
    gamificationEventBus.on(EventType.CHALLENGE_COMPLETED, this.handleChallengeCompleted.bind(this));
    logger.info('NotificationEngine initialized and subscribed to events.');
  }

  private static async handleBadgeEarned(payload: BadgeEarnedPayload) {
    this.sendNotification(payload.userId, `Congratulations! You earned the ${payload.badgeId} badge!`);
  }

  private static async handleLevelUp(payload: LevelUpPayload) {
    this.sendNotification(payload.userId, `Awesome! You just reached Level ${payload.newLevel}! Keep it up!`);
  }

  private static async handleWalletUpdated(payload: WalletUpdatedPayload) {
    // Usually we don't want to spam on every wallet update unless it's a big reward,
    // but for now we log it as per requirements.
    this.sendNotification(payload.userId, `Your wallet balance was updated. New balance: ${payload.newBalance} GreenCoins.`);
  }

  private static async handleChallengeCompleted(payload: ChallengeCompletedPayload) {
    this.sendNotification(payload.userId, `Great job! You completed a challenge (${payload.challengeId}). Check your wallet for rewards!`);
  }

  /**
   * Stub for actual push/email/SMS integration.
   * TODO: Integrate with FCM, AWS SNS, or email service.
   */
  private static sendNotification(userId: string, message: string, channels: ('PUSH'|'EMAIL'|'SMS'|'IN_APP')[] = ['IN_APP']) {
    // In a real app, we would look up user preferences and devices here.
    channels.forEach(channel => {
      switch (channel) {
        case 'PUSH':
          logger.info(`[PUSH NOTIFICATION to ${userId}]: ${message}`);
          break;
        case 'EMAIL':
          logger.info(`[EMAIL to ${userId}]: ${message}`);
          break;
        case 'SMS':
          logger.info(`[SMS to ${userId}]: ${message}`);
          break;
        case 'IN_APP':
        default:
          logger.info(`[IN-APP NOTIFICATION to ${userId}]: ${message}`);
          break;
      }
    });
  }
}
