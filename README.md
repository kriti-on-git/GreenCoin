# GreenCoin

### Rewarding Sustainability Through Smart E-Waste Management

*A modern platform connecting citizens, collectors and recyclers through a gamified reward ecosystem.*

![License](https://img.shields.io/badge/license-MIT-green)
![Node](https://img.shields.io/badge/Node.js-22.x-success)
![React](https://img.shields.io/badge/React-19-blue)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green)
![Status](https://img.shields.io/badge/status-In%20Development-orange)

</p>

---

# 🌍 Vision

GreenCoin transforms e-waste recycling into an engaging, rewarding and measurable experience.

Instead of operating as a recycling company, GreenCoin serves as the digital infrastructure connecting every stakeholder within the recycling ecosystem.

```
Citizen
    │
    ▼
GreenCoin Platform
    │
    ▼
Verified Collector
    │
    ▼
Authorized Recycler
    │
    ▼
Reward Distribution
```

---

# ✨ Features

-  Authentication & Role Management
-  User Dashboard
-  Collector Portal
-  Pickup Lifecycle
-  GreenCoin Wallet
-  Gamification Engine
-  Analytics Dashboard
-  Admin Panel
-  Notification System

---

# 🏛 High Level Architecture

```text
                    React / Next.js
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
 User Portal      Collector Portal      Admin Panel
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
                 REST API (Express.js)
                           │
         ┌──────────┬──────────┬──────────┬──────────┐
         │          │          │          │          │
 Authentication   Users    Rewards    Pickup   Analytics
                           │
                     MongoDB Atlas
```

---

# 🏗 System Architecture

```mermaid
flowchart TD

U[User]

C[Collector]

A[Admin]

FE[React / Next.js]

API[Express API]

AUTH[Authentication]

USR[Users]

PK[Pickup]

RW[Rewards]

AN[Analytics]

DB[(MongoDB)]

U --> FE

C --> FE

A --> FE

FE --> API

API --> AUTH
API --> USR
API --> PK
API --> RW
API --> AN

AUTH --> DB
USR --> DB
PK --> DB
RW --> DB
AN --> DB
```

---

# 🚚 Pickup Workflow

```mermaid
flowchart LR

A[Pickup Requested]

B[Collector Assigned]

C[Pickup Accepted]

D[E-Waste Collected]

E[Recycler Verification]

F[GreenCoins Generated]

G[Wallet Updated]

A --> B --> C --> D --> E --> F --> G
```

---

## 🎮 Reward Workflow

```mermaid
flowchart LR

A["User submits e-waste"]
--> B["Device verified"]

B --> C["Device categorized"]

C --> D["Weight & condition evaluated"]

D --> E["GreenCoin calculation engine"]

E --> F["Coins credited to wallet"]

F --> G["User redeems rewards"]

G --> H["Coupons / Vouchers / Donations"]
```
---

# 🧩 Modules

## Authentication

- Login
- Register
- JWT
- RBAC

---

## User

- Dashboard
- Wallet
- Pickup History
- Rewards

---

## Collector

- Pickup Requests
- Route
- Earnings
- Status

---

## Rewards

- Coin Engine
- Wallet
- Redemption

---

## Gamification

- Badges
- Streaks
- Levels
- Leaderboard

---

## Admin

- User Management
- Collector Verification
- Analytics
- Rewards

---

## Analytics

- Carbon Saved
- Total Pickups
- Active Users
- Coins Distributed

---

# 🗄 Database Design

```mermaid
erDiagram

USERS ||--o{ PICKUPS : creates

COLLECTORS ||--o{ PICKUPS : accepts

PICKUPS ||--|| DEVICES : contains

USERS ||--|| WALLETS : owns

WALLETS ||--o{ TRANSACTIONS : stores

USERS ||--o{ BADGES : earns

USERS ||--o{ NOTIFICATIONS : receives

ADMINS {
string id
string name
string email
}

USERS {
ObjectId id
string name
string email
string role
}

COLLECTORS {
ObjectId id
string aadhaar
string phone
}

DEVICES {
ObjectId id
string category
float weight
}

PICKUPS {
ObjectId id
string status
datetime pickupTime
}

WALLETS {
ObjectId id
int balance
}

TRANSACTIONS {
ObjectId id
int amount
string type
}

BADGES {
ObjectId id
string badge
}

NOTIFICATIONS {
ObjectId id
string title
}
```

---

# 📂 Repository Structure

```
greencoin/

frontend/
backend/

docs/
assets/

database/

api/

.github/

README.md
```

---

# 🚀 Tech Stack

| Layer | Technology |
|--------|------------|
| Frontend | React / Next.js |
| Backend | Node.js |
| Framework | Express.js |
| Database | MongoDB |
| Auth | JWT |
| API | REST |
| Styling | TailwindCSS |
| Deployment | Docker + Vercel + Render |

---

# 🔄 Git Workflow

```text
Fork

↓

Feature Branch

↓

Commit

↓

Pull Request

↓

Review

↓

Merge
```

---


# 📅 Development Roadmap

- [x] Planning
- [ ] Authentication
- [ ] User Dashboard
- [ ] Collector Dashboard
- [ ] Pickup Module
- [ ] Wallet
- [ ] Gamification
- [ ] Analytics
- [ ] Admin Panel
- [ ] Deployment

---

# 🌱 Future Scope

- AI Device Recognition
- QR Verification
- CSR Dashboard
- Blockchain Green Credits
- Carbon Credit Marketplace
- Payment Gateway
- Route Optimization
- AI Chat Assistant

---

# 🤝 Contributing

1. Fork the repository

2. Create a feature branch

3. Commit your changes

4. Push to your fork

5. Open a Pull Request

6. Attach a demo video

---

<p align="center">

Made with ♻ by SmartNerve

</p>
