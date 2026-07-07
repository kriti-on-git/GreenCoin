# GreenCoin Backend

The backend API server for the GreenCoin e-waste recycling platform. Built with **Express 5**, **TypeScript**, **MongoDB (Mongoose)**, and **Zod** for request validation.

---

## What Was Built

This backend implements the **Pickup Module** — the core workflow that drives e-waste collection in the GreenCoin ecosystem. Below is a breakdown of everything that was done.

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

### 5. Authentication Middleware (Stub)

The [`auth.middleware.ts`](src/middlewares/auth.middleware.ts) provides a **stub** authentication layer. It reads the `Authorization: Bearer <token>` header and maps hardcoded tokens to user contexts:

| Token | Role | User ID |
|-------|------|---------|
| `valid_user_token` | `user` | `60d5ecb54cb7c1a361c8d8b1` |
| `valid_collector_token` | `collector` | `60d5ecb54cb7c1a361c8d8b2` |
| `valid_admin_token` | `admin` | `60d5ecb54cb7c1a361c8d8b3` |

> **Note:** This will be replaced with real JWT-based authentication once the Authentication module is complete.

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
│   │   ├── auth.middleware.ts            # Real JWT authentication middleware
│   │   └── error.middleware.ts           # Centralized error handler
│   ├── auth/
│   │   ├── auth.controller.ts            # Register & login request handlers
│   │   ├── auth.routes.ts                # Auth route definitions
│   │   ├── auth.service.ts               # Password hashing & auth business logic
│   │   ├── auth.validation.ts            # Zod schemas for auth inputs
│   │   └── jwt.util.ts                   # Token generation and verification
│   ├── users/
│   │   └── user.model.ts                 # User Mongoose schema & interface
│   ├── pickup/
│   │   ├── pickup.model.ts               # Mongoose schemas & models (Pickup, Device, CollectionCenter)
│   │   ├── pickup.routes.ts              # Pickup route definitions
│   │   ├── pickup.controller.ts          # Pickup request handlers
│   │   ├── pickup.service.ts             # Pickup business logic
│   │   ├── pickup.validation.ts          # Zod schemas + validate middleware
│   │   ├── pickup-state-machine.ts       # State transition validator
│   │   ├── rewards-client.ts             # HTTP client for triggering Reward Service
│   │   ├── collection-center.routes.ts   # Collection center routes
│   │   ├── collection-center.controller.ts
│   │   ├── collection-center.service.ts
│   │   └── collection-center.validation.ts
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
