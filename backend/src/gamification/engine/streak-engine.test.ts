import { StreakEngine } from './streak-engine';
import { gamificationEventBus } from '../events/event-bus';
import * as eventDispatcherModule from '../events/event-dispatcher';
import { EventType } from '../events/event-types';
import { UserStats } from '../models/user-stats.model';
import mongoose from 'mongoose';

jest.mock('../models/user-stats.model');

describe('StreakEngine', () => {
  let streakEngine: StreakEngine;
  let mockStats: any;
  const mockUserId = new mongoose.Types.ObjectId().toHexString();

  beforeEach(() => {
    jest.spyOn(gamificationEventBus, 'on').mockImplementation();
    jest.spyOn(eventDispatcherModule, 'dispatchEvent').mockImplementation(() => {});
    streakEngine = new StreakEngine();

    mockStats = {
      userId: new mongoose.Types.ObjectId(mockUserId),
      currentStreak: 0,
      longestStreak: 0,
      lastActivityDate: null,
      save: jest.fn().mockResolvedValue(true)
    };

    (UserStats.findOne as jest.Mock).mockResolvedValue(mockStats);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should subscribe to DAILY_LOGIN and PICKUP_VERIFIED events', () => {
    expect(gamificationEventBus.on).toHaveBeenCalledWith(EventType.DAILY_LOGIN, expect.any(Function));
    expect(gamificationEventBus.on).toHaveBeenCalledWith(EventType.PICKUP_VERIFIED, expect.any(Function));
  });

  it('should initialize streak to 1 on first activity', async () => {
    const timestamp = new Date('2023-01-01T12:00:00Z');
    
    // Simulate event handler being called
    await (streakEngine as any).handleActivity({ userId: mockUserId, timestamp });

    expect(mockStats.currentStreak).toBe(1);
    expect(mockStats.longestStreak).toBe(1);
    expect(mockStats.lastActivityDate).toEqual(timestamp);
    expect(mockStats.save).toHaveBeenCalled();
    
    expect(eventDispatcherModule.dispatchEvent).toHaveBeenCalledWith(
      EventType.STREAK_UPDATED,
      expect.objectContaining({ userId: mockUserId, streakCount: 1 })
    );
  });

  it('should increment streak for consecutive day activity', async () => {
    mockStats.currentStreak = 1;
    mockStats.longestStreak = 1;
    mockStats.lastActivityDate = new Date('2023-01-01T12:00:00Z');
    
    const nextDay = new Date('2023-01-02T10:00:00Z');
    
    await (streakEngine as any).handleActivity({ userId: mockUserId, timestamp: nextDay });

    expect(mockStats.currentStreak).toBe(2);
    expect(mockStats.longestStreak).toBe(2);
    expect(mockStats.lastActivityDate).toEqual(nextDay);
    expect(mockStats.save).toHaveBeenCalled();
  });

  it('should reset streak on gap day', async () => {
    mockStats.currentStreak = 5;
    mockStats.longestStreak = 5;
    mockStats.lastActivityDate = new Date('2023-01-01T12:00:00Z');
    
    // Gap of 2 days
    const futureDay = new Date('2023-01-03T10:00:00Z');
    
    await (streakEngine as any).handleActivity({ userId: mockUserId, timestamp: futureDay });

    expect(mockStats.currentStreak).toBe(1);
    expect(mockStats.longestStreak).toBe(5); // longest remains 5
    expect(mockStats.lastActivityDate).toEqual(futureDay);
    expect(mockStats.save).toHaveBeenCalled();
  });

  it('should do nothing for same day activity', async () => {
    mockStats.currentStreak = 2;
    mockStats.longestStreak = 2;
    mockStats.lastActivityDate = new Date('2023-01-01T12:00:00Z');
    
    // Same day, different time
    const sameDay = new Date('2023-01-01T18:00:00Z');
    
    await (streakEngine as any).handleActivity({ userId: mockUserId, timestamp: sameDay });

    expect(mockStats.currentStreak).toBe(2);
    expect(mockStats.lastActivityDate).toEqual(new Date('2023-01-01T12:00:00Z'));
    expect(mockStats.save).not.toHaveBeenCalled();
    expect(eventDispatcherModule.dispatchEvent).not.toHaveBeenCalled();
  });

  it('should emit REWARD_CALCULATED when reaching 3 day streak', async () => {
    mockStats.currentStreak = 2;
    mockStats.longestStreak = 2;
    mockStats.lastActivityDate = new Date('2023-01-01T12:00:00Z');
    
    const nextDay = new Date('2023-01-02T10:00:00Z');
    
    await (streakEngine as any).handleActivity({ userId: mockUserId, timestamp: nextDay });

    expect(eventDispatcherModule.dispatchEvent).toHaveBeenCalledWith(
      EventType.REWARD_CALCULATED,
      expect.objectContaining({
        userId: mockUserId,
        coins: 20,
        reason: '3_DAY_STREAK'
      })
    );
  });

  it('should emit BADGE_CRITERIA_MET when reaching 30 day streak', async () => {
    mockStats.currentStreak = 29;
    mockStats.longestStreak = 29;
    mockStats.lastActivityDate = new Date('2023-01-01T12:00:00Z');
    
    const nextDay = new Date('2023-01-02T10:00:00Z');
    
    await (streakEngine as any).handleActivity({ userId: mockUserId, timestamp: nextDay });

    expect(eventDispatcherModule.dispatchEvent).toHaveBeenCalledWith(
      EventType.BADGE_CRITERIA_MET,
      expect.objectContaining({
        userId: mockUserId,
        criteriaType: 'STREAK',
        value: '30_DAY_STREAK'
      })
    );
  });
});
