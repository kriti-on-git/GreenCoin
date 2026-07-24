# GreenCoin Backend

The backend API server for the GreenCoin e-waste recycling platform. Built with **Express 5**, **TypeScript**, **MongoDB (Mongoose)**, and **Zod** for request validation.

---

## What Was Built

This backend implements the **Pickup Module**, **Authentication & Users Module**, and the **Gamification Engine** — forming the core workflows of the GreenCoin ecosystem. Below is a breakdown of everything that was done.

### 1. Pickup Lifecycle & State Machine

A pickup request moves through a strict, forward-only state machine:

```
Requested → Accepted → Picked → Delivered → Verified ─┬─→ Reward Generated
                                                       └─→ Verification Failed
```

- **Only valid forward transitions are allowed.** Attempting to skip a step (e.g. `Requested → Delivered`) or go backward (e.g. `Delivered → Picked`) is rejected with a `400 INVALID_TRANSITION` error.
- The state machine is implemented in [`pickup-state-machine.ts`](src/pickup/pickup-state-machine.ts) as a standalone class with a static transition map, making it easy to test and extend.
- **`Verification Failed`** is reached only when the Rewards service handoff fails after successful verification, which prevents pickups from getting silently stuck in case of network errors.

### 2. Pickup CRUD & Status Update Endpoints

Full REST API for pickup management, implemented across the following files:

- **Routes** → [`pickup.routes.ts`](src/pickup/pickup.routes.ts): Maps HTTP verbs and endpoints to the respective controller actions, integrating Auth and Zod validations.
- **Controller** → [`pickup.controller.ts`](src/pickup/pickup.controller.ts): Orchestrates logic, extracts data from requests (`req.body`, `req.params`, `req.user`), checks roles, calls the service, and sends HTTP responses.
- **Service** → [`pickup.service.ts`](src/pickup/pickup.service.ts): Handles database interactions (Mongoose) and enforces business rules/state transitions.
- **Model** → [`pickup.model.ts`](src/pickup/pickup.model.ts): Defines the Mongoose schemas and TypeScript interfaces for Pickup and Device entities.
- **Rewards Client** → [`rewards-client.ts`](src/pickup/rewards-client.ts): An HTTP client wrapper around native Node `fetch` used to trigger the external Rewards Service logic.

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| `POST` | `/api/v1/pickups` | User | Create a new pickup request with device info |
| `GET` | `/api/v1/pickups` | User/Collector/Admin | List pickups (filtered by role) |
| `GET` | `/api/v1/pickups/:id` | User/Collector/Admin | Get a specific pickup by ID |
| `PATCH` | `/api/v1/pickups/:id/accept` | Collector | Accept a pickup (assigns collector) |
| `PATCH` | `/api/v1/pickups/:id/status` | Collector | Update pickup status (next valid state) |
| `PATCH` | `/api/v1/pickups/:id/verify` | Admin | Verifies a delivered pickup and triggers Rewards |

**Key business rules enforced & Vulnerabilities fixed:**

- A collector must be **assigned** to a pickup before updating its status.
- A different collector **cannot** update a pickup they're not assigned to (`403 FORBIDDEN_NOT_ASSIGNED_COLLECTOR`).
- A pickup that already has a collector **cannot** be accepted again (`403 FORBIDDEN_ALREADY_ASSIGNED`).
- Users can **only** view their own pickups.
- **(Glitch Fixed)** Added stricter collector access checks on viewing specific pickups via `GET /api/v1/pickups/:id` so they can only view pickups with a status of `Requested` or pickups explicitly assigned to them.
- **(Vulnerability Fixed)** Added Zod validation to ensure that all `req.params.id` are valid MongoDB ObjectIds format. This prevents unhandled 500 Internal Server Error crashes (`CastError`) that can occur if an invalid format is passed.

### 3. Collection Center Management

Admin-only CRUD for managing e-waste collection centers:

