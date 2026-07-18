import mongoose from 'mongoose';
import { ChallengeEngine } from './challenge-engine';
import { UserChallenge } from '../models/user-challenge.model';
import { gamificationEventBus } from '../events/event-bus';
import { dispatchEvent } from '../events/event-dispatcher';
import { EventType } from '../events/event-types';

jest.mock('../events/event-dispatcher', () => ({
  dispatchEvent: jest.fn()
}));

describe('ChallengeEngine', () => {
  const userId = 'test-user-challenge';

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/gamification-test');
    ChallengeEngine.initialize();
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  beforeEach(async () => {
    await UserChallenge.deleteMany({});
    jest.clearAllMocks();
  });

  it('should update challenge progress on DEVICE_SCANNED', async () => {
    const handler = (gamificationEventBus as any).listeners(EventType.DEVICE_SCANNED)[0];
    
    await handler({ userId, timestamp: new Date(), deviceId: 'dev1', deviceType: 'PHONE' });
    let progress = await UserChallenge.findOne({ userId, challengeId: 'CHALLENGE_RECYCLE_5_DEVICES' });
    expect(progress?.progress).toBe(1);
    expect(progress?.status).toBe('ACTIVE');

    // Scan 4 more
    for (let i = 0; i < 4; i++) {
      await handler({ userId, timestamp: new Date(), deviceId: `dev${i+2}`, deviceType: 'PHONE' });
    }

    progress = await UserChallenge.findOne({ userId, challengeId: 'CHALLENGE_RECYCLE_5_DEVICES' });
    expect(progress?.progress).toBe(5);
    expect(progress?.status).toBe('COMPLETED');
    expect(progress?.completedAt).toBeDefined();

    expect(dispatchEvent).toHaveBeenCalledWith(
      EventType.CHALLENGE_COMPLETED,
      expect.objectContaining({ userId, challengeId: 'CHALLENGE_RECYCLE_5_DEVICES' })
    );

    expect(dispatchEvent).toHaveBeenCalledWith(
      EventType.REWARD_CALCULATED,
      expect.objectContaining({ userId, coins: 300, referenceId: 'CHALLENGE_RECYCLE_5_DEVICES' })
    );
  });

  it('should update challenge progress on EWASTE_SUBMITTED', async () => {
    const handler = (gamificationEventBus as any).listeners(EventType.EWASTE_SUBMITTED)[0];
    
    await handler({ userId, timestamp: new Date(), submissionId: 'sub1', weight: 1.5 });
    let progress = await UserChallenge.findOne({ userId, challengeId: 'CHALLENGE_EARTH_DAY' });
    expect(progress?.progress).toBe(1.5);
    expect(progress?.status).toBe('ACTIVE');

    await handler({ userId, timestamp: new Date(), submissionId: 'sub2', weight: 1.5 });
    
    progress = await UserChallenge.findOne({ userId, challengeId: 'CHALLENGE_EARTH_DAY' });
    expect(progress?.progress).toBe(3.0);
    expect(progress?.status).toBe('COMPLETED');

    expect(dispatchEvent).toHaveBeenCalledWith(
      EventType.CHALLENGE_COMPLETED,
      expect.objectContaining({ userId, challengeId: 'CHALLENGE_EARTH_DAY' })
    );
  });
});
