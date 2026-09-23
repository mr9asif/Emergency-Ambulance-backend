# 🚑 Emergency Ambulance Dispatch API

> **Fast & Reliable Emergency Ambulance Dispatch**

A production-ready RESTful backend API for an emergency ambulance dispatch and healthcare transportation platform.

The system connects **patients, dispatchers, ambulance drivers, hospitals, and administrators** to manage emergency requests, ambulance assignment, trips, payments, and emergency history.

---

## 🚀 Live Demo

```text
 https://emergency-ambulance-backend.vercel.app
```

### API Base URL

```text
 https://emergency-ambulance-backend.vercel.app
```

### Postman Documentation

```text
https://documenter.getpostman.com/view/38315131/2sBYB2qmo9
```

---

# 📖 Project Overview

Emergency Ambulance Dispatch is a role-based emergency transportation system built with:

- Node.js
- Express.js
- TypeScript
- Prisma ORM
- PostgreSQL
- JWT Authentication

The platform allows patients to create emergency requests with pickup locations and priority levels. Dispatchers can assign available ambulances and drivers, while drivers manage assigned trips and update their status.

### User Roles

- 👤 Patient / Caller
- 🎧 Dispatcher
- 🚑 Ambulance Driver
- 👑 Admin

---

# ✨ Features

## 👤 Patient

- Register and login
- Email verification with OTP
- Manage profile
- Create emergency requests
- Set emergency priority and pickup location
- Track emergency status
- View assigned ambulance and trip
- Cancel eligible requests
- View payment and emergency history

## 🎧 Dispatcher

- View and manage emergency requests
- Check ambulance availability
- Assign ambulances and drivers
- Monitor active trips
- Manage emergency status

## 🚑 Ambulance Driver

- View assigned trips
- Accept or reject assignments
- Update availability
- Start and complete trips
- View emergency and patient information

## 🏥 Hospital

- Manage hospital information

## 👑 Admin

- Manage users
- Manage hospitals
- Manage ambulances and drivers
- Review operator applications
- Manage emergency requests and trips
- Monitor payments
- View platform statistics

---

# 🔐 Authentication

The API uses secure JWT-based authentication with:

- JWT Access Token
- JWT Refresh Token
- HTTP Only Cookies
- Bearer Authentication
- Role-Based Access Control
- bcrypt Password Hashing
- Email & OTP Verification

### Supported Roles

```text
PATIENT
DISPATCHER
AMBULANCE_DRIVER
ADMIN
```

---

# 🚑 Emergency Dispatch

The core dispatch workflow:

```text
Patient
   ↓
Create Emergency Request
   ↓
Dispatcher Reviews Request
   ↓
Check Available Ambulance
   ↓
Assign Ambulance & Driver
   ↓
Driver Accepts / Rejects
   ↓
Trip Starts
   ↓
Patient Transport
   ↓
Trip Completed
   ↓
Payment
   ↓
Emergency History
```

Emergency requests support priority-based dispatching:

```text
LOW
MEDIUM
HIGH
CRITICAL
```

The system also prevents an already assigned ambulance from being assigned to another active emergency.

---

# 💳 Payment Integration

The system supports real payment processing for ambulance services.

Supported gateways include:

- Stripe
- SSLCommerz
- bKash

### Payment Status

```text
PENDING
COMPLETED
FAILED
CANCELLED
```

Payment records are associated with the corresponding trip.

---

# 📦 Tech Stack

### Backend

- Node.js
- Express.js
- TypeScript

### Database

- PostgreSQL
- Prisma ORM

### Authentication & Security

- JWT
- bcrypt
- HTTP Only Cookies
- Helmet
- CORS
- Rate Limiting

### Validation & Utilities

- Zod
- Redis
- SMTP

### Payment

- Stripe / SSLCommerz / bKash

### Development

- Postman
- Prisma Studio
- ESLint
- Prettier
- ts-node-dev

---

# 🗂️ Project Structure

```text
src
│
├── app
│   ├── config
│   ├── middlewares
│   ├── modules
│   │   ├── auth
│   │   ├── user
│   │   ├── admin
│   │   ├── hospital
│   │   ├── ambulance
│   │   ├── driver
│   │   ├── dispatcher
│   │   ├── operator
│   │   ├── emergency
│   │   ├── trip
│   │   ├── payment
│   │   └── notification
│   ├── routes
│   ├── utils
│   ├── interfaces
│   └── errors
│
├── prisma
│   ├── schema
│   └── migrations
│
├── server.ts
└── app.ts
```

---

# 🗃️ Database Schema

### Main Models

- User
- OperatorProfile
- Hospital
- Ambulance
- EmergencyRequest
- Trip
- Payment
- Notification
- OperatorApplication

### Core Relationships

```text
User
 └── OperatorProfile
       └── Hospital

Hospital
 ├── Operators
 └── Ambulances

Ambulance
 └── Trips

User
 └── EmergencyRequests

EmergencyRequest
 └── Trip
       └── Payment
```

---

# 📡 API Endpoints

> Complete request/response examples and authentication details are available in the Postman documentation.

## Authentication

| Method | Endpoint                  | Description   |
| ------ | ------------------------- | ------------- |
| POST   | `/api/auth/register`      | Register      |
| POST   | `/api/auth/verify-email`  | Verify email  |
| POST   | `/api/auth/login`         | Login         |
| POST   | `/api/auth/refresh-token` | Refresh token |
| POST   | `/api/auth/logout`        | Logout        |
| GET    | `/api/auth/me`            | Current user  |

## Emergency Requests