- **Routes** → [`collection-center.routes.ts`](src/pickup/collection-center.routes.ts)
- **Controller** → [`collection-center.controller.ts`](src/pickup/collection-center.controller.ts)
- **Service** → [`collection-center.service.ts`](src/pickup/collection-center.service.ts)
- **Validation** → [`collection-center.validation.ts`](src/pickup/collection-center.validation.ts)

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| `GET` | `/api/v1/collection-centers` | Any authenticated | List all collection centers |
| `POST` | `/api/v1/collection-centers` | Admin only | Create a new collection center |

### 4. Request Validation (Zod)

All incoming requests are validated using **Zod** schemas before reaching the controller:

- [`pickup.validation.ts`](src/pickup/pickup.validation.ts) — Validates pickup creation body, query filters, status update body, and route `id` params.
- [`collection-center.validation.ts`](src/pickup/collection-center.validation.ts) — Validates collection center creation body.

The `validate()` middleware wraps any Zod schema and returns structured `400 VALIDATION_ERROR` responses with field-level error messages.

### 5. Authentication & Users

Full JWT-based Authentication and User Management have been implemented:

- **Auth Routes** → [`auth.routes.ts`](src/auth/auth.routes.ts): Provides `/register`, `/login`, and `/logout` endpoints. Uses `bcrypt` for secure password hashing and `jsonwebtoken` for issuing JWTs.
- **User Routes** → [`user.routes.ts`](src/users/user.routes.ts): Provides profile management with endpoints for `GET /me`, `PATCH /me`, and admin-only routes like `GET /:id` and `GET /`.
- **Middleware** → [`auth.middleware.ts`](src/middlewares/auth.middleware.ts) validates the JWT and injects `req.user`. Additionally, `rbac.middleware.ts` provides role-based access control.

### 5.5. Gamification Engine Architecture

**Goal**
Build a fully modular, scalable, event-driven gamification engine that remains independent from the core application.
The engine should never directly perform business operations (pickup, authentication, scanning, etc.).
Instead, it listens to events generated by other modules and computes:
- GreenCoin rewards
- Badges
- Levels
- XP
- Leaderboards
- Challenges
- Wallet transactions
- Reward redemption eligibility
- User statistics

This allows the gamification module to be plugged into any backend with minimal coupling.

#### High-Level Architecture
```text
                     USER ACTIONS
                           │
        ┌──────────────────┼────────────────────┐
        │                  │                    │
 Device Scan         Pickup Completed      Referral Joined
        │                  │                    │
        └──────────────────┼────────────────────┘
                           │
                  Business Modules
                           │
                  Emit Domain Events
                           │
                           ▼
               Gamification Event Bus
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
 Reward Engine      Badge Engine       XP Engine
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
                     Level Engine
                           │
                           ▼
                    Wallet Engine
                           │
        ┌──────────────────┼────────────────────┐
        │                  │                    │
 Leaderboard        Challenge Engine      Notification
        │                  │                    │
        └──────────────────┼────────────────────┘
                           ▼
                    MongoDB Database
```

#### Folder Structure
```text
gamification/
│
├── engine/
│   ├── reward_engine.js
│   ├── xp_engine.js
│   ├── badge_engine.js
│   ├── level_engine.js
│   ├── leaderboard_engine.js
│   ├── wallet_engine.js
│   ├── streak_engine.js
│   ├── challenge_engine.js
│   ├── notification_engine.js
│   └── gamification_service.js
│
├── events/
│   ├── event_bus.js
│   ├── event_dispatcher.js
│   └── event_types.js
│
├── rules/
│   ├── reward_rules.js
│   ├── badge_rules.js
│   ├── level_rules.js
│   ├── streak_rules.js
│   └── challenge_rules.js
│
├── wallet/
│   ├── wallet_model.js
│   ├── transaction_model.js
│   └── wallet_service.js
│
├── leaderboard/
│   ├── leaderboard_model.js
│   └── leaderboard_service.js
│
├── badges/
│   ├── badge_model.js
│   └── user_badge_model.js
│
├── rewards/
│   ├── reward_catalog.js
│   ├── redemption_service.js
│   └── coupon_service.js
│
├── models/
│   ├── user_stats.js
│   ├── activity_log.js
│   └── gamification_profile.js
│
└── api/
    ├── wallet_routes.js
    ├── reward_routes.js
    ├── leaderboard_routes.js
    ├── badge_routes.js
    └── profile_routes.js
```

