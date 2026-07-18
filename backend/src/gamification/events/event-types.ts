export enum EventType {
  USER_REGISTERED = 'USER_REGISTERED',
  DEVICE_SCANNED = 'DEVICE_SCANNED',
  EWASTE_SUBMITTED = 'EWASTE_SUBMITTED',
  PICKUP_COMPLETED = 'PICKUP_COMPLETED',
  PICKUP_VERIFIED = 'PICKUP_VERIFIED',
  REFERRAL_SUCCESS = 'REFERRAL_SUCCESS',
  REWARD_REDEEMED = 'REWARD_REDEEMED',
  CHALLENGE_COMPLETED = 'CHALLENGE_COMPLETED',
  STREAK_UPDATED = 'STREAK_UPDATED',
  DAILY_LOGIN = 'DAILY_LOGIN',
  PROFILE_COMPLETED = 'PROFILE_COMPLETED',
  COLLECTOR_REVIEWED = 'COLLECTOR_REVIEWED',
  CAMPAIGN_COMPLETED = 'CAMPAIGN_COMPLETED',
  SPECIAL_EVENT = 'SPECIAL_EVENT',
  REWARD_CALCULATED = 'REWARD_CALCULATED',
  XP_UPDATED = 'XP_UPDATED',
  WALLET_UPDATED = 'WALLET_UPDATED',
  BADGE_EARNED = 'BADGE_EARNED',
  LEVEL_UP = 'LEVEL_UP',
  BADGE_CRITERIA_MET = 'BADGE_CRITERIA_MET',
  STATS_UPDATED = 'STATS_UPDATED'
}

export interface BaseEventPayload {
  userId: string;
  timestamp: Date;
}

export interface UserRegisteredPayload extends BaseEventPayload {
  email: string;
}

export interface DeviceScannedPayload extends BaseEventPayload {
  deviceId: string;
  deviceType: string;
}

export interface EwasteSubmittedPayload extends BaseEventPayload {
  submissionId: string;
  weight: number;
}

export interface PickupCompletedPayload extends BaseEventPayload {
  pickupId: string;
  collectorId: string;
}

export interface PickupVerifiedPayload extends BaseEventPayload {
  pickupId: string;
  collectorId: string;
  deviceId?: string;
  category: string;
  weight: number;
}

export interface ReferralSuccessPayload extends BaseEventPayload {
  referredUserId: string;
}

export interface RewardRedeemedPayload extends BaseEventPayload {
  rewardId: string;
  cost: number;
}

export interface ChallengeCompletedPayload extends BaseEventPayload {
  challengeId: string;
}

export interface StreakUpdatedPayload extends BaseEventPayload {
  streakCount: number;
}

export interface DailyLoginPayload extends BaseEventPayload {}

export interface ProfileCompletedPayload extends BaseEventPayload {}

export interface CollectorReviewedPayload extends BaseEventPayload {
  collectorId: string;
  rating: number;
}

export interface CampaignCompletedPayload extends BaseEventPayload {
  campaignId: string;
}

export interface SpecialEventPayload extends BaseEventPayload {
  eventName: string;
  metadata?: Record<string, any>;
}

export interface RewardCalculatedPayload extends BaseEventPayload {
  coins: number;
  reason: string;
  referenceId?: string;
}

export interface XpUpdatedPayload extends BaseEventPayload {
  xpGained: number;
  newTotalXp: number;
}

export interface WalletUpdatedPayload extends BaseEventPayload {
  newBalance: number;
}

export interface BadgeEarnedPayload extends BaseEventPayload {
  badgeId: string;
}

export interface LevelUpPayload extends BaseEventPayload {
  newLevel: number;
}

export interface BadgeCriteriaMetPayload extends BaseEventPayload {
  criteriaType: string;
  value: any;
}

export interface StatsUpdatedPayload extends BaseEventPayload {
  totalDevicesRecycled: number;
  totalWeightRecycled: number;
}

// Map EventType to its payload
export type EventPayloadMap = {
  [EventType.USER_REGISTERED]: UserRegisteredPayload;
  [EventType.DEVICE_SCANNED]: DeviceScannedPayload;
  [EventType.EWASTE_SUBMITTED]: EwasteSubmittedPayload;
  [EventType.PICKUP_COMPLETED]: PickupCompletedPayload;
  [EventType.PICKUP_VERIFIED]: PickupVerifiedPayload;
  [EventType.REFERRAL_SUCCESS]: ReferralSuccessPayload;
  [EventType.REWARD_REDEEMED]: RewardRedeemedPayload;
  [EventType.CHALLENGE_COMPLETED]: ChallengeCompletedPayload;
  [EventType.STREAK_UPDATED]: StreakUpdatedPayload;
  [EventType.DAILY_LOGIN]: DailyLoginPayload;
  [EventType.PROFILE_COMPLETED]: ProfileCompletedPayload;
  [EventType.COLLECTOR_REVIEWED]: CollectorReviewedPayload;
  [EventType.CAMPAIGN_COMPLETED]: CampaignCompletedPayload;
  [EventType.SPECIAL_EVENT]: SpecialEventPayload;
  [EventType.REWARD_CALCULATED]: RewardCalculatedPayload;
  [EventType.XP_UPDATED]: XpUpdatedPayload;
  [EventType.WALLET_UPDATED]: WalletUpdatedPayload;
  [EventType.BADGE_EARNED]: BadgeEarnedPayload;
  [EventType.LEVEL_UP]: LevelUpPayload;
  [EventType.BADGE_CRITERIA_MET]: BadgeCriteriaMetPayload;
  [EventType.STATS_UPDATED]: StatsUpdatedPayload;
};
