# GreenCoin Backend - Complete Postman Test Plan

This document outlines a comprehensive, end-to-end Postman testing plan for the GreenCoin backend (Express 5 + TypeScript + MongoDB + Zod). It is designed to validate the Auth/Users flows, the full Pickup lifecycle, and the Gamification Engine's event-driven logic.

## Phase 0 — Environment Setup

Set up the following variables in a Postman Environment:

- `base_url`: `http://localhost:3000/api/v1` (adjust port if necessary via `.env`)
- `admin_token`, `user1_token`, `user2_token`, `collector1_token`, `collector2_token` (populated in Phase 1)
- `user1_id`, `pickup1_id`, etc. (populated dynamically)

**Test Script Example (Postman):**
```javascript
// Add to the Tests tab of successful login/registration requests
pm.environment.set("user1_token", pm.response.json().data.token);
pm.environment.set("user1_id", pm.response.json().data.user.id || pm.response.json().data.user._id);
```

## Phase 1 — Multi-User Creation

Register and log in the necessary personas.

| Request Name | Method | Endpoint | Role Required | Expected Status | Key Assertions |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Register User 1 | POST | `/auth/register` | None | 201 | success: true, token generated |
| Register Collector 1 | POST | `/auth/register` | None | 201 | success: true, token generated |
| Login User 1 | POST | `/auth/login` | None | 200 | success: true, token generated |
| Invalid Login (Email) | POST | `/auth/login` | None | 400 | success: false, validation or UNAUTHORIZED |
| Invalid Login (Pass) | POST | `/auth/login` | None | 400 | success: false, validation or UNAUTHORIZED |

**Test Script Example:**
```javascript
pm.test("Successful registration returns token", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.success).to.be.true;
    pm.expect(jsonData.data).to.have.property("token");
});
```

*Note: If the `admin` role cannot be self-registered (blocked by API logic), you must manually set a user's role to `admin` in the MongoDB `users` collection prior to running tests.*

## Phase 2 — Pre-Test Configuration Check

> **Known Limitation / Gap:** 
> Currently, there are NO active `admin` API endpoints for managing the Reward Catalog, Challenge Definitions, Badge Rules, or Level Thresholds. The `admin-routes.ts` file was removed. 
> - **Badge Rules**, **Level Thresholds**, **XP Values**, and **Reward Multipliers** are static configurations in code (e.g. `src/gamification/rules/*.ts`).
> - **Reward Catalog** and **Challenge Definitions** exist as DB models but lack admin APIs to populate them. 

Before running the full test, ensure the database is seeded, and be aware of these hardcoded Gamification values:
- **Base Reward for Laptop:** 150 coins (with a 1.5x category multiplier = 225 base coins for a 1kg laptop).
- **XP for PICKUP_VERIFIED:** 100 XP.
- **Level Thresholds:** Level 1 (0 XP), Level 2 (200 XP), Level 3 (500 XP).
- **Badge:** "First Step" (ID: `first-step`) is awarded for 1 device recycled.

## Phase 3 — Pickup Request Creation (multiple users)

Test users create pickup requests of varying sizes.

| Request Name | Method | Endpoint | Role Required | Expected Status | Key Assertions |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Create Pickup (Laptop) | POST | `/pickups` | User | 201 | success: true, status="Requested" |
| Create Pickup (Battery) | POST | `/pickups` | User | 201 | success: true, status="Requested" |
| Create Pickup (Missing) | POST | `/pickups` | User | 400 | error contains Zod validation errors |
| List Pickups (User 1) | GET | `/pickups` | User | 200 | Only returns User 1's pickups |

**Test Script Example (Create Pickup):**
```javascript
pm.test("Status is 201 Created", function () {
    pm.response.to.have.status(201);
});
var jsonData = pm.response.json();
pm.environment.set("pickup1_id", jsonData.data._id);
```

## Phase 4 — Collector Accept & Lifecycle Progression