#### Event-Driven Pipeline
Every business module emits an event.
Example:
```text
Pickup Completed
        │
        ▼
Emit Event
{
    type: "PICKUP_COMPLETED",
    userId,
    collectorId,
    weight,
    category,
    timestamp
}
↓
Gamification Service receives event
↓
Reward Engine calculates coins
↓
XP Engine calculates XP
↓
Badge Engine checks achievements
↓
Level Engine updates level
↓
Wallet Engine credits wallet
↓
Leaderboard recalculates score
↓
Notification Engine notifies user
↓
Save everything to database
```

#### Supported Events
- `USER_REGISTERED`
- `DEVICE_SCANNED`
- `EWASTE_SUBMITTED`
- `PICKUP_COMPLETED`
- `PICKUP_VERIFIED`
- `REFERRAL_SUCCESS`
- `REWARD_REDEEMED`
- `CHALLENGE_COMPLETED`
- `STREAK_UPDATED`
- `DAILY_LOGIN`
- `PROFILE_COMPLETED`
- `COLLECTOR_REVIEWED`
- `CAMPAIGN_COMPLETED`
- `SPECIAL_EVENT`

Every future feature simply emits one of these events.

#### Reward Engine
Responsible for:
`Receive event` ↓ `Find reward rule` ↓ `Calculate base reward` ↓ `Apply multipliers` ↓ `Return final coins`

**Reward Formula**
`Reward = Base Coins × Weight Multiplier × Category Multiplier × Campaign Multiplier × Streak Multiplier × Bonus Multiplier`

**Example**
- Laptop Base = 150
- Weight Bonus = 1.3
- Campaign = 2x
- Weekend = 1.2
- **Total**: `150 × 1.3 × 2 × 1.2 = 468 Coins`

#### XP Engine
Coins ≠ XP. XP measures engagement.
- **Daily Login**: +10 XP
- **Pickup**: +100 XP
- **Referral**: +80 XP
- **Review**: +20 XP
- **Campaign**: +150 XP

XP drives Levels.

#### Level Engine
- **Level 1**: 0 XP
- **Level 2**: 200 XP
- **Level 3**: 500 XP
- **Level 4**: 900 XP
- **Level 5**: 1500 XP

Benefits: Higher level ↓ Higher badge rarity ↓ Special campaigns ↓ Exclusive rewards ↓ Priority rankings.

#### Wallet Engine
Wallet stores: Current Balance, Lifetime Coins, Coins Earned, Coins Redeemed, Pending Coins.
Every transaction: Credit, Debit, Expiry, Bonus, Campaign Reward, Redemption.

**Transaction schema:** `transaction { id, userId, type, coins, reason, referenceId, timestamp }`

Nothing updates balance directly. Everything creates transactions.
`Wallet balance = Sum(all transactions)`

#### Badge Engine
Checks rules after every event.
Example: `First Device` ↓ `Recycle 1 item` ↓ `Badge Unlocked`

Example badges: First Step, Eco Beginner, Recycler, Eco Warrior, Green Hero, Collector Friend, Referral Master, Carbon Saver, Earth Protector, Tech Recycler, Champion, Legend.
Badges have tiers: Bronze, Silver, Gold, Platinum, Diamond.

#### Streak Engine
Tracks continuous actions: Daily Login, Pickup, Weekly Recycling, Monthly Recycling.
Example:
- 3 day streak ↓ +20 Coins
- 7 day streak ↓ +100 Coins
- 30 day streak ↓ Special Badge

#### Leaderboard Engine
Leaderboards: Global, City, College, Company, Campaign, Friends.
Ranking Score Example: `Score = XP + Coins × 0.1 + Badges × 50 + Challenges × 100`
Leaderboard updates: Realtime, Every 5 minutes, or Nightly batch.

