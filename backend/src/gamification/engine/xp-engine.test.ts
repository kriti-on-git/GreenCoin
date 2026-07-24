import { gamificationEventBus } from '../events/event-bus';
import { initializeXpEngine, XpValues } from './xp-engine';
import { EventType, PickupVerifiedPayload } from '../events/event-types';

jest.mock('../models/gamification-profile.model', () => ({
  GamificationProfile: {
    findOneAndUpdate: jest.fn()
  }
}));

jest.mock('../events/event-dispatcher', () => ({
  dispatchEvent: jest.fn()
}));

import { GamificationProfile } from '../models/gamification-profile.model';
import { dispatchEvent } from '../events/event-dispatcher';

describe('XP Engine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    gamificationEventBus.removeAllListeners();
  });

  describe('Event Subscription Integration', () => {
    it('should update XP and dispatch XP_UPDATED on configured events', async () => {
      initializeXpEngine();

      (GamificationProfile.findOneAndUpdate as jest.Mock).mockResolvedValue({ xp: 150 });

      const payload: PickupVerifiedPayload = {
        userId: 'u1',
        pickupId: 'p1',
        collectorId: 'c1',
        category: 'Phone',
        weight: 1,
        timestamp: new Date()
      };

      gamificationEventBus.emit(EventType.PICKUP_VERIFIED, payload);

      await new Promise(process.nextTick);

      const expectedXp = XpValues[EventType.PICKUP_VERIFIED];

      expect(GamificationProfile.findOneAndUpdate).toHaveBeenCalledWith(
        { userId: 'u1' },
        { $inc: { xp: expectedXp } },
        { returnDocument: 'after', upsert: true }
      );

      expect(dispatchEvent).toHaveBeenCalledWith(EventType.XP_UPDATED, expect.objectContaining({
        userId: 'u1',
        xpGained: expectedXp,
        newTotalXp: 150
      }));
    });

    it('should ignore events without configured XP values', async () => {
      initializeXpEngine();
      
      const payload = { userId: 'u1', timestamp: new Date() };
      
      gamificationEventBus.emit(EventType.SPECIAL_EVENT, payload as any);
      
      await new Promise(process.nextTick);
      
      expect(GamificationProfile.findOneAndUpdate).not.toHaveBeenCalled();
      expect(dispatchEvent).not.toHaveBeenCalled();
    });
  });
});
