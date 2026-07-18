import { LeaderboardService } from './leaderboard.service';
import { Leaderboard } from './leaderboard.model';

// Mock the Mongoose model
jest.mock('./leaderboard.model');

describe('LeaderboardService', () => {
  let service: LeaderboardService;

  beforeEach(() => {
    service = new LeaderboardService();
    jest.clearAllMocks();
  });

  describe('calculateScore', () => {
    it('should correctly calculate the score based on the formula', () => {
      // Formula: XP + (Coins * 0.1) + (Badges * 50) + (Challenges * 100)
      const xp = 100;
      const coins = 200;
      const badges = 2;
      const challenges = 1;

      const score = service.calculateScore(xp, coins, badges, challenges);
      // 100 + 20 + 100 + 100 = 320
      expect(score).toBe(320);
    });

    it('should handle zero values correctly', () => {
      const score = service.calculateScore(0, 0, 0, 0);
      expect(score).toBe(0);
    });
  });

  describe('recalculateLeaderboard', () => {
    it('should query, sort, and bulkWrite to update ranks', async () => {
      const mockEntries = [
        { _id: 'user1_id', score: 500 },
        { _id: 'user2_id', score: 300 },
        { _id: 'user3_id', score: 300 },
      ];

      const execMock = jest.fn().mockResolvedValue(mockEntries);
      const selectMock = jest.fn().mockReturnValue({ exec: execMock });
      const sortMock = jest.fn().mockReturnValue({ select: selectMock });
      
      (Leaderboard.find as jest.Mock).mockReturnValue({ sort: sortMock });
      (Leaderboard.bulkWrite as jest.Mock).mockResolvedValue({ modifiedCount: 3 });

      await service.recalculateLeaderboard('global');

      expect(Leaderboard.find).toHaveBeenCalledWith({ scope: 'global' });
      expect(sortMock).toHaveBeenCalledWith({ score: -1 });
      
      const expectedBulkOps = [
        { updateOne: { filter: { _id: 'user1_id' }, update: { $set: { rank: 1 } } } },
        { updateOne: { filter: { _id: 'user2_id' }, update: { $set: { rank: 2 } } } },
        { updateOne: { filter: { _id: 'user3_id' }, update: { $set: { rank: 3 } } } },
      ];

      expect(Leaderboard.bulkWrite).toHaveBeenCalledWith(expectedBulkOps);
    });

    it('should do nothing if there are no entries', async () => {
      const execMock = jest.fn().mockResolvedValue([]);
      const selectMock = jest.fn().mockReturnValue({ exec: execMock });
      const sortMock = jest.fn().mockReturnValue({ select: selectMock });
      
      (Leaderboard.find as jest.Mock).mockReturnValue({ sort: sortMock });

      await service.recalculateLeaderboard('global');

      expect(Leaderboard.bulkWrite).not.toHaveBeenCalled();
    });
  });
});
