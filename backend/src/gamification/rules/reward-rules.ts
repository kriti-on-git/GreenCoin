import { CampaignModel } from '../models/campaign.model';

/**
 * Configuration for base coin values per device category.
 * NOTE: These are placeholder values for the team to tune later.
 */
export const BaseCoinValues: Record<string, number> = {
  Laptop: 150,
  Phone: 50,
  Battery: 20,
  Tablet: 80,
  Monitor: 100,
  Other: 10
};

/**
 * Returns a multiplier based on the weight of the e-waste submitted.
 */
export const getWeightMultiplier = (weightInKg: number): number => {
  if (weightInKg > 5) return 1.3;
  if (weightInKg > 2) return 1.1;
  return 1.0;
};

/**
 * Returns a multiplier based on active campaigns.
 */
export const getCampaignMultiplier = async (): Promise<number> => {
  try {
    const now = new Date();
    const activeCampaigns = await CampaignModel.find({
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now }
    });

    if (activeCampaigns.length === 0) {
      return 1.0;
    }

    // Multiply all active campaign multipliers together
    return activeCampaigns.reduce((acc, campaign) => acc * campaign.multiplier, 1.0);
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    return 1.0;
  }
};

/**
 * Returns a multiplier based on the user's current streak.
 */
export const getStreakMultiplier = (currentStreak: number): number => {
  if (currentStreak >= 7) return 1.2;
  if (currentStreak >= 3) return 1.1;
  return 1.0;
};

/**
 * Category-specific multipliers that reward higher-value device recycling.
 */
export const CategoryMultiplier: Record<string, number> = {
  Laptop: 1.5,
  Phone: 1.2,
  Tablet: 1.3,
  Monitor: 1.4,
  Battery: 1.0,
  Other: 1.0,
};

/**
 * Returns a multiplier based on the device category.
 */
export const getCategoryMultiplier = (category: string): number => {
  return CategoryMultiplier[category] ?? CategoryMultiplier['Other'];
};

/**
 * Returns a bonus multiplier based on contextual conditions.
 * - Weekend bonus (Saturday/Sunday): 1.2×
 * - First-time user bonus (isFirstPickup flag): 1.5×
 * - Otherwise: 1.0×
 */
export const getBonusMultiplier = (payload: any): number => {
  const timestamp = payload.timestamp ? new Date(payload.timestamp) : new Date();
  const dayOfWeek = timestamp.getDay(); // 0 = Sunday, 6 = Saturday

  if (payload.isFirstPickup) return 1.5;
  if (dayOfWeek === 0 || dayOfWeek === 6) return 1.2;
  return 1.0;
};
