# 🍽️ QuickByte Café POS System

A full-stack, production-grade **Point of Sale system** for cafés. Supports four user roles with real-time order management, meal plan payments, inventory tracking, shift management and analytics.

---

## 📸 Screenshots

> Deploy the app and replace these with actual screenshots.

| Admin Dashboard | POS Cashier | Kitchen Display | Student Portal |
|---|---|---|---|
| Analytics & charts | Menu grid + cart | Real-time orders | Wallet & history |

---

## ✨ Features

### 🔐 Authentication & Authorization
- JWT-based authentication with refresh tokens
- Role-Based Access Control (RBAC) — **Admin, Cashier, Kitchen, Student**
- Brute-force protection (10 login attempts / 15 min per IP)
- Secure password hashing with bcrypt

### 🧾 POS — Cashier
- Touch-first menu grid with category filtering and search
- Cart with modifiers, promo codes, and student discounts
- Multiple payment methods: **Cash, Card, Meal Plan, Campus Wallet, QR/UPI, Split**
- Shift management with Z-Report and cash reconciliation
- Offline order queuing via IndexedDB — auto-syncs when reconnected
- Print or email receipts

### 👨‍🍳 Kitchen Display System
- Real-time order board via Socket.io
- Status updates: `pending → preparing → ready → served`
- Pickup display board for customers

### 🎓 Student Portal
- Browse the full menu
- View meal plan balance and transaction history
- QR code for quick cashier lookup

### 📊 Admin Dashboard
- Live dashboard metrics (Socket.io powered)
- **Menu Management** — full CRUD with allergens, dietary tags, nutrition facts
- **Inventory Management** — stock tracking with low/critical alerts
- **Order Management** — view all orders, void/refund with audit trail
- **Reports & Analytics** — revenue by category, top items, staff performance, CSV export
- **Staff Management** — create accounts, toggle active status
- **Meal Plan Management** — assign plans, top-up credits, bulk semester reset

### 🔒 Security
- `helmet.js` security headers
- `express-rate-limit` (100 req/15min global, 10 req/15min on login)
- `joi` input validation on all write endpoints
- Parameterised SQL queries only — no string concatenation
- Price change audit logging
- Soft-deletes with admin-only refunds

### 📱 PWA — Offline Support
- Installable on Android tablets and iPads
- Caches app shell and menu data
- Offline banner with pending order count
- Auto-sync on reconnect

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18 + Vite, Tailwind CSS, React Query, Axios |
| **Routing** | React Router v7 |
| **Real-time** | Socket.io |
| **Backend** | Node.js + Express.js (ESM) |
| **Database** | PostgreSQL (Supabase) |
| **Auth** | JWT (access 8h + refresh 7d) |
| **Validation** | Joi |
| **Security** | Helmet, express-rate-limit |
| **PWA** | vite-plugin-pwa + Workbox |
| **Testing FE** | Vitest + React Testing Library |
| **Testing BE** | Jest + Supertest |
| **Deployment** | Vercel (frontend) + Railway (backend) |

---

## 🚀 Local Setup

