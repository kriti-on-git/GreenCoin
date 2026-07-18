import { EventType, EwasteSubmittedPayload, DeviceScannedPayload, StreakUpdatedPayload } from '../events/event-types';
import { gamificationEventBus } from '../events/event-bus';
import { dispatchEvent } from '../events/event-dispatcher';
import { ChallengeModel } from '../models/challenge.model';
import { UserChallenge } from '../models/user-challenge.model';
import { GamificationProfile } from '../models/gamification-profile.model';
import { logger } from '../../utils/logger';

export class ChallengeEngine {
  static initialize() {
    gamificationEventBus.on(EventType.EWASTE_SUBMITTED, this.handleEwasteSubmitted.bind(this));
    gamificationEventBus.on(EventType.DEVICE_SCANNED, this.handleDeviceScanned.bind(this));
    gamificationEventBus.on(EventType.STREAK_UPDATED, this.handleStreakUpdated.bind(this));
    logger.info('ChallengeEngine initialized and subscribed to events.');
  }

  private static async handleEwasteSubmitted(payload: EwasteSubmittedPayload) {
    try {
      await this.processChallenge(payload.userId, 'WEIGHT_SUBMITTED', payload.weight);
    } catch (error) {
      logger.error('ChallengeEngine error on EWASTE_SUBMITTED:', error);
    }
  }

  private static async handleDeviceScanned(payload: DeviceScannedPayload) {
    try {
      await this.processChallenge(payload.userId, 'DEVICES_SCANNED', 1);
    } catch (error) {
      logger.error('ChallengeEngine error on DEVICE_SCANNED:', error);
    }
  }

  private static async handleStreakUpdated(payload: StreakUpdatedPayload) {
    try {
      await this.processChallenge(payload.userId, 'STREAK_DAYS', payload.streakCount, true);
    } catch (error) {
      logger.error('ChallengeEngine error on STREAK_UPDATED:', error);
    }
  }

  private static async processChallenge(userId: string, criteriaType: string, amount: number, replaceProgress = false) {
    // Find all active challenges for this criteria type from DB
    const applicableRules = await ChallengeModel.find({ 
      isActive: true, 
      'criteria.type': criteriaType as any
    });
    
    if (applicableRules.length === 0) return;

    for (const ruleDb of applicableRules) {
      const rule = ruleDb.toObject();
      let userChallenge = await UserChallenge.findOne({ userId, challengeId: rule.challengeId });
      
      // If completed, skip
      if (userChallenge && userChallenge.status === 'COMPLETED') {
        continue;
      }

      if (!userChallenge) {
        userChallenge = new UserChallenge({
          userId,
          challengeId: rule.challengeId,
          progress: 0,
          status: 'ACTIVE'
        });
      }

      if (replaceProgress) {
        userChallenge.progress = amount;
      } else {
        userChallenge.progress += amount;
      }

      let completed = false;
      if (rule.criteria.type === 'WEIGHT_SUBMITTED' && rule.criteria.targetWeight && userChallenge.progress >= rule.criteria.targetWeight) {
        completed = true;
      } else if (rule.criteria.type === 'DEVICES_SCANNED' && rule.criteria.targetCount && userChallenge.progress >= rule.criteria.targetCount) {
        completed = true;
      } else if (rule.criteria.type === 'STREAK_DAYS' && rule.criteria.targetCount && userChallenge.progress >= rule.criteria.targetCount) {
        completed = true;
      }

      if (completed) {
        userChallenge.status = 'COMPLETED';
        userChallenge.completedAt = new Date();
        await userChallenge.save();
        
        await GamificationProfile.findOneAndUpdate(
          { userId } as any,
          { $inc: { challengesCompleted: 1 } },
          { upsert: true }
        );

        await dispatchEvent(EventType.CHALLENGE_COMPLETED, {
          userId,
          timestamp: new Date(),
          challengeId: rule.challengeId
        });

        await dispatchEvent(EventType.REWARD_CALCULATED, {
          userId,
          timestamp: new Date(),
          coins: rule.rewardCoins,
          reason: `Completed challenge: ${rule.name}`,
          referenceId: rule.challengeId
        });

        logger.info(`User ${userId} completed challenge ${rule.challengeId}`);
      } else {
        await userChallenge.save();
      }
    }
  }
}