| Method | Endpoint                              | Description              |
| ------ | ------------------------------------- | ------------------------ |
| POST   | `/api/emergency-requests`             | Create emergency request |
| GET    | `/api/emergency-requests/my-requests` | View own requests        |
| GET    | `/api/emergency-requests/:id`         | View request             |
| PATCH  | `/api/emergency-requests/:id/cancel`  | Cancel request           |

## Dispatcher

| Method | Endpoint                                        | Description          |
| ------ | ----------------------------------------------- | -------------------- |
| GET    | `/api/dispatcher/emergency-requests`            | View emergencies     |
| PATCH  | `/api/dispatcher/emergency-requests/:id/assign` | Assign ambulance     |
| GET    | `/api/dispatcher/ambulances/available`          | Available ambulances |
| GET    | `/api/dispatcher/trips`                         | Active trips         |

## Driver

| Method | Endpoint                         | Description         |
| ------ | -------------------------------- | ------------------- |
| GET    | `/api/driver/trips`              | Assigned trips      |
| PATCH  | `/api/driver/trips/:id/accept`   | Accept trip         |
| PATCH  | `/api/driver/trips/:id/reject`   | Reject trip         |
| PATCH  | `/api/driver/trips/:id/start`    | Start trip          |
| PATCH  | `/api/driver/trips/:id/complete` | Complete trip       |
| PATCH  | `/api/driver/availability`       | Update availability |

## Ambulance

| Method | Endpoint              | Description      |
| ------ | --------------------- | ---------------- |
| GET    | `/api/ambulances`     | View ambulances  |
| GET    | `/api/ambulances/:id` | View ambulance   |
| POST   | `/api/ambulances`     | Create ambulance |
| PATCH  | `/api/ambulances/:id` | Update ambulance |
| DELETE | `/api/ambulances/:id` | Delete ambulance |

## Hospitals

| Method | Endpoint             | Description     |
| ------ | -------------------- | --------------- |
| GET    | `/api/hospitals`     | View hospitals  |
| GET    | `/api/hospitals/:id` | View hospital   |
| POST   | `/api/hospitals`     | Create hospital |
| PATCH  | `/api/hospitals/:id` | Update hospital |
| DELETE | `/api/hospitals/:id` | Delete hospital |

## Payments

| Method | Endpoint                | Description     |
| ------ | ----------------------- | --------------- |
| POST   | `/api/payments/create`  | Create payment  |
| POST   | `/api/payments/confirm` | Confirm payment |
| GET    | `/api/payments`         | View payments   |
| GET    | `/api/payments/:id`     | View payment    |

## Admin

| Method | Endpoint                        | Description          |
| ------ | ------------------------------- | -------------------- |
| GET    | `/api/admin/users`              | View users           |
| PATCH  | `/api/admin/users/:id`          | Update user          |
| GET    | `/api/admin/hospitals`          | View hospitals       |
| GET    | `/api/admin/ambulances`         | View ambulances      |
| GET    | `/api/admin/drivers`            | View drivers         |
| GET    | `/api/admin/emergency-requests` | View emergencies     |
| GET    | `/api/admin/trips`              | View trips           |
| GET    | `/api/admin/payments`           | View payments        |
| GET    | `/api/admin/dashboard`          | Dashboard statistics |

---

# ⚙️ Environment Variables

Create a `.env` file in the root directory.

```env
PORT=5000
NODE_ENV=development

DATABASE_URL=

JWT_ACCESS_SECRET=
JWT_ACCESS_EXPIRES_IN=

JWT_REFRESH_SECRET=
JWT_REFRESH_EXPIRES_IN=

BCRYPT_SALT_ROUNDS=
COOKIE_SECRET=

CLIENT_URL=
SERVER_URL=

REDIS_URL=

SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=

STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

SSLCOMMERZ_STORE_ID=
SSLCOMMERZ_STORE_PASSWORD=
SSLCOMMERZ_IS_LIVE=
```

---

# 🛠️ Installation

### Clone Repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
cd emergency-ambulance-dispatch
```

### Install Dependencies

```bash
npm install
```

### Generate Prisma Client

```bash
npx prisma generate
```

### Run Migration

```bash
npx prisma migrate dev
```

### Start Development Server

```bash
npm run dev
```

### Build for Production

```bash
npm run build
npm start
```

---

# 🧪 Testing

The API can be tested using:

- Postman
- Thunder Client
- Insomnia

Complete API documentation is available in the Postman collection.

---

# 🧠 Key Backend Challenges

### 🚑 Ambulance Availability

Tracks ambulance availability to prevent duplicate active assignments.

### 🚨 Priority-Based Dispatching

Emergency requests support priority levels to help dispatchers handle urgent cases.

### 🔐 Role-Based Access Control

Each role has controlled access to specific resources and operations.

### 🔄 Emergency State Management

Emergency requests and trips follow controlled status transitions to maintain data consistency.

### 🛡️ Secure API

Includes JWT authentication, Zod validation, bcrypt, Helmet, CORS, rate limiting, and protected routes.

---

# 📈 Future Improvements

- Real-time ambulance GPS tracking
- Socket.IO live dispatch updates
- Push & SMS notifications
- Automatic nearest-ambulance detection
- Google Maps integration
- Route optimization
- Estimated arrival time
- Advanced analytics
- Hospital bed availability
- Refund management

---

# 👨‍💻 Author

**mr9asif**

Backend / Full Stack Developer

### GitHub

```text
https://github.com/mr9asif
```

### LinkedIn

```text
https://linkedin.com/in/mr9asif
```

---

# 📄 License

This project was developed as a backend-focused emergency ambulance dispatch and healthcare transportation management system.

© 2026 mr9asif
