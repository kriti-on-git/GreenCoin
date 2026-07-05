# GreenCoin Backend

The backend API server for the GreenCoin e-waste recycling platform. Built with **Express 5**, **TypeScript**, **MongoDB (Mongoose)**, and **Zod** for request validation.

---

## What Was Built

This backend implements the **Pickup Module** — the core workflow that drives e-waste collection in the GreenCoin ecosystem. Below is a breakdown of everything that was done.

### 1. Pickup Lifecycle & State Machine

A pickup request moves through a strict, forward-only state machine:

```
Requested → Accepted → Picked → Delivered → Verified → Reward Generated
```

- **Only valid forward transitions are allowed.** Attempting to skip a step (e.g. `Requested → Delivered`) or go backward (e.g. `Delivered → Picked`) is rejected with a `400 INVALID_TRANSITION` error.
- The state machine is implemented in [`pickup-state-machine.ts`](src/pickup/pickup-state-machine.ts) as a standalone class with a static transition map, making it easy to test and extend.
- The `Verified → Reward Generated` step is stubbed — the verify endpoint returns `501 NOT_IMPLEMENTED` until the Rewards module is built.

### 2. Pickup CRUD & Status Update Endpoints

Full REST API for pickup management, implemented across:

- **Routes** → [`pickup.routes.ts`](src/pickup/pickup.routes.ts)
- **Controller** → [`pickup.controller.ts`](src/pickup/pickup.controller.ts)
- **Service** → [`pickup.service.ts`](src/pickup/pickup.service.ts)
- **Model** → [`pickup.model.ts`](src/pickup/pickup.model.ts)

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| `POST` | `/api/v1/pickups` | User | Create a new pickup request with device info |
| `GET` | `/api/v1/pickups` | User/Collector/Admin | List pickups (filtered by role) |
| `GET` | `/api/v1/pickups/:id` | User/Collector/Admin | Get a specific pickup by ID |
| `PATCH` | `/api/v1/pickups/:id/accept` | Collector | Accept a pickup (assigns collector) |
| `PATCH` | `/api/v1/pickups/:id/status` | Collector | Update pickup status (next valid state) |
| `PATCH` | `/api/v1/pickups/:id/verify` | — | Stubbed verification endpoint (501) |

**Key business rules enforced:**

- A collector must be **assigned** to a pickup before updating its status.
- A different collector **cannot** update a pickup they're not assigned to (`403 FORBIDDEN_NOT_ASSIGNED_COLLECTOR`).
- A pickup that already has a collector **cannot** be accepted again (`403 FORBIDDEN_ALREADY_ASSIGNED`).
- Users can **only** view their own pickups.

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

- [`pickup.validation.ts`](src/pickup/pickup.validation.ts) — Validates pickup creation body, query filters, and status update body.
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
- `NOT_IMPLEMENTED` — Stubbed endpoint
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

---

## Project Structure

```
backend/
├── src/
│   ├── index.ts                          # Express app setup & MongoDB connection
│   ├── middlewares/
│   │   ├── auth.middleware.ts             # Stub auth (Bearer token → user context)
│   │   └── error.middleware.ts            # Centralized error handler
│   ├── pickup/
│   │   ├── pickup.model.ts               # Mongoose schemas & models (Pickup, Device, CollectionCenter)
│   │   ├── pickup.routes.ts              # Pickup route definitions
│   │   ├── pickup.controller.ts          # Pickup request handlers
│   │   ├── pickup.service.ts             # Pickup business logic
│   │   ├── pickup.validation.ts          # Zod schemas + validate middleware
│   │   ├── pickup-state-machine.ts       # State transition validator
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

Create a `.env` file in the `backend/` directory:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/greencoin
```

### Running the Server

```bash
# Development (with ts-node)
npm run dev

# Build for production
npm run build
node dist/index.js
```

---

## Example API Usage

### Create a Pickup (as a User)

```bash
curl -X POST http://localhost:5000/api/v1/pickups \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer valid_user_token" \
  -d '{
    "pickupTime": "2026-07-10T10:00:00.000Z",
    "device": {
      "category": "Laptop",
      "weight": 2.5
    }
  }'
```

### Accept a Pickup (as a Collector)

```bash
curl -X PATCH http://localhost:5000/api/v1/pickups/<pickup_id>/accept \
  -H "Authorization: Bearer valid_collector_token"
```

### Update Pickup Status (as the assigned Collector)

```bash
curl -X PATCH http://localhost:5000/api/v1/pickups/<pickup_id>/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer valid_collector_token" \
  -d '{ "status": "Picked" }'
```

### Create a Collection Center (as an Admin)

```bash
curl -X POST http://localhost:5000/api/v1/collection-centers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer valid_admin_token" \
  -d '{
    "name": "Downtown E-Waste Hub",
    "location": "123 Green Street, Eco City"
  }'
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js + TypeScript |
| Framework | Express 5 |
| Database | MongoDB via Mongoose |
| Validation | Zod |
| Auth | Stub middleware (JWT planned) |
