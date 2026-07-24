import { gamificationEventBus } from '../events/event-bus';
import { dispatchEvent } from '../events/event-dispatcher';
import { EventType, PickupVerifiedPayload, EwasteSubmittedPayload } from '../events/event-types';
import { UserStats } from '../models/user-stats.model';
import { logger } from '../../utils/logger';

export class StatsEngine {
  static initialize() {
    gamificationEventBus.on(EventType.PICKUP_VERIFIED, this.handlePickupVerified.bind(this));
    gamificationEventBus.on(EventType.EWASTE_SUBMITTED, this.handleEwasteSubmitted.bind(this));
    logger.info('StatsEngine initialized and subscribed to events.');
  }

  private static async handlePickupVerified(payload: PickupVerifiedPayload) {
    try {
      const stats = await UserStats.findOneAndUpdate(
        { userId: payload.userId as any },
        { 
          $inc: { 
            totalDevicesRecycled: 1, 
            totalWeightRecycled: payload.weight 
          } 
        },
        { new: true, upsert: true }
      );

      if (stats) {
        dispatchEvent(EventType.STATS_UPDATED, {
          userId: payload.userId,
          timestamp: new Date(),
          totalDevicesRecycled: stats.totalDevicesRecycled,
          totalWeightRecycled: stats.totalWeightRecycled
        });
      }
    } catch (error) {
      logger.error('Error in StatsEngine.handlePickupVerified:', error);
    }
  }

  private static async handleEwasteSubmitted(payload: EwasteSubmittedPayload) {
    try {
      const stats = await UserStats.findOneAndUpdate(
        { userId: payload.userId as any },
        { 
          $inc: { 
            totalWeightRecycled: payload.weight 
          } 
        },
        { new: true, upsert: true }
      );

      if (stats) {
        dispatchEvent(EventType.STATS_UPDATED, {
          userId: payload.userId,
          timestamp: new Date(),
          totalDevicesRecycled: stats.totalDevicesRecycled,
          totalWeightRecycled: stats.totalWeightRecycled
        });
      }
    } catch (error) {
      logger.error('Error in StatsEngine.handleEwasteSubmitted:', error);
    }
  }
}
