import { dispatchEvent } from './events/event-dispatcher';
import { EventType } from './events/event-types';

import { BadgeEngine } from './engine/badge-engine';
import { ChallengeEngine } from './engine/challenge-engine';
import { LeaderboardEngine } from './engine/leaderboard-engine';
import { LevelEngine } from './engine/level-engine';
import { NotificationEngine } from './engine/notification-engine';
import { initializeRewardEngine } from './engine/reward-engine';
import { StreakEngine } from './engine/streak-engine';
import { WalletEngine } from './engine/wallet-engine';
import { initializeXpEngine } from './engine/xp-engine';
import { StatsEngine } from './engine/stats-engine';
import { seedGamificationData } from './seeder';
import { logger } from '../utils/logger';

export const initializeGamificationEngines = async () => {
  logger.info('Initializing all Gamification Engines...');
  
  BadgeEngine.init();
  ChallengeEngine.initialize();
  new LeaderboardEngine();
  LevelEngine.init();
  NotificationEngine.initialize();
  initializeRewardEngine();
  new StreakEngine();
  WalletEngine.initialize();
  initializeXpEngine();
  StatsEngine.initialize();

  await seedGamificationData();
  
  logger.info('All Gamification Engines initialized successfully.');
};

export { dispatchEvent, EventType };
