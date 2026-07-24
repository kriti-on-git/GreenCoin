import mongoose from 'mongoose';
import { gamificationEventBus } from '../events/event-bus';
import { EventType } from '../events/event-types';
import { LevelEngine } from './level-engine';
import { GamificationProfile } from '../models/gamification-profile.model';

// Mock event-dispatcher so we can verify if it's called
jest.mock('../events/event-dispatcher', () => ({
  dispatchEvent: jest.fn(),
}));

import { dispatchEvent } from '../events/event-dispatcher';

describe('LevelEngine', () => {
  let userId: mongoose.Types.ObjectId;

  beforeAll(() => {
    LevelEngine.init();
  });

  beforeEach(() => {
    userId = new mongoose.Types.ObjectId();
    jest.clearAllMocks();
    
    // Mock the findOne method to return a dummy profile
    GamificationProfile.findOne = jest.fn().mockResolvedValue({
      userId,
      xp: 0,
      level: 1,
      save: jest.fn().mockResolvedValue(true),
    });
  });

  it('should not emit LEVEL_UP if XP is not enough for next level', async () => {
    GamificationProfile.findOne = jest.fn().mockResolvedValue({
      userId,
      xp: 100, // Level 2 needs 200
      level: 1,
      save: jest.fn().mockResolvedValue(true),
    });

    gamificationEventBus.emit(EventType.XP_UPDATED, {
      userId: userId.toString(),
      timestamp: new Date(),
      xpGained: 100,
      newTotalXp: 100,
    });

    // Wait for async operations to complete
    await new Promise(process.nextTick);

    expect(dispatchEvent).not.toHaveBeenCalled();
  });

  it('should emit LEVEL_UP and update profile when enough XP is gained', async () => {
    const saveMock = jest.fn().mockResolvedValue(true);
    const profileMock = {
      userId,
      xp: 250, // Enough for Level 2
      level: 1,
      save: saveMock,
    };
    GamificationProfile.findOne = jest.fn().mockResolvedValue(profileMock);

    gamificationEventBus.emit(EventType.XP_UPDATED, {
      userId: userId.toString(),
      timestamp: new Date(),
      xpGained: 250,
      newTotalXp: 250,
    });

    await new Promise(process.nextTick);

    expect(profileMock.level).toBe(2);
    expect(saveMock).toHaveBeenCalled();
    expect(dispatchEvent).toHaveBeenCalledWith(EventType.LEVEL_UP, expect.objectContaining({
      userId: userId.toString(),
      newLevel: 2,
    }));
  });
});
