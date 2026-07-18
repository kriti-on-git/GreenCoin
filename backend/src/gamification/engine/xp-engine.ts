import { gamificationEventBus } from '../events/event-bus';
import { dispatchEvent } from '../events/event-dispatcher';
import { EventType, BaseEventPayload } from '../events/event-types';
import { GamificationProfile } from '../models/gamification-profile.model';
import { logger } from '../../utils/logger';
import { XP_VALUES } from '../rules/xp-rules';

const handleXpEvent = async (eventName: EventType, payload: BaseEventPayload) => {
  const xpGained = XP_VALUES[eventName];
  if (!xpGained) return; // Event doesn't grant XP or is defaulted to 0

  try {
    const profile = await GamificationProfile.findOneAndUpdate(
      { userId: payload.userId } as any,
      { $inc: { xp: xpGained } },
      { returnDocument: 'after', upsert: true }
    ) as any;

    dispatchEvent(EventType.XP_UPDATED, {
      userId: payload.userId,
      timestamp: new Date(),
      xpGained,
      newTotalXp: profile?.xp || xpGained
    });
  } catch (error) {
    logger.error(`Error updating XP for ${eventName}`, { error, userId: payload.userId });
  }
};

export const initializeXpEngine = () => {
  const eventsToListen = Object.values(EventType) as EventType[];
  
  eventsToListen.forEach((eventName) => {
    // Skip events that are emitted by the gamification engines themselves
    if (eventName === EventType.XP_UPDATED || eventName === EventType.REWARD_CALCULATED) {
      return;
    }
    
    gamificationEventBus.on(eventName, (payload: BaseEventPayload) => {
      handleXpEvent(eventName, payload);
    });
  });
};
