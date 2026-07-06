# Pickup Module — Complete API Reference

This document covers every endpoint, the state machine, the Rewards handoff contract, error codes, and environment variables for the Pickup Module.

---

## Table of Contents

1. [State Machine](#state-machine)
2. [Pickup Endpoints](#pickup-endpoints)
3. [Collection Center Endpoints](#collection-center-endpoints)
4. [Rewards Handoff Contract](#rewards-handoff-contract)
5. [Error Codes](#error-codes)
6. [Environment Variables](#environment-variables)

---

## State Machine

A pickup moves through a strict, forward-only lifecycle. The state machine rejects any invalid or backward transitions with `400 INVALID_TRANSITION`.

```
Requested → Accepted → Picked → Delivered → Verified ─┬─→ Reward Generated
                                                       └─→ Verification Failed
```

| Current Status        | Valid Next Status(es)                            |
|-----------------------|--------------------------------------------------|
| Requested             | Accepted                                         |
| Accepted              | Picked                                           |
| Picked                | Delivered                                        |
| Delivered             | Verified                                         |
| Verified              | Reward Generated, Verification Failed            |
| Reward Generated      | *(terminal — no further transitions)*            |
| Verification Failed   | *(terminal — manual retry handled separately)*   |

**`Verification Failed`** is reached only when the Rewards service handoff fails after successful verification. This prevents pickups from getting silently stuck.

---

## Pickup Endpoints

All pickup endpoints are prefixed with `/api/v1/pickups` and require a valid `Authorization: Bearer <token>` header.

---

### `POST /api/v1/pickups`

**Create a new pickup request.**

| Property | Value |
|----------|-------|
| **Role** | `user` |
| **Auth** | Required |

**Request Body:**
```json
{
  "pickupTime": "2026-08-01T10:00:00.000Z",
  "device": {
    "category": "Laptop",
    "weight": 2.5
  }
}
```

| Field | Type | Rules |
|-------|------|-------|
| `pickupTime` | string | Required. ISO 8601 datetime. |
| `device.category` | string | Required. Non-empty. |
| `device.weight` | number | Required. Positive. |

**Success Response (201):**
```json
{
  "success": true,
  "data": { /* pickup object with populated device */ }
}
```

**Error Responses:**
| Status | Error Code | When |
|--------|-----------|------|
| 400 | `VALIDATION_ERROR` | Invalid/missing body fields |
| 401 | `UNAUTHORIZED` | Missing or invalid auth token |

---

### `GET /api/v1/pickups`

**List pickups (filtered by role).**

| Property | Value |
|----------|-------|
| **Role** | `user` (own only), `collector`, `admin` |
| **Auth** | Required |

**Query Parameters (all optional):**

| Param | Type | Notes |
|-------|------|-------|
| `userId` | ObjectId string | Ignored for `user` role (auto-filtered) |
| `collectorId` | ObjectId string | Filter by assigned collector |
| `status` | PickupStatus enum | Filter by current status |

**Success Response (200):**
```json
{
  "success": true,
  "data": [ /* array of pickup objects */ ]
}
```

---

### `GET /api/v1/pickups/:id`

**Get a single pickup by ID.**

| Property | Value |
|----------|-------|
| **Role** | `user` (own only), `collector`, `admin` |
| **Auth** | Required |

**Error Responses:**
| Status | Error Code | When |
|--------|-----------|------|
| 403 | `FORBIDDEN` | User trying to view another user's pickup |
| 404 | `NOT_FOUND` | Pickup does not exist |

---

### `PATCH /api/v1/pickups/:id/accept`

**Collector accepts a pickup (Requested → Accepted).**

| Property | Value |
|----------|-------|
| **Role** | `collector` only |
| **Auth** | Required |

**No request body required.** The collector is identified from the auth token.

**Error Responses:**
| Status | Error Code | When |
|--------|-----------|------|
| 400 | `INVALID_TRANSITION` | Pickup is not in `Requested` status |
| 403 | `FORBIDDEN` | Caller is not a collector |
| 403 | `FORBIDDEN_ALREADY_ASSIGNED` | Pickup already has a collector |
| 404 | `NOT_FOUND` | Pickup does not exist |

---

### `PATCH /api/v1/pickups/:id/status`

**Collector updates pickup status (Accepted → Picked → Delivered).**

| Property | Value |
|----------|-------|
| **Role** | `collector` only (must be the assigned collector) |
| **Auth** | Required |

**Request Body:**
```json
{
  "status": "Picked"
}
```

| Field | Type | Rules |
|-------|------|-------|
| `status` | PickupStatus enum | Required. Must be a valid next state. |

**Error Responses:**
| Status | Error Code | When |
|--------|-----------|------|
| 400 | `INVALID_TRANSITION` | Invalid state transition |
| 400 | `VALIDATION_ERROR` | Invalid status value in body |
| 403 | `FORBIDDEN` | Caller is not a collector |
| 403 | `FORBIDDEN_NOT_ASSIGNED_COLLECTOR` | Collector is not assigned to this pickup |
| 404 | `NOT_FOUND` | Pickup does not exist |

---

### `PATCH /api/v1/pickups/:id/verify`

**Verify a delivered pickup and trigger the Rewards handoff.**

| Property | Value |
|----------|-------|
| **Role** | `admin` only *(see TODO below)* |
| **Auth** | Required |

> **TODO:** Confirm with team — should the allowed role also include `recycler` or `collection-center-staff`? Currently defaults to `admin` only.

**No request body required.**

**Success Response (200):**
```json
{
  "success": true,
  "data": { /* pickup with status "Reward Generated" */ }
}
```

**Error Responses:**
| Status | Error Code | When |
|--------|-----------|------|
| 400 | `INVALID_TRANSITION` | Pickup is not in `Delivered` status |
| 403 | `FORBIDDEN` | Caller is not an admin |
| 404 | `NOT_FOUND` | Pickup does not exist |
| 502 | `REWARDS_HANDOFF_FAILED` | Rewards service call failed (pickup set to `Verification Failed`) |

---

## Collection Center Endpoints

All collection center endpoints are prefixed with `/api/v1/collection-centers`.

---

### `GET /api/v1/collection-centers`

**List all collection centers.**

| Property | Value |
|----------|-------|
| **Role** | Any authenticated user |
| **Auth** | Required |

**Success Response (200):**
```json
{
  "success": true,
  "data": [ /* array of collection center objects */ ]
}
```

---

### `POST /api/v1/collection-centers`

**Create a new collection center.**

| Property | Value |
|----------|-------|
| **Role** | `admin` only |
| **Auth** | Required |

**Request Body:**
```json
{
  "name": "Downtown E-Waste Hub",
  "location": "123 Green Street, Eco City"
}
```

| Field | Type | Rules |
|-------|------|-------|
| `name` | string | Required. Non-empty. |
| `location` | string | Required. Non-empty. |

**Error Responses:**
| Status | Error Code | When |
|--------|-----------|------|
| 400 | `VALIDATION_ERROR` | Invalid/missing body fields |
| 403 | `FORBIDDEN` | Caller is not an admin |

---

## Rewards Handoff Contract

When a pickup is verified (`PATCH /:id/verify`), the backend calls the Rewards service to trigger reward generation.

### Endpoint

| Property | Value |
|----------|-------|
| **Method** | `POST` |
| **URL** | Configured via `REWARDS_SERVICE_URL` environment variable |
| **Default** | `http://localhost:3001/api/v1/rewards/generate` |

> **TODO:** Confirm the actual Rewards service URL with the Rewards team.

### Request Payload

```json
{
  "pickupId": "667a1b2c3d4e5f6a7b8c9d0e",
  "userId": "60d5ecb54cb7c1a361c8d8b1",
  "deviceId": "667a1b2c3d4e5f6a7b8c9d0f",
  "category": "Laptop",
  "weight": 2.5
}
```

| Field | Type | Description |
|-------|------|-------------|
| `pickupId` | string | MongoDB ObjectId of the verified pickup |
| `userId` | string | MongoDB ObjectId of the user who created the pickup |
| `deviceId` | string | MongoDB ObjectId of the associated device |
| `category` | string | Device category (e.g., "Laptop", "Phone") |
| `weight` | number | Device weight in kg |

### Success Behavior

- Rewards service returns `2xx`
- Pickup status transitions: `Verified → Reward Generated`
- Info log: `Pickup {id} verified and reward triggered`

### Failure Behavior

- Rewards service returns non-`2xx` **or** is unreachable
- Pickup status transitions: `Verified → Verification Failed`
- Error log with reason (no PII)
- API returns `502 REWARDS_HANDOFF_FAILED` to the caller
- The pickup is **not** silently stuck — `Verification Failed` status makes it visible for manual retry

---

## Error Codes

All error responses follow the standardized shape:

```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Human-readable description"
}
```

| Error Code | HTTP Status | Description |
|-----------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid auth token |
| `INVALID_TOKEN` | 401 | Token is expired or unrecognized |
| `FORBIDDEN` | 403 | Role-based access denied |
| `FORBIDDEN_ALREADY_ASSIGNED` | 403 | Pickup already has a collector |
| `FORBIDDEN_NOT_ASSIGNED_COLLECTOR` | 403 | Collector is not assigned to this pickup |
| `NOT_FOUND` | 404 | Resource not found |
| `INVALID_TRANSITION` | 400 | Invalid state machine transition |
| `VALIDATION_ERROR` | 400 | Zod validation failure |
| `REWARDS_HANDOFF_FAILED` | 502 | Rewards service call failed |
| `INTERNAL_SERVER_ERROR` | 500 | Unhandled server error |

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `3000` | Server port |
| `MONGODB_URI` | No | `mongodb://localhost:27017/greencoin` | MongoDB connection URI |
| `JWT_SECRET` | Yes | — | Secret for JWT auth (when real auth is implemented) |
| `REWARDS_SERVICE_URL` | No | `http://localhost:3001/api/v1/rewards/generate` | URL for the Rewards service handoff |

See [`docs/.env.example`](../docs/.env.example) for a template.
