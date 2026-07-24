import { Leaderboard } from './leaderboard.model';

export class LeaderboardService {
  /**
   * Calculates the user's gamification score based on the formula:
   * XP + (Coins * 0.1) + (Badges * 50) + (Challenges * 100)
   */
  public calculateScore(
    xp: number,
    coins: number,
    badgeCount: number,
    challengesCompleted: number = 0
  ): number {
    return xp + coins * 0.1 + badgeCount * 50 + challengesCompleted * 100;
  }

  /**
   * Recalculates the ranks for a specific leaderboard scope.
   * This retrieves all entries for the scope, sorts them by score,
   * and updates their rank sequentially using a bulk operation.
   * @param scope The scope to recalculate (e.g., 'global')
   */
  public async recalculateLeaderboard(
    scope: 'global' | 'city' | 'college' | 'company' | 'campaign' | 'friends'
  ): Promise<void> {
    const entries = await Leaderboard.find({ scope })
      .sort({ score: -1 })
      .select('_id score')
      .exec();

    if (entries.length === 0) {
      return;
    }

    const bulkOps = entries.map((entry, index) => ({
      updateOne: {
        filter: { _id: entry._id },
        update: { $set: { rank: index + 1 } },
      },
    }));

    await Leaderboard.bulkWrite(bulkOps);
  }

  /**
   * Updates or creates a user's score in a given scope.
   */
  public async updateUserScore(
    userId: string,
    scope: 'global' | 'city' | 'college' | 'company' | 'campaign' | 'friends',
    score: number
  ): Promise<void> {
    await Leaderboard.updateOne(
      { userId: userId as any, scope },
      { $set: { score } },
      { upsert: true }
    );
  }
}

export const leaderboardService = new LeaderboardService();
