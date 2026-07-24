# GreenCoin Backend API Documentation

This directory contains the backend services for the GreenCoin E-waste pickup and recycling reward system.

## Authentication Endpoints

| Method | Path | Role | Description |
|---|---|---|---|
| POST | `/api/v1/auth/register` | Public | Register a new user (`name`, `email`, `password`, optional `role`). |
| POST | `/api/v1/auth/login` | Public | Authenticate a user and receive a JWT. |
| POST | `/api/v1/auth/logout` | Any authenticated | Discard token (stateless, client-side). |

## User Profile Endpoints

| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/api/v1/users/me` | Any authenticated | Fetch the current user's profile. |
| PATCH | `/api/v1/users/me` | Any authenticated | Update own profile (only `name` allowed). |
| GET | `/api/v1/users` | admin | List users (supports `?role=` filtering). |
| GET | `/api/v1/users/:id` | admin | Fetch any user's profile by ID. |

## Pickup & Collection Center Endpoints

For full documentation on the Pickup module and state machine, refer to [PICKUP_MODULE.md](./PICKUP_MODULE.md).

| Method | Path | Role | Description |
|---|---|---|---|
| POST | `/api/v1/pickups` | Any authenticated | Request an e-waste pickup. |
| GET | `/api/v1/pickups` | Any authenticated | List pickups (filtered by role). |
| GET | `/api/v1/pickups/:id` | Any authenticated | Fetch a pickup's details (restricted to owner/assigned collector). |
| PATCH | `/api/v1/pickups/:id/accept` | collector | Accept a requested pickup. |
| PATCH | `/api/v1/pickups/:id/status` | collector | Update pickup status (Picked, Delivered). |
| PATCH | `/api/v1/pickups/:id/verify` | admin | Verify a delivered pickup and trigger reward generation. |
| GET | `/api/v1/collection-centers` | Any authenticated | List collection centers. |
| POST | `/api/v1/collection-centers` | admin | Create a new collection center. |