#### Challenge Engine
Creates missions.
Example: `Recycle 5 Devices` ↓ `Reward: 300 Coins`
Campaign example: `Earth Day: Recycle 3 kg` ↓ `Reward: Badge + 500 Coins`
Challenge lifecycle: `Created` ↓ `Assigned` ↓ `Started` ↓ `Completed` ↓ `Reward Issued`

#### Reward Redemption Pipeline
`User` ↓ `Browse Rewards` ↓ `Check Wallet Balance` ↓ `Redeem` ↓ `Wallet Debit` ↓ `Coupon Generated` ↓ `Notify User` ↓ `Transaction Stored`

Reward Types: Amazon Voucher, Flipkart Coupon, Boat Coupon, Croma Coupon, Donation, Plant Tree, CSR Rewards, Event Tickets, Premium Badges, Campus Merchandise.

#### Notification Engine
Triggered after every achievement.
Example: `Congratulations! You earned 250 GreenCoins + Eco Warrior Badge + Reached Level 5`
Supports: Push Notification, Email, In-App, SMS.

#### Database Collections
`wallets`, `wallet_transactions`, `badges`, `user_badges`, `levels`, `leaderboards`, `user_statistics`, `reward_catalog`, `reward_redemptions`, `challenges`, `user_challenges`, `activity_logs`, `campaigns`, `gamification_profiles`

#### Complete Event Flow
`User Recycles Laptop` ↓ `Pickup Verified` ↓ `Emit Event` ↓ `Reward Engine` ↓ `XP Engine` ↓ `Badge Engine` ↓ `Level Engine` ↓ `Wallet Credit` ↓ `Leaderboard Update` ↓ `Challenge Check` ↓ `Notification` ↓ `Save Transactions` ↓ `Frontend Receives Updated Wallet` ↓ `User Sees: +450 Coins, New Badge, Level Up, Leaderboard Rank`

#### API Layer
```
GET    /wallet
GET    /wallet/history
GET    /leaderboard
GET    /badges
GET    /profile/gamification
GET    /challenges
POST   /redeem
GET    /rewards
GET    /levels
GET    /statistics
```

#### Scalability Principles
- **Event-driven**: Business modules emit events; gamification reacts asynchronously.
- **Stateless engines**: Reward, XP, badge, level, and streak engines are pure calculation services, making them easy to test and scale horizontally.
- **Configuration-driven rules**: Store reward formulas, badge criteria, level thresholds, and challenge definitions in configuration/database rather than hardcoding logic.
- **Append-only wallet ledger**: Never mutate balances directly; derive wallet balance from immutable transactions for auditability.
- **Independent APIs**: Frontend consumes gamification endpoints without coupling to business services.
- **Pluggable integrations**: New events, campaigns, rewards, or notification channels can be added without modifying the core engine.

This architecture cleanly separates business logic (pickup, verification, scanning) from engagement logic (coins, XP, badges, leaderboards), making the gamification engine reusable, maintainable, and ready for future growth.

### 6. Error Handling

A centralized [`error.middleware.ts`](src/middlewares/error.middleware.ts) catches all errors thrown by controllers/services and returns a consistent JSON response:

```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Human-readable description"
}
```

Error codes used throughout the API:

- `UNAUTHORIZED` — Missing or invalid auth token
- `FORBIDDEN` — Role-based access denied
- `FORBIDDEN_ALREADY_ASSIGNED` — Pickup already has a collector
- `FORBIDDEN_NOT_ASSIGNED_COLLECTOR` — Collector not assigned to this pickup
- `NOT_FOUND` — Resource not found
- `INVALID_TRANSITION` — Invalid state machine transition
- `VALIDATION_ERROR` — Zod validation failure
- `REWARDS_HANDOFF_FAILED` — Triggering rewards via external service failed
- `INTERNAL_SERVER_ERROR` — Unhandled errors

### 7. Structured Logging

A lightweight [`logger.ts`](src/utils/logger.ts) utility provides `debug`, `info`, `warn`, and `error` log levels with ISO timestamps. Logs are automatically suppressed during test execution (`NODE_ENV=test`) to keep output clean.

