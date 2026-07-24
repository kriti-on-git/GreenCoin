import { IUserStats } from '../models/user-stats.model';

export type BadgeTier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond';

export interface BadgeRule {
  id: string;
  name: string;
  description: string;
  tier?: BadgeTier;
  /**
   * The criteria function determines if a user meets the requirements for a badge.
   * @param stats The user's statistics.
   * @returns True if the badge should be awarded, false otherwise.
   */
  criteria: (stats: Partial<IUserStats>) => boolean;
}

export const BADGE_RULES: BadgeRule[] = [
  {
    id: 'first-step',
    name: 'First Step',
    description: 'Completed your very first recycling action.',
    tier: 'Bronze',
    criteria: (stats) => (stats.totalDevicesRecycled || 0) >= 1
  },
  {
    id: 'eco-beginner',
    name: 'Eco Beginner',
    description: 'Recycled 5 devices.',
    tier: 'Bronze',
    criteria: (stats) => (stats.totalDevicesRecycled || 0) >= 5
  },
  {
    id: 'recycler',
    name: 'Recycler',
    description: 'Recycled 20 devices.',
    tier: 'Silver',
    criteria: (stats) => (stats.totalDevicesRecycled || 0) >= 20
  },
  {
    id: 'eco-warrior',
    name: 'Eco Warrior',
    description: 'Recycled 50 devices.',
    tier: 'Gold',
    criteria: (stats) => (stats.totalDevicesRecycled || 0) >= 50
  },
  {
    id: 'green-hero',
    name: 'Green Hero',
    description: 'Maintained a 10-time recycling streak.',
    tier: 'Platinum',
    criteria: (stats) => (stats.longestStreak || 0) >= 10
  },
  {
    id: 'referral-master',
    name: 'Referral Master',
    description: 'Successfully referred 10 friends.',
    tier: 'Gold',
    criteria: (stats) => (stats.totalReferrals || 0) >= 10 
  },
  {
    id: 'collector-friend',
    name: 'Collector Friend',
    description: 'Interacted with collectors multiple times.',
    tier: 'Silver',
    criteria: (stats) => (stats.totalDevicesRecycled || 0) >= 10
  },
  {
    id: 'earth-protector',
    name: 'Earth Protector',
    description: 'Recycled an enormous amount of e-waste.',
    tier: 'Platinum',
    criteria: (stats) => (stats.totalWeightRecycled || 0) >= 50
  },
  {
    id: 'tech-recycler',
    name: 'Tech Recycler',
    description: 'Consistently recycled devices.',
    tier: 'Gold',
    criteria: (stats) => (stats.totalDevicesRecycled || 0) >= 30
  },
  {
    id: 'champion',
    name: 'Champion',
    description: 'Exceptional dedication to recycling.',
    tier: 'Diamond',
    criteria: (stats) => (stats.totalDevicesRecycled || 0) >= 200 && (stats.longestStreak || 0) >= 15
  },
  {
    id: 'legend',
    name: 'Legend',
    description: 'Achieved legendary status in recycling.',
    tier: 'Diamond',
    criteria: (stats) => (stats.totalDevicesRecycled || 0) >= 500 && (stats.totalWeightRecycled || 0) >= 500
  },
  {
    id: 'carbon-saver',
    name: 'Carbon Saver',
    description: 'Recycled over 100 kg of e-waste. (Tunable placeholder criteria)',
    tier: 'Diamond',
    criteria: (stats) => (stats.totalWeightRecycled || 0) >= 100
  }
];
