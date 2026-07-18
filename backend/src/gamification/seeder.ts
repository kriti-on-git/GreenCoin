import { RewardCatalogModel } from './models/reward-catalog.model';
import { ChallengeModel } from './models/challenge.model';
import { rewardCatalog } from './rewards/reward-catalog';
import { challengeRules } from './rules/challenge-rules';
import { logger } from '../utils/logger';

export const seedGamificationData = async () => {
  try {
    // 1. Seed Rewards
    const rewardCount = await RewardCatalogModel.countDocuments();
    if (rewardCount === 0) {
      logger.info('Seeding Gamification Reward Catalog...');
      const rewardsToInsert = rewardCatalog.map(r => ({
        rewardId: r.id,
        name: r.name,
        description: r.description,
        coinCost: r.coinCost,
        stock: r.stock,
        type: r.type,
        isActive: true
      }));
      await RewardCatalogModel.insertMany(rewardsToInsert);
      logger.info(`Inserted ${rewardsToInsert.length} rewards.`);
    }

    // 2. Seed Challenges
    const challengeCount = await ChallengeModel.countDocuments();
    if (challengeCount === 0) {
      logger.info('Seeding Gamification Challenges...');
      const challengesToInsert = challengeRules.map(c => ({
        challengeId: c.id,
        name: c.name,
        description: c.description,
        criteria: c.criteria,
        rewardCoins: c.rewardCoins,
        rewardBadgeId: c.rewardBadgeId,
        startDate: c.startDate,
        endDate: c.endDate,
        isActive: true
      }));
      await ChallengeModel.insertMany(challengesToInsert);
      logger.info(`Inserted ${challengesToInsert.length} challenges.`);
    }

  } catch (error) {
    logger.error('Error seeding gamification data:', error);
  }
};
