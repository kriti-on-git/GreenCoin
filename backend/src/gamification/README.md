# Gamification Engine

This module handles gamification features such as XP, levels, badges, rewards, challenges, and leaderboards.

## Architecture

This module follows a pub/sub architecture. It MUST NEVER perform core business operations directly (like user authentication, creating pickups, etc.). Instead, other modules emit events that this engine consumes to update gamification state.

## Dispatching Events

To emit an event from another module, import `dispatchEvent` from the Gamification Engine:

```typescript
import { dispatchEvent } from '../gamification/events/event-dispatcher';
import { EventType } from '../gamification/events/event-types';

// Example call:
dispatchEvent(EventType.PICKUP_VERIFIED, {
  userId: 'user_123',
  pickupId: 'pickup_456',
  collectorId: 'collector_789',
  category: 'electronics',
  weight: 5,
  timestamp: new Date()
});
```

## Supported Events

The complete list of events and their strongly-typed payloads are defined in [events/event-types.ts](./events/event-types.ts).

- `USER_REGISTERED`: Triggered when a new user signs up.
- `DEVICE_SCANNED`: Triggered when a user scans a device for recycling evaluation.
- `EWASTE_SUBMITTED`: Triggered when e-waste is submitted.
- `PICKUP_COMPLETED`: Triggered when a collector marks a pickup as completed.
- `PICKUP_VERIFIED`: Triggered when the pickup is fully verified.
- `REFERRAL_SUCCESS`: Triggered when a user successfully refers someone.
- `REWARD_REDEEMED`: Triggered when a user spends their GreenCoins on a reward.
- `CHALLENGE_COMPLETED`: Triggered when a specific challenge is completed.
- `STREAK_UPDATED`: Triggered when a user's activity streak updates.
- `DAILY_LOGIN`: Triggered on user's first login of the day.
- `PROFILE_COMPLETED`: Triggered when a user finishes setting up their profile.
- `COLLECTOR_REVIEWED`: Triggered when a user leaves a review for a collector.
- `CAMPAIGN_COMPLETED`: Triggered when a user participates in and completes a campaign.
- `SPECIAL_EVENT`: Catch-all for generic gamification events.

## Sub-Modules

- **api**: API endpoints related to gamification.
- **badges**: Logic for awarding and displaying badges.
- **engine**: Core engine processing incoming events.
- **leaderboard**: Manages global and localized user rankings.
- **rewards**: Handles available rewards and the redemption process.
- **rules**: Business rules for calculating XP, coins, and levels.
- **wallet**: Manages user coin balances and ledger.
