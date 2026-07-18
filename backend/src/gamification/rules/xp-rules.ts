import { EventType } from '../events/event-types';

export const XP_VALUES: Partial<Record<EventType, number>> = {
  [EventType.DAILY_LOGIN]: 10,
  [EventType.PICKUP_VERIFIED]: 100,
  [EventType.REFERRAL_SUCCESS]: 80,
  [EventType.COLLECTOR_REVIEWED]: 20,
  [EventType.CAMPAIGN_COMPLETED]: 150,
  [EventType.DEVICE_SCANNED]: 15,
  [EventType.EWASTE_SUBMITTED]: 50,
  [EventType.PROFILE_COMPLETED]: 30,
  [EventType.USER_REGISTERED]: 25,
  [EventType.SPECIAL_EVENT]: 200,
};