### Prerequisites
- Node.js 18+
- PostgreSQL 14+ (or a free [Supabase](https://supabase.com) project)
- npm 9+

### 1. Clone the repository
```bash
git clone https://github.com/your-username/uni-cafeteria-pos.git
cd uni-cafeteria-pos
```

### 2. Backend setup
```bash
cd backend
cp .env.example .env
# Edit .env — set DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET
npm install
npm run migrate       # Creates all tables
npm run seed          # Seeds demo data (optional)
npm run dev           # Starts backend on http://localhost:5000
```

### 3. Frontend setup
```bash
cd frontend
cp .env.example .env
# Edit .env — set VITE_API_URL if using a remote backend
npm install
npm run dev           # Starts frontend on http://localhost:5173
```

### 4. Open in browser
Navigate to **http://localhost:5173** and log in with demo credentials below.

---

## 🔑 Demo Credentials

| Role | Email | Password |
|---|---|---|
| **Admin** | admin@cafeteria.edu | Admin@123! |
| **Cashier** | cashier@cafeteria.edu | Cashier@123! |
| **Kitchen** | kitchen@cafeteria.edu | Kitchen@123! |
| **Student** | student@uni.edu.pk | Student@123! |

> Student ID for meal plan lookup: `STU-2024-001`

---

## 🌐 API Documentation

### Base URL
- **Local:** `http://localhost:5000/api`
- **Production:** `https://your-backend.railway.app/api`

### Authentication
All protected routes require `Authorization: Bearer <token>` header.

### Key Endpoints

#### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/login` | Login (rate limited: 10/15min) |
| POST | `/auth/register` | Register new user |
| GET | `/auth/me` | Get current user |
| POST | `/auth/logout` | Logout + blacklist token |
| POST | `/auth/refresh` | Refresh access token |

#### Menu
| Method | Endpoint | Description |
|---|---|---|
| GET | `/categories` | List all categories |
| GET | `/menu-items` | List items (filter: `?category=`, `?search=`) |
| GET | `/menu-items/:id` | Get single item |

#### Orders
| Method | Endpoint | Description |
|---|---|---|
| POST | `/orders` | Create order |
| GET | `/orders/:id` | Get order by ID |
| PUT | `/orders/:id/status` | Update status (kitchen) |
| GET | `/orders` | List kitchen queue |

#### Payments
| Method | Endpoint | Description |
|---|---|---|
| POST | `/payments/process` | Process single payment |
| POST | `/payments/split` | Process split payment |

#### Shifts (Cashier)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/shifts/active` | Get current cashier's active shift |
| POST | `/shifts/open` | Open new shift |
| PUT | `/shifts/:id/close` | Close shift with cash count |
| GET | `/shifts/:id/summary` | Get full Z-Report data |

#### Admin
| Method | Endpoint | Description |
|---|---|---|
| GET | `/admin/staff` | List all staff |
| POST | `/admin/staff` | Create staff account |
| GET | `/admin/inventory` | Get inventory list |
| GET | `/admin/reports/sales` | Sales report (`?from=&to=`) |
| GET | `/admin/reports/top-items` | Top selling items |
| GET | `/admin/reports/staff` | Staff performance |
| POST | `/admin/orders/:id/refund` | Void & refund order |

#### Health
| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Health check → `{ status: "ok", timestamp }` |

---

## 🧪 Running Tests

### Backend tests (Jest + Supertest)
```bash
cd backend
npm test
```
Tests cover: auth, orders, payments, menu endpoints.

> **Note:** Tests require a live PostgreSQL database. Set `DATABASE_URL` in `backend/.env`.

### Frontend tests (Vitest + React Testing Library)
```bash
cd frontend
npm test
```
Tests cover: Login page rendering, Cart hook (add/remove/discount/totals).

---

## 🚢 Deployment

### Backend → Railway

1. Push code to GitHub
2. Create a new project on [Railway](https://railway.app)
3. Connect your GitHub repository
4. Set these environment variables in Railway dashboard:
   ```
   DATABASE_URL=<your Supabase pooler URL>
   JWT_SECRET=<random 64-char string>
   JWT_REFRESH_SECRET=<random 64-char string>
   NODE_ENV=production
   FRONTEND_URL=https://your-app.vercel.app
   PORT=5000
   ```
5. Railway auto-detects `Procfile` and deploys with `node src/index.js`
6. Run migrations: use Railway's shell → `npm run migrate`

### Frontend → Vercel

1. Go to [Vercel](https://vercel.com) → Import your GitHub repo
2. Set root directory to `frontend`
3. Set build command: `npm run build`
4. Set output directory: `dist`
5. Add environment variable:
   ```
   VITE_API_URL=https://your-backend.railway.app/api
   ```
6. Enable auto-deploy on `main` branch

### Database → Supabase

1. Create a free project at [Supabase](https://supabase.com)
2. Copy the **Pooler connection string** (port 6543, Transaction mode)
3. Set it as `DATABASE_URL` in Railway
4. Run `npm run migrate` to create all tables
5. Run `npm run seed` to populate demo data

---

## 📁 Project Structure

```
uni-cafeteria-pos/
├── backend/
│   ├── src/
│   │   ├── config/          # DB, env, migrations, seed
│   │   ├── controllers/     # Route handlers
│   │   ├── middleware/      # auth, RBAC, rate limiter, validation, error handler
│   │   ├── routes/          # Express routers
│   │   ├── services/        # Business logic
│   │   ├── tests/           # Jest + Supertest tests
│   │   └── utils/           # Joi schemas, helpers
│   ├── .env.example
│   ├── jest.config.js
│   └── Procfile
└── frontend/
    ├── public/              # PWA icons
    └── src/
        ├── __tests__/       # Vitest tests
        ├── components/      # UI, POS, Admin, Student components
        ├── contexts/        # Auth, Shift React contexts
        ├── hooks/           # useCart, useAuth, useToast
        ├── pages/           # Route-level pages
        ├── routes/          # ProtectedRoute
        ├── services/        # Axios API services
        └── utils/           # currency, storage, indexedDb
```

---

## 🔗 Links

- 🌐 **Live Demo:** _Coming soon after deployment_
- 📦 **GitHub:** https://github.com/your-username/uni-cafeteria-pos
- 🎫 **Issues:** https://github.com/your-username/uni-cafeteria-pos/issues

---

## 📄 License

MIT — feel free to use this for learning, projects, or deployment.
