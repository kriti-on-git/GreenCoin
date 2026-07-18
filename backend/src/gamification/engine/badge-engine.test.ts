import mongoose from 'mongoose';
import { gamificationEventBus } from '../events/event-bus';
import { EventType } from '../events/event-types';
import { BadgeEngine } from './badge-engine';
import { UserStats } from '../models/user-stats.model';
import { UserBadge } from '../badges/user-badge.model';

jest.mock('../events/event-dispatcher', () => ({
  dispatchEvent: jest.fn(),
}));

import { dispatchEvent } from '../events/event-dispatcher';

describe('BadgeEngine', () => {
  let userId: mongoose.Types.ObjectId;
  let userIdStr: string;

  beforeAll(() => {
    BadgeEngine.init();
  });

  beforeEach(() => {
    userId = new mongoose.Types.ObjectId();
    userIdStr = userId.toString();
    jest.clearAllMocks();

    UserStats.findOne = jest.fn().mockResolvedValue({
      userId,
      totalDevicesRecycled: 0,
      longestStreak: 0,
    });

    // Mock existing badges as empty array (no badges earned yet)
    const findMock = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      }),
    });
    UserBadge.find = findMock as any;
    UserBadge.create = jest.fn().mockResolvedValue(true) as any;
  });

  it('should not award badges if criteria is not met', async () => {
    gamificationEventBus.emit(EventType.PICKUP_VERIFIED, {
      userId: userIdStr,
      timestamp: new Date(),
    });

    await new Promise(process.nextTick);

    expect(UserBadge.create).not.toHaveBeenCalled();
    expect(dispatchEvent).not.toHaveBeenCalled();
  });

  it('should award the First Step badge when recycling 1 device', async () => {
    UserStats.findOne = jest.fn().mockResolvedValue({
      userId,
      totalDevicesRecycled: 1,
    });

    gamificationEventBus.emit(EventType.PICKUP_VERIFIED, {
      userId: userIdStr,
      timestamp: new Date(),
    });

    await new Promise(process.nextTick);

    expect(UserBadge.create).toHaveBeenCalledWith(expect.objectContaining({
      userId: userIdStr,
      badgeId: 'first-step',
    }));
    expect(dispatchEvent).toHaveBeenCalledWith(EventType.BADGE_EARNED, expect.objectContaining({
      userId: userIdStr,
      badgeId: 'first-step',
    }));
  });

  it('should not award a badge if already earned', async () => {
    UserStats.findOne = jest.fn().mockResolvedValue({
      userId,
      totalDevicesRecycled: 1, // Eligible for first-step
    });

    // User already has the first-step badge
    const findMock = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([{ badgeId: 'first-step' }]),
      }),
    });
    UserBadge.find = findMock as any;

    gamificationEventBus.emit(EventType.PICKUP_VERIFIED, {
      userId: userIdStr,
      timestamp: new Date(),
    });

    await new Promise(process.nextTick);

    expect(UserBadge.create).not.toHaveBeenCalled();
    expect(dispatchEvent).not.toHaveBeenCalled();
  });
});