### 8. Database Models & Indexes

Three Mongoose models defined in [`pickup.model.ts`](src/pickup/pickup.model.ts):

| Model | Fields |
|-------|--------|
| **Pickup** | `status`, `pickupTime`, `userId`, `collectorId`, `deviceId`, `createdAt`, `updatedAt` |
| **Device** | `category`, `weight` |
| **CollectionCenter** | `name`, `location` |

Database indexes are set on `Pickup` for fast querying:

- `userId` — for user-specific pickup listing
- `collectorId` — for collector-specific filtering
- `status` — for status-based filtering

### 9. Test Suite

- **Test Suite** → [`pickup.test.ts`](tests/pickup.test.ts): Contains 14 Jest/Supertest tests spanning the complete lifecycle of Pickups. Validates restrictions on User vs Collector vs Admin endpoints, validates forward-only status updates, and comprehensively tests `verifyPickup` with Rewards successful/failure cases using mocked services.
- Ensures logic is heavily protected against regression. 

---

## Project Structure

```
backend/
├── src/
│   ├── index.ts                          # Express app setup, routing & execution
│   ├── config/
│   │   └── db.ts                         # MongoDB connection setup
│   ├── middlewares/
│   │   ├── auth.middleware.ts            # JWT authentication middleware
│   │   ├── error.middleware.ts           # Centralized error handler
│   │   └── rbac.middleware.ts            # Role-based access control
│   ├── auth/
│   │   ├── auth.controller.ts            # Register & login request handlers
│   │   ├── auth.routes.ts                # Auth route definitions
│   │   ├── auth.service.ts               # Password hashing & auth logic
│   │   ├── auth.validation.ts            # Zod schemas for auth inputs
│   │   └── jwt.util.ts                   # Token generation and verification
│   ├── users/
│   │   ├── user.controller.ts            # User profile request handlers
│   │   ├── user.model.ts                 # User schema
│   │   ├── user.routes.ts                # User routes
│   │   └── user.service.ts               # User business logic
│   ├── gamification/                     # Gamification engine (pub/sub)
│   │   ├── api/                          # Gamification endpoints
│   │   ├── badges/                       # Badge logic
│   │   ├── engine/                       # Core event processing
│   │   ├── events/                       # Dispatcher and definitions
│   │   ├── leaderboard/                  # Ranking logic
│   │   ├── models/                       # Gamification database schemas
│   │   ├── rewards/                      # Reward system
│   │   ├── rules/                        # XP and level rules
│   │   └── wallet/                       # Coin balance and ledger
│   ├── pickup/
│   │   ├── pickup.model.ts               # Pickups and Device schemas
│   │   ├── pickup.routes.ts              # Pickup route definitions
│   │   ├── pickup.controller.ts          # Pickup request handlers
│   │   ├── pickup.service.ts             # Pickup business logic
│   │   ├── pickup.validation.ts          # Zod schemas & validate middleware
│   │   ├── pickup-state-machine.ts       # State transition validator
│   │   ├── rewards-client.ts             # HTTP client for external rewards
│   │   └── collection-center.*           # Collection center routes & logic
│   └── utils/
│       └── logger.ts                     # Structured console logger
├── package.json
└── tsconfig.json
```

---

## Getting Started

### Prerequisites

- **Node.js** v18+
- **MongoDB** running locally or a connection URI

### Installation

```bash
cd backend
npm install
```

### Environment Variables

Create a `.env` file in the `backend/` directory (you can use `.env.example` as a template):

```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/greencoin
JWT_SECRET=your_super_secret_jwt_key_here
REWARDS_SERVICE_URL=http://localhost:3001/api/v1/rewards/generate
```

### Running the Server

```bash
# Development (with ts-node)
npm run dev

# Build for production
npm run build
node dist/index.js

# Test (with Jest)
npm test
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js + TypeScript |
| Framework | Express 5 |
| Database | MongoDB via Mongoose |
| Validation | Zod |
| Auth | Real JWT middleware with bcrypt hashing |
| Testing | Jest, Supertest & mongodb-memory-server |
