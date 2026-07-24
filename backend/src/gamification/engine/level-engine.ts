import { gamificationEventBus } from '../events/event-bus';
import { EventType, XpUpdatedPayload } from '../events/event-types';
import { getLevelForXp } from '../rules/level-rules';
import { GamificationProfile } from '../models/gamification-profile.model';
import { dispatchEvent } from '../events/event-dispatcher';
import mongoose from 'mongoose';

export class LevelEngine {
  public static init() {
    gamificationEventBus.on(EventType.XP_UPDATED, async (payload: XpUpdatedPayload) => {
      await LevelEngine.handleXpUpdated(payload);
    });
  }

  private static async handleXpUpdated(payload: XpUpdatedPayload) {
    try {
      const profile = await GamificationProfile.findOne({ userId: payload.userId as any });
      if (!profile) return;

      const newLevel = getLevelForXp(profile.xp);
      if (newLevel > profile.level) {
        profile.level = newLevel;
        await profile.save();

        dispatchEvent(EventType.LEVEL_UP, {
          userId: payload.userId,
          timestamp: new Date(),
          newLevel,
        });
      }
    } catch (error) {
      console.error(`[LevelEngine] Error handling XP_UPDATED for user ${payload.userId}:`, error);
    }
  }
}