| Request Name | Method | Endpoint | Role Required | Expected Status | Key Assertions |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Accept Pickup | PATCH | `/pickups/:id/accept` | Collector | 200 | status becomes "Accepted" |
| Accept Already Assigned | PATCH | `/pickups/:id/accept` | Collector 2 | 403 | error indicates FORBIDDEN_ALREADY_ASSIGNED |
| Update Status to Picked | PATCH | `/pickups/:id/status` | Collector | 200 | status="Picked" |
| Update Status to Delivered| PATCH | `/pickups/:id/status` | Collector | 200 | status="Delivered" |
| Backward Status Update | PATCH | `/pickups/:id/status` | Collector | 400 | error indicates INVALID_TRANSITION |

**Test Script Example:**
```javascript
pm.test("Pickup status is Delivered", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.data.status).to.eql("Delivered");
});
```

## Phase 5 — Verification & Rewards Handoff

The crucial link between core business logic and Gamification.

| Request Name | Method | Endpoint | Role Required | Expected Status | Key Assertions |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Admin Verify Pickup | PATCH | `/pickups/:id/verify` | Admin | 200 | status="Reward Generated" (or "Verified") |
| User Verify Pickup | PATCH | `/pickups/:id/verify` | User | 403 | FORBIDDEN |

*Manual Simulation (REWARDS_HANDOFF_FAILED):*
To simulate a failure in the Gamification Event Engine or Rewards service, you would temporarily disable the `EventBus` listeners. If synchronous, the pickup should halt at `Verification Failed`. However, since GreenCoin uses a decoupled `EventBus`, the pickup transitions to `Verified` (or `Reward Generated`), and gamification computes asynchronously.

## Phase 6 — Gamification Engine Validation

For the user whose pickup was verified (e.g., a 2kg Laptop on a weekday, no streaks):
- Calculation: 150 (Base) × 1.5 (Laptop Mult) × 1.0 (2kg Weight) × 1.0 (Weekday Bonus) = **225 Coins**
- XP: **100 XP**

| Request Name | Method | Endpoint | Role Required | Expected Status | Key Assertions |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Get Wallet | GET | `/gamification/wallet` | User | 200 | balance >= 225 |
| Get Wallet History | GET | `/gamification/wallet/history` | User | 200 | contains 'Pickup Verified' transaction |
| Get Profile | GET | `/gamification/profile` | User | 200 | xp >= 100, level == 1 |
| Get Badges | GET | `/gamification/badges` | User | 200 | contains `first-step` badge |
| Get Leaderboard | GET | `/gamification/leaderboard?scope=global`| User | 200 | user appears in ranked list |
| Get Active Challenges | GET | `/gamification/challenges` | User | 200 | progress increments |

**Test Script Example (Wallet Assert):**
```javascript
pm.test("Wallet balance is correct", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.data.balance).to.be.at.least(225);
});
```

## Phase 7 — Reward Redemption

| Request Name | Method | Endpoint | Role Required | Expected Status | Key Assertions |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Redeem Reward | POST | `/gamification/rewards/redeem` | User | 200 | debit transaction created, success: true |
| Insufficient Balance | POST | `/gamification/rewards/redeem` | User | 400 | error: 'Insufficient GreenCoins balance' |

> **Concurrency Edge Case / Race Condition Limitation:** 
> The `RedemptionService` checks `wallet.balance < reward.coinCost` and then issues a `WalletService.debitWallet()`. Because this spans multiple asynchronous MongoDB operations without a transactional lock or `$inc` check at the query level, a user firing rapid simultaneous redemption requests could potentially bypass the balance check (Race Condition). This is a known gap.

## Phase 8 — Cross-Cutting Security Regression

| Request Name | Method | Endpoint | Role Required | Expected Status | Key Assertions |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Missing JWT on Wallet | GET | `/gamification/wallet` | None | 401 | UNAUTHORIZED |
| Bad JWT on Profile | GET | `/gamification/profile` | Invalid | 401 | UNAUTHORIZED |

**Test Script Example:**
```javascript
pm.test("Status code is 401 Unauthorized", function () {
    pm.response.to.have.status(401);
});
```

## Suggested Execution Order

This test plan is highly sequential. Variables collected from Phase 1 and 3 power the entire suite. 
1. Open the Postman Collection Runner.
2. Ensure you have a clean database before execution (e.g. drop collections or run on a dedicated Test DB).
3. Run the folders in exact sequence: Phase 1 → Phase 8 without parallel execution.
